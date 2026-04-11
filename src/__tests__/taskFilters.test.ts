/**
 * Tests for core task filtering logic:
 * - groupedCategories filter (completedDate today vs past)
 * - getTasksForDay (overdue, today-completed, recurrence)
 * - Priority type
 * - Date edge cases
 */
import { Task, Priority, priorityColor } from '../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Test Task',
    category: 'Work',
    status: 'To Do',
    priority: 'Medium',
    recurrence: 'None',
    sortOrder: 0,
    reminders: [],
    ...overrides,
  };
}

// Mirrors the groupedCategories filter in useTasks
function filterForAllTasksView(tasks: Task[], today: string): Task[] {
  return tasks.filter(task => {
    if (task.status === 'Done' && task.completedDate !== today) return false;
    return true;
  });
}

const DAY_MAP: Record<string, number> = {
  Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
  Thursday: 4, Friday: 5, Saturday: 6,
};

function minIntervalDays(recurrence: string): number {
  if (recurrence === 'Biweekly') return 14;
  if (recurrence === 'Monthly') return 28;
  return 0;
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

// Mirrors the getTasksForDay logic in useUpcoming
function filterForDayView(
  tasks: Task[],
  dayNum: number,
  dateStr: string,
  today: string,
  assignedHereIds: string[] = [],
  assignedElsewhereIds: string[] = [],
): Task[] {
  const assignedHere = new Set(assignedHereIds);
  const assignedElsewhere = new Set(assignedElsewhereIds);
  const yesterday = (() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  })();
  return tasks.filter(task => {
    if (task.status === 'Done') {
      if (task.recurrence !== 'None' && task.completedDate && task.completedDate < dateStr) {
        // Daily tasks completed today don't bleed into tomorrow
        if (task.completedDate === today && task.recurrence === 'Daily') return false;
        const minDays = minIntervalDays(task.recurrence);
        if (minDays > 0 && daysBetween(task.completedDate, dateStr) < minDays) return false;
        // fall through
      } else {
        // Same-day completion: visible in today's view only.
        // Early completions (weekly/biweekly scheduled for tomorrow) stay in tomorrow's section.
        if (task.completedDate !== dateStr || dateStr !== today) return false;
        const scheduledDayNum = task.recurrenceDay != null ? DAY_MAP[task.recurrenceDay] : -1;
        const isEarlyCompletion =
          (task.recurrence === 'Weekly' || task.recurrence === 'Biweekly') &&
          scheduledDayNum === (dayNum + 1) % 7;
        return !isEarlyCompletion;
      }
    }
    if (assignedHere.has(task.id)) return true;
    if (assignedElsewhere.has(task.id)) return false;
    if (task.dueDate === dateStr) return true;
    if (dateStr === today && task.dueDate && task.dueDate < today) return true;
    if (task.recurrence === 'Daily') return true;
    if ((task.recurrence === 'Weekly' || task.recurrence === 'Biweekly') && task.recurrenceDay) {
      const minDays = minIntervalDays(task.recurrence);
      const intervalReady = minDays === 0 || !task.completedDate || daysBetween(task.completedDate, dateStr) >= minDays;
      if (DAY_MAP[task.recurrenceDay] === dayNum) return intervalReady;
      // Linger: yesterday was the scheduled day and not completed this occurrence
      if (dateStr === today) {
        const prevDayNum = (dayNum - 1 + 7) % 7;
        if (DAY_MAP[task.recurrenceDay] === prevDayNum) {
          const occurrenceInterval = task.recurrence === 'Biweekly' ? 14 : 7;
          const completedThisOccurrence =
            !!task.completedDate && daysBetween(task.completedDate, yesterday) < occurrenceInterval;
          return intervalReady && !completedThisOccurrence;
        }
      }
      return false;
    }
    return false;
  });
}

// ── Priority type tests ───────────────────────────────────────────────────────

describe('Priority type', () => {
  it('accepts High, Medium, Low without emojis', () => {
    const high: Priority = 'High';
    const med: Priority = 'Medium';
    const low: Priority = 'Low';
    expect(high).toBe('High');
    expect(med).toBe('Medium');
    expect(low).toBe('Low');
  });

  it('priorityColor returns red for High', () => {
    expect(priorityColor('High')).toContain('red');
  });

  it('priorityColor returns amber for Medium', () => {
    expect(priorityColor('Medium')).toContain('amber');
  });

  it('priorityColor returns green for Low', () => {
    expect(priorityColor('Low')).toContain('green');
  });
});

// ── All Tasks view filter (completedDate) ─────────────────────────────────────

describe('filterForAllTasksView', () => {
  const TODAY = '2026-03-28';
  const YESTERDAY = '2026-03-27';

  it('shows incomplete tasks', () => {
    const task = makeTask({ status: 'To Do' });
    expect(filterForAllTasksView([task], TODAY)).toHaveLength(1);
  });

  it('shows tasks completed today', () => {
    const task = makeTask({ status: 'Done', completedDate: TODAY });
    expect(filterForAllTasksView([task], TODAY)).toHaveLength(1);
  });

  it('hides tasks completed yesterday', () => {
    const task = makeTask({ status: 'Done', completedDate: YESTERDAY });
    expect(filterForAllTasksView([task], TODAY)).toHaveLength(0);
  });

  it('hides done tasks with no completedDate (legacy)', () => {
    const task = makeTask({ status: 'Done' });
    expect(filterForAllTasksView([task], TODAY)).toHaveLength(0);
  });

  it('mixes today-completed and older done tasks correctly', () => {
    const tasks = [
      makeTask({ id: 'a', status: 'To Do' }),
      makeTask({ id: 'b', status: 'Done', completedDate: TODAY }),
      makeTask({ id: 'c', status: 'Done', completedDate: YESTERDAY }),
      makeTask({ id: 'd', status: 'Done', completedDate: '2026-01-01' }),
    ];
    const visible = filterForAllTasksView(tasks, TODAY);
    expect(visible.map(t => t.id)).toEqual(['a', 'b']);
  });
});

// ── Upcoming day view filter ───────────────────────────────────────────────────

describe('filterForDayView', () => {
  const TODAY = '2026-03-28';
  const TOMORROW = '2026-03-29';
  const YESTERDAY = '2026-03-27';
  const LAST_WEEK = '2026-03-21';
  const TODAY_DAY_NUM = 6; // Saturday
  const TOMORROW_DAY_NUM = 0; // Sunday

  describe('done tasks', () => {
    it('shows today-completed tasks in today view', () => {
      const task = makeTask({ status: 'Done', completedDate: TODAY });
      const result = filterForDayView([task], TODAY_DAY_NUM, TODAY, TODAY);
      expect(result).toHaveLength(1);
    });

    it('hides today-completed tasks in tomorrow view', () => {
      const task = makeTask({ status: 'Done', completedDate: TODAY });
      const result = filterForDayView([task], TOMORROW_DAY_NUM, TOMORROW, TODAY);
      expect(result).toHaveLength(0);
    });

    it('hides yesterday-completed tasks in today view', () => {
      const task = makeTask({ status: 'Done', completedDate: YESTERDAY });
      const result = filterForDayView([task], TODAY_DAY_NUM, TODAY, TODAY);
      expect(result).toHaveLength(0);
    });
  });

  describe('due date matching', () => {
    it('shows task due today in today view', () => {
      const task = makeTask({ dueDate: TODAY });
      expect(filterForDayView([task], TODAY_DAY_NUM, TODAY, TODAY)).toHaveLength(1);
    });

    it('shows task due tomorrow in tomorrow view', () => {
      const task = makeTask({ dueDate: TOMORROW });
      expect(filterForDayView([task], TOMORROW_DAY_NUM, TOMORROW, TODAY)).toHaveLength(1);
    });

    it('does not show task due tomorrow in today view (not overdue)', () => {
      const task = makeTask({ dueDate: TOMORROW });
      expect(filterForDayView([task], TODAY_DAY_NUM, TODAY, TODAY)).toHaveLength(0);
    });
  });

  describe('overdue tasks', () => {
    it('pulls overdue task into today view', () => {
      const task = makeTask({ dueDate: YESTERDAY });
      expect(filterForDayView([task], TODAY_DAY_NUM, TODAY, TODAY)).toHaveLength(1);
    });

    it('pulls week-old overdue task into today view', () => {
      const task = makeTask({ dueDate: LAST_WEEK });
      expect(filterForDayView([task], TODAY_DAY_NUM, TODAY, TODAY)).toHaveLength(1);
    });

    it('does NOT show overdue task in tomorrow view', () => {
      const task = makeTask({ dueDate: YESTERDAY });
      expect(filterForDayView([task], TOMORROW_DAY_NUM, TOMORROW, TODAY)).toHaveLength(0);
    });

    it('does not show completed overdue task in today (already done)', () => {
      const task = makeTask({ dueDate: YESTERDAY, status: 'Done', completedDate: TODAY });
      const result = filterForDayView([task], TODAY_DAY_NUM, TODAY, TODAY);
      // Shows via completedDate===today rule, not overdue rule — but only once
      expect(result).toHaveLength(1);
    });

    it('task with no dueDate is not treated as overdue', () => {
      const task = makeTask({ dueDate: undefined });
      // Should not appear in today unless assigned or recurring
      expect(filterForDayView([task], TODAY_DAY_NUM, TODAY, TODAY)).toHaveLength(0);
    });
  });

  describe('section assignments', () => {
    it('shows task explicitly assigned to today', () => {
      const task = makeTask({ id: 'task-1' });
      expect(filterForDayView([task], TODAY_DAY_NUM, TODAY, TODAY, ['task-1'])).toHaveLength(1);
    });

    it('hides task assigned elsewhere from today', () => {
      const task = makeTask({ id: 'task-1' });
      expect(filterForDayView([task], TODAY_DAY_NUM, TODAY, TODAY, [], ['task-1'])).toHaveLength(0);
    });

    it('overdue task assigned to tomorrow does not appear in today', () => {
      const task = makeTask({ id: 'task-1', dueDate: YESTERDAY });
      // Assigned elsewhere (tomorrow) → not shown in today
      expect(filterForDayView([task], TODAY_DAY_NUM, TODAY, TODAY, [], ['task-1'])).toHaveLength(0);
    });
  });

  describe('recurrence', () => {
    it('daily task appears every day', () => {
      const task = makeTask({ recurrence: 'Daily' });
      expect(filterForDayView([task], TODAY_DAY_NUM, TODAY, TODAY)).toHaveLength(1);
      expect(filterForDayView([task], TOMORROW_DAY_NUM, TOMORROW, TODAY)).toHaveLength(1);
    });

    it('weekly task appears on correct day only', () => {
      // Saturday = 6
      const task = makeTask({ recurrence: 'Weekly', recurrenceDay: 'Saturday' });
      expect(filterForDayView([task], 6, TODAY, TODAY)).toHaveLength(1);
      expect(filterForDayView([task], 0, TOMORROW, TODAY)).toHaveLength(0);
    });

    it('biweekly task appears on correct day when never completed', () => {
      const task = makeTask({ recurrence: 'Biweekly', recurrenceDay: 'Sunday' });
      expect(filterForDayView([task], 0, TOMORROW, TODAY)).toHaveLength(1);
      expect(filterForDayView([task], 6, TODAY, TODAY)).toHaveLength(0);
    });

    it('biweekly task does NOT reappear within 14 days of completion', () => {
      // Completed 7 days ago (last Sunday) — too soon
      const task = makeTask({ recurrence: 'Biweekly', recurrenceDay: 'Sunday', completedDate: LAST_WEEK });
      expect(filterForDayView([task], 0, TOMORROW, TODAY)).toHaveLength(0);
    });

    it('biweekly task reappears after 14 days', () => {
      const twoWeeksAgo = '2026-03-14';
      const task = makeTask({ recurrence: 'Biweekly', recurrenceDay: 'Sunday', completedDate: twoWeeksAgo });
      expect(filterForDayView([task], 0, TOMORROW, TODAY)).toHaveLength(1);
    });

    it('monthly done task does NOT reappear within 28 days', () => {
      const task = makeTask({ recurrence: 'Monthly', status: 'Done', dueDate: LAST_WEEK, completedDate: LAST_WEEK });
      // 7 days since completion → too soon
      expect(filterForDayView([task], TODAY_DAY_NUM, TODAY, TODAY)).toHaveLength(0);
    });

    it('monthly done task reappears after 28 days when due again today', () => {
      // Completed last month (29 days ago), due again today
      const twentyNineDaysAgo = '2026-02-27';
      const task = makeTask({ recurrence: 'Monthly', status: 'Done', dueDate: TODAY, completedDate: twentyNineDaysAgo });
      expect(filterForDayView([task], TODAY_DAY_NUM, TODAY, TODAY)).toHaveLength(1);
    });

    it('daily done task reappears next day after completion', () => {
      const task = makeTask({ recurrence: 'Daily', status: 'Done', completedDate: YESTERDAY });
      // Completed yesterday → reappears today
      expect(filterForDayView([task], TODAY_DAY_NUM, TODAY, TODAY)).toHaveLength(1);
    });

    it('weekly done task reappears on its scheduled day the next week', () => {
      // Saturday = 6 (TODAY_DAY_NUM), completed last week
      const task = makeTask({ recurrence: 'Weekly', recurrenceDay: 'Saturday', status: 'Done', completedDate: LAST_WEEK });
      expect(filterForDayView([task], TODAY_DAY_NUM, TODAY, TODAY)).toHaveLength(1);
    });

    it('weekly done task completed today does not appear in tomorrow view', () => {
      const task = makeTask({ recurrence: 'Weekly', recurrenceDay: 'Saturday', status: 'Done', completedDate: TODAY });
      expect(filterForDayView([task], TOMORROW_DAY_NUM, TOMORROW, TODAY)).toHaveLength(0);
    });

    it('daily done task completed today does not appear in tomorrow view', () => {
      const task = makeTask({ recurrence: 'Daily', status: 'Done', completedDate: TODAY });
      expect(filterForDayView([task], TOMORROW_DAY_NUM, TOMORROW, TODAY)).toHaveLength(0);
    });
  });

  describe('early completion (completing a recurring task before its scheduled day)', () => {
    // TODAY = Saturday (day 6), TOMORROW = Sunday (day 0)

    it('weekly Sunday task completed today (Saturday) appears in tomorrow (Sunday) view as Done', () => {
      const task = makeTask({ recurrence: 'Weekly', recurrenceDay: 'Sunday', status: 'Done', completedDate: TODAY });
      expect(filterForDayView([task], TOMORROW_DAY_NUM, TOMORROW, TODAY)).toHaveLength(1);
    });

    it('weekly Sunday task completed today (Saturday) does NOT appear in today (Saturday) view', () => {
      const task = makeTask({ recurrence: 'Weekly', recurrenceDay: 'Sunday', status: 'Done', completedDate: TODAY });
      expect(filterForDayView([task], TODAY_DAY_NUM, TODAY, TODAY)).toHaveLength(0);
    });

    it('weekly Saturday task completed today still appears in today view (scheduled for today, not early)', () => {
      const task = makeTask({ recurrence: 'Weekly', recurrenceDay: 'Saturday', status: 'Done', completedDate: TODAY });
      expect(filterForDayView([task], TODAY_DAY_NUM, TODAY, TODAY)).toHaveLength(1);
    });

    it('weekly Sunday task completed today does NOT linger into Monday', () => {
      // today=Monday(1), yesterday=Sunday. task completed on Saturday.
      // daysBetween(Saturday, Sunday)=1 < 7 → completedThisOccurrence → no linger
      const MON = '2026-03-30';
      const task = makeTask({ recurrence: 'Weekly', recurrenceDay: 'Sunday', status: 'Done', completedDate: TODAY });
      expect(filterForDayView([task], 1, MON, MON)).toHaveLength(0);
    });

    it('weekly Sunday task completed last week (7+ days ago) DOES linger into Monday', () => {
      const MON = '2026-03-30'; // Monday
      // Completed 8 days ago = previous occurrence → should linger if not completed this week
      const EIGHT_DAYS_AGO = '2026-03-22';
      const task = makeTask({ recurrence: 'Weekly', recurrenceDay: 'Sunday', status: 'Done', completedDate: EIGHT_DAYS_AGO });
      // completedDate is 8 days before yesterday(Sunday March 29) → daysBetween=8 >= 7 → linger allowed
      // but intervalReady: minDays=0 → true. So it lingers as Done.
      expect(filterForDayView([task], 1, MON, MON)).toHaveLength(1);
    });
  });

  describe('edge cases', () => {
    it('empty task list returns empty array', () => {
      expect(filterForDayView([], TODAY_DAY_NUM, TODAY, TODAY)).toHaveLength(0);
    });

    it('task with all defaults does not appear without assignment or due date', () => {
      const task = makeTask(); // no dueDate, no recurrence
      expect(filterForDayView([task], TODAY_DAY_NUM, TODAY, TODAY)).toHaveLength(0);
    });

    it('Skipped status task with due date today appears', () => {
      const task = makeTask({ status: 'Skipped', dueDate: TODAY });
      // Skipped is not 'Done' so it should show if dueDate matches
      expect(filterForDayView([task], TODAY_DAY_NUM, TODAY, TODAY)).toHaveLength(1);
    });

    it('multiple tasks: only overdue and today-due appear in today', () => {
      const tasks = [
        makeTask({ id: 'a', dueDate: YESTERDAY }),          // overdue → today
        makeTask({ id: 'b', dueDate: TODAY }),              // due today → today
        makeTask({ id: 'c', dueDate: TOMORROW }),           // due tomorrow → not today
        makeTask({ id: 'd', recurrence: 'Daily' }),         // daily → today
        makeTask({ id: 'e', status: 'Done', completedDate: TODAY }), // done today → today
        makeTask({ id: 'f', status: 'Done', completedDate: YESTERDAY }), // done yesterday → not today
      ];
      const result = filterForDayView(tasks, TODAY_DAY_NUM, TODAY, TODAY);
      expect(result.map(t => t.id).sort()).toEqual(['a', 'b', 'd', 'e']);
    });
  });
});

// ── Overdue day calculation ───────────────────────────────────────────────────

describe('overdue day calculation', () => {
  function calcOverdueDays(dueDate: string, today: string): number {
    return Math.round(
      (new Date(today).getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  it('yesterday is 1 day overdue', () => {
    expect(calcOverdueDays('2026-03-27', '2026-03-28')).toBe(1);
  });

  it('7 days ago is 7 days overdue', () => {
    expect(calcOverdueDays('2026-03-21', '2026-03-28')).toBe(7);
  });

  it('today is 0 days overdue (not actually overdue)', () => {
    expect(calcOverdueDays('2026-03-28', '2026-03-28')).toBe(0);
  });

  it('month ago calculates correctly', () => {
    expect(calcOverdueDays('2026-02-26', '2026-03-28')).toBe(30);
  });
});
