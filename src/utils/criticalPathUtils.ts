import { addBusinessDays, differenceInBusinessDays } from 'date-fns';
import type { LineItem, SubTask, Dependency } from '../types';

interface TaskNode {
  id: string;
  duration: number;
  dependencies: Dependency[];
  earliestStart: number;
  earliestFinish: number;
  latestStart: number;
  latestFinish: number;
  slack: number;
}

export const calculateCriticalPath = (lineItems: LineItem[]): Set<string> => {
  // Create a map of all tasks
  const taskMap = new Map<string, TaskNode>();
  const allTasks: Array<LineItem | SubTask> = [];

  // Collect all tasks (line items and subtasks)
  lineItems.forEach(item => {
    allTasks.push(item);
    item.subtasks.forEach(subtask => {
      allTasks.push(subtask);
    });
  });

  // Initialize task nodes
  allTasks.forEach(task => {
    taskMap.set(task.id, {
      id: task.id,
      duration: task.duration,
      dependencies: task.dependencies,
      earliestStart: 0,
      earliestFinish: 0,
      latestStart: 0,
      latestFinish: 0,
      slack: 0,
    });
  });

  // Forward pass - calculate earliest start and finish
  const calculateEarliestTimes = (taskId: string, visited = new Set<string>()): number => {
    if (visited.has(taskId)) return 0; // Prevent circular dependencies
    visited.add(taskId);

    const node = taskMap.get(taskId);
    if (!node) return 0;

    let maxPredecessorFinish = 0;

    node.dependencies.forEach(dep => {
      const predecessorFinish = calculateEarliestTimes(dep.taskId, new Set(visited));
      if (predecessorFinish > maxPredecessorFinish) {
        maxPredecessorFinish = predecessorFinish;
      }
    });

    node.earliestStart = maxPredecessorFinish;
    node.earliestFinish = node.earliestStart + node.duration;

    return node.earliestFinish;
  };

  // Calculate earliest times for all tasks
  allTasks.forEach(task => {
    calculateEarliestTimes(task.id);
  });

  // Find project completion time (maximum earliest finish)
  let projectCompletion = 0;
  taskMap.forEach(node => {
    if (node.earliestFinish > projectCompletion) {
      projectCompletion = node.earliestFinish;
    }
  });

  // Backward pass - calculate latest start and finish
  const calculateLatestTimes = (taskId: string, visited = new Set<string>()): number => {
    if (visited.has(taskId)) return projectCompletion;
    visited.add(taskId);

    const node = taskMap.get(taskId);
    if (!node) return projectCompletion;

    // Find all tasks that depend on this task
    const successors: string[] = [];
    taskMap.forEach((otherNode, otherId) => {
      if (otherNode.dependencies.some(dep => dep.taskId === taskId)) {
        successors.push(otherId);
      }
    });

    if (successors.length === 0) {
      // No successors - this is an end task
      node.latestFinish = projectCompletion;
    } else {
      // Latest finish is the minimum latest start of all successors
      let minSuccessorStart = projectCompletion;
      successors.forEach(successorId => {
        const successorStart = calculateLatestTimes(successorId, new Set(visited));
        const successorNode = taskMap.get(successorId);
        if (successorNode) {
          const successorLatestStart = successorStart - successorNode.duration;
          if (successorLatestStart < minSuccessorStart) {
            minSuccessorStart = successorLatestStart;
          }
        }
      });
      node.latestFinish = minSuccessorStart;
    }

    node.latestStart = node.latestFinish - node.duration;
    return node.latestStart;
  };

  // Calculate latest times for all tasks
  allTasks.forEach(task => {
    calculateLatestTimes(task.id);
  });

  // Calculate slack and identify critical path
  const criticalPathTasks = new Set<string>();
  taskMap.forEach(node => {
    node.slack = node.latestStart - node.earliestStart;
    if (node.slack === 0) {
      criticalPathTasks.add(node.id);
    }
  });

  return criticalPathTasks;
};
