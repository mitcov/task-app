import React, { useState } from 'react';
import { Benefit, CreditCard, BenefitCategory, CardROI, CARD_COLORS, CATEGORY_ICONS, CATEGORY_LABELS } from '../types';
import { getBenefitStatus } from '../hooks/useCards';
import { BenefitCard } from './BenefitCard';
import { UseAmountModal } from './UseAmountModal';
import { BenefitModal } from './BenefitModal';

type SortMode = 'urgency' | 'card' | 'amount';
type FilterCategory = BenefitCategory | 'all';

interface Props {
  cards: CreditCard[];
  benefits: Benefit[];
  roiData: { perCard: CardROI[]; overall: CardROI };
  onMarkUsed: (id: string, amount: number) => Promise<Benefit>;
  onResetPeriod: (id: string) => Promise<Benefit>;
  onEditBenefit: (benefit: Benefit) => void;
}

export function DashboardView({ cards, benefits, roiData, onMarkUsed, onResetPeriod, onEditBenefit }: Props) {
  const [sortMode, setSortMode] = useState<SortMode>('urgency');
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');
  const [showROIBreakdown, setShowROIBreakdown] = useState(false);
  const [selectedBenefit, setSelectedBenefit] = useState<Benefit | null>(null);
  const [editingBenefit, setEditingBenefit] = useState<Benefit | null>(null);

  const { overall, perCard } = roiData;
  const totalFees = cards.filter(c => c.isActive).reduce((s, c) => s + c.annualFee, 0);

  // Filter
  let displayed = benefits;
  if (filterCategory !== 'all') {
    displayed = displayed.filter(b => b.category === filterCategory);
  }

  // Sort
  if (sortMode === 'card') {
    displayed = [...displayed].sort((a, b) => {
      const ca = cards.find(c => c.id === a.cardId);
      const cb = cards.find(c => c.id === b.cardId);
      return (ca?.name ?? '').localeCompare(cb?.name ?? '');
    });
  } else if (sortMode === 'amount') {
    displayed = [...displayed].sort((a, b) => (b.amount - b.usedAmount) - (a.amount - a.usedAmount));
  }

  // Available categories in current benefits
  const presentCategories = benefits.map(b => b.category).filter(
    (cat, i, arr) => arr.indexOf(cat) === i
  ) as BenefitCategory[];

  const netColor = overall.net >= 0
    ? 'text-green-600 dark:text-green-400'
    : 'text-red-500 dark:text-red-400';

  return (
    <div className="space-y-4 pb-8">
      {/* ROI Banner */}
      {cards.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          {/* Overall summary */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                Annual Value
              </span>
              <button
                onClick={() => setShowROIBreakdown(prev => !prev)}
                className="text-xs text-accent font-medium"
              >
                {showROIBreakdown ? 'Hide' : 'By card'} ›
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Fees paid</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">${totalFees.toFixed(0)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Redeemed</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">${overall.totalUsed.toFixed(0)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Net value</p>
                <p className={`text-lg font-bold ${netColor}`}>
                  {overall.net >= 0 ? '+' : ''}{overall.net.toFixed(0)}
                </p>
              </div>
            </div>
            {/* Overall utilization bar */}
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mb-1">
                <span>Credit utilization</span>
                <span>{Math.round(overall.utilization * 100)}%</span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all"
                  style={{ width: `${overall.utilization * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Per-card breakdown */}
          {showROIBreakdown && perCard.length > 0 && (
            <div className="border-t border-gray-100 dark:border-gray-800">
              {perCard.map(({ card, totalAvailable, totalUsed, net, utilization }) => {
                const cc = CARD_COLORS[card.color];
                const cardNet = totalUsed - card.annualFee;
                return (
                  <div key={card.id} className="px-4 py-3 border-b border-gray-50 dark:border-gray-800/50 last:border-b-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${cc.dot}`} />
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{card.name}</span>
                      </div>
                      <span className={`text-sm font-bold ${cardNet >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                        {cardNet >= 0 ? '+' : ''}${cardNet.toFixed(0)} net
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mb-1.5">
                      <span>Fee: ${card.annualFee}/yr · Redeemed: ${totalUsed.toFixed(0)} · Available: ${(totalAvailable - totalUsed).toFixed(0)}</span>
                    </div>
                    <div className="w-full h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${cardNet >= 0 ? 'bg-green-500' : 'bg-amber-500'}`}
                        style={{ width: `${Math.min(100, utilization * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Filters + Sort */}
      {benefits.length > 0 && (
        <div className="space-y-2">
          {/* Category filter chips */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
            <button
              onClick={() => setFilterCategory('all')}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filterCategory === 'all'
                  ? 'bg-accent text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
              }`}
            >
              All
            </button>
            {presentCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat === filterCategory ? 'all' : cat)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
                  filterCategory === cat
                    ? 'bg-accent text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
                }`}
              >
                <span>{CATEGORY_ICONS[cat]}</span>
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>

          {/* Sort row */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            {([['urgency', 'Urgency'], ['card', 'By card'], ['amount', 'By amount']] as [SortMode, string][]).map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => setSortMode(mode)}
                className={`flex-1 py-1 text-xs font-medium rounded-md transition-colors ${
                  sortMode === mode
                    ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Benefit cards */}
      {displayed.length === 0 ? (
        <div className="text-center py-16">
          {benefits.length === 0 ? (
            <>
              <div className="text-5xl mb-3">💳</div>
              <p className="text-gray-500 dark:text-gray-400 font-medium">No credits yet</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
                Add a card first, then add your benefits
              </p>
            </>
          ) : (
            <>
              <p className="text-gray-400 dark:text-gray-500">No {filterCategory} credits</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map(benefit => {
            const card = cards.find(c => c.id === benefit.cardId);
            return (
              <BenefitCard
                key={benefit.id}
                benefit={benefit}
                card={card}
                onTap={() => setSelectedBenefit(benefit)}
              />
            );
          })}
        </div>
      )}

      {/* UseAmountModal */}
      {selectedBenefit && (
        <UseAmountModal
          benefit={selectedBenefit}
          card={cards.find(c => c.id === selectedBenefit.cardId)}
          onMarkUsed={async (amount) => {
            await onMarkUsed(selectedBenefit.id, amount);
            setSelectedBenefit(null);
          }}
          onReset={async () => {
            await onResetPeriod(selectedBenefit.id);
            setSelectedBenefit(null);
          }}
          onEdit={() => {
            setEditingBenefit(selectedBenefit);
            setSelectedBenefit(null);
          }}
          onClose={() => setSelectedBenefit(null)}
        />
      )}

      {/* Edit benefit modal */}
      {editingBenefit && (
        <BenefitModal
          cards={cards}
          initialBenefit={editingBenefit}
          onSave={async () => { setEditingBenefit(null); }}
          onClose={() => setEditingBenefit(null)}
        />
      )}
    </div>
  );
}
