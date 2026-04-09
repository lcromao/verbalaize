import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const HISTORY_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface HistoryEntry {
  id: string;
  title: string;
  text: string;
  type: 'upload' | 'realtime';
  model: string;
  action: string;
  createdAt: number;
  fileName?: string;
}

interface HistoryState {
  entries: HistoryEntry[];
  selectedId: string | null;
  sidebarOpen: boolean;
  addEntry: (entry: Omit<HistoryEntry, 'id' | 'createdAt'>) => string;
  removeEntry: (id: string) => void;
  clearAll: () => void;
  selectEntry: (id: string | null) => void;
  toggleSidebar: () => void;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      entries: [],
      selectedId: null,
      sidebarOpen: true,

      addEntry: (entry) => {
        const id = crypto.randomUUID();
        const cutoff = Date.now() - HISTORY_TTL_MS;
        set((state) => ({
          entries: [
            { ...entry, id, createdAt: Date.now() },
            ...state.entries.filter((e) => e.createdAt > cutoff),
          ],
          selectedId: id,
        }));
        return id;
      },

      removeEntry: (id) =>
        set((state) => ({
          entries: state.entries.filter((e) => e.id !== id),
          selectedId: state.selectedId === id ? null : state.selectedId,
        })),

      clearAll: () => set({ entries: [], selectedId: null }),

      selectEntry: (id) => set({ selectedId: id }),

      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    }),
    {
      name: 'verbalaize-history',
      partialize: (state) => ({
        entries: state.entries,
        sidebarOpen: state.sidebarOpen,
      }),
      // Purge expired entries when rehydrating from localStorage
      merge: (persisted: unknown, current) => {
        const p = persisted as Partial<HistoryState>;
        const cutoff = Date.now() - HISTORY_TTL_MS;
        return {
          ...current,
          ...p,
          entries: (p.entries ?? []).filter((e) => e.createdAt > cutoff),
        };
      },
    }
  )
);
