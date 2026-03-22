import React, { useState } from 'react';
import { Task, Priority, Recurrence, RecurrenceDay } from '../types';

interface Props {
  existingCategories: string[];
  onAdd: (task: Omit<Task, 'id'>) => void;
  onClose: () => void;
}

export function AddTaskModal({ existingCategories, onAdd, onClose }: Props) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(existingCategories[0] || '');
  const [newCategory, setNewCategory] = useState('');
  const [priority, setPriority] = useState<Priority>('🟡 Medium');
  const [recurrence, setRecurrence] = useState<Recurrence>('None');
  const [recurrenceDay, setRecurrenceDay] = useState<RecurrenceDay>('Sunday');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  const finalCategory = newCategory.trim() || category;

  const handleSubmit = () => {
    if (!title.trim() || !finalCategory) return;
    onAdd({
      title: title.trim(),
      category: finalCategory,
      status: 'To Do',
      priority,
      recurrence,
      recurrenceDay: recurrence === 'Weekly' || recurrence === 'Biweekly' ? recurrenceDay : undefined,
      dueDate: dueDate || undefined,
      notes: notes || undefined,
      sortOrder: 999,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white w-full max-w-lg rounded-t-3xl p-6 pb-10 animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-800">New Task</h2>
          <button onClick={onClose} className="text-gray-400 text-2xl leading-none">×</button>
        </div>

        <div className="space-y-4">
          {/* Title */}
          <input
            autoFocus
            type="text"
            placeholder="Task name"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />

          {/* Category */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Category</label>
            {existingCategories.length > 0 && (
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                {existingCategories.map(c => <option key={c}>{c}</option>)}
              </select>
            )}
            <input
              type="text"
              placeholder="Or type a new category..."
              value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Priority</label>
            <div className="flex gap-2">
              {(['🔴 High', '🟡 Medium', '🟢 Low'] as Priority[]).map(p => (
                <button key={p} onClick={() => setPriority(p)}
                  className={`flex-1 py-2 rounded-xl text-sm border transition-colors
                    ${priority === p ? 'border-blue-400 bg-blue-50 text-blue-600 font-semibold' : 'border-gray-200 text-gray-500'}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Recurrence */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Repeat</label>
            <select
              value={recurrence}
              onChange={e => setRecurrence(e.target.value as Recurrence)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              {(['None', 'Daily', 'Weekly', 'Biweekly', 'Monthly'] as Recurrence[]).map(r => (
                <option key={r}>{r}</option>
              ))}
            </select>

            {(recurrence === 'Weekly' || recurrence === 'Biweekly') && (
              <select
                value={recurrenceDay}
                onChange={e => setRecurrenceDay(e.target.value as RecurrenceDay)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm mt-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                {(['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'] as RecurrenceDay[]).map(d => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            )}
          </div>

          {/* Due date */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Due Date (optional)</label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          {/* Notes */}
          <textarea
            placeholder="Notes (optional)"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!title.trim() || !finalCategory}
          className="w-full mt-6 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-3.5 rounded-2xl transition-colors"
        >
          Add Task
        </button>
      </div>
    </div>
  );
}
