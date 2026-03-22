import React, { useState, useEffect } from 'react';
import { useTasks } from './hooks/useTasks';
import { useUser } from './hooks/useUser';
import { CategoryBoard } from './components/CategoryBoard';
import { TaskModal } from './components/TaskModal';
import { CategoryEditModal } from './components/CategoryEditModal';
import { TodayView } from './components/TodayView';
import { ProfileScreen } from './components/ProfileScreen';
import { Task, Category } from './types';
import { setCurrentUser } from './lib/notion';

type Tab = 'today' | 'all';

function App() {
  const { user, selectUser, signOut } = useUser();
  const {
    tasks, categories, loading, error,
    completeTask, addTask, updateTask, deleteTask, reorderTasks,
    addCategory, updateCategory, deleteCategory, reorderCategories, refetch,
  } = useTasks();

  const [tab, setTab] = useState<Tab>('today');
  const [showAdd, setShowAdd] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  useEffect(() => {
    if (user) {
      setCurrentUser(user.id);
      refetch();
    }
  }, [user, refetch]);

  if (!user) return <ProfileScreen onSelect={selectUser} />;

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-3 animate-pulse">✓</div>
        <p className="text-gray-400 text-sm">Just Do It...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-red-400 text-sm">{error}</p>
    </div>
  );

  const categoryNames = categories.map(c => c.name);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-5 pt-12 pb-4 sticky top-0 z-40">
        <div className="flex items-center justify-between mb-4">
          <button onClick={signOut} className="flex items-center gap-2 active:opacity-70 transition-opacity">
            <span className="text-2xl">{user.emoji}</span>
            <h1 className="text-xl font-bold text-gray-900">Just Do It</h1>
          </button>
          <div className="flex gap-2 items-center">
            {tab === 'all' && (
              <button onClick={() => setShowAddCategory(true)}
                className="bg-gray-100 text-gray-600 px-3 py-2 rounded-full text-xs font-semibold hover:bg-gray-200 transition-colors">
                + Category
              </button>
            )}
            <button onClick={() => setShowAdd(true)}
              className="bg-blue-500 text-white w-9 h-9 rounded-full text-xl font-light flex items-center justify-center shadow-sm hover:bg-blue-600 transition-colors">
              +
            </button>
          </div>
        </div>

        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {([['today', 'Today'], ['all', 'All Tasks']] as [Tab, string][]).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key as Tab)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors
                ${tab === key ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-5 max-w-lg mx-auto">
        {tab === 'today'
          ? <TodayView tasks={tasks} onComplete={completeTask} />
          : <CategoryBoard
              categories={categories}
              onComplete={completeTask}
              onTaskClick={setEditingTask}
              onEditCategory={setEditingCategory}
              onReorder={(activeId, overId, activeCat, overCat, cats) =>
                reorderTasks(activeId, overId, activeCat, overCat, cats)}
              onReorderCategories={(oldIndex, newIndex, cats) =>
                reorderCategories(oldIndex, newIndex, cats)}
            />

        }
      </div>

      {/* Modals */}
      {showAdd && (
        <TaskModal
          existingCategories={categoryNames}
          onSave={(data) => addTask(data as Omit<Task, 'id'>)}
          onClose={() => setShowAdd(false)}
        />
      )}
      {showAddCategory && (
        <CategoryEditModal
          onSave={addCategory}
          onClose={() => setShowAddCategory(false)}
        />
      )}
      {editingTask && (
        <TaskModal
          task={editingTask}
          existingCategories={categoryNames}
          onSave={(data, id) => updateTask(id!, data as Partial<Task>)}
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
