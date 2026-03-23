import React, { useState } from 'react';
import { Category, CATEGORY_COLORS } from '../types';

interface Props {
  category?: Category;
  onSave: (name: string, color: string) => void;
  onUpdate?: (id: string, updates: Partial<Category>) => void;
  onDelete?: (id: string, name: string) => void;
  onClose: () => void;
}

const COLORS = Object.keys(CATEGORY_COLORS);

export function CategoryEditModal({ category, onSave, onUpdate, onDelete, onClose }: Props) {
  const [name, setName] = useState(category?.name || '');
  const [color, setColor] = useState(category?.color || 'Blue');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isEdit = !!category;

  const handleSave = () => {
    if (!name.trim()) return;
    if (isEdit && onUpdate) {
      onUpdate(category.id, { name, color });
    } else {
      onSave(name, color);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-t-3xl p-6 pb-10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">
            {isEdit ? 'Edit Category' : 'New Category'}
          </h2>
          <button onClick={onClose} className="text-gray-400 text-2xl leading-none">×</button>
        </div>

        <div className="space-y-4">
          <input
            autoFocus={!isEdit}
            type="text"
            placeholder="Category name"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"

          />

          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 block">Color</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all
                    ${CATEGORY_COLORS[c]}
                    ${color === c ? 'ring-2 ring-offset-1 ring-blue-400 scale-105' : ''}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button onClick={handleSave} disabled={!name.trim()}
          className="w-full mt-6 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-3.5 rounded-2xl transition-colors">
          {isEdit ? 'Save Changes' : 'Add Category'}
        </button>

        {isEdit && onDelete && !confirmDelete && (
          <button onClick={() => setConfirmDelete(true)}
            className="w-full mt-3 text-red-400 hover:text-red-600 font-medium py-2 text-sm transition-colors">
            Delete Category & All Its Tasks
          </button>
        )}

        {confirmDelete && onDelete && (
          <div className="mt-3 flex gap-2">
            <button onClick={() => { onDelete(category!.id, category!.name); onClose(); }}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 rounded-2xl transition-colors text-sm">
              Yes, delete everything
            </button>
            <button onClick={() => setConfirmDelete(false)}
              className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 font-semibold py-3 rounded-2xl transition-colors text-sm">
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
