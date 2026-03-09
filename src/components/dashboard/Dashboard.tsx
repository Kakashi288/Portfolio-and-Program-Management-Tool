import React, { useMemo, useState } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { format, isBefore, isAfter, differenceInDays } from 'date-fns';
import { getAllTasks } from '../../utils/taskUtils';
import { calculateWorkingDays } from '../../utils/dateUtils';
import { BurndownChart } from '../charts/BurndownChart';
import { StatusDonutChart } from '../charts/StatusDonutChart';
import { TeamWorkloadChart } from '../charts/TeamWorkloadChart';
import { ProgressTrendChart } from '../charts/ProgressTrendChart';
import { Modal } from '../common/Modal';
import { StatusBadge } from '../common/StatusBadge';

type TaskStatus = 'not started' | 'in progress' | 'blocked' | 'backlog' | 'complete' | 'on-hold' | 'cancelled' | 'duplicate';

// Helper function to check if a date is the sentinel value
const isSentinelDate = (date: Date): boolean => {
  return date.getFullYear() === 1900 && date.getMonth() === 0 && date.getDate() === 1;
};

export const Dashboard: React.FC = () => {
  const project = useProjectStore(state => state.project);
  const [selectedFilter, setSelectedFilter] = useState<{ type: 'status' | 'all'; value?: TaskStatus | 'all'; label: string } | null>(null);

  const stats = useMemo(() => {
    if (!project) return null;

    const allTasks = getAllTasks(project.lineItems);
    const total = allTasks.length;
    const notStarted = allTasks.filter(t => t.status === 'not started').length;
    const inProgress = allTasks.filter(t => t.status === 'in progress').length;
    const complete = allTasks.filter(t => t.status === 'complete').length;
    const onHold = allTasks.filter(t => t.status === 'on-hold').length;
    const blocked = allTasks.filter(t => t.status === 'blocked').length;
    const backlog = allTasks.filter(t => t.status === 'backlog').length;
    const cancelled = allTasks.filter(t => t.status === 'cancelled').length;
    const duplicate = allTasks.filter(t => t.status === 'duplicate').length;

    const totalProgress = allTasks.reduce((sum, task) => sum + task.progress, 0);
    const avgProgress = total > 0 ? Math.round(totalProgress / total) : 0;

    // Calculate effective project start and end dates from tasks if project dates are sentinel
    let effectiveStartDate = project.startDate;
    let effectiveEndDate = project.endDate;

    if (isSentinelDate(project.startDate) || isSentinelDate(project.endDate)) {
      // Get ALL dates from all tasks (including nested subtasks)
      const allTaskDates: Date[] = [];

      allTasks.forEach(task => {
        if (task.startDate && !isSentinelDate(task.startDate)) {
          allTaskDates.push(task.startDate);
        }
        if (task.endDate && !isSentinelDate(task.endDate)) {
          allTaskDates.push(task.endDate);
        }
      });

      if (allTaskDates.length > 0) {
        effectiveStartDate = new Date(Math.min(...allTaskDates.map(d => d.getTime())));
        effectiveEndDate = new Date(Math.max(...allTaskDates.map(d => d.getTime())));
      }
    }

    // Calculate project timeline using working days (excluding weekends and bank holidays)
    const today = new Date();
    const daysTotal = calculateWorkingDays(effectiveStartDate, effectiveEndDate);
    const daysElapsed = calculateWorkingDays(effectiveStartDate, today);
    const daysRemaining = calculateWorkingDays(today, effectiveEndDate);
    const timelineProgress = Math.max(0, Math.min(100, Math.round((daysElapsed / daysTotal) * 100)));

    // Milestone statistics
    const allMilestones = allTasks.filter(t => t.isMilestone && !isSentinelDate(t.endDate));
    const completedMilestones = allMilestones.filter(m => m.status === 'complete');
    const upcomingMilestones = allMilestones
      .filter(m => m.status !== 'complete' && isAfter(m.endDate, today))
      .sort((a, b) => a.endDate.getTime() - b.endDate.getTime());
    const overdueMilestones = allMilestones
      .filter(m => m.status !== 'complete' && isBefore(m.endDate, today));

    const nextMilestone = upcomingMilestones[0] || null;

    // All milestones sorted by date
    const sortedMilestones = allMilestones.sort((a, b) => a.endDate.getTime() - b.endDate.getTime());

    // Team statistics - build from actual team names in tasks
    const teamNamesMap = new Map<string, {
      name: string;
      totalTasks: number;
      completedTasks: number;
      inProgressTasks: number;
    }>();

    allTasks.forEach(task => {
      if (task.teamId && task.teamId.trim() !== '') {
        const teamName = task.teamId.trim();
        const existing = teamNamesMap.get(teamName);
        const isComplete = task.status === 'complete';
        const isInProgress = task.status === 'in progress';

        if (existing) {
          existing.totalTasks++;
          if (isComplete) existing.completedTasks++;
          if (isInProgress) existing.inProgressTasks++;
        } else {
          teamNamesMap.set(teamName, {
            name: teamName,
            totalTasks: 1,
            completedTasks: isComplete ? 1 : 0,
            inProgressTasks: isInProgress ? 1 : 0,
          });
        }
      }
    });

    const teamStats = Array.from(teamNamesMap.values()).map((team, index) => {
      const progress = team.totalTasks > 0 ? Math.round((team.completedTasks / team.totalTasks) * 100) : 0;
      // Generate a color for each team
      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
      return {
        id: team.name,
        name: team.name,
        color: colors[index % colors.length],
        taskCount: team.totalTasks,
        completedCount: team.completedTasks,
        inProgressCount: team.inProgressTasks,
        progress,
      };
    });

    // People statistics - build from actual DRI names in tasks
    const peopleNamesMap = new Map<string, {
      name: string;
      totalTasks: number;
      completedTasks: number;
    }>();

    allTasks.forEach(task => {
      if (task.driId && task.driId.trim() !== '') {
        const driName = task.driId.trim();
        const existing = peopleNamesMap.get(driName);
        const isComplete = task.status === 'complete';

        if (existing) {
          existing.totalTasks++;
          if (isComplete) existing.completedTasks++;
        } else {
          peopleNamesMap.set(driName, {
            name: driName,
            totalTasks: 1,
            completedTasks: isComplete ? 1 : 0,
          });
        }
      }
    });

    const peopleStats = Array.from(peopleNamesMap.values())
      .sort((a, b) => b.totalTasks - a.totalTasks)
      .slice(0, 5); // Top 5 contributors

    return {
      total,
      notStarted,
      inProgress,
      complete,
      onHold,
      blocked,
      backlog,
      cancelled,
      duplicate,
      avgProgress,
      daysTotal,
      daysElapsed,
      daysRemaining,
      timelineProgress,
      teamStats,
      peopleStats: peopleStats.slice(0, 5), // Top 5 contributors
      effectiveStartDate,
      effectiveEndDate,
      milestones: {
        total: allMilestones.length,
        completed: completedMilestones.length,
        upcoming: upcomingMilestones.length,
        overdue: overdueMilestones.length,
        next: nextMilestone,
        all: sortedMilestones,
      },
    };
  }, [project]);

  // Get filtered tasks based on selected filter
  const filteredTasks = useMemo(() => {
    if (!project || !selectedFilter) return [];

    const allTasks = getAllTasks(project.lineItems);

    if (selectedFilter.value === 'all') {
      return allTasks;
    }

    return allTasks.filter(task => task.status === selectedFilter.value);
  }, [project, selectedFilter]);

  if (!project || !stats) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>No project data available</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 overflow-auto">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Dashboard</h2>
        <p className="text-gray-600">Overview of {project.name}</p>
      </div>

      {/* Key Metrics - 4 tiles per row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Row 1 */}
        <div
          className="bg-white rounded-lg shadow p-6 h-40 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setSelectedFilter({ type: 'all', value: 'all', label: 'All Tasks' })}
        >
          <div className="flex items-center justify-between h-full">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Tasks</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
            </div>
            <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
        </div>

        <div
          className="bg-white rounded-lg shadow p-6 h-40 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setSelectedFilter({ type: 'status', value: 'not started', label: 'Not Started Tasks' })}
        >
          <div className="flex items-center justify-between h-full">
            <div>
              <p className="text-sm font-medium text-gray-600">Not Started</p>
              <p className="text-3xl font-bold text-gray-500 mt-2">{stats.notStarted}</p>
            </div>
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </div>
        </div>

        <div
          className="bg-white rounded-lg shadow p-6 h-40 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setSelectedFilter({ type: 'status', value: 'complete', label: 'Complete Tasks' })}
        >
          <div className="flex items-center justify-between h-full">
            <div>
              <p className="text-sm font-medium text-gray-600">Complete</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats.complete}</p>
            </div>
            <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        <div
          className="bg-white rounded-lg shadow p-6 h-40 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setSelectedFilter({ type: 'status', value: 'in progress', label: 'In Progress Tasks' })}
        >
          <div className="flex items-center justify-between h-full">
            <div>
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{stats.inProgress}</p>
            </div>
            <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>

        {/* Row 2 */}
        <div
          className="bg-white rounded-lg shadow p-6 h-40 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setSelectedFilter({ type: 'status', value: 'blocked', label: 'Blocked Tasks' })}
        >
          <div className="flex items-center justify-between h-full">
            <div>
              <p className="text-sm font-medium text-gray-600">Blocked</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{stats.blocked}</p>
            </div>
            <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
        </div>

        <div
          className="bg-white rounded-lg shadow p-6 h-40 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setSelectedFilter({ type: 'status', value: 'on-hold', label: 'On Hold Tasks' })}
        >
          <div className="flex items-center justify-between h-full">
            <div>
              <p className="text-sm font-medium text-gray-600">On Hold</p>
              <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.onHold}</p>
            </div>
            <svg className="w-12 h-12 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        <div
          className="bg-white rounded-lg shadow p-6 h-40 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setSelectedFilter({ type: 'all', value: 'all', label: 'All Tasks' })}
        >
          <div className="flex items-center justify-between h-full">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Progress</p>
              <p className="text-3xl font-bold text-purple-600 mt-2">{stats.avgProgress}%</p>
            </div>
            <svg className="w-12 h-12 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
          </div>
        </div>

        {/* Next Milestone Tile - with fixed height */}
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg shadow p-6 border-2 border-yellow-300 h-40 flex flex-col">
          {stats.milestones.next ? (
            <div className="flex-1 flex flex-col justify-between overflow-hidden">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2 L22 12 L12 22 L2 12 Z" />
                  </svg>
                  <p className="text-sm font-medium text-yellow-800">Next Milestone</p>
                </div>
                <p className="text-lg font-bold text-gray-900 line-clamp-2 mb-2" title={stats.milestones.next.name}>
                  {stats.milestones.next.name}
                </p>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-1">
                  <svg className="w-3 h-3 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-yellow-700 font-medium">
                    {format(stats.milestones.next.endDate, 'MMM dd, yyyy')}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <svg className="w-3 h-3 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-yellow-700 font-medium">
                    {differenceInDays(stats.milestones.next.endDate, new Date())} days left
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center">
              <svg className="w-8 h-8 mb-1 text-yellow-300" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2 L22 12 L12 22 L2 12 Z" />
              </svg>
              <p className="text-xs text-gray-600">No upcoming milestones</p>
            </div>
          )}
        </div>
      </div>

      {/* Burndown Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Burndown Chart</h3>
        <BurndownChart
          totalTasks={stats.total}
          completedTasks={stats.complete}
          startDate={stats.effectiveStartDate}
          endDate={stats.effectiveEndDate}
        />
      </div>

      {/* Team Workload & Status Distribution - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Workload Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Workload Distribution</h3>
          <TeamWorkloadChart
            teams={stats.teamStats.map(team => ({
              id: team.id,
              name: team.name,
              color: team.color,
              totalTasks: team.taskCount,
              completedTasks: team.completedCount,
              inProgressTasks: team.inProgressCount,
            }))}
          />
        </div>

        {/* Status Distribution */}
        <div className="bg-white rounded-lg shadow p-6 flex flex-col">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Distribution</h3>
          <div className="flex-1 min-h-[400px]">
            <StatusDonutChart
              data={[
                { status: 'not-started', count: stats.notStarted, color: '#6b7280', label: 'Not Started' },
                { status: 'backlog', count: stats.backlog, color: '#6366f1', label: 'Backlog' },
                { status: 'in-progress', count: stats.inProgress, color: '#3b82f6', label: 'In Progress' },
                { status: 'complete', count: stats.complete, color: '#22c55e', label: 'Complete' },
                { status: 'on-hold', count: stats.onHold, color: '#eab308', label: 'On Hold' },
                { status: 'blocked', count: stats.blocked, color: '#ef4444', label: 'Blocked' },
                { status: 'cancelled', count: stats.cancelled, color: '#f97316', label: 'Cancelled' },
                { status: 'duplicate', count: stats.duplicate, color: '#94a3b8', label: 'Duplicate' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Progress Trend Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Progress Trend</h3>
        <ProgressTrendChart
          startDate={stats.effectiveStartDate}
          endDate={stats.effectiveEndDate}
          totalTasks={stats.total}
          completedTasks={stats.complete}
          milestones={stats.milestones.all.map(milestone => ({
            name: milestone.name,
            date: milestone.endDate,
            completed: milestone.status === 'complete',
          }))}
        />
      </div>

      {/* Project Timeline */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Timeline</h3>
        <div className="space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Start: {format(stats.effectiveStartDate, 'MMM dd, yyyy')}</span>
            <span className="text-gray-600">End: {format(stats.effectiveEndDate, 'MMM dd, yyyy')}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className="bg-blue-600 h-4 rounded-full transition-all"
              style={{ width: `${stats.timelineProgress}%` }}
            />
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">{stats.daysElapsed} days elapsed</span>
            <span className="text-gray-600">{stats.daysRemaining} days remaining</span>
          </div>
        </div>
      </div>

      {/* Milestones & Top Contributors - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* All Milestones */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">All Milestones</h3>
            <div className="flex items-center gap-4 text-xs">
              <span className="text-gray-600">Total: <span className="font-semibold">{stats.milestones.total}</span></span>
              <span className="text-green-600">Completed: <span className="font-semibold">{stats.milestones.completed}</span></span>
              <span className="text-blue-600">Upcoming: <span className="font-semibold">{stats.milestones.upcoming}</span></span>
              {stats.milestones.overdue > 0 && (
                <span className="text-red-600">Overdue: <span className="font-semibold">{stats.milestones.overdue}</span></span>
              )}
            </div>
          </div>
          {stats.milestones.all.length > 0 ? (
            <div className="space-y-3">
              {stats.milestones.all.map((milestone) => {
                const today = new Date();
                const isOverdue = milestone.status !== 'complete' && isBefore(milestone.endDate, today);
                const daysUntil = differenceInDays(milestone.endDate, today);

                return (
                  <div
                    key={milestone.id}
                    className={`p-4 rounded-lg border-2 ${
                      milestone.status === 'complete'
                        ? 'bg-green-50 border-green-200'
                        : isOverdue
                        ? 'bg-red-50 border-red-300'
                        : 'bg-yellow-50 border-yellow-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <svg
                            className={`w-5 h-5 flex-shrink-0 ${
                              milestone.status === 'complete'
                                ? 'fill-green-500 stroke-green-700'
                                : isOverdue
                                ? 'fill-red-400 stroke-red-600'
                                : 'fill-yellow-400 stroke-yellow-600'
                            }`}
                            viewBox="0 0 24 24"
                            strokeWidth="2"
                          >
                            <path d="M12 2 L22 12 L12 22 L2 12 Z" />
                          </svg>
                          <h4 className="text-base font-semibold text-gray-900 truncate" title={milestone.name}>
                            {milestone.name}
                          </h4>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-600">Due: </span>
                            <span className="font-medium text-gray-900">
                              {format(milestone.endDate, 'MMM dd, yyyy')}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Status: </span>
                            <span className={`font-medium ${
                              milestone.status === 'complete'
                                ? 'text-green-700'
                                : milestone.status === 'in progress'
                                ? 'text-blue-700'
                                : milestone.status === 'blocked'
                                ? 'text-red-700'
                                : 'text-gray-700'
                            }`}>
                              {milestone.status.charAt(0).toUpperCase() + milestone.status.slice(1)}
                            </span>
                          </div>
                          {milestone.teamId && milestone.teamId.trim() !== '' && (
                            <div>
                              <span className="text-gray-600">Team: </span>
                              <span className="font-medium text-gray-900">{milestone.teamId}</span>
                            </div>
                          )}
                          {milestone.driId && milestone.driId.trim() !== '' && (
                            <div>
                              <span className="text-gray-600">DRI: </span>
                              <span className="font-medium text-gray-900">{milestone.driId}</span>
                            </div>
                          )}
                        </div>
                        {milestone.notes && (
                          <p className="text-xs text-gray-600 mt-2 line-clamp-2">{milestone.notes}</p>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-right">
                        {milestone.status === 'complete' ? (
                          <div className="flex items-center gap-1 text-green-700">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-sm font-semibold">Complete</span>
                          </div>
                        ) : isOverdue ? (
                          <div className="text-red-700">
                            <div className="text-sm font-semibold">Overdue</div>
                            <div className="text-xs">{Math.abs(daysUntil)} days late</div>
                          </div>
                        ) : (
                          <div className="text-blue-700">
                            <div className="text-sm font-semibold">{daysUntil} days</div>
                            <div className="text-xs">remaining</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-3 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2 L22 12 L12 22 L2 12 Z" />
              </svg>
              <p>No milestones defined yet</p>
              <p className="text-sm mt-1">Mark tasks as milestones to track key deliverables</p>
            </div>
          )}
        </div>

        {/* Top Contributors */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Contributors</h3>
          {stats.peopleStats.length > 0 ? (
            <div className="space-y-3">
              {stats.peopleStats.map((person, index) => (
                <div key={person.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-400">#{index + 1}</span>
                    <span className="text-sm font-medium text-gray-900">{person.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">{person.completedTasks}/{person.totalTasks} completed</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No DRI assignments yet</p>
              <p className="text-xs mt-1">Assign DRIs to tasks to see top contributors</p>
            </div>
          )}
        </div>
      </div>

      {/* Task Details Modal */}
      {selectedFilter && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedFilter(null)}
          title={selectedFilter.label}
          size="xl"
        >
          <div className="space-y-4">
            {filteredTasks.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DRI</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredTasks.map((task) => (
                      <tr key={task.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{task.name}</td>
                        <td className="px-4 py-3 text-sm">
                          <StatusBadge status={task.status} />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2 min-w-[60px]">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${task.progress}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-600">{task.progress}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{task.teamId || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{task.driId || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                          {isSentinelDate(task.startDate) ? '-' : format(task.startDate, 'MMM dd, yyyy')}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                          {isSentinelDate(task.endDate) ? '-' : format(task.endDate, 'MMM dd, yyyy')}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{task.duration} days</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p>No tasks found for this filter</p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
