import axios from 'axios';
import { Task } from '../types';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';
console.log('API_BASE:', API_BASE);

export const api = {
  getTasks: async (): Promise<Task[]> => {
    const { data } = await axios.get(`${API_BASE}/tasks`);
    return data;
  },

  addTask: async (task: Omit<Task, 'id'>): Promise<Task> => {
    const { data } = await axios.post(`${API_BASE}/tasks`, task);
    return data;
  },

  updateTask: async (id: string, updates: Partial<Task>): Promise<Task> => {
    const { data } = await axios.patch(`${API_BASE}/tasks/${id}`, updates);
    return data;
  },

  deleteTask: async (id: string): Promise<void> => {
    await axios.delete(`${API_BASE}/tasks/${id}`);
  },

  reorderTasks: async (taskIds: string[], category: string): Promise<void> => {
    await axios.post(`${API_BASE}/tasks/reorder`, { taskIds, category });
  },
};
