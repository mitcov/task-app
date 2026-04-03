import React from 'react';
import { THEMES, ThemeId } from '../types/theme';

interface Props {
  displayName: string;
  currentTheme: ThemeId;
  onThemeSelect: (id: ThemeId) => void;
  onSignOut: () => void;
  onClose: () => void;
}

export function UserMenu({ displayName, currentTheme, onThemeSelect, onSignOut, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="relative w-full bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl border-t border-gray-100 dark:border-gray-800 p-6 pb-10"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-5" />

        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl">💳</span>
          <div>
            <p className="font-bold text-gray-900 dark:text-white text-base">{displayName}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Signed in</p>
          </div>
        </div>

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
                <div
                  className={`w-full aspect-square rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-transform active:scale-95 overflow-hidden
                    ${isActive
                      ? 'border-gray-800 dark:border-white scale-105 shadow-md'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
                    }`}
                  style={{ backgroundColor: theme.bgHex }}
                >
                  <span
                    className="text-lg font-bold leading-none"
                    style={{ fontFamily: theme.fontFamily, color: theme.textHex }}
                  >
                    Aa
                  </span>
                  <div className="w-4 h-1.5 rounded-full" style={{ backgroundColor: theme.accentHex }} />
                </div>
                <span
                  className={`text-xs font-medium transition-colors leading-tight text-center ${
                    isActive ? 'text-gray-900 dark:text-white font-semibold' : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {theme.name}
                </span>
                <span
                  className="text-[10px] text-gray-400 dark:text-gray-600 -mt-1 leading-none"
                  style={{ fontFamily: theme.fontFamily }}
                >
                  {theme.fontLabel}
                </span>
              </button>
            );
          })}
        </div>

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
