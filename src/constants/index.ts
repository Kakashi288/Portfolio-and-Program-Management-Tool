import type { TaskStatus, GanttConfig } from '../types';

export const TASK_STATUSES: { value: TaskStatus; label: string; color: string }[] = [
  { value: 'not started', label: 'Not Started', color: 'bg-gray-100 text-gray-700' },
  { value: 'in progress', label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  { value: 'blocked', label: 'Blocked', color: 'bg-red-100 text-red-700' },
  { value: 'backlog', label: 'Backlog', color: 'bg-gray-100 text-gray-700' },
  { value: 'complete', label: 'Completed', color: 'bg-green-100 text-green-700' },
  { value: 'on-hold', label: 'On Hold', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-gray-100 text-gray-700' },
  { value: 'duplicate', label: 'Duplicate', color: 'bg-gray-100 text-gray-700' },
];

export const DEPENDENCY_TYPES = [
  { value: 'finish-to-start', label: 'Finish to Start (FS)' },
  { value: 'start-to-start', label: 'Start to Start (SS)' },
  { value: 'finish-to-finish', label: 'Finish to Finish (FF)' },
  { value: 'start-to-finish', label: 'Start to Finish (SF)' },
] as const;

export const DEFAULT_GANTT_CONFIG: GanttConfig = {
  viewMode: 'week',
  showDependencies: true,
  showCriticalPath: false,
  zoom: 1,
};

export const STORAGE_KEYS = {
  PROJECT: 'project-management-data',
  PROJECTS_LIST: 'project-management-projects-list',
  CURRENT_PROJECT_ID: 'project-management-current-project-id',
  UI_STATE: 'project-management-ui-state',
  PROJECT_SETUP_VIEW: 'project-management-project-setup-view',
  CURRENT_SECTION: 'project-management-current-section', // 'sre-dashboard' | 'projects'
} as const;

export const DEFAULT_TEAM_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
];

export const DATE_FORMAT = 'MMM dd, yyyy';
export const DATE_TIME_FORMAT = 'MMM dd, yyyy HH:mm';
