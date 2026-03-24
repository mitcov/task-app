import React, { useState, useCallback } from 'react';
import {
  DndContext,
  pointerWithin,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  DragOverlay,
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

// ── Types ─────────────────────────────────────────────────────────────────────

type FlatItem =
  | { kind: 'section'; id: string; section: DaySection }
  | { kind: 'task'; id: string; task: Task; sectionId: string | null }
  | { kind: 'dropzone'; id: string; sectionId: string }
  | { kind: 'loose-zone'; id: string; date: string };

// ── Section Header ────────────────────────────────────────────────────────────

function SectionHeader({
  section, onRename, onDelete, dragHandleProps,
}: {
  section: DaySection;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  dragHandleProps: any;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(section.title);

  const handleBlur = () => {
    setEditing(false);
    if (title.trim() && title !== section.title) onRename(section.id, title.trim());
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
        <button onClick={() => setEditing(true)}
          className="flex-1 text-left text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {section.title}
        </button>
      )}
      <button onClick={() => onDelete(section.id)}
        className="text-gray-200 dark:text-gray-700 hover:text-red-400 text-base flex-shrink-0">
        ×
      </button>
    </div>
  );
}

// ── Section Container (sortable, wraps header + tasks visually) ───────────────

function SectionContainer({
  section, isOver, onRename, onDelete, children, dragHandleProps, isDraggingSection,
}: {
  section: DaySection;
  isOver: boolean;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  children: React.ReactNode;
  dragHandleProps: any;
  isDraggingSection: boolean;
}) {
  return (
    <div className={`bg-gray-50 dark:bg-gray-900 rounded-2xl border-2 overflow-hidden transition-colors duration-150 mb-1
      ${isOver ? 'border-blue-300 dark:border-blue-700' : 'border-gray-200 dark:border-gray-700'}
      ${isDraggingSection ? 'opacity-30' : ''}`}>
      <SectionHeader
        section={section}
        onRename={onRename}
        onDelete={onDelete}
        dragHandleProps={dragHandleProps}
      />
      <div className="px-3 pt-2 pb-2">
        {children}
      </div>
    </div>
  );
}

// ── Drop Zone ─────────────────────────────────────────────────────────────────

function DropZone({ id, isOver, label, active }: {
  id: string;
  isOver: boolean;
  label: string;
  active: boolean;
}) {
  const { setNodeRef } = useSortable({ id, data: { type: 'dropzone', id } });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border-2 border-dashed text-center transition-all duration-200 overflow-hidden
        ${active
          ? isOver
            ? 'border-blue-400 bg-blue-50 dark:bg-blue-950 p-3 opacity-100 mb-2'
            : 'border-gray-300 dark:border-gray-600 p-2 opacity-60 mb-2'
          : 'p-0 opacity-0 mb-0 border-transparent pointer-events-none h-0'}`}
    >
      {active && (
        <p className={`text-xs transition-colors ${isOver ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500'}`}>
          {isOver ? label : '·'}
        </p>
      )}
    </div>
  );
}

// ── Task Row ──────────────────────────────────────────────────────────────────

function TaskRow({ task, onComplete, onTaskClick, overlay }: {
  task: Task;
  onComplete: (id: string) => void;
  onTaskClick: (task: Task) => void;
  overlay?: boolean;
}) {
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
          ${task.status === 'Done' ? 'bg-green-400 border-green-400 text-white' : 'border-gray-300 hover:border-green-400'}`}
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
          {task.recurrence !== 'None' && <span className="text-xs text-blue-400">↻</span>}
        </div>
      </div>
    </div>
  );
}

// ── Sortable Section (the whole block as a draggable unit) ────────────────────

function SortableSection({
  section, flatItems, isOver, activeTaskId, activeItemId,
  onRename, onDelete, onComplete, onTaskClick,
}: {
  section: DaySection;
  flatItems: FlatItem[];
  isOver: boolean;
  activeTaskId: string | null;
  activeItemId: string | null;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onComplete: (id: string) => void;
  onTaskClick: (task: Task) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: `section-${section.id}`, data: { type: 'section', sectionId: section.id } });

  const style = { transform: CSS.Transform.toString(transform), transition };

  const sectionTaskItems = flatItems.filter(
    i => i.kind === 'task' && i.sectionId === section.id
  ) as Extract<FlatItem, { kind: 'task' }>[];

  const dropzoneItem = flatItems.find(
    i => i.kind === 'dropzone' && i.sectionId === section.id
  );

  return (
    <div ref={setNodeRef} style={style} className="mb-3">
      <SectionContainer
        section={section}
        isOver={isOver}
        onRename={onRename}
        onDelete={onDelete}
        dragHandleProps={{ ...attributes, ...listeners }}
        isDraggingSection={isDragging}
      >
        {sectionTaskItems.map(item => (
          <TaskRow
            key={item.task.id}
            task={item.task}
            onComplete={onComplete}
            onTaskClick={onTaskClick}
          />
        ))}
        {dropzoneItem && (
          <DropZone
            id={dropzoneItem.id}
            isOver={activeItemId === null ? false : isOver}
            label="Drop here"
            active={!!activeTaskId}
          />
        )}
      </SectionContainer>
    </div>
  );
}

// ── Add Section Button ────────────────────────────────────────────────────────

function AddSectionButton({ date, templates, onAdd, onSaveTemplate, onDeleteTemplate }: {
  date: string;
  templates: SectionTemplate[];
  onAdd: (date: string, title: string) => void;
  onSaveTemplate: (title: string) => void;
  onDeleteTemplate: (id: string) => void;
}) {
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
      <button onClick={() => setOpen(o => !o)}
        className="text-xs text-blue-500 font-semibold hover:text-blue-600 transition-colors">
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
                    <button onClick={() => handleAdd(t.title)}
                      className="flex-1 text-left text-sm text-gray-700 dark:text-gray-300 hover:text-blue-500 py-1">
                      {t.title}
                    </button>
                    <button onClick={() => onDeleteTemplate(t.id)}
                      className="text-gray-300 dark:text-gray-600 hover:text-red-400 text-sm">×</button>
                  </div>
                ))}
                <div className="border-t border-gray-100 dark:border-gray-700 my-2" />
              </div>
            )}
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">New Section</p>
            <input
              autoFocus type="text" placeholder="Section title..."
              value={newTitle} onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && newTitle.trim()) handleAdd(newTitle.trim()); }}
              className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 mb-2"
            />
            <label className="flex items-center gap-2 mb-3 cursor-pointer">
              <input type="checkbox" checked={saveAsTemplate} onChange={e => setSaveAsTemplate(e.target.checked)} className="rounded" />
              <span className="text-xs text-gray-500 dark:text-gray-400">Save as template</span>
            </label>
            <div className="flex gap-2">
              <button onClick={() => { if (newTitle.trim()) handleAdd(newTitle.trim()); }} disabled={!newTitle.trim()}
                className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-200 text-white text-sm font-semibold py-2 rounded-xl transition-colors">
                Add
              </button>
              <button onClick={() => setOpen(false)}
                className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-500 text-sm font-semibold py-2 rounded-xl transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Build flat item list for a day ────────────────────────────────────────────

function buildFlatItems(
  tasks: Task[],
  sections: DaySection[],
  assignments: SectionAssignment[],
  date: string
): FlatItem[] {
  const items: FlatItem[] = [];
  const getAssignment = (taskId: string) => assignments.find(a => a.taskId === taskId);

  // Sort sections by sortOrder
  const sortedSections = [...sections].sort((a, b) => a.sortOrder - b.sortOrder);

  sortedSections.forEach(section => {
    // Section header
    items.push({ kind: 'section', id: `section-${section.id}`, section });

    // Tasks in this section
    const sectionTasks = tasks
      .filter(t => getAssignment(t.id)?.sectionId === section.id)
      .sort((a, b) => (getAssignment(a.id)?.sortOrder ?? 999) - (getAssignment(b.id)?.sortOrder ?? 999));

    sectionTasks.forEach(task => {
      items.push({ kind: 'task', id: task.id, task, sectionId: section.id });
    });

    // Drop zone inside section
    items.push({ kind: 'dropzone', id: `dropzone-${section.id}`, sectionId: section.id });
  });

  // Loose zone (between sections and loose tasks)
  if (sections.length > 0) {
    items.push({ kind: 'loose-zone', id: `loose-${date}`, date });
  }

  // Loose tasks
  const looseTasks = tasks
    .filter(t => { const a = getAssignment(t.id); return !a || a.sectionId === null; })
    .sort((a, b) => (getAssignment(a.id)?.sortOrder ?? 999) - (getAssignment(b.id)?.sortOrder ?? 999));

  looseTasks.forEach(task => {
    items.push({ kind: 'task', id: task.id, task, sectionId: null });
  });

  return items;
}

// ── Day Block ─────────────────────────────────────────────────────────────────

function DayBlock({
  label, date, tasks, sections, assignments, templates,
  activeItemId, activeItemDate, overItemId, overDayDate,
  onComplete, onTaskClick, onAddSection, onRenameSection,
  onDeleteSection, onSaveTemplate, onDeleteTemplate,
}: {
  label: string;
  date: string;
  tasks: Task[];
  sections: DaySection[];
  assignments: SectionAssignment[];
  templates: SectionTemplate[];
  activeItemId: string | null;
  activeItemDate: string | null;
  overItemId: string | null;
  overDayDate: string | null;
  onComplete: (id: string) => void;
  onTaskClick: (task: Task) => void;
  onAddSection: (date: string, title: string) => void;
  onRenameSection: (id: string, title: string) => void;
  onDeleteSection: (id: string) => void;
  onSaveTemplate: (title: string) => void;
  onDeleteTemplate: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const pending = tasks.filter(t => t.status !== 'Done').length;
  const flatItems = buildFlatItems(tasks, sections, assignments, date);
  const allIds = flatItems.map(i => i.id);

  const isActiveTask = activeItemId && !activeItemId.startsWith('section-');
  // True when a task from ANOTHER day is currently being dragged INTO this day
  const isIncomingCrossDayDrop = !!(isActiveTask && activeItemDate && activeItemDate !== date && overDayDate === date);
  // True when a task from THIS day is being dragged OUT to another day
  const isOutgoingCrossDayDrag = !!(isActiveTask && activeItemDate === date && overDayDate !== null && overDayDate !== date);

  // Figure out which section is being hovered over
  const getHoveredSectionId = (): string | null => {
    if (!overItemId) return null;
    if (overItemId.startsWith('dropzone-')) return overItemId.replace('dropzone-', '');
    if (overItemId.startsWith('section-')) return overItemId.replace('section-', '');
    // Task — find its section
    const item = flatItems.find(i => i.id === overItemId);
    if (item?.kind === 'task') return item.sectionId;
    return null;
  };
  const hoveredSectionId = getHoveredSectionId();

  return (
    <div className={`mb-8 transition-all duration-200 rounded-2xl p-1
      ${isIncomingCrossDayDrop
        ? 'ring-2 ring-blue-400 ring-offset-2 dark:ring-offset-gray-950 bg-blue-50/30 dark:bg-blue-950/20'
        : ''}`}>
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
          date={date} templates={templates}
          onAdd={onAddSection} onSaveTemplate={onSaveTemplate} onDeleteTemplate={onDeleteTemplate}
        />
      </div>

      {!collapsed && (
        <SortableContext items={allIds} strategy={verticalListSortingStrategy}>
          {tasks.length === 0 && sections.length === 0 ? (
            <div className={`rounded-xl border-2 border-dashed p-4 text-center transition-colors
              ${isIncomingCrossDayDrop
                ? 'border-blue-400 bg-blue-50 dark:bg-blue-950'
                : 'border-gray-200 dark:border-gray-700'}`}>
              <p className="text-xs text-gray-400 dark:text-gray-600">
                {isIncomingCrossDayDrop ? 'Drop to move here' : 'Nothing scheduled'}
              </p>
            </div>
          ) : (
            <>
              {flatItems.map(item => {
                if (item.kind === 'section') {
                  return (
                    <SortableSection
                      key={item.id}
                      section={item.section}
                      flatItems={flatItems}
                      isOver={hoveredSectionId === item.section.id}
                      activeTaskId={isActiveTask ? activeItemId : null}
                      activeItemId={overItemId}
                      onRename={onRenameSection}
                      onDelete={onDeleteSection}
                      onComplete={onComplete}
                      onTaskClick={onTaskClick}
                    />
                  );
                }

                if (item.kind === 'task' && item.sectionId === null) {
                  return (
                    <TaskRow
                      key={item.id}
                      task={item.task}
                      onComplete={onComplete}
                      onTaskClick={onTaskClick}
                    />
                  );
                }

                if (item.kind === 'loose-zone') {
                  return (
                    <DropZone
                      key={item.id}
                      id={item.id}
                      isOver={overItemId === item.id}
                      label="Drop here to remove from section"
                      active={!!isActiveTask}
                    />
                  );
                }

                // Tasks inside sections and dropzones are rendered inside SortableSection
                return null;
              })}

              {/* Cross-day drop zone — shown at bottom of source day when dragging out */}
              {isOutgoingCrossDayDrag && (
                <div className="rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-3 text-center mt-2 opacity-40">
                  <p className="text-xs text-gray-300 dark:text-gray-600">Drag to other day to move</p>
                </div>
              )}
              {/* Cross-day drop zone — shown at bottom of destination day when dragging in */}
              {isIncomingCrossDayDrop && (
                <div className="rounded-xl border-2 border-dashed border-blue-400 bg-blue-50 dark:bg-blue-950 p-3 text-center mt-2">
                  <p className="text-xs text-blue-500">Drop to move to {label}</p>
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
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [activeItemDate, setActiveItemDate] = useState<string | null>(null);
  const [overItemId, setOverItemId] = useState<string | null>(null);
  const [overDayDate, setOverDayDate] = useState<string | null>(null);

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

  const allAssignments = React.useMemo(
    () => [...todayAssignments, ...tomorrowAssignments],
    [todayAssignments, tomorrowAssignments]
  );

  // Given any item id, determine which date it belongs to
  const getDateForItem = useCallback((itemId: string): string | null => {
    if (!itemId) return null;
    const sectionId = itemId.startsWith('section-') ? itemId.replace('section-', '') : null;
    const dropzoneId = itemId.startsWith('dropzone-') ? itemId.replace('dropzone-', '') : null;
    const looseDate = itemId.startsWith('loose-') ? itemId.replace('loose-', '') : null;

    if (looseDate) return looseDate;
    if (sectionId) {
      if (todaySections.some(s => s.id === sectionId)) return today;
      if (tomorrowSections.some(s => s.id === sectionId)) return tomorrow;
    }
    if (dropzoneId) {
      if (todaySections.some(s => s.id === dropzoneId)) return today;
      if (tomorrowSections.some(s => s.id === dropzoneId)) return tomorrow;
    }
    // Task id
    const assignment = allAssignments.find(a => a.taskId === itemId);
    if (assignment) return assignment.date;
    if (todayTasks.some(t => t.id === itemId)) return today;
    if (tomorrowTasks.some(t => t.id === itemId)) return tomorrow;
    return null;
  }, [today, tomorrow, todaySections, tomorrowSections, todayTasks, tomorrowTasks, allAssignments]);

  const handleDragStart = ({ active }: DragStartEvent) => {
    const id = active.id as string;
    setActiveItemId(id);
    if (!id.startsWith('section-')) {
      const task = tasks.find(t => t.id === id);
      if (task) setActiveTask(task);
    }
    setActiveItemDate(getDateForItem(id));
  };

  const handleDragOver = ({ over }: DragOverEvent) => {
    if (!over) {
      setOverItemId(null);
      setOverDayDate(null);
      return;
    }
    const overId = over.id as string;
    setOverItemId(overId);
    setOverDayDate(getDateForItem(overId));
  };

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    const prevActiveId = activeItemId;
    const prevActiveDate = activeItemDate;
    const prevTask = activeTask;

    setActiveTask(null);
    setActiveItemId(null);
    setActiveItemDate(null);
    setOverItemId(null);
    setOverDayDate(null);

    if (!over || !prevActiveId) return;
    const overIdStr = over.id as string;
    if (prevActiveId === overIdStr) return;

    const targetDate = getDateForItem(overIdStr) || prevActiveDate;
    if (!targetDate || !prevActiveDate) return;

    // ── Section reorder ──
    if (prevActiveId.startsWith('section-')) {
      const activeSectionId = prevActiveId.replace('section-', '');
      const daySections = prevActiveDate === today ? todaySections : tomorrowSections;
      if (overIdStr.startsWith('section-')) {
        const overSectionId = overIdStr.replace('section-', '');
        const oldIndex = daySections.findIndex(s => s.id === activeSectionId);
        const newIndex = daySections.findIndex(s => s.id === overSectionId);
        if (oldIndex !== -1 && newIndex !== -1) {
          const reordered = [...daySections];
          const [moved] = reordered.splice(oldIndex, 1);
          reordered.splice(newIndex, 0, moved);
          await reorderSections(prevActiveDate, reordered.map(s => s.id));
        }
      }
      return;
    }

    // ── Cross-day task move ──
    if (targetDate !== prevActiveDate) {
      if (prevTask) await moveTaskToDay(prevActiveId, prevActiveDate, targetDate, prevTask);
      return;
    }

    // ── Same-day task reorder / section assignment ──
    const dayTasks = targetDate === today ? todayTasks : tomorrowTasks;
    const dayAssignments = targetDate === today ? todayAssignments : tomorrowAssignments;
    const daySections = targetDate === today ? todaySections : tomorrowSections;
    const flatItems = buildFlatItems(dayTasks, daySections, dayAssignments, targetDate);

    // Determine new sectionId
    let newSectionId: string | null = null;
    if (overIdStr.startsWith('dropzone-')) {
      newSectionId = overIdStr.replace('dropzone-', '');
    } else if (overIdStr.startsWith('loose-')) {
      newSectionId = null;
    } else if (overIdStr.startsWith('section-')) {
      newSectionId = overIdStr.replace('section-', '');
    } else {
      // Dropped on a task — inherit its section
      const overItem = flatItems.find(i => i.id === overIdStr);
      if (overItem?.kind === 'task') newSectionId = overItem.sectionId;
    }

    // Compute new sort orders — place active task at the over item's index
    const overIndex = flatItems.findIndex(i => i.id === overIdStr);
    const newAssignments = dayTasks.map((t, idx) => {
      const existing = dayAssignments.find(a => a.taskId === t.id);
      if (t.id === prevActiveId) {
        return { taskId: t.id, sectionId: newSectionId, date: targetDate, sortOrder: overIndex };
      }
      return {
        taskId: t.id,
        sectionId: existing?.sectionId ?? null,
        date: targetDate,
        sortOrder: existing?.sortOrder ?? idx,
      };
    });

    await reorderAssignments(newAssignments);
  };

  if (loading) return (
    <p className="text-xs text-gray-400 dark:text-gray-600 text-center py-8">Loading...</p>
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <DayBlock
        label="Today" date={today}
        tasks={todayTasks} sections={todaySections} assignments={todayAssignments}
        templates={templates}
        activeItemId={activeItemId} activeItemDate={activeItemDate}
        overItemId={overItemId} overDayDate={overDayDate}
        onComplete={onComplete} onTaskClick={onTaskClick}
        onAddSection={addSection}
        onRenameSection={(id, title) => updateSection(id, { title })}
        onDeleteSection={deleteSection}
        onSaveTemplate={addTemplate} onDeleteTemplate={deleteTemplate}
      />
      <DayBlock
        label="Tomorrow" date={tomorrow}
        tasks={tomorrowTasks} sections={tomorrowSections} assignments={tomorrowAssignments}
        templates={templates}
        activeItemId={activeItemId} activeItemDate={activeItemDate}
        overItemId={overItemId} overDayDate={overDayDate}
        onComplete={onComplete} onTaskClick={onTaskClick}
        onAddSection={addSection}
        onRenameSection={(id, title) => updateSection(id, { title })}
        onDeleteSection={deleteSection}
        onSaveTemplate={addTemplate} onDeleteTemplate={deleteTemplate}
      />

      <DragOverlay>
        {activeTask && (
          <TaskRow task={activeTask} onComplete={() => {}} onTaskClick={() => {}} overlay />
        )}
      </DragOverlay>
    </DndContext>
  );
}
