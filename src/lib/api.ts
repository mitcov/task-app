import axios from 'axios';
import { Task, Category, DaySection, SectionAssignment, SectionTemplate } from '../types';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';

let currentUserId = '';
export const setCurrentUser = (id: string) => { currentUserId = id; };

export const api = {
  // Tasks
  getTasks: async (): Promise<Task[]> => {
    const { data } = await axios.get(`${API_BASE}/tasks`, { params: { userId: currentUserId } });
    return data;
  },
  addTask: async (task: Omit<Task, 'id'>): Promise<Task> => {
    const { data } = await axios.post(`${API_BASE}/tasks`, { ...task, userId: currentUserId });
    return data;
  },
  updateTask: async (id: string, updates: Partial<Task>): Promise<Task> => {
    const { data } = await axios.patch(`${API_BASE}/tasks/${id}`, updates);
    return data;
  },
  deleteTask: async (id: string): Promise<void> => {
    await axios.delete(`${API_BASE}/tasks/${id}`);
  },
  reorderTasks: async (taskIds: string[]): Promise<void> => {
    await axios.post(`${API_BASE}/tasks/reorder`, { taskIds });
  },

  // Categories
  getCategories: async (): Promise<Omit<Category, 'tasks'>[]> => {
    const { data } = await axios.get(`${API_BASE}/categories`, { params: { userId: currentUserId } });
    return data;
  },
  addCategory: async (cat: { name: string; color: string; sortOrder: number }): Promise<Omit<Category, 'tasks'>> => {
    const { data } = await axios.post(`${API_BASE}/categories`, { ...cat, userId: currentUserId });
    return data;
  },
  updateCategory: async (id: string, updates: Partial<Category>): Promise<Omit<Category, 'tasks'>> => {
    const { data } = await axios.patch(`${API_BASE}/categories/${id}`, updates);
    return data;
  },
  deleteCategory: async (id: string): Promise<void> => {
    await axios.delete(`${API_BASE}/categories/${id}`);
  },
  reorderCategories: async (categoryIds: string[]): Promise<void> => {
    await axios.post(`${API_BASE}/categories/reorder`, { categoryIds });
  },

  // Push
  subscribe: async (userId: string, subscription: PushSubscription): Promise<void> => {
    await axios.post(`${API_BASE}/subscribe`, { userId, subscription });
  },
  unsubscribe: async (userId: string): Promise<void> => {
    await axios.post(`${API_BASE}/unsubscribe`, { userId });
  },

  // Upcoming
  getUpcoming: async (date: string): Promise<{ sections: DaySection[]; assignments: SectionAssignment[] }> => {
    const { data } = await axios.get(`${API_BASE}/upcoming`, { params: { userId: currentUserId, date } });
    return data;
  },
  createDaySection: async (date: string, title: string, sortOrder: number): Promise<DaySection> => {
    const { data } = await axios.post(`${API_BASE}/day-sections`, { userId: currentUserId, date, title, sortOrder });
    return data;
  },
  updateDaySection: async (id: string, updates: Partial<DaySection>): Promise<DaySection> => {
    const { data } = await axios.patch(`${API_BASE}/day-sections/${id}`, updates);
    return data;
  },
  deleteDaySection: async (id: string): Promise<void> => {
    await axios.delete(`${API_BASE}/day-sections/${id}`);
  },
  reorderDaySections: async (sectionIds: string[]): Promise<void> => {
    await axios.post(`${API_BASE}/day-sections/reorder`, { sectionIds });
  },
  assignToSection: async (taskId: string, sectionId: string | null, date: string, sortOrder: number): Promise<void> => {
    await axios.post(`${API_BASE}/section-assignments`, { taskId, sectionId, userId: currentUserId, date, sortOrder });
  },
  deleteAssignment: async (id: string): Promise<void> => {
    await axios.delete(`${API_BASE}/section-assignments/${id}`);
  },
  reorderAssignments: async (assignments: { taskId: string; sectionId: string | null; date: string; sortOrder: number }[]): Promise<void> => {
    await axios.post(`${API_BASE}/section-assignments/reorder`, { assignments: assignments.map(a => ({ ...a, userId: currentUserId })) });
  },
  getSectionTemplates: async (): Promise<SectionTemplate[]> => {
    const { data } = await axios.get(`${API_BASE}/section-templates`, { params: { userId: currentUserId } });
    return data;
  },
  createSectionTemplate: async (title: string): Promise<SectionTemplate> => {
    const { data } = await axios.post(`${API_BASE}/section-templates`, { userId: currentUserId, title });
    return data;
  },
  deleteSectionTemplate: async (id: string): Promise<void> => {
    await axios.delete(`${API_BASE}/section-templates/${id}`);
  },
};
