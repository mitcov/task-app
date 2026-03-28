import React, { useState, useEffect } from 'react';
import { useTasks } from './hooks/useTasks';
import { useUser } from './hooks/useUser';
import { useTheme } from './hooks/useTheme';
import { CategoryBoard } from './components/CategoryBoard';
import { TaskModal } from './components/TaskModal';
import { CategoryEditModal } from './components/CategoryEditModal';
import { UpcomingView } from './components/UpcomingView';
import { CompletedView } from './components/CompletedView';
import { ProfileScreen } from './components/ProfileScreen';
import { UserMenu } from './components/UserMenu';
import { Task, Category } from './types';
import { setCurrentUser } from './lib/api';
import { registerPushNotifications } from './lib/push';


type Tab = 'upcoming' | 'all' | 'done';

function App() {
  const { user, selectUser, signOut } = useUser();
  const { themeId, selectTheme } = useTheme(user?.id);
  const {
    tasks, categories, loading, error,
    completeTask, uncompleteTask, clearCompletedTasks,
    addTask, updateTask, deleteTask, reorderTasks,
    addCategory, updateCategory, deleteCategory, reorderCategories, refetch,
  } = useTasks();

  const [tab, setTab] = useState<Tab>('upcoming');
  const [showAdd, setShowAdd] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [quickAddCategory, setQuickAddCategory] = useState<string | null>(null);
  const [todayPendingCount, setTodayPendingCount] = useState(0);

  useEffect(() => {
    if (user) {
      setCurrentUser(user.id);
      refetch();
      registerPushNotifications(user.id).catch(console.error);
    }
  }, [user, refetch]);

  // Sync PWA home screen badge whenever the count changes
  useEffect(() => {
    const nav = navigator as Navigator & { setAppBadge?: (n: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
    if (todayPendingCount > 0) {
      nav.setAppBadge?.(todayPendingCount)?.catch(() => {});
    } else {
      nav.clearAppBadge?.()?.catch(() => {});
    }
  }, [todayPendingCount]);

  if (!user) return <ProfileScreen onSelect={selectUser} />;

  if (loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">

      <div className="text-center">
        <div className="text-4xl mb-3 animate-pulse">✓</div>
        <p className="text-gray-400 dark:text-gray-500 text-sm">Just Do It...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
      <p className="text-red-400 text-sm">{error}</p>
    </div>
  );

  const categoryNames = categories.map(c => c.name);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-5 pt-12 pb-4 sticky top-0 z-40">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setShowUserMenu(true)} className="flex items-center gap-2 active:opacity-70 transition-opacity">
            <span className="text-2xl">{user.emoji}</span>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Just Do It</h1>
          </button>
          <div className="flex gap-2 items-center">
            {tab === 'all' && (
              <button onClick={() => setShowAddCategory(true)}
                className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-3 py-2 rounded-full text-xs font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                + Category
              </button>
            )}
            <button onClick={() => setShowAdd(true)}
              className="bg-accent text-white w-9 h-9 rounded-full text-xl font-light flex items-center justify-center shadow-sm hover:bg-accent-dark transition-colors">
              +
            </button>
          </div>
        </div>

        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          {([['upcoming', 'Upcoming'], ['all', 'All Tasks'], ['done', 'Done']] as [Tab, string][]).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key as Tab)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors relative
                ${tab === key ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>
              {label}
              {key === 'upcoming' && todayPendingCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-accent text-white text-[10px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center leading-none">
                  {todayPendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content — all three views stay mounted to avoid reload flashes */}
      <div className="px-4 py-5 max-w-lg mx-auto">
        <div className={tab === 'upcoming' ? '' : 'hidden'}>
          <UpcomingView
            tasks={tasks}
            userId={user.id}
            onComplete={completeTask}
            onTaskClick={setEditingTask}
            onUpdateTask={updateTask}
            onTodayPendingCount={setTodayPendingCount}
          />
        </div>
        <div className={tab === 'all' ? '' : 'hidden'}>
          <CategoryBoard
            categories={categories}
            onComplete={completeTask}
            onTaskClick={setEditingTask}
            onEditCategory={setEditingCategory}
            onQuickAdd={setQuickAddCategory}
            onReorder={(activeId, overId, activeCat, overCat, cats) =>
              reorderTasks(activeId, overId, activeCat, overCat, cats)}
            onReorderCategories={(oldIndex, newIndex, cats) =>
              reorderCategories(oldIndex, newIndex, cats)}
          />
        </div>
        <div className={tab === 'done' ? '' : 'hidden'}>
          <CompletedView
            tasks={tasks}
            categories={categories}
            onRestore={uncompleteTask}
            onClearAll={clearCompletedTasks}
            onTaskClick={setEditingTask}
          />
        </div>
      </div>

      {/* Modals */}
      {showAdd && (
        <TaskModal
          existingCategories={categoryNames}
          onSave={async (data) => {
            const taskData = data as Omit<Task, 'id'>;
            if (taskData.category && !categoryNames.some(c => c.toLowerCase() === taskData.category.toLowerCase())) {
              await addCategory(taskData.category, 'Gray');
            }
            await addTask(taskData);
          }}
          onClose={() => setShowAdd(false)}
        />
      )}
      {quickAddCategory && (
        <TaskModal
          existingCategories={categoryNames}
          lockedCategory={quickAddCategory}
          onSave={async (data) => {
            await addTask(data as Omit<Task, 'id'>);
          }}
          onClose={() => setQuickAddCategory(null)}
        />
      )}
      {showAddCategory && (
      <CategoryEditModal
        onSave={(name, color) => {
          const duplicate = categoryNames.some(
            c => c.toLowerCase() === name.toLowerCase()
          );
          if (duplicate) {
            alert(`A category called "${name}" already exists.`);
            return;
          }
          addCategory(name, color);
        }}
        onClose={() => setShowAddCategory(false)}
      />
    )}
      {editingTask && (
        <TaskModal
          task={editingTask}
          existingCategories={categoryNames}
          onSave={async (data, id) => {
            const updates = data as Partial<Task>;
            if (updates.category && !categoryNames.some(c => c.toLowerCase() === updates.category!.toLowerCase())) {
              await addCategory(updates.category, 'Gray');
            }
            await updateTask(id!, updates);
          }}
          onDelete={deleteTask}
          onClose={() => setEditingTask(null)}
        />
      )}
      {editingCategory && (
        <CategoryEditModal
          category={editingCategory}
          onSave={addCategory}
          onUpdate={updateCategory}
          onDelete={deleteCategory}
          onClose={() => setEditingCategory(null)}
        />
      )}
      {showUserMenu && (
        <UserMenu
          user={user}
          currentTheme={themeId}
          onThemeSelect={selectTheme}
          onSignOut={() => { signOut(); setShowUserMenu(false); }}
          onClose={() => setShowUserMenu(false)}
        />
      )}
    </div>
  );
}

export default App;
