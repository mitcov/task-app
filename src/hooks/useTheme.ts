import { useState, useEffect } from 'react';
import { ThemeId, THEMES } from '../types/theme';
import { UserId } from '../components/ProfileScreen';

function storageKey(userId: UserId) {
  return `task_app_theme_${userId}`;
}

function applyThemeToDOM(themeId: ThemeId) {
  const theme = THEMES.find(t => t.id === themeId)!;
  const root = document.documentElement;
  root.setAttribute('data-theme', themeId);
  if (theme.dark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

function loadSavedTheme(userId: UserId): ThemeId {
  const saved = localStorage.getItem(storageKey(userId));
  const validIds = THEMES.map(t => t.id);
  return (validIds.includes(saved as ThemeId) ? saved : 'classic') as ThemeId;
}

export function useTheme(userId: UserId | undefined) {
  const [themeId, setThemeId] = useState<ThemeId>(() => {
    if (!userId) return 'classic';
    const id = loadSavedTheme(userId);
    applyThemeToDOM(id);
    return id;
  });

  // When the logged-in user changes, reload their saved theme
  useEffect(() => {
    if (!userId) {
      applyThemeToDOM('classic');
      setThemeId('classic');
      return;
    }
    const id = loadSavedTheme(userId);
    setThemeId(id);
    applyThemeToDOM(id);
  }, [userId]);

  const selectTheme = (id: ThemeId) => {
    setThemeId(id);
    applyThemeToDOM(id);
    if (userId) {
      localStorage.setItem(storageKey(userId), id);
    }
  };

  const currentTheme = THEMES.find(t => t.id === themeId)!;

  return { themeId, theme: currentTheme, selectTheme };
}
