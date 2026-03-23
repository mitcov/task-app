import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
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

// ── Inline editable section title ─────────────────────────────────────────────

interface SectionHeaderProps {
  section: DaySection;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}

function SectionHeader({ section, onRename, onDelete }: SectionHeaderProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(section.title);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: `section-${section.id}`, data: { type: 'section' } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const handleBlur = () => {
    setEditing(false);
    if (title.trim() && title !== section.title) {
      onRename(section.id, title.trim());
    }
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 mb-2 mt-4 first:mt-0">
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
        <button
          onClick={() => setEditing(true)}
          className="flex-1 text-left text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide"
        >
          {section.title}
        </button>
      )}
      <button
        onClick={() => onDelete(section.id)}
        className="text-gray-200 dark:text-gray-700 hover:text-red-400 text-base"
      >
        ×
      </button>
    </div>
  );
}

// ── Task row ──────────────────────────────────────────────────────────────────

interface TaskRowProps {
  task: Task;
  onComplete: (id: string) => void;
  onTaskClick: (task: Task) => void;
}

function TaskRow({ task, onComplete, onTaskClick }: TaskRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id, data: { type: 'task', taskId: task.id } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-3 mb-2 flex items-center gap-3
        ${task.status === 'Done' ? 'opacity-50' : ''}`}
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
  onComplete: (id: string) => void;
  onTaskClick: (task: Task) => void;
  onAddSection: (date: string, title: string) => void;
  onRenameSection: (id: string, title: string) => void;
  onDeleteSection: (id: string) => void;
  onReorderSections: (date: string, sectionIds: string[]) => void;
  onReorderAssignments: (assignments: { taskId: string; sectionId: string | null; date: string; sortOrder: number }[]) => void;
  onSaveTemplate: (title: string) => void;
  onDeleteTemplate: (id: string) => void;
}

function DayBlock({
  label, date, tasks, sections, assignments, templates,
  onComplete, onTaskClick, onAddSection, onRenameSection,
  onDeleteSection, onReorderSections, onReorderAssignments,
  onSaveTemplate, onDeleteTemplate,
}: DayBlockProps) {
  const [collapsed, setCollapsed] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, { activationConstraint: { delay: 300, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Build ordered list of items (sections and loose tasks interleaved)
  const getAssignment = (taskId: string) => assignments.find(a => a.taskId === taskId);

  // Sort tasks by their assignment sort_order, unsectioned at natural position
  const sortedItems = (): { type: 'section' | 'task'; id: string; sectionId: string | null; sortOrder: number }[] => {
    const items: { type: 'section' | 'task'; id: string; sectionId: string | null; sortOrder: number }[] = [];

    sections.forEach(s => {
      items.push({ type: 'section', id: s.id, sectionId: null, sortOrder: s.sortOrder });
      const sectionTasks = tasks.filter(t => getAssignment(t.id)?.sectionId === s.id);
      sectionTasks.sort((a, b) => (getAssignment(a.id)?.sortOrder ?? 999) - (getAssignment(b.id)?.sortOrder ?? 999));
      sectionTasks.forEach(t => items.push({ type: 'task', id: t.id, sectionId: s.id, sortOrder: getAssignment(t.id)?.sortOrder ?? 999 }));
    });

    // Loose tasks (no assignment or assignment with null sectionId)
    const looseTasks = tasks.filter(t => {
      const a = getAssignment(t.id);
      return !a || a.sectionId === null;
    });
    looseTasks.sort((a, b) => (getAssignment(a.id)?.sortOrder ?? 999) - (getAssignment(b.id)?.sortOrder ?? 999));
    looseTasks.forEach(t => items.push({ type: 'task', id: t.id, sectionId: null, sortOrder: getAssignment(t.id)?.sortOrder ?? 999 }));

    return items;
  };

  const items = sortedItems();
  const allIds = items.map(i => i.type === 'section' ? `section-${i.id}` : i.id);
  const pending = tasks.filter(t => t.status !== 'Done').length;

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;

    const activeIdStr = active.id as string;
    const overIdStr = over.id as string;

    const isSection = activeIdStr.startsWith('section-');

    if (isSection) {
      const activeSectionId = activeIdStr.replace('section-', '');
      const overSectionId = overIdStr.replace('section-', '');
      const oldIndex = sections.findIndex(s => s.id === activeSectionId);
      const newIndex = sections.findIndex(s => s.id === overSectionId);
      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = [...sections];
        const [moved] = reordered.splice(oldIndex, 1);
        reordered.splice(newIndex, 0, moved);
        onReorderSections(date, reordered.map(s => s.id));
      }
      return;
    }

    // Task drag — figure out new section and sort order
    const overItem = items.find(i => (i.type === 'section' ? `section-${i.id}` : i.id) === overIdStr);
    const newSectionId = overItem?.type === 'section' ? overItem.id : overItem?.sectionId ?? null;
    const overIndex = items.findIndex(i => (i.type === 'section' ? `section-${i.id}` : i.id) === overIdStr);

    // Rebuild assignments array with new position
    const newAssignments = tasks.map((t, idx) => {
      const a = getAssignment(t.id);
      if (t.id === activeIdStr) {
        return { taskId: t.id, sectionId: newSectionId, date, sortOrder: overIndex };
      }
      return { taskId: t.id, sectionId: a?.sectionId ?? null, date, sortOrder: a?.sortOrder ?? idx };
    });

    onReorderAssignments(newAssignments);
  };

  return (
    <div className="mb-6">
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
        tasks.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-600 italic py-2">Nothing scheduled</p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={allIds} strategy={verticalListSortingStrategy}>
              {items.map(item => {
                if (item.type === 'section') {
                  const section = sections.find(s => s.id === item.id)!;
                  return (
                    <SectionHeader
                      key={`section-${section.id}`}
                      section={section}
                      onRename={onRenameSection}
                      onDelete={onDeleteSection}
                    />
                  );
                }
                const task = tasks.find(t => t.id === item.id)!;
                return (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onComplete={onComplete}
                    onTaskClick={onTaskClick}
                  />
                );
              })}
            </SortableContext>
          </DndContext>
        )
      )}
    </div>
  );
}

// ── UpcomingView ──────────────────────────────────────────────────────────────

interface UpcomingViewProps {
  tasks: Task[];
  onComplete: (id: string) => void;
  onTaskClick: (task: Task) => void;
}

export function UpcomingView({ tasks, onComplete, onTaskClick }: UpcomingViewProps) {
  const {
    today, tomorrow,
    todayTasks, tomorrowTasks,
    todaySections, tomorrowSections,
    todayAssignments, tomorrowAssignments,
    templates, loading,
    addSection, updateSection, deleteSection, reorderSections,
    reorderAssignments, addTemplate, deleteTemplate,
  } = useUpcoming(tasks);

  if (loading) return <p className="text-xs text-gray-400 dark:text-gray-600 text-center py-8">Loading...</p>;

  return (
    <div>
      <DayBlock
        label="Today"
        date={today}
        tasks={todayTasks}
        sections={todaySections}
        assignments={todayAssignments}
        templates={templates}
        onComplete={onComplete}
        onTaskClick={onTaskClick}
        onAddSection={addSection}
        onRenameSection={(id, title) => updateSection(id, { title })}
        onDeleteSection={deleteSection}
        onReorderSections={reorderSections}
        onReorderAssignments={reorderAssignments}
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
        onComplete={onComplete}
        onTaskClick={onTaskClick}
        onAddSection={addSection}
        onRenameSection={(id, title) => updateSection(id, { title })}
        onDeleteSection={deleteSection}
        onReorderSections={reorderSections}
        onReorderAssignments={reorderAssignments}
        onSaveTemplate={addTemplate}
        onDeleteTemplate={deleteTemplate}
      />
    </div>
  );
}
