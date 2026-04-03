import React, { useState } from 'react';
import { CreditCard, CardColor, Issuer, CARD_COLORS, ISSUER_LABELS } from '../types';

const COLORS: CardColor[] = ['blue', 'purple', 'green', 'red', 'orange', 'yellow', 'pink', 'gray'];
const ISSUERS: Issuer[] = ['amex', 'chase', 'citi', 'capital-one', 'discover', 'barclays', 'wells-fargo', 'other'];

interface Props {
  initialCard?: CreditCard;
  onSave: (card: Omit<CreditCard, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
}

export function CardModal({ initialCard, onSave, onDelete, onClose }: Props) {
  const [name, setName] = useState(initialCard?.name ?? '');
  const [issuer, setIssuer] = useState<Issuer>(initialCard?.issuer ?? 'amex');
  const [lastFour, setLastFour] = useState(initialCard?.lastFour ?? '');
  const [annualFee, setAnnualFee] = useState(initialCard?.annualFee?.toString() ?? '0');
  const [color, setColor] = useState<CardColor>(initialCard?.color ?? 'blue');
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        issuer,
        lastFour: lastFour.trim() || undefined,
        annualFee: parseFloat(annualFee) || 0,
        color,
        isActive: true,
        sortOrder: 0,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl border-t border-gray-100 dark:border-gray-800 p-6 pb-10 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-5" />
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-5">
          {initialCard ? 'Edit Card' : 'Add Card'}
        </h2>

        <div className="space-y-4">
          {/* Card name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Card name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Amex Gold Card"
              className="w-full px-3 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              autoFocus
            />
          </div>

          {/* Issuer */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Issuer</label>
            <select
              value={issuer}
              onChange={e => setIssuer(e.target.value as Issuer)}
              className="w-full px-3 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
            >
              {ISSUERS.map(i => (
                <option key={i} value={i}>{ISSUER_LABELS[i]}</option>
              ))}
            </select>
          </div>

          {/* Last four + Annual fee */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Last 4 digits</label>
              <input
                type="text"
                value={lastFour}
                onChange={e => setLastFour(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="1234"
                maxLength={4}
                className="w-full px-3 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Annual fee ($)</label>
              <input
                type="number"
                value={annualFee}
                onChange={e => setAnnualFee(e.target.value)}
                min="0"
                step="1"
                placeholder="0"
                className="w-full px-3 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              />
            </div>
          </div>

          {/* Color picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Color</label>
            <div className="grid grid-cols-8 gap-2">
              {COLORS.map(c => {
                const cc = CARD_COLORS[c];
                return (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-full aspect-square rounded-lg border-2 transition-all ${cc.dot.replace('bg-', 'bg-')} ${
                      color === c ? 'border-gray-800 dark:border-white scale-110 shadow-sm' : 'border-transparent hover:scale-105'
                    }`}
                    style={{}}
                  >
                    <div className={`w-full h-full rounded-md ${cc.dot}`} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 space-y-3">
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="w-full py-3 rounded-2xl bg-accent text-white font-semibold hover:bg-accent-dark transition-colors disabled:opacity-40"
          >
            {saving ? 'Saving…' : initialCard ? 'Save Changes' : 'Add Card'}
          </button>

          {onDelete && !showDelete && (
            <button
              onClick={() => setShowDelete(true)}
              className="w-full py-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 text-sm text-red-500 font-medium hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            >
              Delete Card
            </button>
          )}

          {showDelete && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowDelete(false)}
                className="flex-1 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onDelete}
                className="flex-1 py-2.5 rounded-2xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
