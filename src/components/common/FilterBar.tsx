import React, { useState, useRef, useEffect } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useProjectStore } from '../../store/projectStore';
import { TASK_STATUSES } from '../../constants';

export const FilterBar: React.FC = () => {
  const project = useProjectStore(state => state.project);
  const filters = useUIStore(state => state.filters);
  const { setSearchQuery, setStatusFilters, setTeamFilters, setDriFilters, toggleShowCompleted, clearFilters } = useUIStore();

  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showTeamDropdown, setShowTeamDropdown] = useState(false);
  const [showDriDropdown, setShowDriDropdown] = useState(false);

  const statusRef = useRef<HTMLDivElement>(null);
  const teamRef = useRef<HTMLDivElement>(null);
  const driRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(event.target as Node)) {
        setShowStatusDropdown(false);
      }
      if (teamRef.current && !teamRef.current.contains(event.target as Node)) {
        setShowTeamDropdown(false);
      }
      if (driRef.current && !driRef.current.contains(event.target as Node)) {
        setShowDriDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Get unique teams and DRIs from project
  const teams = project?.teams || [];
  const people = (project?.people || []).filter(p => p.name !== 'John Doe'); // Filter out default John Doe

  // Also get unique DRIs and Teams from actual task data
  const uniqueDRIsFromTasks = React.useMemo(() => {
    if (!project) return [];
    const driSet = new Set<string>();

    project.lineItems.forEach(item => {
      if (item.driId) driSet.add(item.driId);
      item.subtasks.forEach(subtask => {
        if (subtask.driId) driSet.add(subtask.driId);
      });
    });

    return Array.from(driSet).map(driId => {
      // Check if this DRI exists in people array
      const person = people.find(p => p.id === driId || p.name === driId);
      return person || { id: driId, name: driId, email: '', teamId: '' };
    });
  }, [project, people]);

  const uniqueTeamsFromTasks = React.useMemo(() => {
    if (!project) return [];
    const teamSet = new Set<string>();

    project.lineItems.forEach(item => {
      if (item.teamId) teamSet.add(item.teamId);
      item.subtasks.forEach(subtask => {
        if (subtask.teamId) teamSet.add(subtask.teamId);
      });
    });

    return Array.from(teamSet).map(teamId => {
      // Check if this team exists in teams array
      const team = teams.find(t => t.id === teamId || t.name === teamId);
      return team || { id: teamId, name: teamId, color: '#gray' };
    });
  }, [project, teams]);

  // Combine defined people/teams with those found in tasks
  const allPeople = React.useMemo(() => {
    const peopleMap = new Map();
    [...people, ...uniqueDRIsFromTasks].forEach(p => {
      // Filter out John Doe
      if (p.name !== 'John Doe') {
        peopleMap.set(p.id, p);
      }
    });
    return Array.from(peopleMap.values());
  }, [people, uniqueDRIsFromTasks]);

  const allTeams = React.useMemo(() => {
    const teamsMap = new Map();
    [...teams, ...uniqueTeamsFromTasks].forEach(t => {
      teamsMap.set(t.id, t);
    });
    return Array.from(teamsMap.values());
  }, [teams, uniqueTeamsFromTasks]);

  const activeFiltersCount =
    filters.statusFilters.length +
    filters.teamFilters.length +
    filters.driFilters.length +
    (filters.searchQuery ? 1 : 0) +
    (!filters.showCompleted ? 1 : 0);

  const toggleStatusFilter = (status: typeof filters.statusFilters[number]) => {
    const newFilters = filters.statusFilters.includes(status)
      ? filters.statusFilters.filter(s => s !== status)
      : [...filters.statusFilters, status];
    setStatusFilters(newFilters);
  };

  const toggleTeamFilter = (teamId: string) => {
    const newFilters = filters.teamFilters.includes(teamId)
      ? filters.teamFilters.filter(t => t !== teamId)
      : [...filters.teamFilters, teamId];
    setTeamFilters(newFilters);
  };

  const toggleDriFilter = (driId: string) => {
    const newFilters = filters.driFilters.includes(driId)
      ? filters.driFilters.filter(d => d !== driId)
      : [...filters.driFilters, driId];
    setDriFilters(newFilters);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search tasks..."
          value={filters.searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 w-72"
        />
        <svg
          className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Status Filter */}
      <div className="relative" ref={statusRef}>
        <button
          onClick={() => setShowStatusDropdown(!showStatusDropdown)}
          className={`px-3 py-1.5 text-sm border rounded flex items-center gap-2 hover:bg-gray-50 ${
            filters.statusFilters.length > 0 ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
          }`}
        >
          <span>Status</span>
          {filters.statusFilters.length > 0 && (
            <span className="bg-blue-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
              {filters.statusFilters.length}
            </span>
          )}
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showStatusDropdown && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-50 min-w-[200px]">
            {TASK_STATUSES.map(status => (
              <label
                key={status.value}
                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={filters.statusFilters.includes(status.value)}
                  onChange={() => toggleStatusFilter(status.value)}
                  className="rounded"
                />
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                  {status.label}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Team Filter */}
      {allTeams.length > 0 && (
        <div className="relative" ref={teamRef}>
          <button
            onClick={() => setShowTeamDropdown(!showTeamDropdown)}
            className={`px-3 py-1.5 text-sm border rounded flex items-center gap-2 hover:bg-gray-50 ${
              filters.teamFilters.length > 0 ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
            }`}
          >
            <span>Team</span>
            {filters.teamFilters.length > 0 && (
              <span className="bg-blue-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                {filters.teamFilters.length}
              </span>
            )}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showTeamDropdown && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-50 min-w-[200px]">
              {allTeams.map(team => (
                <label
                  key={team.id}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={filters.teamFilters.includes(team.id)}
                    onChange={() => toggleTeamFilter(team.id)}
                    className="rounded"
                  />
                  <span className="text-sm">{team.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DRI Filter */}
      {allPeople.length > 0 && (
        <div className="relative" ref={driRef}>
          <button
            onClick={() => setShowDriDropdown(!showDriDropdown)}
            className={`px-3 py-1.5 text-sm border rounded flex items-center gap-2 hover:bg-gray-50 ${
              filters.driFilters.length > 0 ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
            }`}
          >
            <span>DRI</span>
            {filters.driFilters.length > 0 && (
              <span className="bg-blue-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                {filters.driFilters.length}
              </span>
            )}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showDriDropdown && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-50 min-w-[200px] max-h-64 overflow-y-auto">
              {allPeople.map(person => (
                <label
                  key={person.id}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={filters.driFilters.includes(person.id)}
                    onChange={() => toggleDriFilter(person.id)}
                    className="rounded"
                  />
                  <span className="text-sm">{person.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Show Completed Toggle */}
      <label className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded cursor-pointer hover:bg-gray-50">
        <input
          type="checkbox"
          checked={filters.showCompleted}
          onChange={toggleShowCompleted}
          className="rounded"
        />
        <span>Show Completed</span>
      </label>

      {/* Clear Filters */}
      {activeFiltersCount > 0 && (
        <button
          onClick={clearFilters}
          className="px-3 py-1.5 text-sm text-red-600 border border-red-300 rounded hover:bg-red-50 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Clear ({activeFiltersCount})
        </button>
      )}
    </div>
  );
};
