import axios from 'axios';
import { CreditCard, Benefit, MerchantMapping } from '../types';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';

let currentUserId = '';
export const setCurrentUser = (id: string) => { currentUserId = id; };

export const api = {
  // Cards
  getCards: async (): Promise<CreditCard[]> => {
    const { data } = await axios.get(`${API_BASE}/cards`, { params: { userId: currentUserId } });
    return data;
  },
  addCard: async (card: Omit<CreditCard, 'id' | 'createdAt'>): Promise<CreditCard> => {
    const { data } = await axios.post(`${API_BASE}/cards`, { ...card, userId: currentUserId });
    return data;
  },
  updateCard: async (id: string, updates: Partial<CreditCard>): Promise<CreditCard> => {
    const { data } = await axios.patch(`${API_BASE}/cards/${id}`, updates);
    return data;
  },
  deleteCard: async (id: string): Promise<void> => {
    await axios.delete(`${API_BASE}/cards/${id}`);
  },
  reorderCards: async (cardIds: string[]): Promise<void> => {
    await axios.post(`${API_BASE}/cards/reorder`, { cardIds });
  },

  // Benefits
  getBenefits: async (cardId?: string): Promise<Benefit[]> => {
    const { data } = await axios.get(`${API_BASE}/benefits`, {
      params: { userId: currentUserId, ...(cardId ? { cardId } : {}) },
    });
    return data;
  },
  addBenefit: async (benefit: Omit<Benefit, 'id' | 'createdAt'>): Promise<Benefit> => {
    const { data } = await axios.post(`${API_BASE}/benefits`, { ...benefit, userId: currentUserId });
    return data;
  },
  updateBenefit: async (id: string, updates: Partial<Benefit>): Promise<Benefit> => {
    const { data } = await axios.patch(`${API_BASE}/benefits/${id}`, updates);
    return data;
  },
  deleteBenefit: async (id: string): Promise<void> => {
    await axios.delete(`${API_BASE}/benefits/${id}`);
  },
  useBenefit: async (id: string, amount: number): Promise<Benefit> => {
    const { data } = await axios.post(`${API_BASE}/benefits/${id}/use`, { amount });
    return data;
  },
  resetBenefit: async (id: string): Promise<Benefit> => {
    const { data } = await axios.post(`${API_BASE}/benefits/${id}/reset`);
    return data;
  },

  // Recommendations
  getRecommendations: async (q: string): Promise<Array<{
    card: CreditCard;
    benefit: Benefit;
    daysLeft: number;
    remaining: number;
    score: number;
  }>> => {
    const { data } = await axios.get(`${API_BASE}/recommendations`, {
      params: { userId: currentUserId, q },
    });
    return data;
  },

  // Merchant mappings
  getMerchants: async (): Promise<MerchantMapping[]> => {
    const { data } = await axios.get(`${API_BASE}/merchants`, { params: { userId: currentUserId } });
    return data;
  },
  addMerchant: async (merchant: Omit<MerchantMapping, 'id'>): Promise<MerchantMapping> => {
    const { data } = await axios.post(`${API_BASE}/merchants`, { ...merchant, userId: currentUserId });
    return data;
  },
  deleteMerchant: async (id: string): Promise<void> => {
    await axios.delete(`${API_BASE}/merchants/${id}`);
  },

  // YNAB
  getYnabStatus: async (): Promise<{ connected: boolean; lastSyncedAt?: string; budgetId?: string }> => {
    const { data } = await axios.get(`${API_BASE}/ynab/status`, { params: { userId: currentUserId } });
    return data;
  },
  connectYnab: async (accessToken: string, budgetId: string): Promise<void> => {
    await axios.post(`${API_BASE}/ynab/connect`, { userId: currentUserId, accessToken, budgetId });
  },
  getYnabAccounts: async (): Promise<Array<{ id: string; name: string; type: string }>> => {
    const { data } = await axios.get(`${API_BASE}/ynab/accounts`, { params: { userId: currentUserId } });
    return data;
  },
  setYnabMapping: async (cardId: string, ynabAccountId: string): Promise<void> => {
    await axios.post(`${API_BASE}/ynab/mapping`, { userId: currentUserId, cardId, ynabAccountId });
  },
  syncYnab: async (): Promise<{ synced: number }> => {
    const { data } = await axios.post(`${API_BASE}/ynab/sync`, { userId: currentUserId });
    return data;
  },
  disconnectYnab: async (): Promise<void> => {
    await axios.delete(`${API_BASE}/ynab/connect`, { params: { userId: currentUserId } });
  },
};
