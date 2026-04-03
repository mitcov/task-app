import React, { useState, useEffect } from 'react';
import { setCurrentUser } from './lib/api';
import { useTheme } from './hooks/useTheme';
import { useCards, getBenefitStatus } from './hooks/useCards';
import { DashboardView } from './components/DashboardView';
import { CardsView } from './components/CardsView';
import { RecommendationsView } from './components/RecommendationsView';
import { CardModal } from './components/CardModal';
import { BenefitModal } from './components/BenefitModal';
import { UserMenu } from './components/UserMenu';

type Tab = 'dashboard' | 'cards' | 'recommendations';

const USER_KEY = 'credit_tracker_user';

function LoginScreen({ onLogin }: { onLogin: (name: string) => void }) {
  const [name, setName] = useState('');
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">💳</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Credits Tracker</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Track your credit card benefits</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Your name
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && name.trim() && onLogin(name.trim())}
            placeholder="e.g. Mitchell"
            className="w-full px-3 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent mb-4"
            autoFocus
          />
          <button
            onClick={() => name.trim() && onLogin(name.trim())}
            disabled={!name.trim()}
            className="w-full py-3 rounded-xl bg-accent text-white font-semibold hover:bg-accent-dark transition-colors disabled:opacity-40"
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [userId, setUserId] = useState<string | undefined>(() => {
    return localStorage.getItem(USER_KEY) || undefined;
  });
  const [tab, setTab] = useState<Tab>('dashboard');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
  const [showAddBenefit, setShowAddBenefit] = useState(false);

  const { themeId, theme, selectTheme } = useTheme(userId);

  const cardsHook = useCards(userId || '');

  useEffect(() => {
    if (userId) {
      setCurrentUser(userId);
    }
  }, [userId]);

  const handleLogin = (name: string) => {
    const id = name.toLowerCase().replace(/\s+/g, '_');
    localStorage.setItem(USER_KEY, id);
    setCurrentUser(id);
    setUserId(id);
  };

  const handleSignOut = () => {
    localStorage.removeItem(USER_KEY);
    setUserId(undefined);
    setShowUserMenu(false);
  };

  if (!userId) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const displayName = userId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  const userEmoji = '💳';

  // Badge count: benefits with red/amber status
  const badgeCount = cardsHook.dashboardBenefits.filter(b => {
    const status = getBenefitStatus(b);
    return status === 'red' || status === 'amber';
  }).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-5 pt-6 pb-4 sticky top-0 z-40">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setShowUserMenu(true)}
              className="flex items-center gap-2 active:opacity-70 transition-opacity"
            >
              <span className="text-2xl">{userEmoji}</span>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">💳 Credits</h1>
            </button>
            <div className="flex gap-2 items-center">
              {tab === 'cards' && (
                <button
                  onClick={() => setShowAddCard(true)}
                  className="bg-accent text-white w-9 h-9 rounded-full text-xl font-light flex items-center justify-center shadow-sm hover:bg-accent-dark transition-colors active:scale-95"
                >
                  +
                </button>
              )}
              {tab === 'dashboard' && (
                <button
                  onClick={() => setShowAddBenefit(true)}
                  className="bg-accent text-white w-9 h-9 rounded-full text-xl font-light flex items-center justify-center shadow-sm hover:bg-accent-dark transition-colors active:scale-95"
                >
                  +
                </button>
              )}
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
            {([
              ['dashboard', 'Dashboard'],
              ['cards', 'Cards'],
              ['recommendations', 'Recommend'],
            ] as [Tab, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors relative ${
                  tab === key
                    ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {label}
                {key === 'dashboard' && badgeCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {badgeCount > 9 ? '9+' : badgeCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-4">
        {tab === 'dashboard' && (
          <DashboardView
            cards={cardsHook.cards}
            benefits={cardsHook.dashboardBenefits}
            roiData={cardsHook.roiData}
            onMarkUsed={cardsHook.markBenefitUsed}
            onResetPeriod={cardsHook.resetBenefitPeriod}
            onEditBenefit={(benefit) => {/* handled in BenefitModal */}}
          />
        )}
        {tab === 'cards' && (
          <CardsView
            cardsWithBenefits={cardsHook.cardsWithBenefits}
            roiData={cardsHook.roiData.perCard}
            onUpdateCard={cardsHook.updateCard}
            onDeleteCard={cardsHook.deleteCard}
            onAddBenefit={cardsHook.addBenefit}
            onUpdateBenefit={cardsHook.updateBenefit}
            onDeleteBenefit={cardsHook.deleteBenefit}
            onMarkUsed={cardsHook.markBenefitUsed}
            onResetPeriod={cardsHook.resetBenefitPeriod}
          />
        )}
        {tab === 'recommendations' && (
          <RecommendationsView
            cards={cardsHook.cards}
            benefits={cardsHook.benefits}
            merchants={cardsHook.merchants}
            onAddMerchant={cardsHook.addMerchant}
            onDeleteMerchant={cardsHook.deleteMerchant}
          />
        )}
      </div>

      {/* Modals */}
      {showUserMenu && (
        <UserMenu
          displayName={displayName}
          currentTheme={themeId}
          onThemeSelect={selectTheme}
          onSignOut={handleSignOut}
          onClose={() => setShowUserMenu(false)}
        />
      )}
      {showAddCard && (
        <CardModal
          onSave={async (card) => { await cardsHook.addCard(card); setShowAddCard(false); }}
          onClose={() => setShowAddCard(false)}
        />
      )}
      {showAddBenefit && (
        <BenefitModal
          cards={cardsHook.cards}
          onSave={async (benefit) => { await cardsHook.addBenefit(benefit); setShowAddBenefit(false); }}
          onClose={() => setShowAddBenefit(false)}
        />
      )}
    </div>
  );
}
