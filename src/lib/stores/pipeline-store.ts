import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FeatureRequestFilter, FeatureRequestSort, FeatureRequestSortField, SortDirection } from '@/types';

export type PipelineViewType = 'list' | 'table' | 'board';

interface PipelineStore {
  // View state
  pipelineView: PipelineViewType;
  setPipelineView: (view: PipelineViewType) => void;

  // Filter state
  filter: FeatureRequestFilter;
  setFilter: (filter: FeatureRequestFilter) => void;
  clearFilter: () => void;

  // Sort state
  sort: FeatureRequestSort;
  setSort: (sort: FeatureRequestSort) => void;
  setSortField: (field: FeatureRequestSortField) => void;
  toggleSortDirection: () => void;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Expanded phases in list view
  expandedPhases: Set<string>;
  togglePhaseExpanded: (phase: string) => void;
  expandAllPhases: () => void;
  collapseAllPhases: () => void;

  // Selected feature requests (for bulk actions)
  selectedFeatureIds: Set<string>;
  toggleFeatureSelected: (id: string) => void;
  selectAllFeatures: (ids: string[]) => void;
  clearSelection: () => void;

  // Drawer state
  selectedFeatureId: string | null;
  setSelectedFeatureId: (id: string | null) => void;
}

const defaultFilter: FeatureRequestFilter = {
  status: undefined,
  priority: undefined,
  phase: undefined,
  assignees: undefined,
  tags: undefined,
  search: undefined,
};

const defaultSort: FeatureRequestSort = {
  field: 'order',
  direction: 'asc',
};

export const usePipelineStore = create<PipelineStore>()(
  persist(
    (set, get) => ({
      // View state
      pipelineView: 'list',
      setPipelineView: (view) => set({ pipelineView: view }),

      // Filter state
      filter: defaultFilter,
      setFilter: (filter) => set({ filter }),
      clearFilter: () => set({ filter: defaultFilter }),

      // Sort state
      sort: defaultSort,
      setSort: (sort) => set({ sort }),
      setSortField: (field) => {
        const currentSort = get().sort;
        const direction: SortDirection =
          currentSort.field === field && currentSort.direction === 'asc' ? 'desc' : 'asc';
        set({ sort: { field, direction } });
      },
      toggleSortDirection: () => {
        const currentSort = get().sort;
        set({
          sort: {
            ...currentSort,
            direction: currentSort.direction === 'asc' ? 'desc' : 'asc',
          },
        });
      },

      // Search
      searchQuery: '',
      setSearchQuery: (query) => set({ searchQuery: query }),

      // Expanded phases
      expandedPhases: new Set(['Phase 1', 'Phase 2', 'Phase 3', 'Future', 'Unassigned']),
      togglePhaseExpanded: (phase) => {
        const expanded = new Set(get().expandedPhases);
        if (expanded.has(phase)) {
          expanded.delete(phase);
        } else {
          expanded.add(phase);
        }
        set({ expandedPhases: expanded });
      },
      expandAllPhases: () => {
        set({ expandedPhases: new Set(['Phase 1', 'Phase 2', 'Phase 3', 'Phase 4', 'Future', 'Unassigned']) });
      },
      collapseAllPhases: () => {
        set({ expandedPhases: new Set() });
      },

      // Selected features
      selectedFeatureIds: new Set(),
      toggleFeatureSelected: (id) => {
        const selected = new Set(get().selectedFeatureIds);
        if (selected.has(id)) {
          selected.delete(id);
        } else {
          selected.add(id);
        }
        set({ selectedFeatureIds: selected });
      },
      selectAllFeatures: (ids) => {
        set({ selectedFeatureIds: new Set(ids) });
      },
      clearSelection: () => {
        set({ selectedFeatureIds: new Set() });
      },

      // Drawer state
      selectedFeatureId: null,
      setSelectedFeatureId: (id) => set({ selectedFeatureId: id }),
    }),
    {
      name: 'pipeline-store',
      partialize: (state) => ({
        pipelineView: state.pipelineView,
        sort: state.sort,
        // Don't persist: filter, searchQuery, expandedPhases, selectedFeatureIds, selectedFeatureId
      }),
    }
  )
);
