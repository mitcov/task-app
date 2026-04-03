import React, { useState } from 'react';
import { CardWithBenefits, CreditCard, Benefit, CardROI, CARD_COLORS, ISSUER_LABELS, CATEGORY_ICONS } from '../types';
import { getBenefitStatus, getDaysLeft } from '../hooks/useCards';
import { CardModal } from './CardModal';
import { BenefitModal } from './BenefitModal';
import { UseAmountModal } from './UseAmountModal';

interface Props {
  cardWithBenefits: CardWithBenefits;
  roi?: CardROI;
  allCards: CreditCard[];
  onUpdateCard: (id: string, updates: Partial<CreditCard>) => Promise<CreditCard>;
  onDeleteCard: (id: string) => Promise<void>;
  onAddBenefit: (benefit: Omit<Benefit, 'id' | 'userId' | 'createdAt'>) => Promise<Benefit>;
  onUpdateBenefit: (id: string, updates: Partial<Benefit>) => Promise<Benefit>;
  onDeleteBenefit: (id: string) => Promise<void>;
  onMarkUsed: (id: string, amount: number) => Promise<Benefit>;
  onResetPeriod: (id: string) => Promise<Benefit>;
}

export function CreditCardTile({
  cardWithBenefits: cwb, roi, allCards,
  onUpdateCard, onDeleteCard,
  onAddBenefit, onUpdateBenefit, onDeleteBenefit,
  onMarkUsed, onResetPeriod,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [showEditCard, setShowEditCard] = useState(false);
  const [showAddBenefit, setShowAddBenefit] = useState(false);
  const [editingBenefit, setEditingBenefit] = useState<Benefit | null>(null);
  const [selectedBenefit, setSelectedBenefit] = useState<Benefit | null>(null);

  const cc = CARD_COLORS[cwb.color];
  const netColor = roi && roi.net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400';

  return (
    <>
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        {/* Card header */}
        <button
          onClick={() => setExpanded(prev => !prev)}
          className="w-full p-4 flex items-center gap-3 text-left active:bg-gray-50 dark:active:bg-gray-800/50 transition-colors"
        >
          {/* Color strip */}
          <div className={`w-3 h-12 rounded-full ${cc.dot} shrink-0`} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900 dark:text-white">{cwb.name}</span>
              {cwb.lastFour && (
                <span className="text-xs text-gray-400 dark:text-gray-500">···{cwb.lastFour}</span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-xs text-gray-400 dark:text-gray-500">{ISSUER_LABELS[cwb.issuer]}</span>
              <span className="text-xs text-gray-300 dark:text-gray-600">·</span>
              <span className="text-xs text-gray-400 dark:text-gray-500">${cwb.annualFee}/yr</span>
              <span className="text-xs text-gray-300 dark:text-gray-600">·</span>
              <span className="text-xs text-gray-400 dark:text-gray-500">{cwb.benefits.length} credits</span>
            </div>
          </div>

          <div className="shrink-0 text-right">
            {roi && (
              <p className={`text-sm font-bold ${netColor}`}>
                {roi.net >= 0 ? '+' : ''}{roi.net.toFixed(0)}
              </p>
            )}
            <span className="text-gray-400 dark:text-gray-500 text-sm">{expanded ? '▲' : '▼'}</span>
          </div>
        </button>

        {/* ROI bar */}
        {roi && roi.totalAvailable > 0 && (
          <div className="px-4 pb-3">
            <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mb-1">
              <span>${roi.totalUsed.toFixed(0)} redeemed of ${roi.totalAvailable.toFixed(0)} available</span>
              <span>{Math.round(roi.utilization * 100)}%</span>
            </div>
            <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${roi.net >= 0 ? 'bg-green-500' : 'bg-amber-400'}`}
                style={{ width: `${Math.min(100, roi.utilization * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Expanded benefits list */}
        {expanded && (
          <div className="border-t border-gray-100 dark:border-gray-800">
            {cwb.benefits.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-sm text-gray-400 dark:text-gray-500">No benefits added yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
                {cwb.benefits.map(benefit => {
                  const status = getBenefitStatus(benefit);
                  const daysLeft = getDaysLeft(benefit);
                  const remaining = benefit.amount - benefit.usedAmount;
                  const progress = Math.min(1, benefit.usedAmount / benefit.amount);
                  const statusDot = { green: 'bg-green-500', amber: 'bg-amber-500', red: 'bg-red-500', gray: 'bg-gray-400' }[status];

                  return (
                    <button
                      key={benefit.id}
                      onClick={() => setSelectedBenefit(benefit)}
                      className="w-full px-4 py-3 flex items-center gap-3 text-left active:bg-gray-50 dark:active:bg-gray-800/50 transition-colors"
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${statusDot}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">{CATEGORY_ICONS[benefit.category]}</span>
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{benefit.name}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${statusDot}`} style={{ width: `${progress * 100}%` }} />
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">${remaining.toFixed(0)}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {benefit.frequency === 'one-time' ? 'one-time' : `${daysLeft > 0 ? daysLeft + 'd' : 'exp'}`}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Add benefit + Edit card row */}
            <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 flex gap-2">
              <button
                onClick={() => setShowAddBenefit(true)}
                className="flex-1 py-2 rounded-xl border border-dashed border-accent text-accent text-sm font-medium hover:bg-accent/5 transition-colors"
              >
                + Add benefit
              </button>
              <button
                onClick={() => setShowEditCard(true)}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Edit
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showEditCard && (
        <CardModal
          initialCard={cwb}
          onSave={async (updates) => {
            await onUpdateCard(cwb.id, updates);
            setShowEditCard(false);
          }}
          onDelete={async () => {
            await onDeleteCard(cwb.id);
            setShowEditCard(false);
          }}
          onClose={() => setShowEditCard(false)}
        />
      )}

      {showAddBenefit && (
        <BenefitModal
          cards={allCards}
          preselectedCardId={cwb.id}
          onSave={async (benefit) => {
            await onAddBenefit(benefit);
            setShowAddBenefit(false);
          }}
          onClose={() => setShowAddBenefit(false)}
        />
      )}

      {editingBenefit && (
        <BenefitModal
          cards={allCards}
          initialBenefit={editingBenefit}
          onSave={async (updates) => {
            await onUpdateBenefit(editingBenefit.id, updates);
            setEditingBenefit(null);
          }}
          onDelete={async () => {
            await onDeleteBenefit(editingBenefit.id);
            setEditingBenefit(null);
          }}
          onClose={() => setEditingBenefit(null)}
        />
      )}

      {selectedBenefit && (
        <UseAmountModal
          benefit={selectedBenefit}
          card={cwb}
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
    </>
  );
}
