import type { LineItem, SubTask, TaskStatus } from '../types';

export const calculateTaskProgress = (task: LineItem): number => {
  if (task.subtasks.length === 0) {
    return task.status === 'complete' ? 100 : 0;
  }

  const totalProgress = task.subtasks.reduce((sum, subtask) => sum + subtask.progress, 0);
  return Math.round(totalProgress / task.subtasks.length);
};

export const getAllTasks = (lineItems: LineItem[]): (LineItem | SubTask)[] => {
  const tasks: (LineItem | SubTask)[] = [];

  const addTasksRecursively = (items: (LineItem | SubTask)[]) => {
    items.forEach(item => {
      tasks.push(item);
      if (item.subtasks && item.subtasks.length > 0) {
        addTasksRecursively(item.subtasks);
      }
    });
  };

  addTasksRecursively(lineItems);
  return tasks;
};

export const getTaskById = (
  id: string,
  lineItems: LineItem[]
): LineItem | SubTask | undefined => {
  const searchRecursively = (items: (LineItem | SubTask)[]): LineItem | SubTask | undefined => {
    for (const item of items) {
      if (item.id === id) return item;
      if (item.subtasks && item.subtasks.length > 0) {
        const found = searchRecursively(item.subtasks);
        if (found) return found;
      }
    }
    return undefined;
  };

  return searchRecursively(lineItems);
};

export const getLineItemBySubTaskId = (
  subtaskId: string,
  lineItems: LineItem[]
): LineItem | undefined => {
  return lineItems.find(item => item.subtasks.some(st => st.id === subtaskId));
};

export const getStatusColor = (status: TaskStatus): string => {
  const colorMap: Record<TaskStatus, string> = {
    'not started': '#6b7280',
    'backlog': '#6366f1',
    'in progress': '#3b82f6',
    'complete': '#22c55e',
    'on-hold': '#eab308',
    'blocked': '#ef4444',
    'cancelled': '#f97316',
    'duplicate': '#94a3b8',
  };
  return colorMap[status] || '#6b7280';
};

export const getStatusBgColor = (status: TaskStatus): string => {
  const colorMap: Record<TaskStatus, string> = {
    'not started': '#f3f4f6',
    'backlog': '#eef2ff',
    'in progress': '#dbeafe',
    'complete': '#d1fae5',
    'on-hold': '#fef3c7',
    'blocked': '#fee2e2',
    'cancelled': '#ffedd5',
    'duplicate': '#f1f5f9',
  };
  return colorMap[status] || '#f3f4f6';
};

export const sortTasksByStartDate = <T extends { startDate: Date }>(tasks: T[]): T[] => {
  return [...tasks].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
};

export const sortTasksByStatus = <T extends { status: TaskStatus }>(tasks: T[]): T[] => {
  const statusOrder: Record<TaskStatus, number> = {
    'blocked': 1,
    'in progress': 2,
    'not started': 3,
    'backlog': 4,
    'on-hold': 5,
    'complete': 6,
    'cancelled': 7,
    'duplicate': 8,
  };

  return [...tasks].sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
};

export const filterTasksByStatus = <T extends { status: TaskStatus }>(
  tasks: T[],
  statuses: TaskStatus[]
): T[] => {
  return tasks.filter(task => statuses.includes(task.status));
};

export const filterTasksByTeam = <T extends { teamId: string }>(
  tasks: T[],
  teamIds: string[]
): T[] => {
  return tasks.filter(task => teamIds.includes(task.teamId));
};

export const getTasksInDateRange = <T extends { startDate: Date; endDate: Date }>(
  tasks: T[],
  startDate: Date,
  endDate: Date
): T[] => {
  return tasks.filter(task =>
    (task.startDate >= startDate && task.startDate <= endDate) ||
    (task.endDate >= startDate && task.endDate <= endDate) ||
    (task.startDate <= startDate && task.endDate >= endDate)
  );
};
