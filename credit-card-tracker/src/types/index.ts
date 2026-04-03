export type Issuer = 'amex' | 'chase' | 'citi' | 'capital-one' | 'discover' | 'barclays' | 'wells-fargo' | 'other';
export type BenefitCategory = 'dining' | 'travel' | 'streaming' | 'shopping' | 'transit' | 'hotel' | 'entertainment' | 'other';
export type BenefitFrequency = 'monthly' | 'quarterly' | 'semi-annual' | 'annual' | 'one-time';
export type CardColor = 'blue' | 'purple' | 'green' | 'red' | 'orange' | 'yellow' | 'pink' | 'gray';

export const CATEGORY_ICONS: Record<BenefitCategory, string> = {
  dining: '🍽️',
  travel: '✈️',
  streaming: '📺',
  shopping: '🛍️',
  transit: '🚗',
  hotel: '🏨',
  entertainment: '🎭',
  other: '⭐',
};

export const CATEGORY_LABELS: Record<BenefitCategory, string> = {
  dining: 'Dining',
  travel: 'Travel',
  streaming: 'Streaming',
  shopping: 'Shopping',
  transit: 'Transit',
  hotel: 'Hotel',
  entertainment: 'Entertainment',
  other: 'Other',
};

export const ISSUER_LABELS: Record<Issuer, string> = {
  amex: 'American Express',
  chase: 'Chase',
  citi: 'Citi',
  'capital-one': 'Capital One',
  discover: 'Discover',
  barclays: 'Barclays',
  'wells-fargo': 'Wells Fargo',
  other: 'Other',
};

export const CARD_COLORS: Record<CardColor, { bg: string; text: string; border: string; dot: string }> = {
  blue:   { bg: 'bg-blue-100 dark:bg-blue-950',   text: 'text-blue-700 dark:text-blue-300',   border: 'border-blue-200 dark:border-blue-800',   dot: 'bg-blue-500' },
  purple: { bg: 'bg-purple-100 dark:bg-purple-950', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800', dot: 'bg-purple-500' },
  green:  { bg: 'bg-green-100 dark:bg-green-950',  text: 'text-green-700 dark:text-green-300',  border: 'border-green-200 dark:border-green-800',  dot: 'bg-green-500' },
  red:    { bg: 'bg-red-100 dark:bg-red-950',      text: 'text-red-700 dark:text-red-300',      border: 'border-red-200 dark:border-red-800',      dot: 'bg-red-500' },
  orange: { bg: 'bg-orange-100 dark:bg-orange-950', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-800', dot: 'bg-orange-500' },
  yellow: { bg: 'bg-yellow-100 dark:bg-yellow-950', text: 'text-yellow-700 dark:text-yellow-600', border: 'border-yellow-200 dark:border-yellow-800', dot: 'bg-yellow-500' },
  pink:   { bg: 'bg-pink-100 dark:bg-pink-950',    text: 'text-pink-700 dark:text-pink-300',    border: 'border-pink-200 dark:border-pink-800',    dot: 'bg-pink-500' },
  gray:   { bg: 'bg-gray-100 dark:bg-gray-800',    text: 'text-gray-700 dark:text-gray-300',    border: 'border-gray-200 dark:border-gray-700',    dot: 'bg-gray-500' },
};

export interface CreditCard {
  id: string;
  userId: string;
  name: string;
  issuer: Issuer;
  lastFour?: string;
  annualFee: number;
  color: CardColor;
  cardKey?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

export interface Benefit {
  id: string;
  cardId: string;
  userId: string;
  name: string;
  amount: number;
  usedAmount: number;
  frequency: BenefitFrequency;
  category: BenefitCategory;
  periodStart: string; // ISO date string
  notes?: string;
  source: 'manual' | 'scraped';
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface MerchantMapping {
  id: string;
  userId: string;
  merchantName: string;
  category: BenefitCategory;
  cardId?: string;
  notes?: string;
}

export interface YnabConnection {
  userId: string;
  budgetId?: string;
  accountMappings: Record<string, string>; // cardId -> ynabAccountId
  lastSyncedAt?: string;
}

export interface CardWithBenefits extends CreditCard {
  benefits: Benefit[];
}

export interface CardROI {
  card: CreditCard;
  totalAvailable: number;
  totalUsed: number;
  net: number;
  utilization: number;
}

export type BenefitStatus = 'green' | 'amber' | 'red' | 'gray';
