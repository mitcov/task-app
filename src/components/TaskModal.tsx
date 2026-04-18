import React, { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { Task, Priority, Recurrence, RecurrenceDay, Reminder, REMINDER_PRESETS } from '../types';

interface Props {
  task?: Task;
  existingCategories: string[];
  lockedCategory?: string;
  defaultDueDate?: string;
  onSave: (data: Omit<Task, 'id'> | Partial<Task>, id?: string) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

export function TaskModal({ task, existingCategories, lockedCategory, defaultDueDate, onSave, onDelete, onClose }: Props) {
  const isEdit = !!task;

  const [title, setTitle] = useState(task?.title || '');
  const [category, setCategory] = useState(lockedCategory || task?.category || existingCategories[0] || '');
  const [newCategory, setNewCategory] = useState<string | null>(
    existingCategories.length === 0 ? '' : null
  );
  const [priority, setPriority] = useState<Priority>(task?.priority || 'Medium');
  const [recurrence, setRecurrence] = useState<Recurrence>(task?.recurrence || 'None');
  const [recurrenceDay, setRecurrenceDay] = useState<RecurrenceDay>(task?.recurrenceDay || 'Sunday');
  const [dueDate, setDueDate] = useState(task?.dueDate ? task.dueDate.split('T')[0] : (defaultDueDate || ''));
  const dateInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const input = dateInputRef.current;
    if (!input) return;
    const handler = () => setDueDate(input.value);
    input.addEventListener('change', handler);
    return () => input.removeEventListener('change', handler);
  }, []);
  const [reminderTime, setReminderTime] = useState(task?.reminderTime || '');
  const [reminders, setReminders] = useState<Reminder[]>(task?.reminders || []);
  const [notes, setNotes] = useState(task?.notes || '');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const finalCategory = (newCategory !== null && newCategory.trim())
    ? newCategory.trim()
    : category;

  const addReminder = (type: 'once' | 'daily') => {
    if (reminders.length >= 3) return;
    if (type === 'once') {
      setReminders([...reminders, { type: 'once', offsetMinutes: 1440, label: '1 day before' }]);
    } else {
      const today = format(new Date(), 'yyyy-MM-dd');
      setReminders([...reminders, { type: 'daily', dailyTime: '09:00', dailyStart: today }]);
    }
  };

  const updateReminder = (index: number, updates: Partial<Reminder>) => {
    const updated = [...reminders];
    updated[index] = { ...updated[index], ...updates };
    setReminders(updated);
  };

  const removeReminder = (index: number) => {
    setReminders(reminders.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!title.trim() || !finalCategory) return;
    const data = {
      title: title.trim(),
      category: finalCategory,
      priority,
      recurrence,
      recurrenceDay: recurrence === 'Weekly' || recurrence === 'Biweekly' ? recurrenceDay : undefined,
      dueDate: dueDate || null,
      reminderTime: reminders.some(r => r.type === 'once') ? reminderTime || undefined : undefined,
      notes: notes || undefined,
      reminders,
      ...(isEdit ? {} : { status: 'To Do' as const, sortOrder: 999 }),
    };
    onSave(data, task?.id);
    onClose();
  };

  const hasOnceReminder = reminders.some(r => r.type === 'once');

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-t-3xl p-6 pb-10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">
            {isEdit ? 'Edit Task' : 'New Task'}
          </h2>
          <button onClick={onClose} className="text-gray-400 text-2xl leading-none">×</button>
        </div>

        <div className="space-y-4">
          {/* Title */}
          <input
            autoFocus={!isEdit}
            type="text"
            placeholder="Task name"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />

          {/* Category */}
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">
              Category
            </label>
            {lockedCategory ? (
              <div className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-800 rounded-xl px-4 py-3 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <span>{lockedCategory}</span>
                <span className="text-xs text-gray-300 dark:text-gray-600">(locked)</span>
              </div>
            ) : (
              <>
                {existingCategories.length > 0 && (
                  <select
                    value={newCategory !== null ? '__new__' : category}
                    onChange={e => {
                      if (e.target.value === '__new__') {
                        setNewCategory('');
                      } else {
                        setCategory(e.target.value);
                        setNewCategory(null);
                      }
                    }}
                    className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    {existingCategories.map(c => <option key={c} value={c}>{c}</option>)}
                    <option value="__new__">+ New category...</option>
                  </select>
                )}
                {(newCategory !== null || existingCategories.length === 0) && (
                  <input
                    autoFocus={existingCategories.length === 0}
                    type="text"
                    placeholder="New category name"
                    value={newCategory ?? ''}
                    onChange={e => setNewCategory(e.target.value)}
                    className={`w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 ${existingCategories.length > 0 ? 'mt-2' : ''}`}
                  />
                )}
              </>
            )}
          </div>

          {/* Priority */}
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">
              Priority
            </label>
            <div className="flex gap-2">
              {(['High', 'Medium', 'Low'] as Priority[]).map(p => {
                const colors = {
                  High: { active: 'border-red-400 bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400' },
                  Medium: { active: 'border-amber-400 bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400' },
                  Low: { active: 'border-green-400 bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400' },
                };
                return (
                  <button key={p} onClick={() => setPriority(p)}
                    className={`flex-1 py-2 rounded-xl text-sm border transition-colors font-medium
                      ${priority === p
                        ? colors[p].active
                        : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'}`}>
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recurrence */}
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">
              Repeat
            </label>
            <select
              value={recurrence}
              onChange={e => setRecurrence(e.target.value as Recurrence)}
              className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              {(['None', 'Daily', 'Weekly', 'Biweekly', 'Monthly'] as Recurrence[]).map(r => (
                <option key={r}>{r}</option>
              ))}
            </select>
            {(recurrence === 'Weekly' || recurrence === 'Biweekly') && (
              <select
                value={recurrenceDay}
                onChange={e => setRecurrenceDay(e.target.value as RecurrenceDay)}
                className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl px-4 py-3 text-sm mt-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                {(['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'] as RecurrenceDay[]).map(d => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            )}
          </div>

          {/* Due Date */}
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">
              Due Date (optional)
            </label>
            <div className="overflow-hidden rounded-xl">
              <input
                ref={dateInputRef}
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
          </div>

          {/* Reminders */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Reminders
              </label>
              {reminders.length < 3 && (
                <div className="flex gap-2">
                  <button
                    onClick={() => addReminder('once')}
                    disabled={!dueDate}
                    className={`text-xs font-semibold transition-colors ${dueDate ? 'text-blue-500' : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'}`}
                    title={!dueDate ? 'Set a due date first' : ''}
                  >
                    + One-time {!dueDate && '(needs due date)'}
                  </button>
                  <button
                    onClick={() => addReminder('daily')}
                    className="text-xs text-purple-500 font-semibold"
                  >
                    + Daily nag
                  </button>
                </div>
              )}
            </div>

            {reminders.length === 0 && (
              <p className="text-xs text-gray-400 dark:text-gray-600 italic">
                No reminders set
              </p>
            )}

            {/* Reminder time for once reminders */}
            {hasOnceReminder && (
              <div className="mb-3">
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                  Time on due date
                </label>
                <div className="overflow-hidden rounded-xl">
                  <input
                    type="time"
                    value={reminderTime}
                    onChange={e => setReminderTime(e.target.value)}
                    className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
              </div>
            )}

            {reminders.map((reminder, index) => (
              <div key={index} className={`rounded-xl border p-3 mb-2 ${
                reminder.type === 'once'
                  ? 'border-blue-100 dark:border-blue-900 bg-blue-50 dark:bg-blue-950'
                  : 'border-purple-100 dark:border-purple-900 bg-purple-50 dark:bg-purple-950'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-semibold ${
                    reminder.type === 'once' ? 'text-blue-600 dark:text-blue-400' : 'text-purple-600 dark:text-purple-400'
                  }`}>
                    {reminder.type === 'once' ? '⏰ One-time' : '🔁 Daily until done'}
                  </span>
                  <button
                    onClick={() => removeReminder(index)}
                    className="text-gray-300 dark:text-gray-600 hover:text-red-400 text-lg"
                  >
                    ×
                  </button>
                </div>

                {reminder.type === 'once' ? (
                  <select
                    value={reminder.offsetMinutes}
                    onChange={e => {
                      const preset = REMINDER_PRESETS.find(p => p.offsetMinutes === Number(e.target.value));
                      if (preset) updateReminder(index, { offsetMinutes: preset.offsetMinutes, label: preset.label });
                    }}
                    className="w-full border border-blue-200 dark:border-blue-800 dark:bg-gray-800 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    {REMINDER_PRESETS.map(p => (
                      <option key={p.offsetMinutes} value={p.offsetMinutes}>{p.label}</option>
                    ))}
                  </select>
                ) : (
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Time</label>
                      <div className="overflow-hidden rounded-lg">
                        <input
                          type="time"
                          value={reminder.dailyTime || '09:00'}
                          onChange={e => updateReminder(index, { dailyTime: e.target.value })}
                          className="w-full border border-purple-200 dark:border-purple-800 dark:bg-gray-800 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Start date</label>
                      <div className="overflow-hidden rounded-lg">
                        <input
                          type="date"
                          value={reminder.dailyStart || ''}
                          onChange={e => updateReminder(index, { dailyStart: e.target.value })}
                          className="w-full border border-purple-200 dark:border-purple-800 dark:bg-gray-800 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                        />
                      </div>
                    </div>
                  </div>

                )}
              </div>
            ))}
          </div>

          {/* Notes */}
          <textarea
            placeholder="Notes (optional)"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
          />
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={!title.trim() || !finalCategory}
          className="w-full mt-6 bg-accent hover:bg-accent-dark disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-3.5 rounded-2xl transition-colors"
        >
          {isEdit ? 'Save Changes' : 'Add Task'}
        </button>

        {/* Delete (edit mode only) */}
        {isEdit && onDelete && !confirmDelete && (
          <button
            onClick={() => setConfirmDelete(true)}
            className="w-full mt-3 text-red-400 hover:text-red-600 font-medium py-2 text-sm transition-colors"
          >
            Delete Task
          </button>
        )}
        {confirmDelete && onDelete && (
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => { onDelete(task!.id); onClose(); }}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 rounded-2xl transition-colors text-sm"
            >
              Yes, delete it
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 font-semibold py-3 rounded-2xl transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
