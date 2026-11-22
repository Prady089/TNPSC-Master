import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ');
}

export function Card({ children, className = '', as: As = 'div' }: { children: ReactNode; className?: string; as?: 'div' | 'section' | 'article' }) {
  // Only add default padding / background / border when the caller didn't set
  // their own, because conflicting Tailwind utilities resolve by stylesheet order.
  const has = (re: RegExp) => className.split(/\s+/).some((c) => re.test(c));
  return (
    <As className={cx('rounded-2xl',
      !has(/^p-/) && 'p-4',
      !has(/^bg-/) && 'bg-surface',
      !has(/^border-(0|none)$/) && 'border',
      !has(/^border-(?!0$|none$|dashed$|solid$)/) && 'border-line',
      className)}>
      {children}
    </As>
  );
}

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
const btn: Record<BtnVariant, string> = {
  primary: 'bg-brand text-brand-ink hover:opacity-90',
  secondary: 'bg-brand-soft text-brand hover:opacity-90',
  ghost: 'text-muted hover:bg-surface-2',
  danger: 'bg-bad-soft text-bad hover:opacity-90',
};
const btnBase = 'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 disabled:pointer-events-none';

export function Button({ variant = 'primary', className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }) {
  return <button {...p} className={cx(btnBase, btn[variant], className)} />;
}

export function LinkButton({ to, variant = 'primary', className, children }: { to: string; variant?: BtnVariant; className?: string; children: ReactNode }) {
  return (
    <Link to={to} className={cx(btnBase, btn[variant], className)}>
      {children}
    </Link>
  );
}

export function Bar({ value, tone = 'brand', className }: { value: number; tone?: 'brand' | 'good' | 'bad' | 'accent'; className?: string }) {
  const color = { brand: 'bg-brand', good: 'bg-good', bad: 'bg-bad', accent: 'bg-accent' }[tone];
  return (
    <div className={cx('h-2 w-full overflow-hidden rounded-full bg-surface-2', className)}>
      <div className={cx('h-full rounded-full transition-all', color)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm text-muted" role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-brand" />
      {label}
    </div>
  );
}

export function Empty({ title, children, icon }: { title: string; children?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      {icon && <div className="mb-1 text-muted">{icon}</div>}
      <p className="font-semibold">{title}</p>
      {children && <div className="max-w-sm text-sm text-muted">{children}</div>}
    </div>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return <div className="rounded-xl bg-bad-soft px-4 py-3 text-sm text-bad">{children}</div>;
}

export function Pill({ children, tone = 'muted' }: { children: ReactNode; tone?: 'muted' | 'brand' | 'accent' | 'good' | 'bad' }) {
  const t = {
    muted: 'bg-surface-2 text-muted',
    brand: 'bg-brand-soft text-brand',
    accent: 'bg-accent-soft text-accent',
    good: 'bg-good-soft text-good',
    bad: 'bg-bad-soft text-bad',
  }[tone];
  return <span className={cx('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', t)}>{children}</span>;
}

export function PageTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

/** Input styling without a width, for inline selects. */
export const inputBase =
  'rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/70 focus:border-brand focus:outline-none';
export const inputCls = `w-full ${inputBase}`;
