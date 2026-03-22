import React, { useState } from 'react';

export type UserId = 'mitchell' | 'julia' | 'test';

export interface UserProfile {
  id: UserId;
  name: string;
  emoji: string;
  color: string;
  bgColor: string;
}

export const PROFILES: UserProfile[] = [
  {
    id: 'mitchell',
    name: 'Mitchell',
    emoji: '🥸',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
  },
  {
    id: 'julia',
    name: 'Julia',
    emoji: '👸🏼',
    color: 'text-pink-700',
    bgColor: 'bg-pink-50 border-pink-200 hover:bg-pink-100',
  },
];

export const TEST_PROFILE: UserProfile = {
  id: 'test',
  name: 'Test',
  emoji: '🧪',
  color: 'text-gray-700',
  bgColor: 'bg-gray-50 border-gray-200 hover:bg-gray-100',
};

interface Props {
  onSelect: (user: UserProfile) => void;
}

export function ProfileScreen({ onSelect }: Props) {
  const [showDev, setShowDev] = useState(false);
  const [devTaps, setDevTaps] = useState(0);

  const handleDevTap = () => {
    const next = devTaps + 1;
    setDevTaps(next);
    if (next >= 3) {
      setShowDev(true);
      setDevTaps(0);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center px-6">
      {/* App title */}
      <div className="text-center mb-12">
        <div className="text-5xl mb-4">📋</div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Just Do It</h1>
        <p className="text-gray-400 dark:text-gray-500 mt-2 text-sm">Who's checking in?</p>
      </div>

      {/* Profile cards */}
      <div className="flex gap-4 w-full max-w-xs">
        {PROFILES.map(profile => (
          <button
            key={profile.id}
            onClick={() => onSelect(profile)}
            className={`flex-1 flex flex-col items-center gap-3 p-6 rounded-3xl border-2 transition-all active:scale-95 shadow-sm ${profile.bgColor}`}
          >
            <span className="text-5xl">{profile.emoji}</span>
            <span className={`font-bold text-lg ${profile.color}`}>{profile.name}</span>
          </button>
        ))}
      </div>

      {/* Hidden dev button */}
      <div className="absolute bottom-8 right-8">
        {showDev ? (
          <button
            onClick={() => { onSelect(TEST_PROFILE); setShowDev(false); }}
            className="bg-gray-200 text-gray-500 text-xs font-mono px-3 py-2 rounded-xl border border-gray-300 hover:bg-gray-300 transition-colors"
          >
            🧪 dev
          </button>
        ) : (
          <button
            onClick={handleDevTap}
            className="w-8 h-8 rounded-full opacity-10 hover:opacity-20 transition-opacity bg-gray-400"
          />
        )}
      </div>
    </div>
  );
}
