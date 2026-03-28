import { useState, useCallback, useEffect, useRef } from 'react';
import { Task, DaySection, SectionAssignment, SectionTemplate } from '../types';
import { api } from '../lib/api';
import { format } from 'date-fns';

const DAY_MAP: Record<string, number> = {
  Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
  Thursday: 4, Friday: 5, Saturday: 6,
};

export function useUpcoming(tasks: Task[], userId: string) {
  const [todaySections, setTodaySections] = useState<DaySection[]>([]);
  const [tomorrowSections, setTomorrowSections] = useState<DaySection[]>([]);
  const [todayAssignments, setTodayAssignments] = useState<SectionAssignment[]>([]);
  const [tomorrowAssignments, setTomorrowAssignments] = useState<SectionAssignment[]>([]);
  const [templates, setTemplates] = useState<SectionTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const initialLoadRef = useRef(true);

  // Clear stale state immediately when the user switches
  useEffect(() => {
    setTodaySections([]);
    setTomorrowSections([]);
    setTodayAssignments([]);
    setTomorrowAssignments([]);
    setTemplates([]);
    initialLoadRef.current = true;
  }, [userId]);

  const today = format(new Date(), 'yyyy-MM-dd');
  const tomorrow = format(new Date(Date.now() + 86400000), 'yyyy-MM-dd');
  const todayNum = new Date().getDay();
  const tomorrowNum = (todayNum + 1) % 7;

  // Tasks appear in a day if:
  // 1. They have an explicit SectionAssignment for that day, OR
  // 2. They have no assignment on EITHER day AND match via dueDate/recurrence
  const getTasksForDay = useCallback((
    dayNum: number,
    dateStr: string,
    thisAssignments: SectionAssignment[],
    otherAssignments: SectionAssignment[],
  ): Task[] => {
    const assignedHere = new Set(thisAssignments.map(a => a.taskId));
    const assignedElsewhere = new Set(otherAssignments.map(a => a.taskId));
    return tasks.filter(task => {
      if (task.status === 'Done') {
        // Today-completed tasks stay visible in today's view only
        return task.completedDate === dateStr && dateStr === today;
      }
      if (assignedHere.has(task.id)) return true;
      if (assignedElsewhere.has(task.id)) return false;
      if (task.dueDate === dateStr) return true;
      // Pull overdue tasks (past due date, not completed) into today only
      if (dateStr === today && task.dueDate && task.dueDate < today) return true;
      if (task.recurrence === 'Daily') return true;
      if ((task.recurrence === 'Weekly' || task.recurrence === 'Biweekly') && task.recurrenceDay) {
        return DAY_MAP[task.recurrenceDay] === dayNum;
      }
      return false;
    });
  }, [tasks, today]);

  const fetchUpcoming = useCallback(async () => {
    if (!userId) return;
    try {
      if (initialLoadRef.current) setLoading(true);
      const [todayData, tomorrowData, templatesData] = await Promise.all([
        api.getUpcoming(today),
        api.getUpcoming(tomorrow),
        api.getSectionTemplates(),
      ]);
      setTodaySections(todayData.sections);
      setTomorrowSections(tomorrowData.sections);
      setTodayAssignments(todayData.assignments);
      setTomorrowAssignments(tomorrowData.assignments);
      setTemplates(templatesData);
      initialLoadRef.current = false;
    } catch (e) {
      console.error('Failed to load upcoming', e);
    } finally {
      setLoading(false);
    }
  }, [today, tomorrow, userId]);

  useEffect(() => { fetchUpcoming(); }, [fetchUpcoming]);

  const addSection = useCallback(async (date: string, title: string) => {
    const sections = date === today ? todaySections : tomorrowSections;
    const newSection = await api.createDaySection(date, title, sections.length * 10);
    const setSections = date === today ? setTodaySections : setTomorrowSections;
    setSections(prev => [...prev, newSection]);
  }, [today, todaySections, tomorrowSections]);

  const updateSection = useCallback(async (id: string, updates: Partial<DaySection>) => {
    // Optimistic
    setTodaySections(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    setTomorrowSections(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    api.updateDaySection(id, updates).catch(() => fetchUpcoming());
  }, [fetchUpcoming]);

  const deleteSection = useCallback(async (id: string) => {
    // Optimistic
    setTodaySections(prev => prev.filter(s => s.id !== id));
    setTomorrowSections(prev => prev.filter(s => s.id !== id));
    // Orphan tasks in that section (make them loose)
    setTodayAssignments(prev => prev.map(a => a.sectionId === id ? { ...a, sectionId: null } : a));
    setTomorrowAssignments(prev => prev.map(a => a.sectionId === id ? { ...a, sectionId: null } : a));
    api.deleteDaySection(id).catch(() => fetchUpcoming());
  }, [fetchUpcoming]);

  // Reorder sections only (when no loose tasks involved)
  const reorderSections = useCallback(async (date: string, sectionIds: string[]) => {
    const setSections = date === today ? setTodaySections : setTomorrowSections;
    setSections(prev => {
      const map = new Map(prev.map(s => [s.id, s]));
      return sectionIds.map((id, idx) => ({ ...map.get(id)!, sortOrder: idx * 10 }));
    });
    api.reorderDaySections(sectionIds).catch(() => fetchUpcoming());
  }, [today, fetchUpcoming]);

  // Unified reorder: update sections and loose tasks in the same sortOrder space.
  // sectionUpdates: array of { id, sortOrder } for each section's new day-level position.
  // looseAssignments: array of { taskId, sectionId, date, sortOrder } for loose tasks.
  const reorderDayItems = useCallback(async (
    date: string,
    sectionUpdates: { id: string; sortOrder: number }[],
    looseAssignments: { taskId: string; sectionId: string | null; date: string; sortOrder: number }[],
  ) => {
    // Optimistic
    const setSections = date === today ? setTodaySections : setTomorrowSections;
    setSections(prev => prev.map(s => {
      const upd = sectionUpdates.find(u => u.id === s.id);
      return upd ? { ...s, sortOrder: upd.sortOrder } : s;
    }));

    const setAssignments = date === today ? setTodayAssignments : setTomorrowAssignments;
    setAssignments(prev => {
      const next = [...prev];
      looseAssignments.forEach(la => {
        const idx = next.findIndex(a => a.taskId === la.taskId);
        if (idx >= 0) {
          next[idx] = { ...next[idx], sectionId: la.sectionId, sortOrder: la.sortOrder };
        } else {
          next.push({ id: `opt-${la.taskId}`, userId: '', ...la });
        }
      });
      return next;
    });

    // Persist in parallel (sections one by one, assignments batch)
    const saves: Promise<unknown>[] = [
      ...sectionUpdates.map(u => api.updateDaySection(u.id, { sortOrder: u.sortOrder })),
      ...(looseAssignments.length > 0 ? [api.reorderAssignments(looseAssignments)] : []),
    ];
    Promise.all(saves).catch(() => fetchUpcoming());
  }, [today, fetchUpcoming]);

  // Reorder task assignments (section membership + order within section)
  const reorderAssignments = useCallback(async (
    assignments: { taskId: string; sectionId: string | null; date: string; sortOrder: number }[]
  ) => {
    // Optimistic
    const byDate: Record<string, typeof assignments> = {};
    assignments.forEach(a => { (byDate[a.date] ||= []).push(a); });

    if (byDate[today]) {
      setTodayAssignments(prev => {
        const next = [...prev];
        byDate[today].forEach(na => {
          const idx = next.findIndex(a => a.taskId === na.taskId);
          if (idx >= 0) next[idx] = { ...next[idx], sectionId: na.sectionId, sortOrder: na.sortOrder };
          else next.push({ id: `opt-${na.taskId}`, userId: '', ...na });
        });
        return next;
      });
    }
    if (byDate[tomorrow]) {
      setTomorrowAssignments(prev => {
        const next = [...prev];
        byDate[tomorrow].forEach(na => {
          const idx = next.findIndex(a => a.taskId === na.taskId);
          if (idx >= 0) next[idx] = { ...next[idx], sectionId: na.sectionId, sortOrder: na.sortOrder };
          else next.push({ id: `opt-${na.taskId}`, userId: '', ...na });
        });
        return next;
      });
    }

    api.reorderAssignments(assignments).catch(() => fetchUpcoming());
  }, [today, tomorrow, fetchUpcoming]);

  // Schedule a task to another day without changing its due date.
  const moveTaskToDay = useCallback(async (
    taskId: string,
    fromDate: string,
    toDate: string,
  ) => {
    const fromAssignments = fromDate === today ? todayAssignments : tomorrowAssignments;
    const toAssignments = toDate === today ? todayAssignments : tomorrowAssignments;
    const setFrom = fromDate === today ? setTodayAssignments : setTomorrowAssignments;
    const setTo = toDate === today ? setTodayAssignments : setTomorrowAssignments;

    const existingFrom = fromAssignments.find(a => a.taskId === taskId);
    const existingTo = toAssignments.find(a => a.taskId === taskId);

    // Optimistic: remove from source, add/update in target
    setFrom(prev => prev.filter(a => a.taskId !== taskId));
    const newSortOrder = (toAssignments.reduce((m, a) => Math.max(m, a.sortOrder), -1) + 1) * 10;
    if (existingTo) {
      setTo(prev => prev.map(a => a.taskId === taskId ? { ...a, sectionId: null, sortOrder: newSortOrder } : a));
    } else {
      setTo(prev => [...prev, { id: `opt-${taskId}`, taskId, sectionId: null, userId: '', date: toDate, sortOrder: newSortOrder }]);
    }

    // API: delete source assignment (if existed), create target assignment.
    // We delete by taskId+date rather than assignment ID to avoid stale optimistic IDs.
    try {
      await Promise.all([
        existingFrom ? api.deleteAssignmentByTask(taskId, fromDate) : Promise.resolve(),
        api.assignToSection(taskId, null, toDate, newSortOrder),
      ]);
    } catch {
      fetchUpcoming();
    }
  }, [today, todayAssignments, tomorrowAssignments, fetchUpcoming]);

  // Move an entire section (and its tasks) to another day.
  const moveSectionToDay = useCallback(async (
    sectionId: string,
    fromDate: string,
    toDate: string,
  ) => {
    const fromSections = fromDate === today ? todaySections : tomorrowSections;
    const fromAssignments = fromDate === today ? todayAssignments : tomorrowAssignments;
    const toSections = toDate === today ? todaySections : tomorrowSections;

    const section = fromSections.find(s => s.id === sectionId);
    if (!section) return;

    const sectionTasks = fromAssignments.filter(a => a.sectionId === sectionId);

    const setFromSections = fromDate === today ? setTodaySections : setTomorrowSections;
    const setToSections = toDate === today ? setTodaySections : setTomorrowSections;
    const setFromAssignments = fromDate === today ? setTodayAssignments : setTomorrowAssignments;
    const setToAssignments = toDate === today ? setTodayAssignments : setTomorrowAssignments;

    // Optimistic: remove from source
    setFromSections(prev => prev.filter(s => s.id !== sectionId));
    setFromAssignments(prev => prev.filter(a => a.sectionId !== sectionId));

    try {
      const newSection = await api.createDaySection(toDate, section.title, toSections.length * 10);

      // Optimistic: add to target
      setToSections(prev => [...prev, newSection]);

      if (sectionTasks.length > 0) {
        const newAssignments = sectionTasks.map(a => ({
          taskId: a.taskId,
          sectionId: newSection.id,
          date: toDate,
          sortOrder: a.sortOrder,
        }));
        await api.reorderAssignments(newAssignments);
        setToAssignments(prev => [
          ...prev,
          ...newAssignments.map(a => ({ id: `opt-${a.taskId}`, userId: '', ...a })),
        ]);
      }

      await api.deleteDaySection(sectionId);
    } catch {
      await fetchUpcoming();
    }
  }, [today, todaySections, tomorrowSections, todayAssignments, tomorrowAssignments, fetchUpcoming]);

  const addTemplate = useCallback(async (title: string) => {
    const tmpl = await api.createSectionTemplate(title);
    setTemplates(prev => [...prev, tmpl]);
  }, []);

  const deleteTemplate = useCallback(async (id: string) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
    api.deleteSectionTemplate(id).catch(() => fetchUpcoming());
  }, [fetchUpcoming]);

  return {
    today,
    tomorrow,
    todayTasks: getTasksForDay(todayNum, today, todayAssignments, tomorrowAssignments),
    tomorrowTasks: getTasksForDay(tomorrowNum, tomorrow, tomorrowAssignments, todayAssignments),
    todaySections,
    tomorrowSections,
    todayAssignments,
    tomorrowAssignments,
    templates,
    loading,
    addSection,
    updateSection,
    deleteSection,
    reorderSections,
    reorderDayItems,
    reorderAssignments,
    moveTaskToDay,
    moveSectionToDay,
    addTemplate,
    deleteTemplate,
    refetch: fetchUpcoming,
  };
}
