import { useState, useCallback, useEffect } from 'react';
import { Task, DaySection, SectionAssignment, SectionTemplate } from '../types';
import { api } from '../lib/api';
import { format } from 'date-fns';

const DAY_MAP: Record<string, number> = {
  Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
  Thursday: 4, Friday: 5, Saturday: 6,
};

export function useUpcoming(tasks: Task[]) {
  const [todaySections, setTodaySections] = useState<DaySection[]>([]);
  const [tomorrowSections, setTomorrowSections] = useState<DaySection[]>([]);
  const [todayAssignments, setTodayAssignments] = useState<SectionAssignment[]>([]);
  const [tomorrowAssignments, setTomorrowAssignments] = useState<SectionAssignment[]>([]);
  const [templates, setTemplates] = useState<SectionTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const today = format(new Date(), 'yyyy-MM-dd');
  const tomorrow = format(new Date(Date.now() + 86400000), 'yyyy-MM-dd');

  const todayNum = new Date().getDay();
  const tomorrowNum = (todayNum + 1) % 7;

  const getTasksForDay = useCallback((dayNum: number, dateStr: string): Task[] => {
    return tasks.filter(task => {
      if (task.status === 'Done') return false;
      if (task.dueDate === dateStr) return true;
      if (task.recurrence === 'Daily') return true;
      if ((task.recurrence === 'Weekly' || task.recurrence === 'Biweekly') && task.recurrenceDay) {
        return DAY_MAP[task.recurrenceDay] === dayNum;
      }
      return false;
    });
  }, [tasks]);

  const fetchUpcoming = useCallback(async () => {
    try {
      setLoading(true);
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
    } catch (e) {
      console.error('Failed to load upcoming', e);
    } finally {
      setLoading(false);
    }
  }, [today, tomorrow]);

  useEffect(() => { fetchUpcoming(); }, [fetchUpcoming]);

  const addSection = useCallback(async (date: string, title: string) => {
    const sections = date === today ? todaySections : tomorrowSections;
    await api.createDaySection(date, title, sections.length);
    await fetchUpcoming();
  }, [today, todaySections, tomorrowSections, fetchUpcoming]);

  const updateSection = useCallback(async (id: string, updates: Partial<DaySection>) => {
    await api.updateDaySection(id, updates);
    await fetchUpcoming();
  }, [fetchUpcoming]);

  const deleteSection = useCallback(async (id: string) => {
    await api.deleteDaySection(id);
    await fetchUpcoming();
  }, [fetchUpcoming]);

  const reorderSections = useCallback(async (date: string, sectionIds: string[]) => {
    await api.reorderDaySections(sectionIds);
    await fetchUpcoming();
  }, [fetchUpcoming]);

  const assignTask = useCallback(async (
    taskId: string,
    sectionId: string | null,
    date: string,
    sortOrder: number
  ) => {
    await api.assignToSection(taskId, sectionId, date, sortOrder);
    await fetchUpcoming();
  }, [fetchUpcoming]);

  const reorderAssignments = useCallback(async (
    assignments: { taskId: string; sectionId: string | null; date: string; sortOrder: number }[]
  ) => {
    await api.reorderAssignments(assignments);
    await fetchUpcoming();
  }, [fetchUpcoming]);

  const addTemplate = useCallback(async (title: string) => {
    await api.createSectionTemplate(title);
    await fetchUpcoming();
  }, [fetchUpcoming]);

  const deleteTemplate = useCallback(async (id: string) => {
    await api.deleteSectionTemplate(id);
    await fetchUpcoming();
  }, [fetchUpcoming]);

  return {
    today,
    tomorrow,
    todayTasks: getTasksForDay(todayNum, today),
    tomorrowTasks: getTasksForDay(tomorrowNum, tomorrow),
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
    assignTask,
    reorderAssignments,
    addTemplate,
    deleteTemplate,
    refetch: fetchUpcoming,
  };
}
