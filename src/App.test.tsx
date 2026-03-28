/**
 * Smoke test: App renders without crashing.
 * Full logic tests live in src/__tests__/taskFilters.test.ts
 */
import React from 'react';
import { render } from '@testing-library/react';

// Mock heavy modules that don't work in jsdom
jest.mock('./lib/api', () => ({
  api: {
    getTasks: jest.fn().mockResolvedValue([]),
    getCategories: jest.fn().mockResolvedValue([]),
    getUpcoming: jest.fn().mockResolvedValue({ sections: [], assignments: [] }),
    getSectionTemplates: jest.fn().mockResolvedValue([]),
  },
  setCurrentUser: jest.fn(),
}));

jest.mock('./lib/push', () => ({
  registerPushNotifications: jest.fn().mockResolvedValue(undefined),
}));

// Stub out dnd-kit — it calls ResizeObserver and other browser APIs not in jsdom
jest.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DragOverlay: () => null,
  useDraggable: () => ({ attributes: {}, listeners: {}, setNodeRef: () => {}, transform: null }),
  useDroppable: () => ({ setNodeRef: () => {}, isOver: false }),
  PointerSensor: class {},
  TouchSensor: class {},
  KeyboardSensor: class {},
  useSensor: () => ({}),
  useSensors: (...args: unknown[]) => args,
  closestCenter: jest.fn(),
  pointerWithin: jest.fn(() => []),
}));

jest.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSortable: () => ({
    attributes: {}, listeners: {}, setNodeRef: () => {},
    transform: null, transition: undefined, isDragging: false,
  }),
  verticalListSortingStrategy: 'vertical',
  sortableKeyboardCoordinates: jest.fn(),
  arrayMove: (arr: unknown[], from: number, to: number) => {
    const result = [...arr];
    const [item] = result.splice(from, 1);
    result.splice(to, 0, item);
    return result;
  },
}));

jest.mock('@dnd-kit/utilities', () => ({
  CSS: { Transform: { toString: () => '' } },
}));

import App from './App';

test('App renders without crashing', () => {
  // Should render ProfileScreen (user picker) without throwing
  expect(() => render(<App />)).not.toThrow();
});
