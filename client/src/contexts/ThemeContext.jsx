import { createContext, useContext, useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

const ThemeContext = createContext(null);

export const FONT_OPTIONS = [
  { id: 'inter',      label: 'Inter',         stack: '"Inter", sans-serif' },
  { id: 'space',      label: 'Space Grotesk',  stack: '"Space Grotesk", sans-serif' },
  { id: 'libre',      label: 'Libre Baskerville', stack: '"Libre Baskerville", serif' },
  { id: 'jetbrains',  label: 'JetBrains Mono', stack: '"JetBrains Mono", monospace' },
  { id: 'playfair',   label: 'Playfair Display', stack: '"Playfair Display", serif' },
  { id: 'nunito',     label: 'Nunito',          stack: '"Nunito", sans-serif' },
];

export const DEFAULT_THEME = {
  logoUrl: '',
  logoText: 'Focusverse',
  logoSub: 'Hub',
  accent: '#7c3aed',
  accentHover: '#6d28d9',
  bg: '#07070a',
  surface: '#0f0f14',
  surface2: '#16161e',
  border: '#1e1e2a',
  text: '#e2e2e8',
  textMuted: '#6b6b80',
  fontId: 'inter',
  sidebarWidth: '230',
  darkMode: true,
};

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `${r}, ${g}, ${b}`;
}

function applyTheme(theme) {
  const root = document.documentElement;
  const font = FONT_OPTIONS.find(f => f.id === theme.fontId) || FONT_OPTIONS[0];
  root.style.setProperty('--accent', theme.accent);
  root.style.setProperty('--accent-hover', theme.accentHover);
  root.style.setProperty('--accent-glow', `rgba(${hexToRgb(theme.accent)}, 0.2)`);
  root.style.setProperty('--bg', theme.bg);
  root.style.setProperty('--surface', theme.surface);
  root.style.setProperty('--surface-2', theme.surface2);
  root.style.setProperty('--border', theme.border);
  root.style.setProperty('--text', theme.text);
  root.style.setProperty('--text-muted', theme.textMuted);
  root.style.setProperty('--font-body', font.stack);
  root.style.setProperty('--sidebar-w', `${theme.sidebarWidth}px`);
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'theme'), snap => {
      if (snap.exists()) {
        const t = { ...DEFAULT_THEME, ...snap.data() };
        setTheme(t);
        applyTheme(t);
      } else {
        applyTheme(DEFAULT_THEME);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  async function saveTheme(updates) {
    const next = { ...theme, ...updates };
    setTheme(next);
    applyTheme(next);
    await setDoc(doc(db, 'config', 'theme'), next, { merge: true });
  }

  return (
    <ThemeContext.Provider value={{ theme, saveTheme, loading, FONT_OPTIONS }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
