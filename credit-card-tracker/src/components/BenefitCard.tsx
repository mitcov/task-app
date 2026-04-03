import React from 'react';
import { Benefit, CreditCard, BenefitStatus, CATEGORY_ICONS, CARD_COLORS } from '../types';
import { getBenefitStatus, getDaysLeft } from '../hooks/useCards';
import { format } from 'date-fns';

const STATUS_STYLES: Record<BenefitStatus, { card: string; badge: string; bar: string; text: string }> = {
  green: {
    card:  'border-green-200 dark:border-green-800 bg-white dark:bg-gray-900',
    badge: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    bar:   'bg-green-500',
    text:  'text-green-600 dark:text-green-400',
  },
  amber: {
    card:  'border-amber-200 dark:border-amber-800 bg-white dark:bg-gray-900',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
    bar:   'bg-amber-500',
    text:  'text-amber-600 dark:text-amber-400',
  },
  red: {
    card:  'border-red-200 dark:border-red-800 bg-white dark:bg-gray-900',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    bar:   'bg-red-500',
    text:  'text-red-600 dark:text-red-400',
  },
  gray: {
    card:  'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50',
    badge: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
    bar:   'bg-gray-400',
    text:  'text-gray-500 dark:text-gray-400',
  },
};

interface Props {
  benefit: Benefit;
  card?: CreditCard;
  onTap: () => void;
}

export function BenefitCard({ benefit, card, onTap }: Props) {
  const status = getBenefitStatus(benefit);
  const styles = STATUS_STYLES[status];
  const daysLeft = getDaysLeft(benefit);
  const remaining = benefit.amount - benefit.usedAmount;
  const progress = Math.min(1, benefit.usedAmount / benefit.amount);
  const cardColor = card ? CARD_COLORS[card.color] : CARD_COLORS.gray;

  function daysLabel() {
    if (benefit.frequency === 'one-time') return 'one-time';
    if (daysLeft < 0) return `${Math.abs(daysLeft)}d overdue`;
    if (daysLeft === 0) return 'resets today';
    return `${daysLeft}d left`;
  }

  return (
    <button
      onClick={onTap}
      className={`w-full text-left rounded-xl border-2 p-4 shadow-sm transition-all active:scale-[0.98] ${styles.card}`}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-base">{CATEGORY_ICONS[benefit.category]}</span>
            <span className="font-semibold text-gray-900 dark:text-white text-sm truncate">
              {benefit.name}
            </span>
          </div>
          {card && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cardColor.bg} ${cardColor.text} ${cardColor.border}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cardColor.dot}`} />
              {card.name}
            </span>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${styles.badge}`}>
            {daysLabel()}
          </span>
          {status === 'gray' && (
            <span className="text-xs text-gray-400 dark:text-gray-500">Used</span>
          )}
        </div>
      </div>

      {/* Amounts */}
      <div className="flex items-baseline justify-between mb-2">
        <span className={`text-2xl font-bold ${status !== 'gray' ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
          ${remaining.toFixed(0)}
          <span className="text-sm font-normal text-gray-400 dark:text-gray-500 ml-1">remaining</span>
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          ${benefit.usedAmount.toFixed(0)} / ${benefit.amount.toFixed(0)}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${styles.bar}`}
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </button>
  );
}
