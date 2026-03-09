import { create } from 'zustand';
import type { UIState, ViewMode, ResourceCalendarViewMode } from '../types';
import { DEFAULT_GANTT_CONFIG } from '../constants';
import { saveUIStateToStorage, loadUIStateFromStorage } from '../utils/storageUtils';

interface UIStore extends UIState {
  setView: (view: 'list' | 'gantt') => void;
  toggleView: () => void;
  setViewMode: (viewMode: ViewMode) => void;
  setResourceCalendarViewMode: (viewMode: ResourceCalendarViewMode) => void;
  setZoom: (zoom: number) => void;
  toggleShowDependencies: () => void;
  toggleShowCriticalPath: () => void;
  setSelectedTask: (taskId: string | null) => void;
  openTaskForm: () => void;
  closeTaskForm: () => void;
  toggleTaskForm: () => void;
  toggleSidebar: () => void;
  // Table view expand/collapse
  toggleTableExpandedTask: (taskId: string) => void;
  expandAllTable: (taskIds: string[]) => void;
  collapseAllTable: () => void;
  // Gantt view expand/collapse
  toggleGanttExpandedTask: (taskId: string) => void;
  expandAllGantt: (taskIds: string[]) => void;
  collapseAllGantt: () => void;
  setSearchQuery: (query: string) => void;
  setStatusFilters: (statuses: import('../types').TaskStatus[]) => void;
  setTeamFilters: (teamIds: string[]) => void;
  setDriFilters: (driIds: string[]) => void;
  toggleShowCompleted: () => void;
  clearFilters: () => void;
  loadFromStorage: () => void;
  saveToStorage: () => void;
  isPathMilestoneOpen: boolean;
  openPathMilestone: () => void;
  closePathMilestone: () => void;
}

export const useUIStore = create<UIStore>((set, get) => ({
  ganttConfig: DEFAULT_GANTT_CONFIG,
  resourceCalendarViewMode: 'day',
  selectedTaskId: null,
  isTaskFormOpen: false,
  isSidebarOpen: true,
  view: 'dashboard',
  tableExpandedTasks: [],
  ganttExpandedTasks: [],
  isPathMilestoneOpen: false,
  filters: {
    searchQuery: '',
    statusFilters: [],
    teamFilters: [],
    driFilters: [],
    showCompleted: true,
  },

  setView: (view) => {
    set({ view });
    get().saveToStorage();
  },

  toggleView: () => {
    set((state) => ({ view: state.view === 'list' ? 'gantt' : 'list' }));
    get().saveToStorage();
  },

  setViewMode: (viewMode) => {
    set((state) => ({
      ganttConfig: { ...state.ganttConfig, viewMode },
    }));
    get().saveToStorage();
  },

  setResourceCalendarViewMode: (viewMode) => {
    set({ resourceCalendarViewMode: viewMode });
    get().saveToStorage();
  },

  setZoom: (zoom) => {
    set((state) => ({
      ganttConfig: { ...state.ganttConfig, zoom: Math.max(0.5, Math.min(2, zoom)) },
    }));
    get().saveToStorage();
  },

  toggleShowDependencies: () => {
    set((state) => ({
      ganttConfig: {
        ...state.ganttConfig,
        showDependencies: !state.ganttConfig.showDependencies,
      },
    }));
    get().saveToStorage();
  },

  toggleShowCriticalPath: () => {
    set((state) => ({
      ganttConfig: {
        ...state.ganttConfig,
        showCriticalPath: !state.ganttConfig.showCriticalPath,
      },
    }));
    get().saveToStorage();
  },

  setSelectedTask: (taskId) => {
    set({ selectedTaskId: taskId });
  },

  openTaskForm: () => {
    set({ isTaskFormOpen: true });
  },

  closeTaskForm: () => {
    set({ isTaskFormOpen: false, selectedTaskId: null });
  },

  toggleTaskForm: () => {
    set((state) => ({ isTaskFormOpen: !state.isTaskFormOpen }));
  },

  toggleSidebar: () => {
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen }));
    get().saveToStorage();
  },

  // Table view expand/collapse
  toggleTableExpandedTask: (taskId) => {
    set((state) => {
      const tableExpandedTasks = state.tableExpandedTasks.includes(taskId)
        ? state.tableExpandedTasks.filter(id => id !== taskId)
        : [...state.tableExpandedTasks, taskId];
      return { tableExpandedTasks };
    });
    get().saveToStorage();
  },

  expandAllTable: (taskIds) => {
    set({ tableExpandedTasks: taskIds });
    get().saveToStorage();
  },

  collapseAllTable: () => {
    set({ tableExpandedTasks: [] });
    get().saveToStorage();
  },

  // Gantt view expand/collapse
  toggleGanttExpandedTask: (taskId) => {
    set((state) => {
      const ganttExpandedTasks = state.ganttExpandedTasks.includes(taskId)
        ? state.ganttExpandedTasks.filter(id => id !== taskId)
        : [...state.ganttExpandedTasks, taskId];
      return { ganttExpandedTasks };
    });
    get().saveToStorage();
  },

  expandAllGantt: (taskIds) => {
    set({ ganttExpandedTasks: taskIds });
    get().saveToStorage();
  },

  collapseAllGantt: () => {
    set({ ganttExpandedTasks: [] });
    get().saveToStorage();
  },

  setSearchQuery: (searchQuery) => {
    set((state) => ({
      filters: { ...state.filters, searchQuery },
    }));
    get().saveToStorage();
  },

  setStatusFilters: (statusFilters) => {
    set((state) => ({
      filters: { ...state.filters, statusFilters },
    }));
    get().saveToStorage();
  },

  setTeamFilters: (teamFilters) => {
    set((state) => ({
      filters: { ...state.filters, teamFilters },
    }));
    get().saveToStorage();
  },

  setDriFilters: (driFilters) => {
    set((state) => ({
      filters: { ...state.filters, driFilters },
    }));
    get().saveToStorage();
  },

  toggleShowCompleted: () => {
    set((state) => ({
      filters: { ...state.filters, showCompleted: !state.filters.showCompleted },
    }));
    get().saveToStorage();
  },

  clearFilters: () => {
    set({
      filters: {
        searchQuery: '',
        statusFilters: [],
        teamFilters: [],
        driFilters: [],
        showCompleted: true,
      },
    });
    get().saveToStorage();
  },

  loadFromStorage: () => {
    const uiState = loadUIStateFromStorage();
    if (uiState) {
      set(uiState);
    }
  },

  saveToStorage: () => {
    const state = get();
    const uiState: UIState = {
      ganttConfig: state.ganttConfig,
      resourceCalendarViewMode: state.resourceCalendarViewMode,
      selectedTaskId: state.selectedTaskId,
      isTaskFormOpen: state.isTaskFormOpen,
      isSidebarOpen: state.isSidebarOpen,
      view: state.view,
      tableExpandedTasks: state.tableExpandedTasks,
      ganttExpandedTasks: state.ganttExpandedTasks,
      filters: state.filters,
    };
    saveUIStateToStorage(uiState);
  },

  openPathMilestone: () => {
    set({ isPathMilestoneOpen: true });
  },

  closePathMilestone: () => {
    set({ isPathMilestoneOpen: false });
  },
}));
