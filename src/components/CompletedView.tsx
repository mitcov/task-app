import React, { useState } from 'react';
import { Task, Category, CATEGORY_COLORS, priorityColor } from '../types';

interface CompletedViewProps {
  tasks: Task[];
  categories: Category[];
  onRestore: (id: string) => void;
  onClearAll: () => void;
  onTaskClick: (task: Task) => void;
}

function formatCompleted(dateStr?: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function CompletedView({ tasks, categories, onRestore, onClearAll, onTaskClick }: CompletedViewProps) {
  const [confirmClear, setConfirmClear] = useState(false);

  const doneTasks = tasks
    .filter(t => t.status === 'Done')
    .sort((a, b) => {
      const aTime = a.lastCompleted ? new Date(a.lastCompleted).getTime() : 0;
      const bTime = b.lastCompleted ? new Date(b.lastCompleted).getTime() : 0;
      return bTime - aTime;
    });

  if (doneTasks.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p className="text-4xl mb-3">✓</p>
        <p className="text-sm">No completed tasks yet.</p>
        <p className="text-xs mt-1 text-gray-400 dark:text-gray-600">Mark tasks as done and they'll appear here.</p>
      </div>
    );
  }

  // Group by category, preserving category sort order
  const catOrder = categories.map(c => c.name);
  const grouped: Record<string, Task[]> = {};
  doneTasks.forEach(t => {
    if (!grouped[t.category]) grouped[t.category] = [];
    grouped[t.category].push(t);
  });
  const groupedCategories = Object.entries(grouped).sort(([a], [b]) => {
    const ai = catOrder.indexOf(a);
    const bi = catOrder.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  const getCategoryColor = (name: string) => {
    const cat = categories.find(c => c.name === name);
    return CATEGORY_COLORS[cat?.color || 'Gray'] || CATEGORY_COLORS.Gray;
  };

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-400 dark:text-gray-500">
          {doneTasks.length} completed task{doneTasks.length !== 1 ? 's' : ''}
        </p>
        {confirmClear ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Delete all?</span>
            <button
              onClick={() => { onClearAll(); setConfirmClear(false); }}
              className="text-xs bg-red-500 text-white px-3 py-1 rounded-full font-semibold hover:bg-red-600 transition-colors"
            >
              Yes, clear
            </button>
            <button
              onClick={() => setConfirmClear(false)}
              className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmClear(true)}
            className="text-xs text-red-400 hover:text-red-500 transition-colors font-medium"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Tasks grouped by category */}
      {groupedCategories.map(([catName, catTasks]) => (
        <div key={catName} className="mb-4">
          <div className="flex items-center gap-2 mb-2 px-1">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${getCategoryColor(catName)}`}>
              {catName}
            </span>
            <span className="text-xs text-gray-400">{catTasks.length}</span>
          </div>
          {catTasks.map(task => (
            <div
              key={task.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-2.5 mb-1.5 flex items-center gap-2"
            >
              {/* Restore button */}
              <button
                onClick={() => onRestore(task.id)}
                title="Restore task"
                className="w-6 h-6 rounded-full border-2 border-green-400 bg-green-400 flex-shrink-0 flex items-center justify-center text-white hover:bg-green-500 hover:border-green-500 transition-colors"
              >
                <span className="text-xs">✓</span>
              </button>

              {/* Task info */}
              <div className="flex-1 min-w-0" onClick={() => onTaskClick(task)}>
                <p className="text-sm font-medium truncate line-through text-gray-400 dark:text-gray-500">
                  {task.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-xs font-medium ${priorityColor(task.priority)}`}>{task.priority}</span>
                  {task.recurrence !== 'None' && (
                    <span className="text-xs text-blue-400">↻ {task.recurrence}</span>
                  )}
                </div>
              </div>

              {/* Completion time */}
              {task.lastCompleted && (
                <span className="text-xs text-gray-300 dark:text-gray-600 flex-shrink-0">
                  {formatCompleted(task.lastCompleted)}
                </span>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
