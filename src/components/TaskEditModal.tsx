import React, { useState } from 'react';
import { Task, Priority, Recurrence, RecurrenceDay } from '../types';

interface Props {
  task: Task;
  categories: string[];
  onSave: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function TaskEditModal({ task, categories, onSave, onDelete, onClose }: Props) {
  const [title, setTitle] = useState(task.title);
  const [category, setCategory] = useState(task.category);
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [recurrence, setRecurrence] = useState<Recurrence>(task.recurrence);
  const [recurrenceDay, setRecurrenceDay] = useState<RecurrenceDay>(task.recurrenceDay || 'Sunday');
  const [dueDate, setDueDate] = useState(task.dueDate || '');
  const [notes, setNotes] = useState(task.notes || '');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = () => {
    onSave(task.id, {
      title,
      category,
      priority,
      recurrence,
      recurrenceDay: recurrence === 'Weekly' || recurrence === 'Biweekly' ? recurrenceDay : undefined,
      dueDate: dueDate || undefined,
      notes: notes || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white w-full max-w-lg rounded-t-3xl p-6 pb-10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-800">Edit Task</h2>
          <button onClick={onClose} className="text-gray-400 text-2xl leading-none">×</button>
        </div>

        <div className="space-y-4">
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

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

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Repeat</label>
            <select value={recurrence} onChange={e => setRecurrence(e.target.value as Recurrence)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
              {(['None', 'Daily', 'Weekly', 'Biweekly', 'Monthly'] as Recurrence[]).map(r => (
                <option key={r}>{r}</option>
              ))}
            </select>
            {(recurrence === 'Weekly' || recurrence === 'Biweekly') && (
              <select value={recurrenceDay} onChange={e => setRecurrenceDay(e.target.value as RecurrenceDay)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm mt-2 focus:outline-none focus:ring-2 focus:ring-blue-300">
                {(['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'] as RecurrenceDay[]).map(d => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Due Date</label>
            <input type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>

          <textarea placeholder="Notes" value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none" />
        </div>

        <button onClick={handleSave}
          className="w-full mt-6 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3.5 rounded-2xl transition-colors">
          Save Changes
        </button>

        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)}
            className="w-full mt-3 text-red-400 hover:text-red-600 font-medium py-2 text-sm transition-colors">
            Delete Task
          </button>
        ) : (
          <div className="mt-3 flex gap-2">
            <button onClick={() => { onDelete(task.id); onClose(); }}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 rounded-2xl transition-colors text-sm">
              Yes, delete it
            </button>
            <button onClick={() => setConfirmDelete(false)}
              className="flex-1 border border-gray-200 text-gray-500 font-semibold py-3 rounded-2xl transition-colors text-sm">
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
