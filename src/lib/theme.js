export const THEMES = [
  {
    id: 'dark',
    name: 'Dark',
    mode: 'dark',
    vars: {
      '--bg':     '#040c1c',
      '--sf':     '#08111f',
      '--sf2':    '#0c1828',
      '--sf3':    '#101f33',
      '--panel':  '#030810',
      '--panel2': '#040c1c',
      '--panel3': '#08111f',
      '--tx':     '#f0f4ff',
      '--tx2':    '#f0f4ff',
      '--tx3':    '#c8d8ee',
      '--tx4':    '#8090a8',
      '--bdr':    'rgba(255,255,255,.12)',
      '--bdr2':   'rgba(255,255,255,.20)',
    },
  },
  {
    id: 'light',
    name: 'Light',
    mode: 'light',
    vars: {
      '--bg':     '#ffffff',
      '--sf':     '#ffffff',
      '--sf2':    '#f0f4fa',
      '--sf3':    '#e4ecf6',
      '--panel':  '#ffffff',
      '--panel2': '#f0f4fa',
      '--panel3': '#e4ecf6',
      '--tx':     '#0a1a30',
      '--tx2':    '#1e3a6a',
      '--tx3':    '#4a6888',
      '--tx4':    '#7898b8',
      '--bdr':    'rgba(26,47,85,.22)',
      '--bdr2':   'rgba(26,47,85,.38)',
    },
  },
];

const ALL_VARS = [...new Set(THEMES.flatMap(t => Object.keys(t.vars)))];

export function applyTheme(themeId) {
  const theme = THEMES.find(t => t.id === themeId) || THEMES[0];
  const root  = document.documentElement;
  ALL_VARS.forEach(k => root.style.removeProperty(k));
  Object.entries(theme.vars).forEach(([k, v]) => root.style.setProperty(k, v));
  root.setAttribute('data-theme', theme.mode);
  try {
    localStorage.setItem('bb-color-theme', themeId);
    window.setTheme?.(theme.mode);
  } catch {}
}

export function getSavedTheme() {
  try { return localStorage.getItem('bb-color-theme') || 'dark'; } catch { return 'dark'; }
}
