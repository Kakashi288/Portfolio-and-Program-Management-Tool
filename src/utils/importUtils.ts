import type { LineItem, SubTask, TaskStatus } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface ImportRow {
  taskNumber: string;
  taskName: string;
  startDate: string;
  endDate: string;
  duration: string;
  status: string;
  team: string;
  dri: string;
  progress: string;
  predecessor: string;
  notes: string;
}

export const parseCSV = (csvContent: string): ImportRow[] => {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length < 2) {
    throw new Error('CSV file must contain at least a header row and one data row');
  }

  // Skip header row
  const dataLines = lines.slice(1);

  const rows: ImportRow[] = dataLines.map(line => {
    // Parse CSV with quoted strings
    const regex = /(?:,|^)(?:"([^"]*)"|([^",]*))/g;
    const values: string[] = [];
    let match;

    while ((match = regex.exec(line)) !== null) {
      values.push(match[1] !== undefined ? match[1] : match[2]);
    }

    return {
      taskNumber: values[0]?.trim() || '',
      taskName: values[1]?.trim() || '',
      startDate: values[2]?.trim() || '',
      endDate: values[3]?.trim() || '',
      duration: values[4]?.trim() || '',
      status: values[5]?.trim() || '',
      team: values[6]?.trim() || '',
      dri: values[7]?.trim() || '',
      progress: values[8]?.trim() || '',
      predecessor: values[9]?.trim() || '',
      notes: values[10]?.trim() || '',
    };
  });

  return rows;
};

const parseStatus = (statusStr: string): TaskStatus => {
  const normalized = statusStr.toLowerCase().trim();
  switch (normalized) {
    case 'not started':
    case 'not-started':
      return 'not started';
    case 'in progress':
    case 'in-progress':
      return 'in progress';
    case 'complete':
    case 'completed':
      return 'complete';
    case 'on hold':
    case 'on-hold':
      return 'on hold';
    case 'blocked':
      return 'blocked';
    default:
      return 'not started';
  }
};

const parseDate = (dateStr: string): Date => {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateStr}`);
  }
  return date;
};

export const importTasksFromCSV = (
  csvContent: string,
  existingTeamMap: Map<string, string>,
  existingPeopleMap: Map<string, string>
): LineItem[] => {
  const rows = parseCSV(csvContent);
  const lineItems: LineItem[] = [];
  const taskIdMap = new Map<string, string>(); // taskNumber -> taskId

  // First pass: create all line items and subtasks with IDs
  rows.forEach(row => {
    const parts = row.taskNumber.split('.');
    const taskId = uuidv4();
    taskIdMap.set(row.taskNumber, taskId);

    if (parts.length === 1) {
      // Line item
      const lineItem: LineItem = {
        id: taskId,
        name: row.taskName,
        startDate: parseDate(row.startDate),
        endDate: parseDate(row.endDate),
        duration: parseInt(row.duration) || 1,
        status: parseStatus(row.status),
        teamId: existingTeamMap.get(row.team) || '',
        driId: existingPeopleMap.get(row.dri) || '',
        progress: parseInt(row.progress) || 0,
        dependencies: [],
        subtasks: [],
        notes: row.notes,
        isMilestone: false,
      };
      lineItems.push(lineItem);
    }
  });

  // Second pass: create subtasks and link to parents
  rows.forEach(row => {
    const parts = row.taskNumber.split('.');

    if (parts.length === 2) {
      // Subtask
      const parentNumber = parts[0];
      const parentIndex = parseInt(parentNumber) - 1;

      if (parentIndex >= 0 && parentIndex < lineItems.length) {
        const subtask: SubTask = {
          id: taskIdMap.get(row.taskNumber)!,
          name: row.taskName.trim().replace(/^↳\s*/, ''), // Remove leading arrow if present
          startDate: parseDate(row.startDate),
          endDate: parseDate(row.endDate),
          duration: parseInt(row.duration) || 1,
          status: parseStatus(row.status),
          teamId: existingTeamMap.get(row.team) || '',
          driId: existingPeopleMap.get(row.dri) || '',
          progress: parseInt(row.progress) || 0,
          dependencies: [],
          notes: row.notes,
          isMilestone: false,
        };
        lineItems[parentIndex].subtasks.push(subtask);
      }
    }
  });

  // Third pass: add dependencies
  rows.forEach(row => {
    if (!row.predecessor) return;

    const taskId = taskIdMap.get(row.taskNumber);
    if (!taskId) return;

    // Parse predecessors (e.g., "1 (FS); 2 (SS)")
    const predecessorParts = row.predecessor.split(';').map(p => p.trim()).filter(p => p);

    predecessorParts.forEach(pred => {
      const match = pred.match(/^(\d+(?:\.\d+)?)\s*\(([A-Z]{2})\)$/);
      if (match) {
        const predTaskNumber = match[1];
        const depType = match[2];
        const predTaskId = taskIdMap.get(predTaskNumber);

        if (predTaskId) {
          const dependency = {
            taskId: predTaskId,
            type: depType as 'FS' | 'SS' | 'FF' | 'SF',
          };

          // Find task and add dependency
          const parts = row.taskNumber.split('.');
          if (parts.length === 1) {
            // Line item
            const taskIndex = parseInt(parts[0]) - 1;
            if (taskIndex >= 0 && taskIndex < lineItems.length) {
              lineItems[taskIndex].dependencies.push(dependency);
            }
          } else if (parts.length === 2) {
            // Subtask
            const parentIndex = parseInt(parts[0]) - 1;
            const subtaskIndex = parseInt(parts[1]) - 1;
            if (parentIndex >= 0 && parentIndex < lineItems.length) {
              const parent = lineItems[parentIndex];
              if (subtaskIndex >= 0 && subtaskIndex < parent.subtasks.length) {
                parent.subtasks[subtaskIndex].dependencies.push(dependency);
              }
            }
          }
        }
      }
    });
  });

  return lineItems;
};
