import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import {
  DndContext,
  pointerWithin,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  DragCancelEvent,
  DragOverlay,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task, DaySection, SectionAssignment, SectionTemplate, priorityColor } from '../types';
import { useUpcoming } from '../hooks/useUpcoming';

// ── Types ─────────────────────────────────────────────────────────────────────

type DayLevelEntry =
  | { kind: 'task'; task: Task }
  | { kind: 'section'; section: DaySection };

type ClonedDragState = {
  todayDayLevel: DayLevelEntry[];
  tomorrowDayLevel: DayLevelEntry[];
  sectionTasks: Map<string, Task[]>;
};

// ── Section Empty Drop Zone ───────────────────────────────────────────────────

function SectionEmptyDropZone({ sectionId, active }: { sectionId: string; active: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: `empty-${sectionId}` });
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
        <p className={`text-xs ${isOver ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500'}`}>
          {isOver ? 'Drop here' : '·'}
        </p>
      )}
    </div>
  );
}

// ── Loose Zone Drop Target ────────────────────────────────────────────────────

function LooseZoneDropZone({ date, active }: { date: string; active: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: `loose-${date}` });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border-2 border-dashed text-center transition-all duration-200 overflow-hidden
        ${active
          ? isOver
            ? 'border-blue-400 bg-blue-50 dark:bg-blue-950 p-3 opacity-100'
            : 'border-gray-300 dark:border-gray-600 p-2 opacity-60'
          : 'p-0 opacity-0 border-transparent pointer-events-none h-0'}`}
    >
      {active && (
        <p className={`text-xs ${isOver ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500'}`}>
          {isOver ? 'Drop here to remove from section' : '·'}
        </p>
      )}
    </div>
  );
}

// ── Task Row ──────────────────────────────────────────────────────────────────

function TaskRow({ task, containerId, date, onComplete, onUncomplete, onTaskClick, overlay }: {
  task: Task;
  containerId: string;
  date: string;
  onComplete: (id: string) => void;
  onUncomplete: (id: string) => void;
  onTaskClick: (task: Task) => void;
  overlay?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id, data: { type: 'task', taskId: task.id, containerId, date } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.2 : 1,
  };

  const today = format(new Date(), 'yyyy-MM-dd');
  const isOverdue = task.status !== 'Done' && !!task.dueDate && task.dueDate < today;
  const overdueDays = isOverdue
    ? Math.round((new Date(today).getTime() - new Date(task.dueDate!).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div
      ref={setNodeRef}
      style={overlay ? {} : style}
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-2.5 mb-1.5 flex items-center gap-2
        ${task.status === 'Done' ? 'opacity-50' : ''}
        ${isOverdue ? 'border-red-200 dark:border-red-900' : ''}
        ${overlay ? 'shadow-xl rotate-1 scale-105' : ''}`}
    >
      <div {...attributes} {...listeners}
        className="text-gray-400 dark:text-gray-500 cursor-grab active:cursor-grabbing select-none px-2 py-2 flex-shrink-0 touch-none">
        ⣿
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); task.status === 'Done' ? onUncomplete(task.id) : onComplete(task.id); }}
        className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors
          ${task.status === 'Done' ? 'bg-green-400 border-green-400 text-white' : isOverdue ? 'border-red-400 hover:border-green-400' : 'border-gray-300 hover:border-green-400'}`}
      >
        {task.status === 'Done' && <span className="text-xs">✓</span>}
      </button>
      <div className="flex-1 min-w-0" onClick={() => onTaskClick(task)}>
        <p className={`text-sm font-medium truncate ${task.status === 'Done' ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-100'}`}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-400">{task.category}</span>
          <span className={`text-xs font-medium ${priorityColor(task.priority)}`}>{task.priority}</span>
          {task.recurrence !== 'None' && <span className="text-xs text-blue-400">↻</span>}
          {isOverdue && (
            <span className="text-xs font-semibold text-red-500 dark:text-red-400">
              {overdueDays === 1 ? '1 day overdue' : `${overdueDays} days overdue`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sortable Section ──────────────────────────────────────────────────────────

function SortableSection({
  section, projectedTasks, looseTasks, date, dayContainerId, activeTask,
  onRename, onDelete, onComplete, onUncomplete, onTaskClick, onAssignTasks,
}: {
  section: DaySection;
  projectedTasks: Task[];
  looseTasks: Task[];
  date: string;
  dayContainerId: string;
  activeTask: Task | null;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onComplete: (id: string) => void;
  onUncomplete: (id: string) => void;
  onTaskClick: (task: Task) => void;
  onAssignTasks: (taskIds: string[]) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(section.title);
  const [pickerOpen, setPickerOpen] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: `section-${section.id}`, data: { type: 'section', sectionId: section.id, containerId: dayContainerId, date } });

  const style = { transform: CSS.Transform.toString(transform), transition };

  // Highlights when the active task is currently projected inside this section
  const isOver = !!activeTask && projectedTasks.some(t => t.id === activeTask.id);
  const taskIds = projectedTasks.map(t => t.id);

  const handleBlur = () => {
    setEditing(false);
    if (title.trim() && title !== section.title) onRename(section.id, title.trim());
  };

  return (
    <div style={style} className="mb-2">
      <div className={`bg-gray-50 dark:bg-gray-900 rounded-2xl border-2 transition-colors duration-150
        ${isOver ? 'border-blue-300 dark:border-blue-700' : 'border-gray-200 dark:border-gray-700'}
        ${isDragging ? 'opacity-30' : ''}`}>
        {/* Header gets setNodeRef — only ~48px tall, no overlap with inner tasks */}
        <div ref={setNodeRef} className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-700">
          <div {...attributes} {...listeners}
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
          <div className="relative flex-shrink-0 flex items-center gap-1">
            <button
              onClick={() => setPickerOpen(o => !o)}
              className="text-gray-300 dark:text-gray-600 hover:text-blue-400 text-sm font-bold px-3 py-2"
              title="Add tasks to section"
            >
              +
            </button>
            {pickerOpen && (
              <SectionTaskPicker
                looseTasks={looseTasks}
                onAssign={onAssignTasks}
                onClose={() => setPickerOpen(false)}
              />
            )}
            <button onClick={() => onDelete(section.id)}
              className="text-gray-200 dark:text-gray-700 hover:text-red-400 text-base px-3 py-2">
              ×
            </button>
          </div>
        </div>
        {/* Inner SortableContext — geometry fully isolated from the outer context */}
        <div className="px-3 pt-2 pb-2">
          <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
            {projectedTasks.map(task => (
              <TaskRow
                key={task.id}
                task={task}
                containerId={section.id}
                date={date}
                onComplete={onComplete}
                onUncomplete={onUncomplete}
                onTaskClick={onTaskClick}
              />
            ))}
            {projectedTasks.length === 0 && (
              <SectionEmptyDropZone sectionId={section.id} active={!!activeTask} />
            )}
          </SortableContext>
        </div>
      </div>
    </div>
  );
}

// ── Section Ghost (drag overlay) ──────────────────────────────────────────────

function SectionGhost({ section }: { section: DaySection }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl border-2 border-blue-300 dark:border-blue-700 overflow-hidden shadow-xl rotate-1 scale-105 opacity-90">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-700">
        <span className="text-gray-300 dark:text-gray-600 px-1">⣿</span>
        <span className="flex-1 text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {section.title}
        </span>
      </div>
      <div className="px-3 py-2 text-xs text-gray-400">Moving section…</div>
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
                className="flex-1 bg-accent hover:bg-accent-dark disabled:bg-gray-200 text-white text-sm font-semibold py-2 rounded-xl transition-colors">
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

// ── Section Task Picker ───────────────────────────────────────────────────────

function SectionTaskPicker({ looseTasks, onAssign, onClose }: {
  looseTasks: Task[];
  onAssign: (taskIds: string[]) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-7 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-3 z-50 w-64">
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
          Add tasks to section
        </p>
        {looseTasks.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500 py-2 text-center">No loose tasks available</p>
        ) : (
          <div className="max-h-48 overflow-y-auto mb-3 space-y-1">
            {looseTasks.map(task => (
              <label key={task.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.has(task.id)}
                  onChange={() => toggle(task.id)}
                  className="rounded flex-shrink-0"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{task.title}</span>
                <span className={`text-xs ml-auto flex-shrink-0 ${priorityColor(task.priority)}`}>{task.priority}</span>
              </label>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => { onAssign(Array.from(selected)); onClose(); }}
            disabled={selected.size === 0}
            className="flex-1 bg-accent hover:bg-accent-dark disabled:bg-gray-200 text-white text-sm font-semibold py-2 rounded-xl transition-colors">
            Add {selected.size > 0 ? `(${selected.size})` : ''}
          </button>
          <button onClick={onClose}
            className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-500 text-sm font-semibold py-2 rounded-xl transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}

// ── Day-level helpers ─────────────────────────────────────────────────────────

function buildDayLevel(
  tasks: Task[],
  sections: DaySection[],
  assignments: SectionAssignment[],
): DayLevelEntry[] {
  const getAssignment = (taskId: string) => assignments.find(a => a.taskId === taskId);

  const looseTasks = tasks.filter(t => {
    const a = getAssignment(t.id);
    return !a || a.sectionId === null;
  });

  type Raw =
    | { kind: 'section'; section: DaySection; order: number }
    | { kind: 'task'; task: Task; order: number };

  const raw: Raw[] = [
    ...sections.map(s => ({ kind: 'section' as const, section: s, order: s.sortOrder })),
    ...looseTasks.map(t => {
      const a = getAssignment(t.id);
      return { kind: 'task' as const, task: t, order: a?.sortOrder ?? 9999 };
    }),
  ];

  raw.sort((a, b) => a.order !== b.order ? a.order - b.order : a.kind === 'section' ? -1 : 1);

  return raw.map(r => r.kind === 'section'
    ? { kind: 'section', section: r.section }
    : { kind: 'task', task: r.task });
}

function buildSectionTasksMap(
  allSections: DaySection[],
  allTasks: Task[],
  allAssignments: SectionAssignment[],
): Map<string, Task[]> {
  const map = new Map<string, Task[]>();
  for (const section of allSections) {
    const tasks = allTasks
      .filter(t => allAssignments.some(a => a.taskId === t.id && a.sectionId === section.id))
      .sort((a, b) => {
        const aOrd = allAssignments.find(x => x.taskId === a.id)?.sortOrder ?? 999;
        const bOrd = allAssignments.find(x => x.taskId === b.id)?.sortOrder ?? 999;
        return aOrd - bOrd;
      });
    map.set(section.id, tasks);
  }
  return map;
}

function buildClonedState(
  todayTasks: Task[], tomorrowTasks: Task[],
  todaySections: DaySection[], tomorrowSections: DaySection[],
  todayAssignments: SectionAssignment[], tomorrowAssignments: SectionAssignment[],
): ClonedDragState {
  return {
    todayDayLevel: buildDayLevel(todayTasks, todaySections, todayAssignments),
    tomorrowDayLevel: buildDayLevel(tomorrowTasks, tomorrowSections, tomorrowAssignments),
    sectionTasks: buildSectionTasksMap(
      [...todaySections, ...tomorrowSections],
      [...todayTasks, ...tomorrowTasks],
      [...todayAssignments, ...tomorrowAssignments],
    ),
  };
}

function getDayLevel(state: ClonedDragState, containerId: string): DayLevelEntry[] | null {
  if (containerId === 'day-today') return state.todayDayLevel;
  if (containerId === 'day-tomorrow') return state.tomorrowDayLevel;
  return null;
}

function withDayLevel(state: ClonedDragState, containerId: string, newLevel: DayLevelEntry[]): ClonedDragState {
  if (containerId === 'day-today') return { ...state, todayDayLevel: newLevel };
  if (containerId === 'day-tomorrow') return { ...state, tomorrowDayLevel: newLevel };
  return state;
}

function getContainerForItem(
  overId: string,
  state: ClonedDragState,
  today: string,
  tomorrow: string,
): { containerId: string; date: string } | null {
  if (overId === `loose-${today}` || overId === `day-${today}`) return { containerId: 'day-today', date: today };
  if (overId === `loose-${tomorrow}` || overId === `day-${tomorrow}`) return { containerId: 'day-tomorrow', date: tomorrow };

  if (overId.startsWith('empty-')) {
    const sectionId = overId.slice(6);
    const date = state.todayDayLevel.some(e => e.kind === 'section' && e.section.id === sectionId) ? today : tomorrow;
    return { containerId: sectionId, date };
  }

  if (overId.startsWith('section-')) {
    const sectionId = overId.slice(8);
    const date = state.todayDayLevel.some(e => e.kind === 'section' && e.section.id === sectionId) ? today : tomorrow;
    return { containerId: sectionId, date };
  }

  for (const [sectionId, tasks] of Array.from(state.sectionTasks.entries())) {
    if (tasks.some(t => t.id === overId)) {
      const date = state.todayDayLevel.some(e => e.kind === 'section' && e.section.id === sectionId) ? today : tomorrow;
      return { containerId: sectionId, date };
    }
  }

  if (state.todayDayLevel.some(e => e.kind === 'task' && e.task.id === overId)) return { containerId: 'day-today', date: today };
  if (state.tomorrowDayLevel.some(e => e.kind === 'task' && e.task.id === overId)) return { containerId: 'day-tomorrow', date: tomorrow };

  return null;
}

function applyDragOver(
  state: ClonedDragState,
  activeId: string,
  overId: string,
  fromContainerId: string,
  toContainerId: string,
): ClonedDragState {
  if (fromContainerId === toContainerId) {
    // Same container: arrayMove
    const dayLevel = getDayLevel(state, fromContainerId);
    if (dayLevel) {
      const ai = dayLevel.findIndex(e =>
        (e.kind === 'task' && e.task.id === activeId) ||
        (e.kind === 'section' && `section-${e.section.id}` === activeId));
      const oi = dayLevel.findIndex(e =>
        (e.kind === 'task' && e.task.id === overId) ||
        (e.kind === 'section' && `section-${e.section.id}` === overId));
      if (ai !== -1 && oi !== -1 && ai !== oi) return withDayLevel(state, fromContainerId, arrayMove(dayLevel, ai, oi));
    } else {
      const tasks = state.sectionTasks.get(fromContainerId);
      if (tasks) {
        const ai = tasks.findIndex(t => t.id === activeId);
        const oi = tasks.findIndex(t => t.id === overId);
        if (ai !== -1 && oi !== -1 && ai !== oi) {
          const newMap = new Map(state.sectionTasks);
          newMap.set(fromContainerId, arrayMove(tasks, ai, oi));
          return { ...state, sectionTasks: newMap };
        }
      }
    }
    return state;
  }

  // Cross container: remove from source, insert at target
  let newState = state;
  let taskToMove: Task | null = null;
  let entryToMove: DayLevelEntry | null = null;

  const fromDay = getDayLevel(newState, fromContainerId);
  if (fromDay) {
    const idx = fromDay.findIndex(e =>
      (e.kind === 'task' && e.task.id === activeId) ||
      (e.kind === 'section' && `section-${e.section.id}` === activeId));
    if (idx !== -1) {
      entryToMove = fromDay[idx];
      if (entryToMove.kind === 'task') taskToMove = entryToMove.task;
      newState = withDayLevel(newState, fromContainerId, fromDay.filter((_, i) => i !== idx));
    }
  } else {
    const tasks = newState.sectionTasks.get(fromContainerId);
    if (tasks) {
      const idx = tasks.findIndex(t => t.id === activeId);
      if (idx !== -1) {
        taskToMove = tasks[idx];
        const newMap = new Map(newState.sectionTasks);
        newMap.set(fromContainerId, tasks.filter((_, i) => i !== idx));
        newState = { ...newState, sectionTasks: newMap };
      }
    }
  }

  if (!taskToMove && !entryToMove) return state;

  const toDay = getDayLevel(newState, toContainerId);
  if (toDay) {
    const insertEntry: DayLevelEntry = entryToMove ?? { kind: 'task', task: taskToMove! };
    let oi = toDay.findIndex(e =>
      (e.kind === 'task' && e.task.id === overId) ||
      (e.kind === 'section' && `section-${e.section.id}` === overId));
    if (oi === -1) oi = toDay.length;
    const newLevel = [...toDay];
    newLevel.splice(oi, 0, insertEntry);
    newState = withDayLevel(newState, toContainerId, newLevel);
  } else {
    if (!taskToMove) return state;
    const toTasks = newState.sectionTasks.get(toContainerId) ?? [];
    // Dropping onto section header → insert at 0; otherwise find position by task id
    let oi = overId.startsWith('section-') ? 0 : toTasks.findIndex(t => t.id === overId);
    if (oi === -1) oi = toTasks.length;
    const newTasks = [...toTasks];
    newTasks.splice(oi, 0, taskToMove);
    const newMap = new Map(newState.sectionTasks);
    newMap.set(toContainerId, newTasks);
    newState = { ...newState, sectionTasks: newMap };
  }

  return newState;
}

// Shared-counter ordering: sections and loose tasks occupy the same sortOrder space.
function computeSectionUpdates(dayLevel: DayLevelEntry[]): { id: string; sortOrder: number }[] {
  const result: { id: string; sortOrder: number }[] = [];
  let pos = 0;
  for (const e of dayLevel) {
    if (e.kind === 'section') result.push({ id: e.section.id, sortOrder: pos });
    pos++;
  }
  return result;
}

function computeLooseAssignments(
  dayLevel: DayLevelEntry[],
  date: string,
): { taskId: string; sectionId: null; date: string; sortOrder: number }[] {
  const result: { taskId: string; sectionId: null; date: string; sortOrder: number }[] = [];
  let pos = 0;
  for (const e of dayLevel) {
    if (e.kind === 'task') result.push({ taskId: e.task.id, sectionId: null, date, sortOrder: pos });
    pos++;
  }
  return result;
}

// ── Day Block ─────────────────────────────────────────────────────────────────

function DayBlock({
  label, date, dayContainerId, tasks, sections, assignments, templates,
  clonedDayLevel, clonedSectionTasks,
  activeTask, activeSection, activeItemDate, overContainerDate,
  onComplete, onUncomplete, onTaskClick, onAddSection, onRenameSection,
  onDeleteSection, onSaveTemplate, onDeleteTemplate, onAssignToSection,
}: {
  label: string;
  date: string;
  dayContainerId: string;
  tasks: Task[];
  sections: DaySection[];
  assignments: SectionAssignment[];
  templates: SectionTemplate[];
  clonedDayLevel: DayLevelEntry[] | null;
  clonedSectionTasks: Map<string, Task[]> | null;
  activeTask: Task | null;
  activeSection: DaySection | null;
  activeItemDate: string | null;
  overContainerDate: string | null;
  onComplete: (id: string) => void;
  onUncomplete: (id: string) => void;
  onTaskClick: (task: Task) => void;
  onAddSection: (date: string, title: string) => void;
  onRenameSection: (id: string, title: string) => void;
  onDeleteSection: (id: string) => void;
  onSaveTemplate: (title: string) => void;
  onDeleteTemplate: (id: string) => void;
  onAssignToSection: (sectionId: string, taskIds: string[]) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  // Use projected (cloned) state during drag, canonical state otherwise
  const dayLevel = clonedDayLevel ?? buildDayLevel(tasks, sections, assignments);
  const outerIds = dayLevel.map(e => e.kind === 'section' ? `section-${e.section.id}` : e.task.id);

  // Day-level droppable so cross-day drags work even over empty space
  const { setNodeRef: setDayRef } = useDroppable({ id: `day-${date}` });

  const isDragging = !!(activeTask || activeSection);
  const isIncomingCrossDayDrop = isDragging && !!activeItemDate && activeItemDate !== date && overContainerDate === date;
  const isOutgoingCrossDayDrag = !!activeTask && activeItemDate === date && overContainerDate !== null && overContainerDate !== date;

  // Total count across loose tasks + all section tasks in this day (including done)
  const total = dayLevel.reduce((count, e) => {
    if (e.kind === 'task') return count + 1;
    if (e.kind === 'section') {
      const canonical = tasks.filter(t =>
        assignments.some(a => a.taskId === t.id && a.sectionId === e.section.id)
      );
      const projected = clonedSectionTasks?.get(e.section.id) ?? canonical;
      return count + projected.length;
    }
    return count;
  }, 0);

  return (
    <div ref={setDayRef} className={`mb-5 transition-all duration-200 rounded-2xl p-1
      ${isIncomingCrossDayDrop
        ? 'ring-2 ring-blue-400 ring-offset-2 dark:ring-offset-gray-950 bg-blue-50/30 dark:bg-blue-950/20'
        : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => setCollapsed(c => !c)} className="flex items-center gap-2">
          <h2 className="text-base font-bold text-gray-800 dark:text-white">{label}</h2>
          {total > 0 && (
            <span className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-xs font-semibold px-2 py-0.5 rounded-full">
              {total}
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
        <SortableContext items={outerIds} strategy={verticalListSortingStrategy}>
          {dayLevel.length === 0 ? (
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
              {dayLevel.map(entry => {
                if (entry.kind === 'section') {
                  const canonical = tasks
                    .filter(t => assignments.some(a => a.taskId === t.id && a.sectionId === entry.section.id))
                    .sort((a, b) => {
                      const aOrd = assignments.find(x => x.taskId === a.id)?.sortOrder ?? 999;
                      const bOrd = assignments.find(x => x.taskId === b.id)?.sortOrder ?? 999;
                      return aOrd - bOrd;
                    });
                  const projectedTasks = clonedSectionTasks?.get(entry.section.id) ?? canonical;
                  const looseTasks = dayLevel
                    .filter(e => e.kind === 'task')
                    .map(e => (e as { kind: 'task'; task: Task }).task);
                  return (
                    <SortableSection
                      key={entry.section.id}
                      section={entry.section}
                      projectedTasks={projectedTasks}
                      looseTasks={looseTasks}
                      date={date}
                      dayContainerId={dayContainerId}
                      activeTask={activeTask}
                      onRename={onRenameSection}
                      onDelete={onDeleteSection}
                      onComplete={onComplete}
                      onUncomplete={onUncomplete}
                      onTaskClick={onTaskClick}
                      onAssignTasks={(ids) => onAssignToSection(entry.section.id, ids)}
                    />
                  );
                }

                // Loose task
                return (
                  <TaskRow
                    key={entry.task.id}
                    task={entry.task}
                    containerId={dayContainerId}
                    date={date}
                    onComplete={onComplete}
                    onUncomplete={onUncomplete}
                    onTaskClick={onTaskClick}
                  />
                );
              })}

              {sections.length > 0 && (
                <LooseZoneDropZone date={date} active={!!activeTask} />
              )}

              {isOutgoingCrossDayDrag && (
                <div className="rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-3 text-center mt-2 opacity-40">
                  <p className="text-xs text-gray-300 dark:text-gray-600">Drag to other day to move</p>
                </div>
              )}
              {isIncomingCrossDayDrop && (
                <div className="rounded-xl border-2 border-dashed border-blue-400 bg-blue-50 dark:bg-blue-950 p-3 text-center mt-2">
                  <p className="text-xs text-blue-500">
                    Drop to {activeSection ? 'move section' : 'schedule'} in {label}
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
  userId: string;
  onComplete: (id: string) => void;
  onUncomplete: (id: string) => void;
  onTaskClick: (task: Task) => void;
  onUpdateTask: (id: string, updates: any) => void;
  onTodayPendingCount?: (count: number) => void;
}

export function UpcomingView({ tasks, userId, onComplete, onUncomplete, onTaskClick, onTodayPendingCount }: UpcomingViewProps) {
  // ── Drag state ───────────────────────────────────────────────────────────
  const [clonedState, setClonedState] = useState<ClonedDragState | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeSection, setActiveSection] = useState<DaySection | null>(null);
  const [activeItemDate, setActiveItemDate] = useState<string | null>(null);
  const [overContainerDate, setOverContainerDate] = useState<string | null>(null);
  // Synchronous ref for current active container (avoids stale closure in onDragOver)
  const activeContainerRef = useRef<string | null>(null);

  const {
    today, tomorrow,
    todayTasks, tomorrowTasks,
    todaySections, tomorrowSections,
    todayAssignments, tomorrowAssignments,
    templates, loading,
    addSection, updateSection, deleteSection,
    reorderDayItems, reorderAssignments,
    moveTaskToDay, moveSectionToDay,
    addTemplate, deleteTemplate,
  } = useUpcoming(tasks, userId);

  // Report today's pending (non-done) count (used for tab badge + PWA badge)
  useEffect(() => {
    onTodayPendingCount?.(todayTasks.filter(t => t.status !== 'Done').length);
  }, [todayTasks, onTodayPendingCount]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ── Drag handlers ────────────────────────────────────────────────────────

  const handleDragStart = ({ active }: DragStartEvent) => {
    const id = active.id as string;
    const containerId = active.data.current?.containerId as string | undefined;
    const date = active.data.current?.date as string | undefined;

    setActiveItemDate(date ?? null);
    activeContainerRef.current = containerId ?? null;

    if (id.startsWith('section-')) {
      const sectionId = id.replace('section-', '');
      const section = [...todaySections, ...tomorrowSections].find(s => s.id === sectionId);
      if (section) setActiveSection(section);
    } else {
      const task = [...todayTasks, ...tomorrowTasks].find(t => t.id === id);
      if (task) setActiveTask(task);
    }

    setClonedState(buildClonedState(
      todayTasks, tomorrowTasks,
      todaySections, tomorrowSections,
      todayAssignments, tomorrowAssignments,
    ));
  };

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    // Sections don't need live preview — they use CSS transforms via useSortable
    if (activeSection || active.id.toString().startsWith('section-')) return;
    if (!over || !clonedState) { setOverContainerDate(null); return; }

    const activeId = active.id as string;
    const overId = over.id as string;

    const overInfo = getContainerForItem(overId, clonedState, today, tomorrow);
    if (!overInfo) { setOverContainerDate(null); return; }

    setOverContainerDate(overInfo.date);

    const fromContainerId = activeContainerRef.current;
    if (!fromContainerId) return;

    setClonedState(prev => prev
      ? applyDragOver(prev, activeId, overId, fromContainerId, overInfo.containerId)
      : prev
    );
    // Update synchronously so next onDragOver sees the new container
    activeContainerRef.current = overInfo.containerId;
  };

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    const savedState = clonedState;
    const savedTask = activeTask;
    const savedSection = activeSection;
    const savedOriginalDate = activeItemDate;
    const savedFinalContainerId = activeContainerRef.current;

    // Clear all drag state immediately
    setClonedState(null);
    setActiveTask(null);
    setActiveSection(null);
    setActiveItemDate(null);
    setOverContainerDate(null);
    activeContainerRef.current = null;

    if (!savedState || !savedOriginalDate) return;

    // Determine the final date from the final containerId
    let finalDate: string;
    if (savedFinalContainerId === 'day-today') {
      finalDate = today;
    } else if (savedFinalContainerId === 'day-tomorrow') {
      finalDate = tomorrow;
    } else if (savedFinalContainerId) {
      // Section container — look up which day it's in
      finalDate = savedState.todayDayLevel.some(e => e.kind === 'section' && e.section.id === savedFinalContainerId)
        ? today : tomorrow;
    } else {
      finalDate = savedOriginalDate;
    }

    // Cross-day moves
    if (savedSection && finalDate !== savedOriginalDate) {
      await moveSectionToDay(savedSection.id, savedOriginalDate, finalDate);
      return;
    }
    if (savedTask && finalDate !== savedOriginalDate) {
      await moveTaskToDay(savedTask.id, savedOriginalDate, finalDate);
      return;
    }

    // For sections: handleDragOver skips live preview so savedState has the original order.
    // Apply the final drop position now so section reorders persist.
    let stateToCommit = savedState;
    if (savedSection && over) {
      const containerId = finalDate === today ? 'day-today' : 'day-tomorrow';
      stateToCommit = applyDragOver(stateToCommit, active.id as string, over.id as string, containerId, containerId);
    }

    // Same-day: commit full ordering from final state
    const todaySectionUpd = computeSectionUpdates(stateToCommit.todayDayLevel);
    const todayLooseUpd = computeLooseAssignments(stateToCommit.todayDayLevel, today);
    const tomorrowSectionUpd = computeSectionUpdates(stateToCommit.tomorrowDayLevel);
    const tomorrowLooseUpd = computeLooseAssignments(stateToCommit.tomorrowDayLevel, tomorrow);

    const sectionTaskUpd: { taskId: string; sectionId: string; date: string; sortOrder: number }[] = [];
    (Array.from(stateToCommit.sectionTasks.entries()) as [string, Task[]][]).forEach(([sectionId, stasks]) => {
      const sDate = stateToCommit.todayDayLevel.some(e => e.kind === 'section' && e.section.id === sectionId)
        ? today : tomorrow;
      stasks.forEach((t, idx) => sectionTaskUpd.push({ taskId: t.id, sectionId, date: sDate, sortOrder: idx }));
    });

    const saves: Promise<unknown>[] = [];
    if (todaySectionUpd.length > 0 || todayLooseUpd.length > 0) {
      saves.push(reorderDayItems(today, todaySectionUpd, todayLooseUpd));
    }
    if (tomorrowSectionUpd.length > 0 || tomorrowLooseUpd.length > 0) {
      saves.push(reorderDayItems(tomorrow, tomorrowSectionUpd, tomorrowLooseUpd));
    }
    if (sectionTaskUpd.length > 0) {
      saves.push(reorderAssignments(sectionTaskUpd));
    }
    await Promise.all(saves);
  };

  const handleDragCancel = (_e: DragCancelEvent) => {
    setClonedState(null);
    setActiveTask(null);
    setActiveSection(null);
    setActiveItemDate(null);
    setOverContainerDate(null);
    activeContainerRef.current = null;
  };

  if (loading) return (
    <p className="text-xs text-gray-400 dark:text-gray-600 text-center py-8">Loading…</p>
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={(args) => {
        const hits = pointerWithin(args);
        return hits.length ? hits : closestCenter(args);
      }}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <DayBlock
        label="Today" date={today} dayContainerId="day-today"
        tasks={todayTasks} sections={todaySections} assignments={todayAssignments}
        templates={templates}
        clonedDayLevel={clonedState?.todayDayLevel ?? null}
        clonedSectionTasks={clonedState?.sectionTasks ?? null}
        activeTask={activeTask} activeSection={activeSection}
        activeItemDate={activeItemDate} overContainerDate={overContainerDate}
        onComplete={onComplete} onUncomplete={onUncomplete} onTaskClick={onTaskClick}
        onAddSection={addSection}
        onRenameSection={(id, title) => updateSection(id, { title })}
        onDeleteSection={deleteSection}
        onSaveTemplate={addTemplate} onDeleteTemplate={deleteTemplate}
        onAssignToSection={(sectionId, taskIds) => {
          const sectionTasks = todayAssignments.filter(a => a.sectionId === sectionId);
          const maxOrder = sectionTasks.reduce((m, a) => Math.max(m, a.sortOrder), -1);
          reorderAssignments(taskIds.map((taskId, i) => ({
            taskId, sectionId, date: today, sortOrder: maxOrder + (i + 1) * 10,
          })));
        }}
      />
      <DayBlock
        label="Tomorrow" date={tomorrow} dayContainerId="day-tomorrow"
        tasks={tomorrowTasks} sections={tomorrowSections} assignments={tomorrowAssignments}
        templates={templates}
        clonedDayLevel={clonedState?.tomorrowDayLevel ?? null}
        clonedSectionTasks={clonedState?.sectionTasks ?? null}
        activeTask={activeTask} activeSection={activeSection}
        activeItemDate={activeItemDate} overContainerDate={overContainerDate}
        onComplete={onComplete} onUncomplete={onUncomplete} onTaskClick={onTaskClick}
        onAddSection={addSection}
        onRenameSection={(id, title) => updateSection(id, { title })}
        onDeleteSection={deleteSection}
        onSaveTemplate={addTemplate} onDeleteTemplate={deleteTemplate}
        onAssignToSection={(sectionId, taskIds) => {
          const sectionTasks = tomorrowAssignments.filter(a => a.sectionId === sectionId);
          const maxOrder = sectionTasks.reduce((m, a) => Math.max(m, a.sortOrder), -1);
          reorderAssignments(taskIds.map((taskId, i) => ({
            taskId, sectionId, date: tomorrow, sortOrder: maxOrder + (i + 1) * 10,
          })));
        }}
      />

      <DragOverlay>
        {activeTask && (
          <TaskRow task={activeTask} containerId="" date="" onComplete={() => {}} onUncomplete={() => {}} onTaskClick={() => {}} overlay />
        )}
        {activeSection && (
          <SectionGhost section={activeSection} />
        )}
      </DragOverlay>
    </DndContext>
  );
}
