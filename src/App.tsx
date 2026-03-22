import React, { useState } from 'react';
import { useTasks } from './hooks/useTasks';
import { CategoryBoard } from './components/CategoryBoard';
import { AddTaskModal } from './components/AddTaskModal';
import { TodayView } from './components/TodayView';

type Tab = 'today' | 'all';

function App() {
  const { tasks, categories, loading, error, completeTask, addTask, deleteTask, reorderTasks } = useTasks();
  const [tab, setTab] = useState<Tab>('today');
  const [showAdd, setShowAdd] = useState(false);

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

const categoryNames = tasks.map(t => t.category).filter((c, i, arr) => arr.indexOf(c) === i);
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-5 pt-12 pb-4 sticky top-0 z-40">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900">My Tasks</h1>
          <button
            onClick={() => setShowAdd(true)}
            className="bg-blue-500 text-white w-9 h-9 rounded-full text-xl font-light flex items-center justify-center shadow-sm hover:bg-blue-600 transition-colors"
          >
            +
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {([['today', 'Today'], ['all', 'All Tasks']] as [Tab, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors
                ${tab === key ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}
            >
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
              onDelete={deleteTask}
              onReorder={reorderTasks}
            />
        }
      </div>

      {/* Add Task Modal */}
      {showAdd && (
        <AddTaskModal
          existingCategories={categoryNames}
          onAdd={addTask}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}

export default App;
