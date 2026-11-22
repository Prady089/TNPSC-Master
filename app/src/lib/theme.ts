export type Theme = 'system' | 'light' | 'dark';

export function getTheme(): Theme {
  try {
    return (localStorage.getItem('theme') as Theme) || 'light';
  } catch {
    return 'light';
  }
}

export function applyTheme(t: Theme) {
  const root = document.documentElement;
  if (t === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', t);
  try {
    localStorage.setItem('theme', t);
  } catch {
    /* storage unavailable */
  }
}
