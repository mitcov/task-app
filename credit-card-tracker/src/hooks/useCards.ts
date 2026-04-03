import { useState, useEffect, useCallback, useMemo } from 'react';
import { CreditCard, Benefit, MerchantMapping, CardWithBenefits, CardROI, BenefitStatus } from '../types';
import { api } from '../lib/api';
import { differenceInDays, addMonths, addDays, parseISO } from 'date-fns';

export function periodEnd(benefit: Benefit): Date {
  const start = parseISO(benefit.periodStart);
  switch (benefit.frequency) {
    case 'monthly':     return addMonths(start, 1);
    case 'quarterly':   return addMonths(start, 3);
    case 'semi-annual': return addMonths(start, 6);
    case 'annual':      return addMonths(start, 12);
    case 'one-time':    return addDays(start, 36500); // never expires
    default:            return addMonths(start, 1);
  }
}

export function getBenefitStatus(benefit: Benefit): BenefitStatus {
  if (benefit.usedAmount >= benefit.amount) return 'gray';
  if (benefit.frequency === 'one-time') return 'green';
  const daysLeft = differenceInDays(periodEnd(benefit), new Date());
  if (daysLeft < 0)   return 'red';
  if (daysLeft <= 7)  return 'red';
  if (daysLeft <= 30) return 'amber';
  return 'green';
}

export function getDaysLeft(benefit: Benefit): number {
  if (benefit.frequency === 'one-time') return 9999;
  return differenceInDays(periodEnd(benefit), new Date());
}

function computeCardROI(card: CreditCard, benefits: Benefit[]): CardROI {
  const cardBenefits = benefits.filter(b => b.cardId === card.id && b.isActive);
  const totalAvailable = cardBenefits.reduce((s, b) => s + b.amount, 0);
  const totalUsed = cardBenefits.reduce((s, b) => s + b.usedAmount, 0);
  const net = totalUsed - card.annualFee;
  const utilization = totalAvailable > 0 ? totalUsed / totalAvailable : 0;
  return { card, totalAvailable, totalUsed, net, utilization };
}

function urgencyScore(benefit: Benefit): number {
  if (benefit.usedAmount >= benefit.amount) return 9999; // push fully used to bottom
  const daysLeft = getDaysLeft(benefit);
  if (daysLeft < 0) return -1000 + daysLeft; // expired, most urgent
  return daysLeft; // fewer days = more urgent = lower number = sorts first
}

export function useCards(userId: string) {
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [merchants, setMerchants] = useState<MerchantMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      setError(null);
      const [c, b, m] = await Promise.all([api.getCards(), api.getBenefits(), api.getMerchants()]);
      setCards(c);
      setBenefits(b);
      setMerchants(m);
    } catch (e) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userId) fetchAll();
  }, [userId, fetchAll]);

  // Cards with their benefits attached
  const cardsWithBenefits = useMemo((): CardWithBenefits[] => {
    return cards.map(card => ({
      ...card,
      benefits: benefits.filter(b => b.cardId === card.id && b.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    }));
  }, [cards, benefits]);

  // Benefits sorted by urgency for dashboard
  const dashboardBenefits = useMemo(() => {
    return [...benefits]
      .filter(b => b.isActive)
      .sort((a, b) => urgencyScore(a) - urgencyScore(b));
  }, [benefits]);

  // ROI per card + overall
  const roiData = useMemo((): { perCard: CardROI[]; overall: CardROI } => {
    const perCard = cards.filter(c => c.isActive).map(c => computeCardROI(c, benefits));
    const totalAvailable = perCard.reduce((s, r) => s + r.totalAvailable, 0);
    const totalUsed = perCard.reduce((s, r) => s + r.totalUsed, 0);
    const totalFees = cards.filter(c => c.isActive).reduce((s, c) => s + c.annualFee, 0);
    return {
      perCard,
      overall: {
        card: { id: 'overall', name: 'All Cards' } as CreditCard,
        totalAvailable,
        totalUsed,
        net: totalUsed - totalFees,
        utilization: totalAvailable > 0 ? totalUsed / totalAvailable : 0,
      },
    };
  }, [cards, benefits]);

  // --- Card mutations ---
  const addCard = useCallback(async (card: Omit<CreditCard, 'id' | 'userId' | 'createdAt'>) => {
    const newCard = await api.addCard({ ...card, userId });
    setCards(prev => [...prev, newCard]);
    return newCard;
  }, [userId]);

  const updateCard = useCallback(async (id: string, updates: Partial<CreditCard>) => {
    const updated = await api.updateCard(id, updates);
    setCards(prev => prev.map(c => c.id === id ? updated : c));
    return updated;
  }, []);

  const deleteCard = useCallback(async (id: string) => {
    await api.deleteCard(id);
    setCards(prev => prev.filter(c => c.id !== id));
    setBenefits(prev => prev.filter(b => b.cardId !== id));
  }, []);

  // --- Benefit mutations ---
  const addBenefit = useCallback(async (benefit: Omit<Benefit, 'id' | 'userId' | 'createdAt'>) => {
    const newBenefit = await api.addBenefit({ ...benefit, userId });
    setBenefits(prev => [...prev, newBenefit]);
    return newBenefit;
  }, [userId]);

  const updateBenefit = useCallback(async (id: string, updates: Partial<Benefit>) => {
    const updated = await api.updateBenefit(id, updates);
    setBenefits(prev => prev.map(b => b.id === id ? updated : b));
    return updated;
  }, []);

  const deleteBenefit = useCallback(async (id: string) => {
    await api.deleteBenefit(id);
    setBenefits(prev => prev.filter(b => b.id !== id));
  }, []);

  const markBenefitUsed = useCallback(async (id: string, amount: number) => {
    const updated = await api.useBenefit(id, amount);
    setBenefits(prev => prev.map(b => b.id === id ? updated : b));
    return updated;
  }, []);

  const resetBenefitPeriod = useCallback(async (id: string) => {
    const updated = await api.resetBenefit(id);
    setBenefits(prev => prev.map(b => b.id === id ? updated : b));
    return updated;
  }, []);

  // --- Merchant mutations ---
  const addMerchant = useCallback(async (merchant: Omit<MerchantMapping, 'id'>) => {
    const newMerchant = await api.addMerchant(merchant);
    setMerchants(prev => [...prev, newMerchant]);
    return newMerchant;
  }, []);

  const deleteMerchant = useCallback(async (id: string) => {
    await api.deleteMerchant(id);
    setMerchants(prev => prev.filter(m => m.id !== id));
  }, []);

  return {
    cards, benefits, merchants,
    cardsWithBenefits, dashboardBenefits, roiData,
    loading, error,
    addCard, updateCard, deleteCard,
    addBenefit, updateBenefit, deleteBenefit,
    markBenefitUsed, resetBenefitPeriod,
    addMerchant, deleteMerchant,
    refetch: fetchAll,
  };
}
