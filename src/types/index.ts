export type Priority = '🔴 High' | '🟡 Medium' | '🟢 Low';
export type Status = 'To Do' | 'Done' | 'Skipped';
export type Recurrence = 'None' | 'Daily' | 'Weekly' | 'Biweekly' | 'Monthly';
export type RecurrenceDay = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export interface Reminder {
  id?: string;
  type: 'once' | 'daily';
  offsetMinutes?: number;
  label?: string;
  dailyTime?: string;
  dailyStart?: string;
}

export const REMINDER_PRESETS: { label: string; offsetMinutes: number }[] = [
  { label: '15 minutes before', offsetMinutes: 15 },
  { label: '30 minutes before', offsetMinutes: 30 },
  { label: '1 hour before', offsetMinutes: 60 },
  { label: '2 hours before', offsetMinutes: 120 },
  { label: '3 hours before', offsetMinutes: 180 },
  { label: '1 day before', offsetMinutes: 1440 },
  { label: '2 days before', offsetMinutes: 2880 },
  { label: '1 week before', offsetMinutes: 10080 },
];

export interface Task {
  id: string;
  userId?: string;
  title: string;
  category: string;
  status: Status;
  dueDate?: string;
  reminderTime?: string;
  recurrence: Recurrence;
  recurrenceDay?: RecurrenceDay;
  priority: Priority;
  sortOrder: number;
  lastCompleted?: string;
  notes?: string;
  reminders: Reminder[];
}

export interface Category {
  id: string;
  name: string;
  sortOrder: number;
  color: string;
  tasks: Task[];
}

export const CATEGORY_COLORS: Record<string, string> = {
  Red: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
  Orange: 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
  Yellow: 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
  Green: 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
  Blue: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  Purple: 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  Pink: 'bg-pink-100 dark:bg-pink-950 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800',
  Gray: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700',
};
