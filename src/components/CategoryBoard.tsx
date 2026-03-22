import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
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
import { Category, Task } from '../types';

interface TaskCardProps {
  task: Task;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
}

function TaskCard({ task, onComplete, onDelete }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-xl shadow-sm border border-gray-100 p-3 mb-2 flex items-center gap-3 touch-none
        ${task.status === 'Done' ? 'opacity-50' : ''}`}
    >
      {/* Drag handle */}
      <div {...attributes} {...listeners}
        className="text-gray-300 cursor-grab active:cursor-grabbing text-lg select-none px-1">
        ⠿
      </div>

      {/* Checkbox */}
      <button
        onClick={() => onComplete(task.id)}
        className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors
          ${task.status === 'Done'
            ? 'bg-green-400 border-green-400 text-white'
            : 'border-gray-300 hover:border-green-400'}`}
      >
        {task.status === 'Done' && <span className="text-xs">✓</span>}
      </button>

      {/* Task info */}
      <div className="flex-1 min-w-0">
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

      {/* Delete */}
      <button onClick={() => onDelete(task.id)}
        className="text-gray-200 hover:text-red-400 transition-colors text-lg flex-shrink-0">
        ×
      </button>
    </div>
  );
}

interface CategoryColumnProps {
  category: Category;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onDragEnd: (category: string, event: DragEndEvent) => void;
}

function CategoryColumn({ category, onComplete, onDelete, onDragEnd }: CategoryColumnProps) {
  const [collapsed, setCollapsed] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const pending = category.tasks.filter(t => t.status !== 'Done').length;

  return (
    <div className="bg-gray-50 rounded-2xl p-4 mb-4">
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between mb-3"
      >
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
            {category.name}
          </h2>
          {pending > 0 && (
            <span className="bg-blue-100 text-blue-600 text-xs font-semibold px-2 py-0.5 rounded-full">
              {pending}
            </span>
          )}
        </div>
        <span className="text-gray-400 text-sm">{collapsed ? '▸' : '▾'}</span>
      </button>

      {!collapsed && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(e) => onDragEnd(category.name, e)}
        >
          <SortableContext
            items={category.tasks.map(t => t.id)}
            strategy={verticalListSortingStrategy}
          >
            {category.tasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onComplete={onComplete}
                onDelete={onDelete}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}

      {!collapsed && category.tasks.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-4">No tasks here yet</p>
      )}
    </div>
  );
}

interface CategoryBoardProps {
  categories: Category[];
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onReorder: (category: string, oldIndex: number, newIndex: number) => void;
}

export function CategoryBoard({ categories, onComplete, onDelete, onReorder }: CategoryBoardProps) {
  const handleDragEnd = (categoryName: string, event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const category = categories.find(c => c.name === categoryName);
    if (!category) return;

    const oldIndex = category.tasks.findIndex(t => t.id === active.id);
    const newIndex = category.tasks.findIndex(t => t.id === over.id);
    onReorder(categoryName, oldIndex, newIndex);
  };

  if (categories.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-4xl mb-3">📋</p>
        <p className="text-sm">No tasks yet. Add one below!</p>
      </div>
    );
  }

  return (
    <div>
      {categories.map(cat => (
        <CategoryColumn
          key={cat.id}
          category={cat}
          onComplete={onComplete}
          onDelete={onDelete}
          onDragEnd={handleDragEnd}
        />
      ))}
    </div>
  );
}
