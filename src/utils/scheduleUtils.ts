import { addBusinessDays, max as maxDate } from 'date-fns';
import type { LineItem, SubTask, Dependency } from '../types';

interface TaskWithDates {
  id: string;
  startDate: Date;
  endDate: Date;
  duration: number;
  dependencies: Dependency[];
}

export const autoScheduleTasks = (lineItems: LineItem[]): LineItem[] => {
  // Create a map of all tasks (both line items and subtasks)
  const taskMap = new Map<string, TaskWithDates>();
  const taskToParent = new Map<string, string>();

  // Build task map
  lineItems.forEach(item => {
    taskMap.set(item.id, {
      id: item.id,
      startDate: item.startDate,
      endDate: item.endDate,
      duration: item.duration,
      dependencies: item.dependencies,
    });

    item.subtasks.forEach(subtask => {
      taskMap.set(subtask.id, {
        id: subtask.id,
        startDate: subtask.startDate,
        endDate: subtask.endDate,
        duration: subtask.duration,
        dependencies: subtask.dependencies,
      });
      taskToParent.set(subtask.id, item.id);
    });
  });

  // Process each task and calculate dates based on dependencies
  const processedTasks = new Set<string>();

  const calculateTaskDates = (taskId: string): Date => {
    if (processedTasks.has(taskId)) {
      const task = taskMap.get(taskId);
      return task ? task.endDate : new Date();
    }

    const task = taskMap.get(taskId);
    if (!task) return new Date();

    // If no dependencies, keep current start date
    if (!task.dependencies || task.dependencies.length === 0) {
      processedTasks.add(taskId);
      return task.endDate;
    }

    // Calculate earliest start date based on dependencies
    let earliestStart = task.startDate;

    task.dependencies.forEach(dep => {
      const predecessorEnd = calculateTaskDates(dep.taskId);

      switch (dep.type) {
        case 'FS': // Finish-to-Start (default)
          // Task can start the day after predecessor finishes
          const fsStart = addBusinessDays(predecessorEnd, 1);
          if (fsStart > earliestStart) {
            earliestStart = fsStart;
          }
          break;

        case 'SS': // Start-to-Start
          // Task starts when predecessor starts
          const predecessor = taskMap.get(dep.taskId);
          if (predecessor && predecessor.startDate > earliestStart) {
            earliestStart = predecessor.startDate;
          }
          break;

        case 'FF': // Finish-to-Finish
          // Task finishes when predecessor finishes
          // So start date = predecessor end - task duration
          const ffStart = addBusinessDays(predecessorEnd, -(task.duration - 1));
          if (ffStart > earliestStart) {
            earliestStart = ffStart;
          }
          break;

        case 'SF': // Start-to-Finish (rare)
          // Task finishes when predecessor starts
          const sfPredecessor = taskMap.get(dep.taskId);
          if (sfPredecessor) {
            const sfStart = addBusinessDays(sfPredecessor.startDate, -(task.duration - 1));
            if (sfStart > earliestStart) {
              earliestStart = sfStart;
            }
          }
          break;
      }
    });

    // Update task dates
    task.startDate = earliestStart;
    task.endDate = addBusinessDays(earliestStart, task.duration - 1);

    processedTasks.add(taskId);
    return task.endDate;
  };

  // Process all tasks
  lineItems.forEach(item => {
    calculateTaskDates(item.id);
    item.subtasks.forEach(subtask => {
      calculateTaskDates(subtask.id);
    });
  });

  // Update line items with calculated dates
  return lineItems.map(item => {
    const updatedItem = taskMap.get(item.id);
    const updatedSubtasks = item.subtasks.map(subtask => {
      const updatedSubtask = taskMap.get(subtask.id);
      if (updatedSubtask) {
        return {
          ...subtask,
          startDate: updatedSubtask.startDate,
          endDate: updatedSubtask.endDate,
        };
      }
      return subtask;
    });

    if (updatedItem) {
      // Calculate parent dates to span all subtasks
      if (updatedSubtasks.length > 0) {
        const subtaskStarts = updatedSubtasks.map(s => s.startDate);
        const subtaskEnds = updatedSubtasks.map(s => s.endDate);
        const parentStart = new Date(Math.min(...subtaskStarts.map(d => d.getTime())));
        const parentEnd = new Date(Math.max(...subtaskEnds.map(d => d.getTime())));

        return {
          ...item,
          startDate: parentStart,
          endDate: parentEnd,
          subtasks: updatedSubtasks,
        };
      }

      return {
        ...item,
        startDate: updatedItem.startDate,
        endDate: updatedItem.endDate,
        subtasks: updatedSubtasks,
      };
    }

    return {
      ...item,
      subtasks: updatedSubtasks,
    };
  });
};
