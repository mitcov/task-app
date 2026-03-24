import React, { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  DragOverlay,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task, DaySection, SectionAssignment, SectionTemplate } from '../types';
import { useUpcoming } from '../hooks/useUpcoming';

// ── Section Header ────────────────────────────────────────────────────────────

interface SectionHeaderProps {
  section: DaySection;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  dragHandleProps: any;
}

function SectionHeader({ section, onRename, onDelete, dragHandleProps }: SectionHeaderProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(section.title);

  const handleBlur = () => {
    setEditing(false);
    if (title.trim() && title !== section.title) {
      onRename(section.id, title.trim());
    }
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-700">
      <div {...dragHandleProps}
        className="text-gray-300 dark:text-gray-600 cursor-grab active:cursor-grabbing select-none px-1 touch-none">
        ⣿
      </div>
      {editing ? (
        <input
          autoFocus
          value={title}
          onChange={e => setTitle(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={e => { if (e.key === 'Enter') handleBlur(); }}
          className="flex-1 text-sm font-semibold bg-transparent border-b border-blue-400 outline-none text-gray-700 dark:text-gray-300 py-0.5"
        />
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="flex-1 text-left text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide"
        >
          {section.title}
        </button>
      )}
      <button
        onClick={() => onDelete(section.id)}
        className="text-gray-200 dark:text-gray-700 hover:text-red-400 text-base flex-shrink-0"
      >
        ×
      </button>
    </div>
  );
}

// ── Section Block (draggable whole unit) ─────────────────────────────────────

interface SectionBlockProps {
  section: DaySection;
  tasks: Task[];
  isDragging: boolean;
  isTaskOver: boolean;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onComplete: (id: string) => void;
  onTaskClick: (task: Task) => void;
  getAssignment: (taskId: string) => SectionAssignment | undefined;
  activeTaskId: string | null;
}

function SectionBlock({
  section, tasks, isDragging, isTaskOver,
  onRename, onDelete, onComplete, onTaskClick,
  getAssignment, activeTaskId,
}: SectionBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSectionDragging,
  } = useSortable({
    id: `section-${section.id}`,
    data: { type: 'section', sectionId: section.id },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSectionDragging ? 0.3 : 1,
  };

  const sectionTasks = tasks
    .filter(t => getAssignment(t.id)?.sectionId === section.id)
    .sort((a, b) => (getAssignment(a.id)?.sortOrder ?? 999) - (getAssignment(b.id)?.sortOrder ?? 999));

  return (
    <div ref={setNodeRef} style={style} className="mb-3">
      <div className={`bg-gray-50 dark:bg-gray-900 rounded-2xl border-2 overflow-hidden transition-colors duration-150
        ${isTaskOver ? 'border-blue-300 dark:border-blue-700' : 'border-gray-200 dark:border-gray-700'}`}>
        <SectionHeader
          section={section}
          onRename={onRename}
          onDelete={onDelete}
          dragHandleProps={{ ...attributes, ...listeners }}
        />
        <div className="p-3 space-y-0">
          {sectionTasks.map(task => (
            <TaskRow
              key={task.id}
              task={task}
              onComplete={onComplete}
              onTaskClick={onTaskClick}
            />
          ))}
          {/* Drop zone — only visible during drag */}
          {activeTaskId && (
            <SectionDropZone
              sectionId={section.id}
              isOver={isTaskOver}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Section Drop Zone ─────────────────────────────────────────────────────────

interface SectionDropZoneProps {
  sectionId: string;
  isOver: boolean;
}

function SectionDropZone({ sectionId, isOver }: SectionDropZoneProps) {
  const { setNodeRef } = useSortable({
    id: `dropzone-${sectionId}`,
    data: { type: 'dropzone', sectionId },
  });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border-2 border-dashed text-center transition-all duration-200 overflow-hidden
        ${isOver
          ? 'border-blue-400 bg-blue-50 dark:bg-blue-950 p-3 opacity-100'
          : 'border-gray-200 dark:border-gray-700 p-1 opacity-40'}`}
    >
      <p className={`text-xs transition-colors ${isOver ? 'text-blue-500' : 'text-gray-300 dark:text-gray-600'}`}>
        {isOver ? 'Drop here' : '·'}
      </p>
    </div>
  );
}

// ── Loose Tasks Drop Zone ─────────────────────────────────────────────────────

interface LooseDropZoneProps {
  date: string;
  isOver: boolean;
  active: boolean;
}

function LooseDropZone({ date, isOver, active }: LooseDropZoneProps) {
  const { setNodeRef } = useDroppable({
    id: `loose-${date}`,
    data: { type: 'loose', date },
  });

  if (!active) return null;

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border-2 border-dashed text-center transition-all duration-200 mb-2
        ${isOver
          ? 'border-blue-400 bg-blue-50 dark:bg-blue-950 p-3'
          : 'border-gray-200 dark:border-gray-700 p-2 opacity-50'}`}
    >
      <p className={`text-xs ${isOver ? 'text-blue-500' : 'text-gray-300 dark:text-gray-600'}`}>
        {isOver ? 'Drop to unassign from section' : 'Drop here for loose task'}
      </p>
    </div>
  );
}

// ── Task Row ──────────────────────────────────────────────────────────────────

interface TaskRowProps {
  task: Task;
  onComplete: (id: string) => void;
  onTaskClick: (task: Task) => void;
  overlay?: boolean;
}

function TaskRow({ task, onComplete, onTaskClick, overlay }: TaskRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id, data: { type: 'task', taskId: task.id } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.2 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={overlay ? {} : style}
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-3 mb-2 flex items-center gap-3
        ${task.status === 'Done' ? 'opacity-50' : ''}
        ${overlay ? 'shadow-xl rotate-1 scale-105' : ''}`}
    >
      <div {...attributes} {...listeners}
        className="text-gray-400 dark:text-gray-500 cursor-grab active:cursor-grabbing select-none px-2 py-2 flex-shrink-0 touch-none">
        ⣿
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onComplete(task.id); }}
        className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors
          ${task.status === 'Done'
            ? 'bg-green-400 border-green-400 text-white'
            : 'border-gray-300 hover:border-green-400'}`}
      >
        {task.status === 'Done' && <span className="text-xs">✓</span>}
      </button>
      <div className="flex-1 min-w-0" onClick={() => onTaskClick(task)}>
        <p className={`text-sm font-medium truncate ${task.status === 'Done' ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-100'}`}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-400">{task.category}</span>
          <span className="text-xs text-gray-400">{task.priority}</span>
          {task.recurrence !== 'None' && (
            <span className="text-xs text-blue-400">↻</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Add Section Button ────────────────────────────────────────────────────────

interface AddSectionButtonProps {
  date: string;
  templates: SectionTemplate[];
  onAdd: (date: string, title: string) => void;
  onSaveTemplate: (title: string) => void;
  onDeleteTemplate: (id: string) => void;
}

function AddSectionButton({ date, templates, onAdd, onSaveTemplate, onDeleteTemplate }: AddSectionButtonProps) {
  const [open, setOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);

  const handleAdd = (title: string) => {
    onAdd(date, title);
    if (saveAsTemplate) onSaveTemplate(title);
    setOpen(false);
    setNewTitle('');
    setSaveAsTemplate(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="text-xs text-blue-500 font-semibold hover:text-blue-600 transition-colors"
      >
        + Section
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-4 z-50 w-64">
            {templates.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Templates</p>
                {templates.map(t => (
                  <div key={t.id} className="flex items-center gap-2 mb-1">
                    <button
                      onClick={() => handleAdd(t.title)}
                      className="flex-1 text-left text-sm text-gray-700 dark:text-gray-300 hover:text-blue-500 py-1"
                    >
                      {t.title}
                    </button>
                    <button
                      onClick={() => onDeleteTemplate(t.id)}
                      className="text-gray-300 dark:text-gray-600 hover:text-red-400 text-sm"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <div className="border-t border-gray-100 dark:border-gray-700 my-2" />
              </div>
            )}
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">New Section</p>
            <input
              autoFocus
              type="text"
              placeholder="Section title..."
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && newTitle.trim()) handleAdd(newTitle.trim()); }}
              className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 mb-2"
            />
            <label className="flex items-center gap-2 mb-3 cursor-pointer">
              <input
                type="checkbox"
                checked={saveAsTemplate}
                onChange={e => setSaveAsTemplate(e.target.checked)}
                className="rounded"
              />
              <span className="text-xs text-gray-500 dark:text-gray-400">Save as template</span>
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => { if (newTitle.trim()) handleAdd(newTitle.trim()); }}
                disabled={!newTitle.trim()}
                className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-200 text-white text-sm font-semibold py-2 rounded-xl transition-colors"
              >
                Add
              </button>
              <button
                onClick={() => setOpen(false)}
                className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-500 text-sm font-semibold py-2 rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Day Block ─────────────────────────────────────────────────────────────────

interface DayBlockProps {
  label: string;
  date: string;
  tasks: Task[];
  sections: DaySection[];
  assignments: SectionAssignment[];
  templates: SectionTemplate[];
  activeTaskId: string | null;
  activeSectionDate: string | null;
  overDayDate: string | null;
  overSectionId: string | null;
  onComplete: (id: string) => void;
  onTaskClick: (task: Task) => void;
  onAddSection: (date: string, title: string) => void;
  onRenameSection: (id: string, title: string) => void;
  onDeleteSection: (id: string) => void;
  onSaveTemplate: (title: string) => void;
  onDeleteTemplate: (id: string) => void;
}

function DayBlock({
  label, date, tasks, sections, assignments, templates,
  activeTaskId, activeSectionDate, overDayDate, overSectionId,
  onComplete, onTaskClick, onAddSection,
  onRenameSection, onDeleteSection,
  onSaveTemplate, onDeleteTemplate,
}: DayBlockProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pending = tasks.filter(t => t.status !== 'Done').length;
  const isThisDayOver = overDayDate === date && !overSectionId;
  const isDraggingFromOtherDay = activeTaskId !== null && activeSectionDate !== date;

  const getAssignment = useCallback(
    (taskId: string) => assignments.find(a => a.taskId === taskId),
    [assignments]
  );

  const looseTasks = tasks
    .filter(t => { const a = getAssignment(t.id); return !a || a.sectionId === null; })
    .sort((a, b) => (getAssignment(a.id)?.sortOrder ?? 999) - (getAssignment(b.id)?.sortOrder ?? 999));

  const sectionIds = sections.map(s => `section-${s.id}`);
  const looseTaskIds = looseTasks.map(t => t.id);
  const dropzoneIds = sections.map(s => `dropzone-${s.id}`);
  const allIds = [...sectionIds, ...looseTaskIds, ...dropzoneIds];

  return (
    <div className={`mb-8 rounded-2xl transition-all duration-200
      ${isDraggingFromOtherDay && isThisDayOver
        ? 'ring-2 ring-blue-400 ring-offset-2 dark:ring-offset-gray-950'
        : ''}`}
    >
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setCollapsed(c => !c)} className="flex items-center gap-2">
          <h2 className="text-base font-bold text-gray-800 dark:text-white">{label}</h2>
          {pending > 0 && (
            <span className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-xs font-semibold px-2 py-0.5 rounded-full">
              {pending}
            </span>
          )}
          <span className="text-gray-400 text-sm">{collapsed ? '▸' : '▾'}</span>
        </button>
        <AddSectionButton
          date={date}
          templates={templates}
          onAdd={onAddSection}
          onSaveTemplate={onSaveTemplate}
          onDeleteTemplate={onDeleteTemplate}
        />
      </div>

      {!collapsed && (
        <SortableContext items={allIds} strategy={verticalListSortingStrategy}>
          {tasks.length === 0 && sections.length === 0 ? (
            <div className={`rounded-xl border-2 border-dashed p-4 text-center transition-colors
              ${isDraggingFromOtherDay && isThisDayOver
                ? 'border-blue-400 bg-blue-50 dark:bg-blue-950'
                : 'border-gray-200 dark:border-gray-700'}`}>
              <p className="text-xs text-gray-400 dark:text-gray-600">
                {isDraggingFromOtherDay ? 'Drop to move here' : 'Nothing scheduled'}
              </p>
            </div>
          ) : (
            <>
              {sections.map(section => (
                <SectionBlock
                  key={section.id}
                  section={section}
                  tasks={tasks}
                  isDragging={false}
                  isTaskOver={overSectionId === section.id}
                  onRename={onRenameSection}
                  onDelete={onDeleteSection}
                  onComplete={onComplete}
                  onTaskClick={onTaskClick}
                  getAssignment={getAssignment}
                  activeTaskId={activeTaskId}
                />
              ))}

              {/* Loose tasks drop zone — only during drag */}
              {activeTaskId && sections.length > 0 && (
                <LooseDropZone
                  date={date}
                  isOver={isThisDayOver && overSectionId === null}
                  active={!!activeTaskId}
                />
              )}

              {looseTasks.map(task => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onComplete={onComplete}
                  onTaskClick={onTaskClick}
                />
              ))}

              {/* Cross-day drop indicator */}
              {isDraggingFromOtherDay && (
                <div className={`rounded-xl border-2 border-dashed p-3 text-center transition-all duration-200 mt-2
                  ${isThisDayOver
                    ? 'border-blue-400 bg-blue-50 dark:bg-blue-950 opacity-100'
                    : 'border-gray-200 dark:border-gray-700 opacity-40'}`}>
                  <p className={`text-xs ${isThisDayOver ? 'text-blue-500' : 'text-gray-300 dark:text-gray-600'}`}>
                    Drop to move to {label}
                  </p>
                </div>
              )}
            </>
          )}
        </SortableContext>
      )}
    </div>
  );
}

// ── Upcoming View ─────────────────────────────────────────────────────────────

interface UpcomingViewProps {
  tasks: Task[];
  onComplete: (id: string) => void;
  onTaskClick: (task: Task) => void;
  onUpdateTask: (id: string, updates: any) => void;
}

export function UpcomingView({ tasks, onComplete, onTaskClick, onUpdateTask }: UpcomingViewProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeTaskDate, setActiveTaskDate] = useState<string | null>(null);
  const [overDayDate, setOverDayDate] = useState<string | null>(null);
  const [overSectionId, setOverSectionId] = useState<string | null>(null);

  const handleUpdateTaskDate = useCallback(async (id: string, date: string) => {
    await onUpdateTask(id, { dueDate: date });
  }, [onUpdateTask]);

  const {
    today, tomorrow,
    todayTasks, tomorrowTasks,
    todaySections, tomorrowSections,
    todayAssignments, tomorrowAssignments,
    templates, loading,
    addSection, updateSection, deleteSection, reorderSections,
    reorderAssignments, moveTaskToDay, addTemplate, deleteTemplate,
  } = useUpcoming(tasks, handleUpdateTaskDate);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, { activationConstraint: { delay: 300, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const allAssignments = [...todayAssignments, ...tomorrowAssignments];
  const allSections = [...todaySections, ...tomorrowSections];

  const getTaskById = (id: string) => tasks.find(t => t.id === id);
  const getSectionDate = (sectionId: string) => {
    if (todaySections.some(s => s.id === sectionId)) return today;
    if (tomorrowSections.some(s => s.id === sectionId)) return tomorrow;
    return null;
  };
  const getTaskDate = (taskId: string) => {
    const assignment = allAssignments.find(a => a.taskId === taskId);
    if (assignment) return assignment.date;
    if (todayTasks.some(t => t.id === taskId)) return today;
    if (tomorrowTasks.some(t => t.id === taskId)) return tomorrow;
    return null;
  };
  const getAssignmentForDay = (taskId: string, date: string) =>
    allAssignments.find(a => a.taskId === taskId && a.date === date);

  const handleDragStart = ({ active }: DragStartEvent) => {
    if (active.data.current?.type === 'task') {
      const task = getTaskById(active.id as string);
      if (task) {
        setActiveTask(task);
        setActiveTaskDate(getTaskDate(active.id as string));
      }
    }
  };

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) { setOverDayDate(null); setOverSectionId(null); return; }

    const overData = over.data?.current as any;

    if (overData?.type === 'dropzone') {
      setOverSectionId(overData.sectionId);
      setOverDayDate(getSectionDate(overData.sectionId));
      return;
    }

    if (overData?.type === 'section') {
      setOverSectionId(overData.sectionId);
      setOverDayDate(getSectionDate(overData.sectionId));
      return;
    }

    if (overData?.type === 'loose') {
      setOverSectionId(null);
      setOverDayDate(overData.date);
      return;
    }

    if (overData?.type === 'task') {
      const assignment = allAssignments.find(a => a.taskId === over.id);
      setOverSectionId(assignment?.sectionId ?? null);
      const taskDate = getTaskDate(over.id as string);
      setOverDayDate(taskDate);
      return;
    }

    setOverDayDate(null);
    setOverSectionId(null);
  };

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    const prevTask = activeTask;
    const prevTaskDate = activeTaskDate;
    setActiveTask(null);
    setActiveTaskDate(null);
    setOverDayDate(null);
    setOverSectionId(null);

    if (!over || active.id === over.id) return;

    const activeIdStr = active.id as string;
    const overIdStr = over.id as string;
    const overData = over.data?.current as any;

    // ── Section reorder ──
    if (activeIdStr.startsWith('section-')) {
      const activeSectionId = activeIdStr.replace('section-', '');
      const activeSection = allSections.find(s => s.id === activeSectionId);
      if (!activeSection) return;
      const date = getSectionDate(activeSectionId);
      if (!date) return;
      const daySections = date === today ? todaySections : tomorrowSections;

      if (overIdStr.startsWith('section-')) {
        const overSectionId = overIdStr.replace('section-', '');
        const oldIndex = daySections.findIndex(s => s.id === activeSectionId);
        const newIndex = daySections.findIndex(s => s.id === overSectionId);
        if (oldIndex !== -1 && newIndex !== -1) {
          const reordered = [...daySections];
          const [moved] = reordered.splice(oldIndex, 1);
          reordered.splice(newIndex, 0, moved);
          await reorderSections(date, reordered.map(s => s.id));
        }
      }
      return;
    }

    // ── Task drag ──
    if (!prevTask || !prevTaskDate) return;
    const targetDate = overDayDate || prevTaskDate;
    const isCrossDay = targetDate !== prevTaskDate;

    if (isCrossDay) {
      await moveTaskToDay(activeIdStr, prevTaskDate, targetDate, prevTask);
      return;
    }

    // Same-day reorder/reassign
    const dayTasks = targetDate === today ? todayTasks : tomorrowTasks;
    const dayAssignments = targetDate === today ? todayAssignments : tomorrowAssignments;

    let newSectionId: string | null = null;
    let newSortOrder = 999;

    if (overIdStr.startsWith('dropzone-')) {
      newSectionId = overIdStr.replace('dropzone-', '');
      newSortOrder = 999;
    } else if (overData?.type === 'loose') {
      newSectionId = null;
      newSortOrder = 999;
    } else if (overIdStr.startsWith('section-')) {
      newSectionId = overIdStr.replace('section-', '');
      newSortOrder = 0;
    } else {
      // Dropped on a task
      const overAssignment = dayAssignments.find(a => a.taskId === overIdStr);
      newSectionId = overAssignment?.sectionId ?? null;
      const overIndex = dayTasks.findIndex(t => t.id === overIdStr);
      newSortOrder = overIndex;
    }

    const newAssignments = dayTasks.map((t, idx) => {
      const a = getAssignmentForDay(t.id, targetDate);
      if (t.id === activeIdStr) {
        return { taskId: t.id, sectionId: newSectionId, date: targetDate, sortOrder: newSortOrder };
      }
      return { taskId: t.id, sectionId: a?.sectionId ?? null, date: targetDate, sortOrder: a?.sortOrder ?? idx };
    });

    await reorderAssignments(newAssignments);
  };

  if (loading) return <p className="text-xs text-gray-400 dark:text-gray-600 text-center py-8">Loading...</p>;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <DayBlock
        label="Today"
        date={today}
        tasks={todayTasks}
        sections={todaySections}
        assignments={todayAssignments}
        templates={templates}
        activeTaskId={activeTask?.id ?? null}
        activeSectionDate={activeTaskDate}
        overDayDate={overDayDate}
        overSectionId={overSectionId}
        onComplete={onComplete}
        onTaskClick={onTaskClick}
        onAddSection={addSection}
        onRenameSection={(id, title) => updateSection(id, { title })}
        onDeleteSection={deleteSection}
        onSaveTemplate={addTemplate}
        onDeleteTemplate={deleteTemplate}
      />
      <DayBlock
        label="Tomorrow"
        date={tomorrow}
        tasks={tomorrowTasks}
        sections={tomorrowSections}
        assignments={tomorrowAssignments}
        templates={templates}
        activeTaskId={activeTask?.id ?? null}
        activeSectionDate={activeTaskDate}
        overDayDate={overDayDate}
        overSectionId={overSectionId}
        onComplete={onComplete}
        onTaskClick={onTaskClick}
        onAddSection={addSection}
        onRenameSection={(id, title) => updateSection(id, { title })}
        onDeleteSection={deleteSection}
        onSaveTemplate={addTemplate}
        onDeleteTemplate={deleteTemplate}
      />

      <DragOverlay>
        {activeTask && (
          <TaskRow
            task={activeTask}
            onComplete={() => {}}
            onTaskClick={() => {}}
            overlay
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}
