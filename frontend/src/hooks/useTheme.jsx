// src/hooks/useTheme.js
import { useEffect, useState } from 'react';

const DEFAULT_THEME = 'light';
const ALTERNATE_THEME = 'dark';

export default function useTheme() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || DEFAULT_THEME;
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === DEFAULT_THEME ? ALTERNATE_THEME : DEFAULT_THEME));
  };

  return { theme, toggleTheme };
}
