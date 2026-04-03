import React, { useState, useMemo } from 'react';
import {
  CreditCard, Benefit, MerchantMapping,
  BenefitCategory, CATEGORY_ICONS, CATEGORY_LABELS, CARD_COLORS,
} from '../types';
import { getBenefitStatus, getDaysLeft } from '../hooks/useCards';

interface Props {
  cards: CreditCard[];
  benefits: Benefit[];
  merchants: MerchantMapping[];
  onAddMerchant: (m: Omit<MerchantMapping, 'id'>) => Promise<MerchantMapping>;
  onDeleteMerchant: (id: string) => Promise<void>;
}

interface Recommendation {
  card: CreditCard;
  benefit: Benefit;
  daysLeft: number;
  remaining: number;
  score: number;
}

const CATEGORIES: BenefitCategory[] = ['dining', 'travel', 'streaming', 'shopping', 'transit', 'hotel', 'entertainment', 'other'];

function computeRecommendations(
  query: string,
  cards: CreditCard[],
  benefits: Benefit[],
): Recommendation[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const results: Recommendation[] = [];

  benefits.forEach(benefit => {
    if (!benefit.isActive) return;
    if (benefit.usedAmount >= benefit.amount) return; // fully used

    const status = getBenefitStatus(benefit);
    if (status === 'gray') return;

    const daysLeft = getDaysLeft(benefit);
    if (daysLeft < 0 && benefit.frequency !== 'one-time') return; // expired

    const card = cards.find(c => c.id === benefit.cardId);
    if (!card || !card.isActive) return;

    // Score: does query match benefit name, category, or card name?
    const benefitMatch = benefit.name.toLowerCase().includes(q);
    const categoryMatch = benefit.category.toLowerCase().includes(q) ||
      CATEGORY_LABELS[benefit.category].toLowerCase().includes(q);
    const cardMatch = card.name.toLowerCase().includes(q);

    if (!benefitMatch && !categoryMatch && !cardMatch) return;

    const remaining = benefit.amount - benefit.usedAmount;
    // Score: lower days left = more urgent (higher score for sorting)
    const urgencyBonus = daysLeft < 30 ? (30 - Math.max(0, daysLeft)) * 10 : 0;
    const score = remaining + urgencyBonus;

    results.push({ card, benefit, daysLeft, remaining, score });
  });

  return results.sort((a, b) => b.score - a.score);
}

export function RecommendationsView({ cards, benefits, merchants, onAddMerchant, onDeleteMerchant }: Props) {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<BenefitCategory | null>(null);
  const [showAddMerchant, setShowAddMerchant] = useState(false);
  const [newMerchantName, setNewMerchantName] = useState('');
  const [newMerchantCategory, setNewMerchantCategory] = useState<BenefitCategory>('dining');
  const [deletingMerchantId, setDeletingMerchantId] = useState<string | null>(null);

  const activeQuery = selectedCategory ? CATEGORY_LABELS[selectedCategory] : query;

  const recommendations = useMemo(
    () => computeRecommendations(activeQuery, cards, benefits),
    [activeQuery, cards, benefits]
  );

  const handleCategoryPick = (cat: BenefitCategory) => {
    setSelectedCategory(prev => prev === cat ? null : cat);
    setQuery('');
  };

  const handleSaveMerchant = async () => {
    if (!newMerchantName.trim()) return;
    await onAddMerchant({
      userId: '',  // api.ts injects userId via setCurrentUser
      merchantName: newMerchantName.trim(),
      category: newMerchantCategory,
      cardId: recommendations[0]?.card?.id,
    });
    setNewMerchantName('');
    setShowAddMerchant(false);
  };

  const statusColors = {
    green: { badge: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300', bar: 'bg-green-500' },
    amber: { badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300', bar: 'bg-amber-500' },
    red:   { badge: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300', bar: 'bg-red-500' },
    gray:  { badge: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400', bar: 'bg-gray-400' },
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Search */}
      <div>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">🔍</span>
          <input
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedCategory(null); }}
            placeholder="Where are you shopping?"
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Category quick-picks */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => handleCategoryPick(cat)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-colors ${
              selectedCategory === cat
                ? 'bg-accent text-white'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
            }`}
          >
            <span>{CATEGORY_ICONS[cat]}</span>
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Results */}
      {activeQuery ? (
        <>
          {recommendations.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-4xl mb-2">🤔</div>
              <p className="text-gray-500 dark:text-gray-400 font-medium">No matching credits found</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
                All credits for this category may be fully used or expired
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recommendations.map((rec, i) => {
                const status = getBenefitStatus(rec.benefit);
                const sc = statusColors[status];
                const cc = CARD_COLORS[rec.card.color];
                const progress = Math.min(1, rec.benefit.usedAmount / rec.benefit.amount);

                return (
                  <div
                    key={rec.benefit.id}
                    className={`bg-white dark:bg-gray-900 rounded-xl border-2 p-4 shadow-sm ${
                      i === 0 ? 'border-accent' : 'border-gray-100 dark:border-gray-800'
                    }`}
                  >
                    {i === 0 && (
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-xs font-bold text-accent uppercase tracking-wide">⭐ Best Pick</span>
                      </div>
                    )}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white text-sm">
                          {CATEGORY_ICONS[rec.benefit.category]} {rec.benefit.name}
                        </p>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border mt-1 ${cc.bg} ${cc.text} ${cc.border}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cc.dot}`} />
                          {rec.card.name}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xl font-bold text-gray-900 dark:text-white">${rec.remaining.toFixed(0)}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">remaining</p>
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mb-1">
                      <span>${rec.benefit.usedAmount.toFixed(0)} / ${rec.benefit.amount.toFixed(0)} used</span>
                      {rec.benefit.frequency !== 'one-time' && (
                        <span className={`font-medium px-1.5 py-0.5 rounded-full ${sc.badge}`}>
                          {rec.daysLeft > 0 ? `${rec.daysLeft}d left` : 'expired'}
                        </span>
                      )}
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${sc.bar}`} style={{ width: `${progress * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Save as merchant */}
          {recommendations.length > 0 && !showAddMerchant && (
            <button
              onClick={() => { setShowAddMerchant(true); setNewMerchantName(activeQuery); }}
              className="w-full py-2.5 rounded-xl border border-dashed border-accent text-accent text-sm font-medium hover:bg-accent/5 transition-colors"
            >
              + Save "{activeQuery}" as a saved merchant
            </button>
          )}
        </>
      ) : (
        /* Saved merchants */
        <div>
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
            Saved Merchants
          </p>
          {merchants.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 dark:text-gray-500 text-sm">
                Search for a merchant or category above, then save it for quick access
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {merchants.map(merchant => (
                <div
                  key={merchant.id}
                  className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span>{CATEGORY_ICONS[merchant.category]}</span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">{merchant.merchantName}</span>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{CATEGORY_LABELS[merchant.category]}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setQuery(merchant.merchantName); setSelectedCategory(null); }}
                      className="text-xs text-accent font-medium px-2 py-1 rounded-lg hover:bg-accent/10 transition-colors"
                    >
                      Search
                    </button>
                    {deletingMerchantId === merchant.id ? (
                      <button
                        onClick={async () => { await onDeleteMerchant(merchant.id); setDeletingMerchantId(null); }}
                        className="text-xs text-white bg-red-500 font-medium px-2 py-1 rounded-lg hover:bg-red-600 transition-colors"
                      >
                        Delete
                      </button>
                    ) : (
                      <button
                        onClick={() => setDeletingMerchantId(merchant.id)}
                        className="text-xs text-gray-400 dark:text-gray-500 font-medium px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add merchant form */}
      {showAddMerchant && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setShowAddMerchant(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl border-t border-gray-100 dark:border-gray-800 p-6 pb-10"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-5" />
            <h3 className="font-bold text-gray-900 dark:text-white mb-4">Save Merchant</h3>

            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Merchant name</label>
                <input
                  type="text"
                  value={newMerchantName}
                  onChange={e => setNewMerchantName(e.target.value)}
                  className="w-full px-3 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Category</label>
                <div className="grid grid-cols-4 gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setNewMerchantCategory(cat)}
                      className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl border-2 transition-all ${
                        newMerchantCategory === cat
                          ? 'border-accent bg-accent/5 dark:bg-accent/10'
                          : 'border-gray-100 dark:border-gray-800'
                      }`}
                    >
                      <span className="text-lg">{CATEGORY_ICONS[cat]}</span>
                      <span className={`text-[10px] font-medium ${newMerchantCategory === cat ? 'text-accent' : 'text-gray-500 dark:text-gray-400'}`}>
                        {CATEGORY_LABELS[cat]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleSaveMerchant}
              disabled={!newMerchantName.trim()}
              className="w-full py-3 rounded-2xl bg-accent text-white font-semibold hover:bg-accent-dark transition-colors disabled:opacity-40"
            >
              Save Merchant
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
