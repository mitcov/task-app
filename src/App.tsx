import React, { useState, useEffect } from 'react';
import { useTasks } from './hooks/useTasks';
import { useUser } from './hooks/useUser';
import { CategoryBoard } from './components/CategoryBoard';
import { TaskModal } from './components/TaskModal';
import { CategoryEditModal } from './components/CategoryEditModal';
import { UpcomingView } from './components/UpcomingView';
import { CompletedView } from './components/CompletedView';
import { ProfileScreen } from './components/ProfileScreen';
import { Task, Category } from './types';
import { setCurrentUser } from './lib/api';
import { registerPushNotifications } from './lib/push';


type Tab = 'upcoming' | 'all' | 'done';

function App() {
  const { user, selectUser, signOut } = useUser();
  const {
    tasks, categories, loading, error,
    completeTask, uncompleteTask, clearCompletedTasks,
    addTask, updateTask, deleteTask, reorderTasks,
    addCategory, updateCategory, deleteCategory, reorderCategories, refetch,
  } = useTasks();

  const [tab, setTab] = useState<Tab>('upcoming');
  const [showAdd, setShowAdd] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  useEffect(() => {
    if (user) {
      setCurrentUser(user.id);
      refetch();
      registerPushNotifications(user.id).catch(console.error);
    }
  }, [user, refetch]);

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
          <button onClick={signOut} className="flex items-center gap-2 active:opacity-70 transition-opacity">
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
              className="bg-blue-500 text-white w-9 h-9 rounded-full text-xl font-light flex items-center justify-center shadow-sm hover:bg-blue-600 transition-colors">
              +
            </button>
          </div>
        </div>

        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          {([['upcoming', 'Upcoming'], ['all', 'All Tasks'], ['done', 'Done']] as [Tab, string][]).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key as Tab)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors
                ${tab === key ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-5 max-w-lg mx-auto">
        {tab === 'upcoming' && (
          <UpcomingView
            tasks={tasks}
            onComplete={completeTask}
            onTaskClick={setEditingTask}
            onUpdateTask={updateTask}
          />
        )}
        {tab === 'all' && (
          <CategoryBoard
            categories={categories}
            onComplete={completeTask}
            onTaskClick={setEditingTask}
            onEditCategory={setEditingCategory}
            onReorder={(activeId, overId, activeCat, overCat, cats) =>
              reorderTasks(activeId, overId, activeCat, overCat, cats)}
            onReorderCategories={(oldIndex, newIndex, cats) =>
              reorderCategories(oldIndex, newIndex, cats)}
          />
        )}
        {tab === 'done' && (
          <CompletedView
            tasks={tasks}
            categories={categories}
            onRestore={uncompleteTask}
            onClearAll={clearCompletedTasks}
            onTaskClick={setEditingTask}
          />
        )}
      </div>

      {/* Modals */}
      {showAdd && (
        <TaskModal
          existingCategories={categoryNames}
          onSave={async (data) => {
            const taskData = data as Omit<Task, 'id'>;
            // If this is a new category not already in our list, save it
            if (taskData.category && !categoryNames.some(c => c.toLowerCase() === taskData.category.toLowerCase())) {
              await addCategory(taskData.category, 'Gray');
            }
            await addTask(taskData);
          }}
          onClose={() => setShowAdd(false)}
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
    </div>
  );
}

export default App;
