export type Priority = '🔴 High' | '🟡 Medium' | '🟢 Low';
export type Status = 'To Do' | 'Done' | 'Skipped';
export type Recurrence = 'None' | 'Daily' | 'Weekly' | 'Biweekly' | 'Monthly';
export type RecurrenceDay = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export interface Task {
  id: string;
  title: string;
  category: string;
  status: Status;
  dueDate?: string;
  recurrence: Recurrence;
  recurrenceDay?: RecurrenceDay;
  priority: Priority;
  sortOrder: number;
  lastCompleted?: string;
  notes?: string;
}

export interface Category {
  id: string;
  name: string;
  sortOrder: number;
  color: string;
  tasks: Task[];
}

export const CATEGORY_COLORS: Record<string, string> = {
  Red: 'bg-red-100 text-red-700 border-red-200',
  Orange: 'bg-orange-100 text-orange-700 border-orange-200',
  Yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  Green: 'bg-green-100 text-green-700 border-green-200',
  Blue: 'bg-blue-100 text-blue-700 border-blue-200',
  Purple: 'bg-purple-100 text-purple-700 border-purple-200',
  Pink: 'bg-pink-100 text-pink-700 border-pink-200',
  Gray: 'bg-gray-100 text-gray-700 border-gray-200',
};
