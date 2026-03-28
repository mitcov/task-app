import React from 'react';
import { UserProfile } from './ProfileScreen';
import { THEMES, ThemeId } from '../types/theme';

interface Props {
  user: UserProfile;
  currentTheme: ThemeId;
  onThemeSelect: (id: ThemeId) => void;
  onSignOut: () => void;
  onClose: () => void;
}

export function UserMenu({ user, currentTheme, onThemeSelect, onSignOut, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Sheet */}
      <div
        className="relative w-full bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl border-t border-gray-100 dark:border-gray-800 p-6 pb-10"
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-5" />

        {/* User identity */}
        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl">{user.emoji}</span>
          <div>
            <p className="font-bold text-gray-900 dark:text-white text-base">{user.name}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Signed in</p>
          </div>
        </div>

        {/* Theme picker */}
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
          Theme
        </p>
        <div className="grid grid-cols-4 gap-3 mb-6">
          {THEMES.map(theme => {
            const isActive = theme.id === currentTheme;
            return (
              <button
                key={theme.id}
                onClick={() => onThemeSelect(theme.id)}
                className="flex flex-col items-center gap-1.5 group"
              >
                {/* Swatch */}
                <div
                  className={`w-full aspect-square rounded-2xl border-2 flex items-center justify-center transition-transform active:scale-95
                    ${isActive
                      ? 'border-gray-800 dark:border-white scale-105 shadow-md'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
                    }`}
                  style={{ backgroundColor: theme.bgHex }}
                >
                  {/* Mini accent circle */}
                  <div
                    className="w-6 h-6 rounded-full shadow-sm"
                    style={{ backgroundColor: theme.accentHex }}
                  />
                </div>
                {/* Label */}
                <span
                  className={`text-xs font-medium transition-colors
                    ${isActive
                      ? 'text-gray-900 dark:text-white font-semibold'
                      : 'text-gray-500 dark:text-gray-400'
                    }`}
                >
                  {theme.name}
                </span>
                {/* Active indicator */}
                {isActive && (
                  <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300">✓</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Sign out */}
        <button
          onClick={onSignOut}
          className="w-full py-3 rounded-2xl border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
