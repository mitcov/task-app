import React, { useState } from 'react';
import { Task, Priority, Recurrence, RecurrenceDay } from '../types';

interface Props {
  task?: Task;
  existingCategories: string[];
  onSave: (data: Omit<Task, 'id'> | Partial<Task>, id?: string) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

export function TaskModal({ task, existingCategories, onSave, onDelete, onClose }: Props) {
  const isEdit = !!task;

  const [title, setTitle] = useState(task?.title || '');
  const [category, setCategory] = useState(task?.category || existingCategories[0] || '');
  const [newCategory, setNewCategory] = useState('');
  const [priority, setPriority] = useState<Priority>(task?.priority || '🟡 Medium');
  const [recurrence, setRecurrence] = useState<Recurrence>(task?.recurrence || 'None');
  const [recurrenceDay, setRecurrenceDay] = useState<RecurrenceDay>(task?.recurrenceDay || 'Sunday');
  const [dueDate, setDueDate] = useState(task?.dueDate || '');
  const [notes, setNotes] = useState(task?.notes || '');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const finalCategory = newCategory.trim() || category;

  const handleSave = () => {
    if (!title.trim() || !finalCategory) return;
    const data = {
      title: title.trim(),
      category: finalCategory,
      priority,
      recurrence,
      recurrenceDay: recurrence === 'Weekly' || recurrence === 'Biweekly' ? recurrenceDay : undefined,
      dueDate: dueDate || undefined,
      notes: notes || undefined,
      ...(isEdit ? {} : { status: 'To Do' as const, sortOrder: 999 }),
    };
    onSave(data, task?.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white w-full max-w-lg rounded-t-3xl p-6 pb-10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-800">{isEdit ? 'Edit Task' : 'New Task'}</h2>
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
            <select
              value={newCategory ? '__new__' : category}
              onChange={e => {
                if (e.target.value === '__new__') {
                  setNewCategory(' ');
                } else {
                  setCategory(e.target.value);
                  setNewCategory('');
                }
              }}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              {existingCategories.map(c => <option key={c} value={c}>{c}</option>)}
              <option value="__new__">+ New category...</option>
            </select>
            {newCategory !== '' && (
              <input
                autoFocus
                type="text"
                placeholder="New category name"
                value={newCategory.trim()}
                onChange={e => setNewCategory(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm mt-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            )}
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

          {/* Due Date */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Due Date (optional)</label>
            <input type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>

          {/* Notes */}
          <textarea placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none" />
        </div>

        {/* Save */}
        <button onClick={handleSave} disabled={!title.trim() || !finalCategory}
          className="w-full mt-6 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-3.5 rounded-2xl transition-colors">
          {isEdit ? 'Save Changes' : 'Add Task'}
        </button>

        {/* Delete (edit mode only) */}
        {isEdit && onDelete && !confirmDelete && (
          <button onClick={() => setConfirmDelete(true)}
            className="w-full mt-3 text-red-400 hover:text-red-600 font-medium py-2 text-sm transition-colors">
            Delete Task
          </button>
        )}
        {confirmDelete && onDelete && (
          <div className="mt-3 flex gap-2">
            <button onClick={() => { onDelete(task!.id); onClose(); }}
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