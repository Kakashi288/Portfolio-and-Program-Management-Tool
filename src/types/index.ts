export type TaskStatus =
  | "not started"
  | "in progress"
  | "blocked"
  | "backlog"
  | "complete"
  | "on-hold"
  | "cancelled"
  | "duplicate";

export type DependencyType =
  | "finish-to-start"
  | "start-to-start"
  | "finish-to-finish"
  | "start-to-finish";

export type ViewMode = "day" | "week" | "month" | "quarter";

export type ResourceCalendarViewMode = "day" | "week" | "month" | "quarter" | "year";

export interface Team {
  id: string;
  name: string;
  color: string;
}

export interface Person {
  id: string;
  name: string;
  email: string;
  teamId: string;
}

export interface Dependency {
  taskId: string;
  type: DependencyType;
  lag?: number;
}

export interface Task {
  id: string;
  name: string;
  duration: number;
  startDate: Date;
  endDate: Date;
  dependencies: Dependency[];
  teamId: string;
  driId: string;
  status: TaskStatus;
  progress: number;
  notes?: string;
  externalLinks?: string;
  isMilestone?: boolean;
  color?: string;
  subtasks: Task[];
  parentTaskId?: string;
}

export interface SubTask {
  id: string;
  name: string;
  duration: number;
  startDate: Date;
  endDate: Date;
  dependencies: Dependency[];
  teamId: string;
  driId: string;
  status: TaskStatus;
  parentTaskId: string;
  progress: number;
  notes?: string;
  externalLinks?: string;
  isMilestone?: boolean;
  subtasks: SubTask[];
}

export interface LineItem {
  id: string;
  name: string;
  duration: number;
  startDate: Date;
  endDate: Date;
  dependencies: Dependency[];
  teamId: string;
  driId: string;
  status: TaskStatus;
  subtasks: LineItem[];
  progress: number;
  notes?: string;
  externalLinks?: string;
  isMilestone?: boolean;
  color?: string;
  parentTaskId?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  lineItems: LineItem[];
  teams: Team[];
  people: Person[];
  createdAt: Date;
  updatedAt: Date;
}

export interface GanttConfig {
  viewMode: ViewMode;
  showDependencies: boolean;
  showCriticalPath: boolean;
  zoom: number;
}

export interface UIState {
  ganttConfig: GanttConfig;
  resourceCalendarViewMode: ResourceCalendarViewMode;
  selectedTaskId: string | null;
  isTaskFormOpen: boolean;
  isSidebarOpen: boolean;
  view: 'list' | 'gantt' | 'dashboard' | 'calendar';
  tableExpandedTasks: string[];
  ganttExpandedTasks: string[];
  filters: {
    searchQuery: string;
    statusFilters: TaskStatus[];
    teamFilters: string[];
    driFilters: string[];
    showCompleted: boolean;
  };
}

export interface TaskFormData {
  name: string;
  duration: number;
  startDate: Date;
  teamId: string;
  driId: string;
  status: TaskStatus;
  dependencies: Dependency[];
  notes?: string;
  externalLinks?: string;
  isMilestone?: boolean;
}

export interface SubTaskFormData {
  name: string;
  duration: number;
  startDate: Date;
  teamId: string;
  driId: string;
  status: TaskStatus;
  dependencies: Dependency[];
  notes?: string;
  externalLinks?: string;
}
