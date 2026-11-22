// Discussion chat for TNPSC Group 1 Prep.
// Socket.IO server: verifies the member's Supabase session, stores messages in
// Supabase (service key) and broadcasts them to everyone in the room.
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ALLOWED_ORIGINS (comma list, * wildcards ok), PORT
import http from 'node:http';
import { Server } from 'socket.io';
import { createClient } from '@supabase/supabase-js';

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ALLOWED_ORIGINS = '', PORT = '8080' } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

// ── config ──
const MAX_LEN = 1000;
const PAGE = 50;
const RATE = { count: 5, windowMs: 10_000 }; // max 5 messages per 10 s per member
const PROFILE_TTL = 60_000;
const STAFF = new Set(['admin', 'superadmin']);
const UNIT_CODES = ['gs1', 'gs2', 'gs3', 'gs4', 'gs5', 'gs6', 'apt', 'rsn', 'ca'];

/** Valid rooms: general, unit-<code>, quiz-YYYY-MM-DD, ch-<chapterId>, mains, interview. */
function validRoom(room) {
  if (typeof room !== 'string' || room.length > 60) return false;
  if (['general', 'mains', 'interview', 'doubts'].includes(room)) return true;
  if (room.startsWith('unit-')) return UNIT_CODES.includes(room.slice(5));
  if (/^quiz-\d{4}-\d{2}-\d{2}$/.test(room)) return true;
  return /^ch-[a-z0-9]+(-[a-z0-9]+){1,4}$/.test(room);
}

const originPatterns = ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
  .map((o) => new RegExp('^' + o.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[a-z0-9-]+') + '$', 'i'));
const originAllowed = (origin) => !origin || originPatterns.length === 0 || originPatterns.some((re) => re.test(origin));

// ── profile cache (role / mute / name can change while connected) ──
const profiles = new Map(); // userId -> { at, value }
async function loadProfile(userId, fresh = false) {
  const hit = profiles.get(userId);
  if (!fresh && hit && Date.now() - hit.at < PROFILE_TTL) return hit.value;
  const { data, error } = await sb.from('profiles').select('full_name, district, role, chat_muted_until').eq('id', userId).maybeSingle();
  if (error) throw error;
  profiles.set(userId, { at: Date.now(), value: data });
  return data;
}

const toClient = (m) => ({
  id: m.id, room_id: m.room_id, user_id: m.user_id, author_name: m.author_name,
  author_role: m.author_role, body: m.body, created_at: m.created_at,
});
const COLS = 'id, room_id, user_id, author_name, author_role, body, created_at';

// ── server ──
const server = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, online: io.engine.clientsCount }));
    return;
  }
  res.writeHead(404).end();
});

const io = new Server(server, {
  cors: { origin: (origin, cb) => cb(null, originAllowed(origin)), credentials: false },
  // CORS doesn't apply to websocket upgrades, so check the Origin header for every transport.
  allowRequest: (req, cb) => cb(null, originAllowed(req.headers.origin)),
  maxHttpBufferSize: 16_000,
  pingInterval: 25_000,
});

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('unauthorized'));
    const { data, error } = await sb.auth.getUser(token);
    if (error || !data?.user) return next(new Error('unauthorized'));
    const p = await loadProfile(data.user.id, true);
    if (!p?.full_name) return next(new Error('profile_incomplete'));
    socket.data.userId = data.user.id;
    next();
  } catch (e) {
    console.error('auth error', e);
    next(new Error('server_error'));
  }
});

const sent = new Map(); // userId -> timestamps
function rateLimited(userId) {
  const now = Date.now();
  const list = (sent.get(userId) ?? []).filter((t) => now - t < RATE.windowMs);
  if (list.length >= RATE.count) { sent.set(userId, list); return true; }
  list.push(now);
  sent.set(userId, list);
  return false;
}

async function presence(room) {
  const n = (await io.in(room).fetchSockets()).length;
  io.to(room).emit('presence', { room, online: n });
}

const ok = (ack, payload = {}) => typeof ack === 'function' && ack({ ok: true, ...payload });
const fail = (ack, error) => typeof ack === 'function' && ack({ ok: false, error });

io.on('connection', (socket) => {
  const userId = socket.data.userId;
  socket.data.room = null;

  socket.on('join', async ({ room } = {}, ack) => {
    if (!validRoom(room)) return fail(ack, 'Unknown room');
    try {
      const prev = socket.data.room;
      if (prev && prev !== room) { socket.leave(prev); presence(prev); }
      socket.join(room);
      socket.data.room = room;
      const { data, error } = await sb.from('chat_messages').select(COLS)
        .eq('room_id', room).is('deleted_at', null).order('created_at', { ascending: false }).limit(PAGE);
      if (error) throw error;
      const me = await loadProfile(userId);
      ok(ack, { messages: data.reverse().map(toClient), hasMore: data.length === PAGE, me: { id: userId, role: me?.role, muted_until: me?.chat_muted_until } });
      presence(room);
    } catch (e) {
      console.error('join', e);
      fail(ack, 'Could not load this room');
    }
  });

  socket.on('history', async ({ room, before } = {}, ack) => {
    if (!validRoom(room) || typeof before !== 'string') return fail(ack, 'Bad request');
    const { data, error } = await sb.from('chat_messages').select(COLS)
      .eq('room_id', room).is('deleted_at', null).lt('created_at', before).order('created_at', { ascending: false }).limit(PAGE);
    if (error) return fail(ack, 'Could not load older messages');
    ok(ack, { messages: data.reverse().map(toClient), hasMore: data.length === PAGE });
  });

  socket.on('send', async ({ room, body } = {}, ack) => {
    if (!validRoom(room) || socket.data.room !== room) return fail(ack, 'Join the room first');
    const text = typeof body === 'string' ? body.replace(/\s+$/g, '').replace(/^\s+/g, '') : '';
    if (!text) return fail(ack, 'Message is empty');
    if (text.length > MAX_LEN) return fail(ack, `Keep it under ${MAX_LEN} characters`);
    try {
      const p = await loadProfile(userId);
      if (!p?.full_name) return fail(ack, 'Complete your profile first');
      if (p.chat_muted_until && new Date(p.chat_muted_until) > new Date()) {
        return fail(ack, `You are muted until ${new Date(p.chat_muted_until).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
      }
      if (rateLimited(userId)) return fail(ack, 'Slow down a little – too many messages');
      const { data, error } = await sb.from('chat_messages')
        .insert({ room_id: room, user_id: userId, author_name: p.full_name, author_role: p.role ?? 'student', body: text })
        .select(COLS).single();
      if (error) throw error;
      const msg = toClient(data);
      io.to(room).emit('message', msg);
      ok(ack, { message: msg });
    } catch (e) {
      console.error('send', e);
      fail(ack, 'Could not send – try again');
    }
  });

  socket.on('delete', async ({ id } = {}, ack) => {
    if (typeof id !== 'string') return fail(ack, 'Bad request');
    try {
      const { data: m } = await sb.from('chat_messages').select('id, room_id, user_id').eq('id', id).maybeSingle();
      if (!m) return fail(ack, 'Message not found');
      const me = await loadProfile(userId, true);
      if (m.user_id !== userId && !STAFF.has(me?.role)) return fail(ack, 'Not allowed');
      const { error } = await sb.from('chat_messages').update({ deleted_at: new Date().toISOString(), deleted_by: userId }).eq('id', id);
      if (error) throw error;
      io.to(m.room_id).emit('deleted', { id, room: m.room_id });
      ok(ack);
    } catch (e) {
      console.error('delete', e);
      fail(ack, 'Could not delete');
    }
  });

  // Staff only: mute a member for N hours (0 = unmute).
  socket.on('mute', async ({ userId: target, hours } = {}, ack) => {
    try {
      const me = await loadProfile(userId, true);
      if (!STAFF.has(me?.role)) return fail(ack, 'Not allowed');
      if (typeof target !== 'string' || target === userId) return fail(ack, 'Bad request');
      const them = await loadProfile(target, true);
      if (!them) return fail(ack, 'Member not found');
      if (them.role === 'superadmin' || (them.role === 'admin' && me.role !== 'superadmin')) return fail(ack, 'You cannot mute this member');
      const h = Math.max(0, Math.min(24 * 30, Number(hours) || 0));
      const until = h ? new Date(Date.now() + h * 3600_000).toISOString() : null;
      const { error } = await sb.from('profiles').update({ chat_muted_until: until }).eq('id', target);
      if (error) throw error;
      profiles.delete(target);
      ok(ack, { until });
    } catch (e) {
      console.error('mute', e);
      fail(ack, 'Could not mute');
    }
  });

  socket.on('rooms', async (_payload, ack) => {
    const { data, error } = await sb.from('chat_room_activity').select('room_id, last_at, messages').order('last_at', { ascending: false }).limit(100);
    if (error) return fail(ack, 'Could not load rooms');
    const online = {};
    for (const [name, members] of io.of('/').adapter.rooms) if (validRoom(name)) online[name] = members.size;
    ok(ack, { rooms: data, online });
  });

  socket.on('disconnect', () => {
    const room = socket.data.room;
    if (room) presence(room);
  });
});

server.listen(Number(PORT), () => console.log(`chat server listening on :${PORT}`));
