import React, { useState } from 'react';
import { Benefit, BenefitCategory, BenefitFrequency, CreditCard, CATEGORY_ICONS, CATEGORY_LABELS } from '../types';
import { format } from 'date-fns';

const CATEGORIES: BenefitCategory[] = ['dining', 'travel', 'streaming', 'shopping', 'transit', 'hotel', 'entertainment', 'other'];
const FREQUENCIES: { value: BenefitFrequency; label: string }[] = [
  { value: 'monthly',     label: 'Monthly' },
  { value: 'quarterly',   label: 'Quarterly' },
  { value: 'semi-annual', label: '6-Month' },
  { value: 'annual',      label: 'Annual' },
  { value: 'one-time',    label: 'One-time' },
];

interface Props {
  cards: CreditCard[];
  initialBenefit?: Benefit;
  preselectedCardId?: string;
  onSave: (benefit: Omit<Benefit, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
}

export function BenefitModal({ cards, initialBenefit, preselectedCardId, onSave, onDelete, onClose }: Props) {
  const [name, setName] = useState(initialBenefit?.name ?? '');
  const [cardId, setCardId] = useState(initialBenefit?.cardId ?? preselectedCardId ?? cards[0]?.id ?? '');
  const [amount, setAmount] = useState(initialBenefit?.amount?.toString() ?? '');
  const [category, setCategory] = useState<BenefitCategory>(initialBenefit?.category ?? 'dining');
  const [frequency, setFrequency] = useState<BenefitFrequency>(initialBenefit?.frequency ?? 'monthly');
  const [periodStart, setPeriodStart] = useState(
    initialBenefit?.periodStart ?? format(new Date(), 'yyyy-MM-dd')
  );
  const [notes, setNotes] = useState(initialBenefit?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !cardId || !amount) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        cardId,
        amount: parseFloat(amount),
        usedAmount: initialBenefit?.usedAmount ?? 0,
        category,
        frequency,
        periodStart,
        notes: notes.trim() || undefined,
        source: 'manual',
        isActive: true,
        sortOrder: initialBenefit?.sortOrder ?? 0,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl border-t border-gray-100 dark:border-gray-800 p-6 pb-10 max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-5" />
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-5">
          {initialBenefit ? 'Edit Benefit' : 'Add Benefit'}
        </h2>

        <div className="space-y-4">
          {/* Card selector */}
          {cards.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Card</label>
              <select
                value={cardId}
                onChange={e => setCardId(e.target.value)}
                className="w-full px-3 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              >
                {cards.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Benefit name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Benefit name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Dining Credit"
              className="w-full px-3 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              autoFocus
            />
          </div>

          {/* Amount + Frequency */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Amount ($) <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                min="0.01"
                step="0.01"
                placeholder="120"
                className="w-full px-3 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Frequency</label>
              <select
                value={frequency}
                onChange={e => setFrequency(e.target.value as BenefitFrequency)}
                className="w-full px-3 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              >
                {FREQUENCIES.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</label>
            <div className="grid grid-cols-4 gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl border-2 transition-all text-center ${
                    category === cat
                      ? 'border-accent bg-accent/5 dark:bg-accent/10'
                      : 'border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700'
                  }`}
                >
                  <span className="text-xl">{CATEGORY_ICONS[cat]}</span>
                  <span className={`text-[10px] font-medium leading-tight ${
                    category === cat ? 'text-accent' : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {CATEGORY_LABELS[cat]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Period start */}
          {frequency !== 'one-time' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Current period started
              </label>
              <input
                type="date"
                value={periodStart}
                onChange={e => setPeriodStart(e.target.value)}
                className="w-full px-3 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Notes <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. $10/month at select restaurants"
              rows={2}
              className="w-full px-3 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 space-y-3">
          <button
            onClick={handleSave}
            disabled={saving || !name.trim() || !amount || !cardId}
            className="w-full py-3 rounded-2xl bg-accent text-white font-semibold hover:bg-accent-dark transition-colors disabled:opacity-40"
          >
            {saving ? 'Saving…' : initialBenefit ? 'Save Changes' : 'Add Benefit'}
          </button>

          {onDelete && !showDelete && (
            <button
              onClick={() => setShowDelete(true)}
              className="w-full py-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 text-sm text-red-500 font-medium hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            >
              Delete Benefit
            </button>
          )}

          {showDelete && (
            <div className="flex gap-2">
              <button onClick={() => setShowDelete(false)} className="flex-1 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                Cancel
              </button>
              <button onClick={onDelete} className="flex-1 py-2.5 rounded-2xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors">
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
