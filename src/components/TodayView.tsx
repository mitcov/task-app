import React from 'react';
import { Task } from '../types';
import { isToday, parseISO } from 'date-fns';

interface Props {
  tasks: Task[];
  onComplete: (id: string) => void;
}

const DAY_MAP: Record<string, number> = {
  Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
  Thursday: 4, Friday: 5, Saturday: 6,
};

export function TodayView({ tasks, onComplete }: Props) {
  const todayNum = new Date().getDay();

  const todayTasks = tasks.filter(task => {
    if (task.status === 'Done') return false;
    if (task.dueDate && isToday(parseISO(task.dueDate))) return true;
    if (task.recurrence === 'Daily') return true;
    if ((task.recurrence === 'Weekly' || task.recurrence === 'Biweekly') && task.recurrenceDay) {
      return DAY_MAP[task.recurrenceDay] === todayNum;
    }
    return false;
  });

  const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  return (
    <div>
      <p className="text-sm text-gray-400 mb-4">
        {todayTasks.length === 0
          ? `Nothing scheduled for ${dayName} 🎉`
          : `${todayTasks.length} task${todayTasks.length !== 1 ? 's' : ''} for ${dayName}`}
      </p>

      {todayTasks.map(task => (
        <div key={task.id}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 mb-2 flex items-center gap-3">
          <button
            onClick={() => onComplete(task.id)}
            className="w-6 h-6 rounded-full border-2 border-gray-300 hover:border-green-400 flex-shrink-0 flex items-center justify-center transition-colors"
          />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-800">{task.title}</p>
            <p className="text-xs text-gray-400">{task.category} · {task.priority}</p>
          </div>
          {task.recurrence !== 'None' && (
            <span className="text-xs text-blue-400">↻</span>
          )}
        </div>
      ))}
    </div>
  );
}
