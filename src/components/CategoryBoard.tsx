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
  DragOverEvent,
  DragOverlay,
  Active,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Category, Task, CATEGORY_COLORS } from '../types';

// ── TaskCard ──────────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: Task;
  onComplete: (id: string) => void;
  onClick: (task: Task) => void;
  overlay?: boolean;
}

export function TaskCard({ task, onComplete, onClick, overlay }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id, data: { type: 'task', category: task.category } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={overlay ? {} : style}
      className={`bg-white rounded-xl shadow-sm border border-gray-100 p-3 mb-2 flex items-center gap-3 touch-none
        ${task.status === 'Done' ? 'opacity-50' : ''}
        ${overlay ? 'shadow-lg rotate-1 scale-105' : ''}`}
    >
      <div {...attributes} {...listeners}
        className="text-gray-300 cursor-grab active:cursor-grabbing text-lg select-none px-1 flex-shrink-0">
        ⠿
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
      <div className="flex-1 min-w-0" onClick={() => onClick(task)}>
        <p className={`text-sm font-medium truncate ${task.status === 'Done' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-400">{task.priority}</span>
          {task.recurrence !== 'None' && (
            <span className="text-xs text-blue-400">↻ {task.recurrence}</span>
          )}
          {task.dueDate && (
            <span className="text-xs text-gray-400">
              {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── CategoryColumn ────────────────────────────────────────────────────────────

interface CategoryColumnProps {
  category: Category;
  onComplete: (id: string) => void;
  onTaskClick: (task: Task) => void;
  onEditCategory: (cat: Category) => void;
  isOver?: boolean;
  isDraggingCategory?: boolean;
}

function CategoryColumn({ category, onComplete, onTaskClick, onEditCategory, isOver, isDraggingCategory }: CategoryColumnProps) {
  const [collapsed, setCollapsed] = useState(false);
  const colorClass = CATEGORY_COLORS[category.color] || CATEGORY_COLORS.Gray;
  const pending = category.tasks.filter(t => t.status !== 'Done').length;

  const {
    attributes: catAttributes,
    listeners: catListeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id, data: { type: 'category' } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-2xl p-4 mb-4 transition-colors border-2 touch-none
        ${isOver && !isDraggingCategory ? 'border-blue-300 bg-blue-50' : 'border-transparent bg-gray-50'}
        ${isDragging ? 'shadow-xl' : ''}`}
    >
      <div className="flex items-center justify-between mb-3">
        {/* Category drag handle */}
        <div {...catAttributes} {...catListeners}
          className="text-gray-300 cursor-grab active:cursor-grabbing text-lg select-none pr-2 flex-shrink-0">
          ⠿
        </div>

        <button onClick={() => setCollapsed(c => !c)} className="flex items-center gap-2 flex-1">
          <span className={`text-xs font-bold px-2 py-1 rounded-lg border ${colorClass}`}>
            {category.name}
          </span>
          {pending > 0 && (
            <span className="bg-blue-100 text-blue-600 text-xs font-semibold px-2 py-0.5 rounded-full">
              {pending}
            </span>
          )}
          <span className="text-gray-400 text-sm ml-1">{collapsed ? '▸' : '▾'}</span>
        </button>

        <button onClick={() => onEditCategory(category)}
          className="text-gray-300 hover:text-gray-500 transition-colors text-sm px-2">
          ✎
        </button>
      </div>

      {!collapsed && (
        <SortableContext
          items={category.tasks.map(t => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {category.tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onComplete={onComplete}
              onClick={onTaskClick}
            />
          ))}
          {category.tasks.length === 0 && (
            <div className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors
              ${isOver && !isDraggingCategory ? 'border-blue-300' : 'border-gray-200'}`}>
              <p className="text-xs text-gray-400">Drop tasks here</p>
            </div>
          )}
        </SortableContext>
      )}
    </div>
  );
}

// ── CategoryBoard ─────────────────────────────────────────────────────────────

interface CategoryBoardProps {
  categories: Category[];
  onComplete: (id: string) => void;
  onTaskClick: (task: Task) => void;
  onEditCategory: (cat: Category) => void;
  onReorder: (activeId: string, overId: string, activeCat: string, overCat: string, cats: Category[]) => void;
  onReorderCategories: (oldIndex: number, newIndex: number, cats: Category[]) => void;
}

export function CategoryBoard({
  categories, onComplete, onTaskClick, onEditCategory, onReorder, onReorderCategories
}: CategoryBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [overCategory, setOverCategory] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const findTaskCategory = (taskId: string) =>
    categories.find(c => c.tasks.some(t => t.id === taskId))?.name || '';

  const findCategoryFromOver = (over: { id: string | number }) => {
    const taskCat = categories.find(c => c.tasks.some(t => t.id === over.id));
    if (taskCat) return taskCat.name;
    const cat = categories.find(c => c.id === over.id);
    if (cat) return cat.name;
    return null;
  };

  const handleDragStart = ({ active }: { active: Active }) => {
    if (active.data.current?.type === 'category') {
      const cat = categories.find(c => c.id === active.id);
      if (cat) setActiveCategory(cat);
    } else {
      const task = categories.flatMap(c => c.tasks).find(t => t.id === active.id);
      if (task) setActiveTask(task);
    }
  };

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (active.data.current?.type === 'category') return;
    if (!over) { setOverCategory(null); return; }
    const cat = findCategoryFromOver(over);
    setOverCategory(cat);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    const wasCategory = active.data.current?.type === 'category';
    setActiveTask(null);
    setActiveCategory(null);
    setOverCategory(null);

    if (!over || active.id === over.id) return;

    if (wasCategory) {
      const oldIndex = categories.findIndex(c => c.id === active.id);
      const newIndex = categories.findIndex(c => c.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        onReorderCategories(oldIndex, newIndex, categories);
      }
      return;
    }

    const activeCat = findTaskCategory(active.id as string);
    const overCat = findCategoryFromOver(over) || activeCat;
    onReorder(active.id as string, over.id as string, activeCat, overCat, categories);
  };

  if (categories.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-4xl mb-3">📋</p>
        <p className="text-sm">No categories yet. Add one above!</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={categories.map(c => c.id)}
        strategy={verticalListSortingStrategy}
      >
        {categories.map(cat => (
          <CategoryColumn
            key={cat.id}
            category={cat}
            onComplete={onComplete}
            onTaskClick={onTaskClick}
            onEditCategory={onEditCategory}
            isOver={overCategory === cat.name}
            isDraggingCategory={!!activeCategory}
          />
        ))}
      </SortableContext>

      <DragOverlay>
        {activeTask && (
          <TaskCard task={activeTask} onComplete={() => {}} onClick={() => {}} overlay />
        )}
        {activeCategory && (
          <div className="bg-gray-50 rounded-2xl p-4 shadow-xl border-2 border-blue-300 opacity-90">
            <div className="flex items-center gap-2">
              <span className="text-gray-300 text-lg">⠿</span>
              <span className={`text-xs font-bold px-2 py-1 rounded-lg border ${CATEGORY_COLORS[activeCategory.color] || CATEGORY_COLORS.Gray}`}>
                {activeCategory.name}
              </span>
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
