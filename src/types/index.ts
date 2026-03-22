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
  tasks: Task[];
}
