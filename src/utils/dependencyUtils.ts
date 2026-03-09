import type { LineItem, SubTask, Dependency } from '../types';
import { addDays } from './dateUtils';

type Task = LineItem | SubTask;

export const calculateTaskStartDate = (
  task: Task,
  dependency: Dependency,
  allTasks: Task[]
): Date => {
  const dependentTask = allTasks.find(t => t.id === dependency.taskId);
  if (!dependentTask) return task.startDate;

  const lag = dependency.lag || 0;

  switch (dependency.type) {
    case 'finish-to-start':
      return addDays(dependentTask.endDate, lag);
    case 'start-to-start':
      return addDays(dependentTask.startDate, lag);
    case 'finish-to-finish':
      return addDays(dependentTask.endDate, lag);
    case 'start-to-finish':
      return addDays(dependentTask.startDate, lag);
    default:
      return task.startDate;
  }
};

export const getTaskDependencies = (
  taskId: string,
  allTasks: Task[]
): Task[] => {
  const task = allTasks.find(t => t.id === taskId);
  if (!task || !task.dependencies.length) return [];

  return task.dependencies
    .map(dep => allTasks.find(t => t.id === dep.taskId))
    .filter((t): t is Task => t !== undefined);
};

export const getDependentTasks = (
  taskId: string,
  allTasks: Task[]
): Task[] => {
  return allTasks.filter(task =>
    task.dependencies.some(dep => dep.taskId === taskId)
  );
};

export const detectCircularDependencies = (
  tasks: Task[]
): { hasCircular: boolean; cycles: string[][] } => {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const cycles: string[][] = [];

  const dfs = (taskId: string, path: string[]): boolean => {
    if (recursionStack.has(taskId)) {
      const cycleStart = path.indexOf(taskId);
      cycles.push(path.slice(cycleStart).concat(taskId));
      return true;
    }

    if (visited.has(taskId)) return false;

    visited.add(taskId);
    recursionStack.add(taskId);

    const task = tasks.find(t => t.id === taskId);
    if (task) {
      for (const dep of task.dependencies) {
        if (dfs(dep.taskId, [...path, taskId])) {
          return true;
        }
      }
    }

    recursionStack.delete(taskId);
    return false;
  };

  let hasCircular = false;
  for (const task of tasks) {
    if (!visited.has(task.id)) {
      if (dfs(task.id, [])) {
        hasCircular = true;
      }
    }
  }

  return { hasCircular, cycles };
};

export const isValidDependency = (
  fromTaskId: string,
  toTaskId: string,
  allTasks: Task[]
): { valid: boolean; reason?: string } => {
  if (fromTaskId === toTaskId) {
    return { valid: false, reason: 'A task cannot depend on itself' };
  }

  const fromTask = allTasks.find(t => t.id === fromTaskId);
  const toTask = allTasks.find(t => t.id === toTaskId);

  if (!fromTask || !toTask) {
    return { valid: false, reason: 'Task not found' };
  }

  if (fromTask.dependencies.some(dep => dep.taskId === toTaskId)) {
    return { valid: false, reason: 'Dependency already exists' };
  }

  const simulatedTasks = allTasks.map(task =>
    task.id === fromTaskId
      ? { ...task, dependencies: [...task.dependencies, { taskId: toTaskId, type: 'finish-to-start' as const }] }
      : task
  );

  const { hasCircular } = detectCircularDependencies(simulatedTasks);
  if (hasCircular) {
    return { valid: false, reason: 'Would create a circular dependency' };
  }

  return { valid: true };
};

export const topologicalSort = (tasks: Task[]): Task[] => {
  const result: Task[] = [];
  const visited = new Set<string>();
  const tempMarked = new Set<string>();

  const visit = (taskId: string) => {
    if (tempMarked.has(taskId)) {
      throw new Error('Circular dependency detected');
    }
    if (visited.has(taskId)) return;

    tempMarked.add(taskId);

    const task = tasks.find(t => t.id === taskId);
    if (task) {
      for (const dep of task.dependencies) {
        visit(dep.taskId);
      }
      visited.add(taskId);
      tempMarked.delete(taskId);
      result.unshift(task);
    }
  };

  for (const task of tasks) {
    if (!visited.has(task.id)) {
      visit(task.id);
    }
  }

  return result;
};

export const calculateCriticalPath = (tasks: Task[]): string[] => {
  if (tasks.length === 0) return [];

  try {
    const sortedTasks = topologicalSort(tasks);
    const earliestStart = new Map<string, number>();
    const earliestFinish = new Map<string, number>();
    const latestStart = new Map<string, number>();
    const latestFinish = new Map<string, number>();

    for (const task of sortedTasks) {
      let maxPredecessorFinish = 0;
      for (const dep of task.dependencies) {
        const depFinish = earliestFinish.get(dep.taskId) || 0;
        maxPredecessorFinish = Math.max(maxPredecessorFinish, depFinish);
      }
      earliestStart.set(task.id, maxPredecessorFinish);
      earliestFinish.set(task.id, maxPredecessorFinish + task.duration);
    }

    const projectDuration = Math.max(...Array.from(earliestFinish.values()));

    for (const task of sortedTasks.reverse()) {
      const dependents = tasks.filter(t =>
        t.dependencies.some(dep => dep.taskId === task.id)
      );

      let minSuccessorStart = projectDuration;
      if (dependents.length === 0) {
        minSuccessorStart = projectDuration;
      } else {
        for (const dependent of dependents) {
          const depStart = latestStart.get(dependent.id) || projectDuration;
          minSuccessorStart = Math.min(minSuccessorStart, depStart);
        }
      }

      latestFinish.set(task.id, minSuccessorStart);
      latestStart.set(task.id, minSuccessorStart - task.duration);
    }

    const criticalPath: string[] = [];
    for (const task of tasks) {
      const es = earliestStart.get(task.id) || 0;
      const ls = latestStart.get(task.id) || 0;
      if (es === ls) {
        criticalPath.push(task.id);
      }
    }

    return criticalPath;
  } catch (error) {
    console.error('Failed to calculate critical path:', error);
    return [];
  }
};
