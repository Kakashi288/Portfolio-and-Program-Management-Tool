import type { LineItem, SubTask, TaskStatus } from '../types';

export interface FilterCriteria {
  searchQuery: string;
  statusFilters: TaskStatus[];
  teamFilters: string[];
  driFilters: string[];
  showCompleted: boolean;
}

export const filterTasks = (
  lineItems: LineItem[],
  filters: FilterCriteria,
  teams?: Array<{ id: string; name: string }>,
  people?: Array<{ id: string; name: string }>
): LineItem[] => {
  return lineItems.map(item => {
    // Check if parent task matches filters
    const parentMatches = matchesFilters(item, filters, teams, people);

    // Filter subtasks
    const filteredSubtasks = item.subtasks.filter(subtask =>
      matchesFilters(subtask, filters, teams, people)
    );

    // Show parent if it matches OR if any subtasks match
    if (parentMatches || filteredSubtasks.length > 0) {
      return {
        ...item,
        subtasks: filteredSubtasks,
      };
    }

    return null;
  }).filter((item): item is LineItem => item !== null);
};

const matchesFilters = (
  task: LineItem | SubTask,
  filters: FilterCriteria,
  teams?: Array<{ id: string; name: string }>,
  people?: Array<{ id: string; name: string }>
): boolean => {
  // Search query filter
  if (filters.searchQuery) {
    const query = filters.searchQuery.toLowerCase();
    const matchesName = task.name.toLowerCase().includes(query);
    const matchesNotes = task.notes?.toLowerCase().includes(query);
    if (!matchesName && !matchesNotes) {
      return false;
    }
  }

  // Status filter
  if (filters.statusFilters.length > 0) {
    if (!filters.statusFilters.includes(task.status)) {
      return false;
    }
  }

  // Show completed filter
  if (!filters.showCompleted && task.status === 'complete') {
    return false;
  }

  // Team filter - match by ID or name
  if (filters.teamFilters.length > 0) {
    const taskTeamId = task.teamId;
    // Check if taskTeamId matches any selected filter (by ID or by name)
    const matchesTeam = filters.teamFilters.some(filterId => {
      // Direct ID match
      if (filterId === taskTeamId) return true;

      // Find team by filter ID
      const filterTeam = teams?.find(t => t.id === filterId);
      if (!filterTeam) return false;

      // Check if task's teamId is the team's name (when typed directly)
      if (filterTeam.name === taskTeamId) return true;

      return false;
    });

    if (!matchesTeam) {
      return false;
    }
  }

  // DRI filter - match by ID or name
  if (filters.driFilters.length > 0) {
    const taskDriId = task.driId;
    // Check if taskDriId matches any selected filter (by ID or by name)
    const matchesDri = filters.driFilters.some(filterId => {
      // Direct ID match
      if (filterId === taskDriId) return true;

      // Find person by filter ID
      const filterPerson = people?.find(p => p.id === filterId);
      if (!filterPerson) return false;

      // Check if task's driId is the person's name (when typed directly)
      if (filterPerson.name === taskDriId) return true;

      return false;
    });

    if (!matchesDri) {
      return false;
    }
  }

  return true;
};
