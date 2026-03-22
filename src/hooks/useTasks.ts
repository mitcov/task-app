import { useState, useEffect, useCallback } from 'react';
import { Task, Category } from '../types';
import { api } from '../lib/notion';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getTasks();
      setTasks(data);
    } catch (e) {
      setError('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const groupByCategory = useCallback((): Category[] => {
    const map: Record<string, Task[]> = {};
    tasks.forEach(task => {
      if (!map[task.category]) map[task.category] = [];
      map[task.category].push(task);
    });
    return Object.entries(map)
      .map(([name, tasks]) => ({
        id: name,
        name,
        tasks: tasks.sort((a, b) => a.sortOrder - b.sortOrder),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [tasks]);

  const completeTask = useCallback(async (id: string) => {
    await api.updateTask(id, {
      status: 'Done',
      lastCompleted: new Date().toISOString(),
    });
    await fetchTasks();
  }, [fetchTasks]);

  const addTask = useCallback(async (task: Omit<Task, 'id'>) => {
    await api.addTask(task);
    await fetchTasks();
  }, [fetchTasks]);

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    await api.updateTask(id, updates);
    await fetchTasks();
  }, [fetchTasks]);

  const deleteTask = useCallback(async (id: string) => {
    await api.deleteTask(id);
    await fetchTasks();
  }, [fetchTasks]);

  const reorderTasks = useCallback(async (
    category: string,
    oldIndex: number,
    newIndex: number
  ) => {
    const categoryTasks = tasks
      .filter(t => t.category === category)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const reordered = [...categoryTasks];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    // Optimistic update
    const updatedIds = reordered.map(t => t.id);
    setTasks(prev => prev.map(t => {
      const idx = updatedIds.indexOf(t.id);
      return idx !== -1 ? { ...t, sortOrder: idx } : t;
    }));

    await api.reorderTasks(updatedIds, category);
  }, [tasks]);

  return {
    tasks,
    loading,
    error,
    categories: groupByCategory(),
    completeTask,
    addTask,
    updateTask,
    deleteTask,
    reorderTasks,
    refetch: fetchTasks,
  };
}
