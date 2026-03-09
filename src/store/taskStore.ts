import { create } from 'zustand';
import type { LineItem, SubTask } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { useProjectStore } from './projectStore';
import { calculateEndDate, calculateDuration, adjustForWeekend } from '../utils/dateUtils';
import { calculateTaskProgress } from '../utils/taskUtils';

// Sentinel date to indicate "no date set"
const SENTINEL_DATE = new Date(1900, 0, 1);

// Helper function to check if a date is the sentinel value
const isSentinelDate = (date: Date): boolean => {
  return date.getFullYear() === 1900 && date.getMonth() === 0 && date.getDate() === 1;
};

// Helper function to find task by ID recursively
export const findTaskInTree = (
  tasks: LineItem[],
  taskId: string,
  parentPath: number[] = []
): { task: LineItem; path: number[]; parent: LineItem | null } | null => {
  if (!tasks) return null;

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    if (task.id === taskId) {
      return { task, path: [...parentPath, i], parent: null };
    }
    // Search in subtasks recursively
    if (task.subtasks && task.subtasks.length > 0) {
      const found = findTaskInTree(task.subtasks, taskId, [...parentPath, i]);
      if (found) {
        return { ...found, parent: task };
      }
    }
  }
  return null;
};

// Helper function to update task at path recursively
const updateTaskAtPath = (
  tasks: LineItem[],
  path: number[],
  updater: (task: LineItem) => LineItem
): LineItem[] => {
  if (path.length === 0) return tasks;

  const [index, ...rest] = path;

  return tasks.map((task, i) => {
    if (i !== index) return task;

    if (rest.length === 0) {
      // This is the target task
      return updater(task);
    } else {
      // Recurse into subtasks
      return {
        ...task,
        subtasks: task.subtasks ? updateTaskAtPath(task.subtasks, rest, updater) : [],
      };
    }
  });
};

// Helper function to delete task at path recursively
const deleteTaskAtPath = (tasks: LineItem[], path: number[]): LineItem[] => {
  if (path.length === 0) return tasks;

  const [index, ...rest] = path;

  if (rest.length === 0) {
    // Delete at this level
    return tasks.filter((_, i) => i !== index);
  } else {
    // Recurse into subtasks
    return tasks.map((task, i) => {
      if (i !== index) return task;
      return {
        ...task,
        subtasks: task.subtasks ? deleteTaskAtPath(task.subtasks, rest) : [],
      };
    });
  }
};

// Helper function to clean dependencies recursively
const cleanDependenciesRecursive = (tasks: LineItem[], deletedTaskId: string): LineItem[] => {
  return tasks.map(task => ({
    ...task,
    dependencies: task.dependencies.filter(dep => dep.taskId !== deletedTaskId),
    subtasks: task.subtasks ? cleanDependenciesRecursive(task.subtasks, deletedTaskId) : [],
  }));
};

// Helper function to recalculate parent task dates based on subtasks
// Envelope behavior: parent dates expand to include children but don't shrink
// Recursively processes all levels of nesting
const recalculateParentDates = (item: LineItem): LineItem => {
  if (!item.subtasks || item.subtasks.length === 0) return item;

  // First, recursively recalculate all subtasks that have their own children
  const recalculatedSubtasks = item.subtasks.map(subtask => {
    if (subtask.subtasks && subtask.subtasks.length > 0) {
      return recalculateParentDates(subtask as LineItem);
    }
    return subtask;
  });

  // Filter out sentinel dates from subtasks
  const validSubtasks = recalculatedSubtasks.filter(s => !isSentinelDate(s.startDate) && !isSentinelDate(s.endDate));

  // If no valid subtasks with dates, keep parent dates as-is
  if (validSubtasks.length === 0) {
    return { ...item, subtasks: recalculatedSubtasks as any };
  }

  // Find earliest start and latest end from all valid subtasks
  const subtaskStarts = validSubtasks.map(s => s.startDate.getTime());
  const subtaskEnds = validSubtasks.map(s => s.endDate.getTime());

  const earliestChildStart = new Date(Math.min(...subtaskStarts));
  const latestChildEnd = new Date(Math.max(...subtaskEnds));

  // Envelope behavior: expand parent dates if children extend beyond
  // If parent has sentinel dates, use child dates directly
  // If parent is a milestone, always use exact child range (latest end date)
  // If parent has manual dates, expand to include children
  const parentHasManualDates = !isSentinelDate(item.startDate) && !isSentinelDate(item.endDate);
  const isMilestone = item.isMilestone === true;

  let finalStartDate: Date;
  let finalEndDate: Date;

  if (isMilestone) {
    // Milestones always use exact child range - no envelope behavior
    finalStartDate = earliestChildStart;
    finalEndDate = latestChildEnd;
  } else if (parentHasManualDates) {
    // Parent has manual dates - use envelope (expand but don't shrink)
    finalStartDate = new Date(Math.min(item.startDate.getTime(), earliestChildStart.getTime()));
    finalEndDate = new Date(Math.max(item.endDate.getTime(), latestChildEnd.getTime()));
  } else {
    // Parent has sentinel dates - use exact child range
    finalStartDate = earliestChildStart;
    finalEndDate = latestChildEnd;
  }

  return {
    ...item,
    subtasks: recalculatedSubtasks as any,
    startDate: finalStartDate,
    endDate: finalEndDate,
    duration: calculateDuration(finalStartDate, finalEndDate),
  };
};

interface TaskStore {
  // Unified recursive methods
  addTask: (parentId: string | null, task: Omit<LineItem, 'id' | 'subtasks' | 'progress' | 'endDate' | 'parentTaskId'>) => void;
  updateTask: (id: string, updates: Partial<LineItem>) => void;
  deleteTask: (id: string) => void;

  // Legacy methods (kept for backward compatibility)
  addLineItem: (task: Omit<LineItem, 'id' | 'subtasks' | 'progress' | 'endDate' | 'parentTaskId'>) => void;
  updateLineItem: (id: string, updates: Partial<LineItem>) => void;
  deleteLineItem: (id: string) => void;
  addSubTask: (
    lineItemId: string,
    subtask: Omit<SubTask, 'id' | 'parentTaskId' | 'progress' | 'endDate' | 'subtasks'>
  ) => void;
  updateSubTask: (lineItemId: string, subtaskId: string, updates: Partial<SubTask>) => void;
  deleteSubTask: (lineItemId: string, subtaskId: string) => void;
  reorderLineItems: (sourceIndex: number, destIndex: number) => void;
}

export const useTaskStore = create<TaskStore>(() => ({
  // Unified recursive methods
  addTask: (parentId, taskData) => {
    const project = useProjectStore.getState().project;
    if (!project) return;

    // Skip weekend adjustment and end date calculation for sentinel dates
    const adjustedStartDate = isSentinelDate(taskData.startDate)
      ? taskData.startDate
      : adjustForWeekend(taskData.startDate);
    const endDate = isSentinelDate(taskData.startDate)
      ? taskData.startDate
      : calculateEndDate(adjustedStartDate, taskData.duration);

    const newTask: LineItem = {
      id: uuidv4(),
      ...taskData,
      startDate: adjustedStartDate,
      endDate,
      subtasks: [],
      progress: taskData.status === 'complete' ? 100 : 0,
      parentTaskId: parentId || undefined,
    };

    let updatedLineItems: LineItem[];

    if (parentId === null) {
      // Add as root-level task
      updatedLineItems = [...project.lineItems, newTask];
    } else {
      // Find parent and add as subtask
      const found = findTaskInTree(project.lineItems, parentId);
      if (!found) return;

      updatedLineItems = updateTaskAtPath(project.lineItems, found.path, (parent) => {
        const updatedParent = {
          ...parent,
          subtasks: [...(parent.subtasks || []), newTask],
        };
        return recalculateParentDates(updatedParent);
      });
    }

    const updatedProject = {
      ...project,
      lineItems: updatedLineItems,
      updatedAt: new Date(),
    };

    // Filter out sentinel dates when calculating project dates
    const allDates = updatedProject.lineItems.flatMap(item => [
      item.startDate,
      item.endDate,
    ]).filter(date => !isSentinelDate(date));

    if (allDates.length > 0) {
      updatedProject.startDate = new Date(Math.min(...allDates.map(d => d.getTime())));
      updatedProject.endDate = new Date(Math.max(...allDates.map(d => d.getTime())));
    }

    useProjectStore.getState().setProject(updatedProject);
  },

  updateTask: (id, updates) => {
    const project = useProjectStore.getState().project;
    if (!project) return;

    const found = findTaskInTree(project.lineItems, id);
    if (!found) return;

    let updatedLineItems = updateTaskAtPath(project.lineItems, found.path, (task) => {
      const updatedTask = { ...task, ...updates };

      // Adjust dates to business days if they were updated (skip sentinel dates)
      if (updates.startDate && !isSentinelDate(updatedTask.startDate)) {
        updatedTask.startDate = adjustForWeekend(updatedTask.startDate);
      }
      if (updates.endDate && !isSentinelDate(updatedTask.endDate)) {
        updatedTask.endDate = adjustForWeekend(updatedTask.endDate);
      }

      // Auto-calculate based on what fields were updated (skip for sentinel dates)
      if (!isSentinelDate(updatedTask.startDate) && !isSentinelDate(updatedTask.endDate)) {
        if (updates.startDate && updates.endDate) {
          updatedTask.duration = calculateDuration(updatedTask.startDate, updatedTask.endDate);
        } else if (updates.endDate && !updates.duration) {
          updatedTask.duration = calculateDuration(updatedTask.startDate, updatedTask.endDate);
        } else if ((updates.startDate || updates.duration) && !updates.endDate) {
          updatedTask.endDate = calculateEndDate(updatedTask.startDate, updatedTask.duration);
        }
      }

      if (updates.subtasks || updates.status) {
        updatedTask.progress = calculateTaskProgress(updatedTask);
      }

      // Don't recalculate from children when manually updating parent dates
      // The envelope recalculation will happen when children change and cascade up
      return updatedTask;
    });

    // If this is a subtask (path length > 1) and dates were updated,
    // recalculate all parent dates up the hierarchy using envelope logic
    if (found.path.length > 1 && (updates.startDate || updates.endDate || updates.duration || updates.subtasks)) {
      // Recalculate each parent level from immediate parent up to root
      for (let level = found.path.length - 1; level > 0; level--) {
        const parentPath = found.path.slice(0, level);
        updatedLineItems = updateTaskAtPath(updatedLineItems, parentPath, (parent) => {
          return recalculateParentDates(parent);
        });
      }
    }

    const updatedProject = {
      ...project,
      lineItems: updatedLineItems,
      updatedAt: new Date(),
    };

    // Filter out sentinel dates when calculating project dates
    const allDates = updatedProject.lineItems.flatMap(item => [
      item.startDate,
      item.endDate,
    ]).filter(date => !isSentinelDate(date));

    if (allDates.length > 0) {
      updatedProject.startDate = new Date(Math.min(...allDates.map(d => d.getTime())));
      updatedProject.endDate = new Date(Math.max(...allDates.map(d => d.getTime())));
    }

    useProjectStore.getState().setProject(updatedProject);
  },

  deleteTask: (id) => {
    const project = useProjectStore.getState().project;
    if (!project) return;

    const found = findTaskInTree(project.lineItems, id);
    if (!found) return;

    const updatedLineItems = deleteTaskAtPath(project.lineItems, found.path);
    const cleanedLineItems = cleanDependenciesRecursive(updatedLineItems, id);

    const updatedProject = {
      ...project,
      lineItems: cleanedLineItems,
      updatedAt: new Date(),
    };

    useProjectStore.getState().setProject(updatedProject);
  },

  // Legacy methods (kept for backward compatibility)
  addLineItem: (taskData) => {
    const project = useProjectStore.getState().project;
    if (!project) return;

    // Skip weekend adjustment and end date calculation for sentinel dates
    const adjustedStartDate = isSentinelDate(taskData.startDate)
      ? taskData.startDate
      : adjustForWeekend(taskData.startDate);
    const endDate = isSentinelDate(taskData.startDate)
      ? taskData.startDate
      : calculateEndDate(adjustedStartDate, taskData.duration);

    const newTask: LineItem = {
      id: uuidv4(),
      ...taskData,
      startDate: adjustedStartDate,
      endDate,
      subtasks: [],
      progress: taskData.status === 'complete' ? 100 : 0,
    };

    const updatedProject = {
      ...project,
      lineItems: [...project.lineItems, newTask],
      updatedAt: new Date(),
    };

    // Filter out sentinel dates when calculating project dates
    const allDates = updatedProject.lineItems.flatMap(item => [
      item.startDate,
      item.endDate,
    ]).filter(date => !isSentinelDate(date));

    if (allDates.length > 0) {
      updatedProject.startDate = new Date(Math.min(...allDates.map(d => d.getTime())));
      updatedProject.endDate = new Date(Math.max(...allDates.map(d => d.getTime())));
    }

    useProjectStore.getState().setProject(updatedProject);
  },

  updateLineItem: (id, updates) => {
    const project = useProjectStore.getState().project;
    if (!project) return;

    const updatedLineItems = project.lineItems.map(item => {
      if (item.id !== id) return item;

      const updatedItem = { ...item, ...updates };

      // Adjust dates to business days if they were updated (skip sentinel dates)
      if (updates.startDate && !isSentinelDate(updatedItem.startDate)) {
        updatedItem.startDate = adjustForWeekend(updatedItem.startDate);
      }
      if (updates.endDate && !isSentinelDate(updatedItem.endDate)) {
        updatedItem.endDate = adjustForWeekend(updatedItem.endDate);
      }

      // Auto-calculate based on what fields were updated (skip for sentinel dates)
      if (!isSentinelDate(updatedItem.startDate) && !isSentinelDate(updatedItem.endDate)) {
        if (updates.startDate && updates.endDate) {
          // Both dates changed - calculate duration
          updatedItem.duration = calculateDuration(updatedItem.startDate, updatedItem.endDate);
        } else if (updates.endDate && !updates.duration) {
          // Only end date changed - calculate duration
          updatedItem.duration = calculateDuration(updatedItem.startDate, updatedItem.endDate);
        } else if ((updates.startDate || updates.duration) && !updates.endDate) {
          // Start date or duration changed - calculate end date
          updatedItem.endDate = calculateEndDate(
            updatedItem.startDate,
            updatedItem.duration
          );
        }
      }

      if (updates.subtasks || updates.status) {
        updatedItem.progress = calculateTaskProgress(updatedItem);
      }

      return updatedItem;
    });

    const updatedProject = {
      ...project,
      lineItems: updatedLineItems,
      updatedAt: new Date(),
    };

    // Filter out sentinel dates when calculating project dates
    const allDates = updatedProject.lineItems.flatMap(item => [
      item.startDate,
      item.endDate,
    ]).filter(date => !isSentinelDate(date));
    if (allDates.length > 0) {
      updatedProject.startDate = new Date(Math.min(...allDates.map(d => d.getTime())));
      updatedProject.endDate = new Date(Math.max(...allDates.map(d => d.getTime())));
    }

    useProjectStore.getState().setProject(updatedProject);
  },

  deleteLineItem: (id) => {
    const project = useProjectStore.getState().project;
    if (!project) return;

    const updatedLineItems = project.lineItems.filter(item => item.id !== id);

    const updatedWithCleanedDeps = updatedLineItems.map(item => ({
      ...item,
      dependencies: item.dependencies.filter(dep => dep.taskId !== id),
      subtasks: item.subtasks.map(subtask => ({
        ...subtask,
        dependencies: subtask.dependencies.filter(dep => dep.taskId !== id),
      })),
    }));

    const updatedProject = {
      ...project,
      lineItems: updatedWithCleanedDeps,
      updatedAt: new Date(),
    };

    useProjectStore.getState().setProject(updatedProject);
  },

  addSubTask: (lineItemId, subtaskData) => {
    const project = useProjectStore.getState().project;
    if (!project) return;

    // Skip weekend adjustment and end date calculation for sentinel dates
    const adjustedStartDate = isSentinelDate(subtaskData.startDate)
      ? subtaskData.startDate
      : adjustForWeekend(subtaskData.startDate);
    const endDate = isSentinelDate(subtaskData.startDate)
      ? subtaskData.startDate
      : calculateEndDate(adjustedStartDate, subtaskData.duration);

    const newSubTask: SubTask = {
      id: uuidv4(),
      ...subtaskData,
      parentTaskId: lineItemId,
      startDate: adjustedStartDate,
      endDate,
      progress: subtaskData.status === 'complete' ? 100 : 0,
      subtasks: [],
    };

    const updatedLineItems = project.lineItems.map(item => {
      if (item.id !== lineItemId) return item;

      let updatedItem = {
        ...item,
        subtasks: [...item.subtasks, newSubTask],
      };

      // Recalculate parent dates based on all subtasks
      updatedItem = recalculateParentDates(updatedItem);

      // Recalculate progress
      updatedItem.progress = calculateTaskProgress(updatedItem);

      return updatedItem;
    });

    useProjectStore.getState().setProject({
      ...project,
      lineItems: updatedLineItems,
      updatedAt: new Date(),
    });
  },

  updateSubTask: (lineItemId, subtaskId, updates) => {
    const project = useProjectStore.getState().project;
    if (!project) return;

    const updatedLineItems = project.lineItems.map(item => {
      if (item.id !== lineItemId) return item;

      const updatedSubtasks = item.subtasks.map(subtask => {
        if (subtask.id !== subtaskId) return subtask;

        const updatedSubtask = { ...subtask, ...updates };

        // Adjust dates to business days if they were updated (skip sentinel dates)
        if (updates.startDate && !isSentinelDate(updatedSubtask.startDate)) {
          updatedSubtask.startDate = adjustForWeekend(updatedSubtask.startDate);
        }
        if (updates.endDate && !isSentinelDate(updatedSubtask.endDate)) {
          updatedSubtask.endDate = adjustForWeekend(updatedSubtask.endDate);
        }

        // Auto-calculate based on what fields were updated (skip for sentinel dates)
        if (!isSentinelDate(updatedSubtask.startDate) && !isSentinelDate(updatedSubtask.endDate)) {
          if (updates.startDate && updates.endDate) {
            // Both dates changed - calculate duration
            updatedSubtask.duration = calculateDuration(updatedSubtask.startDate, updatedSubtask.endDate);
          } else if (updates.endDate && !updates.duration) {
            // Only end date changed - calculate duration
            updatedSubtask.duration = calculateDuration(updatedSubtask.startDate, updatedSubtask.endDate);
          } else if ((updates.startDate || updates.duration) && !updates.endDate) {
            // Start date or duration changed - calculate end date
            updatedSubtask.endDate = calculateEndDate(
              updatedSubtask.startDate,
              updatedSubtask.duration
            );
          }
        }

        return updatedSubtask;
      });

      let updatedItem = {
        ...item,
        subtasks: updatedSubtasks,
      };

      // Recalculate parent dates based on all subtasks
      updatedItem = recalculateParentDates(updatedItem);

      // Recalculate progress
      updatedItem.progress = calculateTaskProgress(updatedItem);

      return updatedItem;
    });

    useProjectStore.getState().setProject({
      ...project,
      lineItems: updatedLineItems,
      updatedAt: new Date(),
    });
  },

  deleteSubTask: (lineItemId, subtaskId) => {
    const project = useProjectStore.getState().project;
    if (!project) return;

    const updatedLineItems = project.lineItems.map(item => {
      if (item.id !== lineItemId) return item;

      const updatedSubtasks = item.subtasks.filter(st => st.id !== subtaskId);

      let itemWithCleanedDeps = {
        ...item,
        subtasks: updatedSubtasks.map(subtask => ({
          ...subtask,
          dependencies: subtask.dependencies.filter(dep => dep.taskId !== subtaskId),
        })),
        dependencies: item.dependencies.filter(dep => dep.taskId !== subtaskId),
      };

      // Recalculate parent dates based on remaining subtasks
      itemWithCleanedDeps = recalculateParentDates(itemWithCleanedDeps);

      // Recalculate progress
      itemWithCleanedDeps.progress = calculateTaskProgress(itemWithCleanedDeps);

      return itemWithCleanedDeps;
    });

    useProjectStore.getState().setProject({
      ...project,
      lineItems: updatedLineItems,
      updatedAt: new Date(),
    });
  },

  reorderLineItems: (sourceIndex, destIndex) => {
    const project = useProjectStore.getState().project;
    if (!project) return;

    const lineItems = [...project.lineItems];
    const [removed] = lineItems.splice(sourceIndex, 1);
    lineItems.splice(destIndex, 0, removed);

    useProjectStore.getState().setProject({
      ...project,
      lineItems,
      updatedAt: new Date(),
    });
  },
}));
