import React from 'react';
import { CardWithBenefits, CreditCard, Benefit, CardROI } from '../types';
import { CreditCardTile } from './CreditCardTile';

interface Props {
  cardsWithBenefits: CardWithBenefits[];
  roiData: CardROI[];
  onUpdateCard: (id: string, updates: Partial<CreditCard>) => Promise<CreditCard>;
  onDeleteCard: (id: string) => Promise<void>;
  onAddBenefit: (benefit: Omit<Benefit, 'id' | 'userId' | 'createdAt'>) => Promise<Benefit>;
  onUpdateBenefit: (id: string, updates: Partial<Benefit>) => Promise<Benefit>;
  onDeleteBenefit: (id: string) => Promise<void>;
  onMarkUsed: (id: string, amount: number) => Promise<Benefit>;
  onResetPeriod: (id: string) => Promise<Benefit>;
}

export function CardsView({
  cardsWithBenefits, roiData,
  onUpdateCard, onDeleteCard,
  onAddBenefit, onUpdateBenefit, onDeleteBenefit,
  onMarkUsed, onResetPeriod,
}: Props) {
  const allCards = cardsWithBenefits as CreditCard[];

  if (cardsWithBenefits.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-3">💳</div>
        <p className="text-gray-500 dark:text-gray-400 font-medium">No cards added yet</p>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
          Tap + to add your first credit card
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-8">
      {cardsWithBenefits.map(cwb => {
        const roi = roiData.find(r => r.card.id === cwb.id);
        return (
          <CreditCardTile
            key={cwb.id}
            cardWithBenefits={cwb}
            roi={roi}
            allCards={allCards}
            onUpdateCard={onUpdateCard}
            onDeleteCard={onDeleteCard}
            onAddBenefit={onAddBenefit}
            onUpdateBenefit={onUpdateBenefit}
            onDeleteBenefit={onDeleteBenefit}
            onMarkUsed={onMarkUsed}
            onResetPeriod={onResetPeriod}
          />
        );
      })}
    </div>
  );
}
