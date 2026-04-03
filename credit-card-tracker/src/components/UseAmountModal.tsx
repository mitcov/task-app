import React, { useState } from 'react';
import { Benefit, CreditCard, CATEGORY_ICONS } from '../types';
import { getBenefitStatus, getDaysLeft } from '../hooks/useCards';

interface Props {
  benefit: Benefit;
  card?: CreditCard;
  onMarkUsed: (amount: number) => Promise<void>;
  onReset: () => Promise<void>;
  onEdit: () => void;
  onClose: () => void;
}

export function UseAmountModal({ benefit, card, onMarkUsed, onReset, onEdit, onClose }: Props) {
  const remaining = benefit.amount - benefit.usedAmount;
  const [amount, setAmount] = useState(remaining > 0 ? remaining.toFixed(2) : '0');
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const status = getBenefitStatus(benefit);
  const daysLeft = getDaysLeft(benefit);
  const progress = Math.min(1, benefit.usedAmount / benefit.amount);

  const handleSave = async () => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return;
    setSaving(true);
    try {
      await onMarkUsed(val);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      await onReset();
    } finally {
      setResetting(false);
    }
  };

  const statusBar = {
    green: 'bg-green-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    gray: 'bg-gray-400',
  }[status];

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl border-t border-gray-100 dark:border-gray-800 p-6 pb-10"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-5" />

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">{CATEGORY_ICONS[benefit.category]}</span>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{benefit.name}</h2>
            </div>
            {card && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{card.name}</p>
            )}
          </div>
          <button onClick={onEdit} className="text-xs text-accent font-medium px-2 py-1 rounded-lg hover:bg-accent/10 transition-colors">
            Edit
          </button>
        </div>

        {/* Used / total + progress */}
        <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-1.5">
          <span>${benefit.usedAmount.toFixed(2)} used</span>
          <span>${benefit.amount.toFixed(2)} total</span>
        </div>
        <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-1">
          <div className={`h-full rounded-full transition-all ${statusBar}`} style={{ width: `${progress * 100}%` }} />
        </div>
        <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mb-5">
          <span className="font-semibold text-gray-700 dark:text-gray-300">${remaining.toFixed(2)} remaining</span>
          {benefit.frequency !== 'one-time' && (
            <span>{daysLeft > 0 ? `${daysLeft} days until reset` : 'Period ended'}</span>
          )}
        </div>

        {remaining > 0 && (
          <>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Mark as used ($)
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                min="0.01"
                max={remaining}
                step="0.01"
                className="flex-1 px-3 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              />
              <button
                onClick={() => setAmount(remaining.toFixed(2))}
                className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
              >
                Full
              </button>
            </div>

            {/* Quick amounts */}
            {[5, 10, 15, 25].filter(n => n <= remaining).length > 0 && (
              <div className="flex gap-2 mb-5">
                {[5, 10, 15, 25].filter(n => n <= remaining).map(n => (
                  <button
                    key={n}
                    onClick={() => setAmount(n.toFixed(2))}
                    className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    ${n}
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={saving || parseFloat(amount) <= 0 || isNaN(parseFloat(amount))}
              className="w-full py-3 rounded-2xl bg-accent text-white font-semibold hover:bg-accent-dark transition-colors disabled:opacity-40 mb-3"
            >
              {saving ? 'Saving…' : 'Save Usage'}
            </button>
          </>
        )}

        {/* Reset period */}
        {!showResetConfirm ? (
          <button
            onClick={() => setShowResetConfirm(true)}
            className="w-full py-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Reset Period
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setShowResetConfirm(false)}
              className="flex-1 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleReset}
              disabled={resetting}
              className="flex-1 py-2.5 rounded-2xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-40"
            >
              {resetting ? 'Resetting…' : 'Confirm Reset'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
