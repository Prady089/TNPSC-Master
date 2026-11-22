import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import './index.css';
import App from './App';
import { AuthProvider } from './lib/auth';
import { applyTheme, getTheme } from './lib/theme';

applyTheme(getTheme());

// After a deploy, a tab still running the old version asks for page files that no longer exist.
// Reload once to pick up the new version (guarded so it can never loop).
const RELOAD_KEY = 'reloaded-for-update';
window.addEventListener('vite:preloadError', (e) => {
  let last = 0;
  try { last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0); } catch { /* ignore */ }
  if (Date.now() - last > 30_000) {
    e.preventDefault();
    try { sessionStorage.setItem(RELOAD_KEY, String(Date.now())); } catch { /* ignore */ }
    window.location.reload();
  }
});

// Offline service worker: when a new version is deployed, switch to it and refresh automatically,
// and check for updates every 30 minutes while the app stays open.
registerSW({
  immediate: true,
  onRegisteredSW(_url, reg) {
    if (reg) setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000);
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
