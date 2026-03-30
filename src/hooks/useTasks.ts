import { useState, useCallback, useRef, useMemo } from 'react';
import { format } from 'date-fns';
import { Task, Category } from '../types';
import { api } from '../lib/api';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Omit<Category, 'tasks'>[]>([]);
  const [loading, setLoading] = useState(true);
  const initialLoad = useRef(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      if (initialLoad.current) setLoading(true);
      const [tasksData, catsData] = await Promise.all([
        api.getTasks(),
        api.getCategories(),
      ]);
      setTasks(tasksData);
      setCategories(catsData);
      initialLoad.current = false;
    } catch (e: any) {
      setError(`Failed to load tasks: ${e?.message || JSON.stringify(e)}`);
    } finally {
      setLoading(false);
    }
  }, []); // stable — no dependencies needed since api functions don't change

  const groupedCategories = useMemo((): Category[] => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const taskMap: Record<string, Task[]> = {};
    tasks.forEach(task => {
      // Hide done tasks unless they were completed today (they fade in place until tomorrow)
      if (task.status === 'Done' && task.completedDate !== today) return;
      if (!taskMap[task.category]) taskMap[task.category] = [];
      taskMap[task.category].push(task);
    });

    // Merge stored categories with any categories derived from tasks
    const allCategoryNames = new Set([
      ...categories.map(c => c.name),
      ...tasks.map(t => t.category),
    ]);

    return Array.from(allCategoryNames).map(name => {
      const stored = categories.find(c => c.name === name);
      return {
        id: stored?.id || name,
        name,
        sortOrder: stored?.sortOrder ?? 999,
        color: stored?.color || 'Gray',
        tasks: (taskMap[name] || []).sort((a, b) => a.sortOrder - b.sortOrder),
      };
    }).sort((a, b) => a.sortOrder - b.sortOrder);
  }, [tasks, categories]);

  const completeTask = useCallback(async (id: string) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const updates = { status: 'Done' as const, lastCompleted: new Date().toISOString(), completedDate: today };
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    api.updateTask(id, updates).catch(() => fetchAll());
  }, [fetchAll]);

  const uncompleteTask = useCallback(async (id: string) => {
    const updates = { status: 'To Do' as const, lastCompleted: null, completedDate: null };
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    api.updateTask(id, updates).catch(() => fetchAll());
  }, [fetchAll]);

  const clearCompletedTasks = useCallback(async () => {
    const doneTasks = tasks.filter(t => t.status === 'Done');
    setTasks(prev => prev.filter(t => t.status !== 'Done'));
    Promise.all(doneTasks.map(t => api.deleteTask(t.id))).catch(() => fetchAll());
  }, [tasks, fetchAll]);

  const addTask = useCallback(async (task: Omit<Task, 'id'>) => {
    const newTask = await api.addTask(task);
    setTasks(prev => [...prev, newTask]);
  }, []);

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    api.updateTask(id, updates).catch(() => fetchAll());
  }, [fetchAll]);

  const deleteTask = useCallback(async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    api.deleteTask(id).catch(() => fetchAll());
  }, [fetchAll]);

  const reorderTasks = useCallback(async (
    activeId: string,
    overId: string,
    activeCategory: string,
    overCategory: string,
    allCats: Category[]
  ) => {
    const activeCatTasks = [...(allCats.find(c => c.name === activeCategory)?.tasks || [])];
    const overCatTasks = activeCategory === overCategory
      ? activeCatTasks
      : [...(allCats.find(c => c.name === overCategory)?.tasks || [])];

    if (activeCategory === overCategory) {
      const oldIndex = activeCatTasks.findIndex(t => t.id === activeId);
      const newIndex = activeCatTasks.findIndex(t => t.id === overId);
      const reordered = [...activeCatTasks];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);
      setTasks(prev => prev.map(t => {
        const idx = reordered.findIndex(r => r.id === t.id);
        return idx !== -1 ? { ...t, sortOrder: idx } : t;
      }));
      await api.reorderTasks(reordered.map(t => t.id));
    } else {
      // Moving to a different category
      const newOverTasks = [...overCatTasks];
      const overIndex = newOverTasks.findIndex(t => t.id === overId);
      newOverTasks.splice(overIndex >= 0 ? overIndex : newOverTasks.length, 0, { id: activeId } as Task);
      setTasks(prev => prev.map(t =>
        t.id === activeId ? { ...t, category: overCategory } : t
      ));
      Promise.all([
        api.updateTask(activeId, { category: overCategory }),
        api.reorderTasks(newOverTasks.map(t => t.id)),
      ]).catch(() => fetchAll());
    }
  }, [fetchAll]);

  const addCategory = useCallback(async (name: string, color: string) => {
    const newCat = await api.addCategory({ name, color, sortOrder: categories.length });
    setCategories(prev => [...prev, newCat]);
  }, [categories.length]);

  const updateCategory = useCallback(async (id: string, updates: Partial<Category>) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    api.updateCategory(id, updates).catch(() => fetchAll());
  }, [fetchAll]);

  const deleteCategory = useCallback(async (id: string, categoryName: string) => {
    const categoryTasks = tasks.filter(t => t.category === categoryName);
    setTasks(prev => prev.filter(t => t.category !== categoryName));
    setCategories(prev => prev.filter(c => c.id !== id));
    Promise.all([
      ...categoryTasks.map(t => api.deleteTask(t.id)),
      api.deleteCategory(id),
    ]).catch(() => fetchAll());
  }, [tasks, fetchAll]);

  const reorderCategories = useCallback(async (oldIndex: number, newIndex: number, allCats: Category[]) => {
    const reordered = [...allCats];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);
    setCategories(reordered.map((c, idx) => ({ ...c, sortOrder: idx })));
    api.reorderCategories(reordered.map(c => c.id)).catch(() => fetchAll());
  }, [fetchAll]);

  return {
    tasks,
    loading,
    error,
    categories: groupedCategories,
    rawCategories: categories,
    completeTask,
    uncompleteTask,
    clearCompletedTasks,
    addTask,
    updateTask,
    deleteTask,
    reorderTasks,
    addCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    refetch: fetchAll,
  };
}
