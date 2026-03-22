import { useState, useCallback } from 'react';
import { Task, Category } from '../types';
import { api } from '../lib/notion';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Omit<Category, 'tasks'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [tasksData, catsData] = await Promise.all([
        api.getTasks(),
        api.getCategories(),
      ]);
      setTasks(tasksData);
      setCategories(catsData);
    } catch (e) {
      setError('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, []); // stable — no dependencies needed since api functions don't change

  const groupedCategories = useCallback((): Category[] => {
    const taskMap: Record<string, Task[]> = {};
    tasks.forEach(task => {
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
    await api.updateTask(id, { status: 'Done', lastCompleted: new Date().toISOString() });
    await fetchAll();
  }, [fetchAll]);

  const addTask = useCallback(async (task: Omit<Task, 'id'>) => {
    await api.addTask(task);
    await fetchAll();
  }, [fetchAll]);

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    await api.updateTask(id, updates);
    await fetchAll();
  }, [fetchAll]);

  const deleteTask = useCallback(async (id: string) => {
    await api.deleteTask(id);
    await fetchAll();
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
      await api.updateTask(activeId, { category: overCategory });
      const newOverTasks = [...overCatTasks];
      const overIndex = newOverTasks.findIndex(t => t.id === overId);
      newOverTasks.splice(overIndex >= 0 ? overIndex : newOverTasks.length, 0, { id: activeId } as Task);
      setTasks(prev => prev.map(t =>
        t.id === activeId ? { ...t, category: overCategory } : t
      ));
      await api.reorderTasks(newOverTasks.map(t => t.id));
      await fetchAll();
    }
  }, [fetchAll]);

  const addCategory = useCallback(async (name: string, color: string) => {
    await api.addCategory({ name, color, sortOrder: categories.length });
    await fetchAll();
  }, [categories.length, fetchAll]);

  const updateCategory = useCallback(async (id: string, updates: Partial<Category>) => {
    await api.updateCategory(id, updates);
    await fetchAll();
  }, [fetchAll]);

  const deleteCategory = useCallback(async (id: string, categoryName: string) => {
    // Delete all tasks in this category first
    const categoryTasks = tasks.filter(t => t.category === categoryName);
    await Promise.all(categoryTasks.map(t => api.deleteTask(t.id)));
    await api.deleteCategory(id);
    await fetchAll();
  }, [tasks, fetchAll]);

  const reorderCategories = useCallback(async (oldIndex: number, newIndex: number, allCats: Category[]) => {
    const reordered = [...allCats];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);
    await api.reorderCategories(reordered.map(c => c.id));
    await fetchAll();
  }, [fetchAll]);

  return {
    tasks,
    loading,
    error,
    categories: groupedCategories(),
    rawCategories: categories,
    completeTask,
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
