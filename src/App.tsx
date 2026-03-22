import React, { useState } from 'react';
import { useTasks } from './hooks/useTasks';
import { CategoryBoard } from './components/CategoryBoard';
import { AddTaskModal } from './components/AddTaskModal';
import { TaskEditModal } from './components/TaskEditModal';
import { CategoryEditModal } from './components/CategoryEditModal';
import { TodayView } from './components/TodayView';
import { Task, Category } from './types';

type Tab = 'today' | 'all';

function App() {
  const {
    tasks, categories, loading, error,
    completeTask, addTask, updateTask, deleteTask, reorderTasks,
    addCategory, updateCategory, deleteCategory,
  } = useTasks();

  const [tab, setTab] = useState<Tab>('today');
  const [showAdd, setShowAdd] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-3 animate-pulse">📋</div>
        <p className="text-gray-400 text-sm">Loading tasks...</p>
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
          <h1 className="text-xl font-bold text-gray-900">My Tasks</h1>
          <div className="flex gap-2">
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
            <button key={key} onClick={() => setTab(key)}
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
            />
        }
      </div>

      {/* Modals */}
      {showAdd && (
        <AddTaskModal
          existingCategories={categoryNames}
          onAdd={addTask}
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
        <TaskEditModal
          task={editingTask}
          categories={categoryNames}
          onSave={updateTask}
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
