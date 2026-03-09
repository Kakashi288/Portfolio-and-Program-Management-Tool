import React from 'react';
import { useProjectStore } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';
import { differenceInDays, format } from 'date-fns';

// Sentinel date to indicate "no date set"
const SENTINEL_DATE = new Date(1900, 0, 1);

// Helper function to check if a date is the sentinel value
const isSentinelDate = (date: Date): boolean => {
  return date.getFullYear() === 1900 && date.getMonth() === 0 && date.getDate() === 1;
};

// Helper function to recursively count all tasks and subtasks
const countAllTasks = (items: any[]): { total: number; completed: number; inProgress: number; blocked: number } => {
  let total = 0;
  let completed = 0;
  let inProgress = 0;
  let blocked = 0;

  const processItem = (item: any) => {
    total++;
    if (item.status === 'complete') completed++;
    if (item.status === 'in progress') inProgress++;
    if (item.status === 'blocked') blocked++;

    // Recursively process subtasks
    if (item.subtasks && item.subtasks.length > 0) {
      item.subtasks.forEach((subtask: any) => processItem(subtask));
    }
  };

  items.forEach(item => processItem(item));

  return { total, completed, inProgress, blocked };
};

export const Sidebar: React.FC = () => {
  const project = useProjectStore(state => state.project);
  const { isSidebarOpen, toggleSidebar } = useUIStore();

  const stats = React.useMemo(() => {
    if (!project) return {
      total: 0,
      completed: 0,
      inProgress: 0,
      blocked: 0,
      timelineProgress: 0,
      daysRemaining: 0,
      nextMilestone: null,
      hasValidDates: false,
      projectHealth: 'unknown' as 'on-track' | 'at-risk' | 'behind' | 'unknown',
      completionRate: 0
    };

    // Recursively count all tasks and subtasks
    const { total, completed, inProgress, blocked } = countAllTasks(project.lineItems);

    // Calculate completion rate
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Check if project has valid dates (not sentinel dates)
    const hasValidDates = !isSentinelDate(project.startDate) && !isSentinelDate(project.endDate);

    // Calculate timeline progress only if valid dates exist
    let timelineProgress = 0;
    let daysRemaining = 0;
    let projectHealth: 'on-track' | 'at-risk' | 'behind' | 'unknown' = 'unknown';

    if (hasValidDates) {
      const today = new Date();
      const daysTotal = differenceInDays(project.endDate, project.startDate);
      const daysElapsed = differenceInDays(today, project.startDate);
      daysRemaining = differenceInDays(project.endDate, today);

      // Handle case where start and end dates are the same (division by zero)
      timelineProgress = daysTotal === 0 ? 0 : Math.max(0, Math.min(100, Math.round((daysElapsed / daysTotal) * 100)));

      // Calculate project health based on timeline vs completion
      if (total > 0) {
        const diff = completionRate - timelineProgress;
        if (diff >= -5) {
          projectHealth = 'on-track'; // Within 5% or ahead
        } else if (diff >= -15) {
          projectHealth = 'at-risk'; // 5-15% behind
        } else {
          projectHealth = 'behind'; // More than 15% behind
        }
      }
    }

    // Find next milestone
    const milestones = project.lineItems.filter(item => item.isMilestone && item.status !== 'complete');
    const nextMilestone = milestones.sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())[0] || null;

    return {
      total,
      completed,
      inProgress,
      blocked,
      timelineProgress,
      daysRemaining,
      nextMilestone,
      hasValidDates,
      projectHealth,
      completionRate
    };
  }, [project]);

  if (!isSidebarOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
        onClick={toggleSidebar}
      />
      <aside className="fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 flex-1 overflow-y-auto scrollbar-thin flex flex-col gap-8">
          {/* Project Health Indicator */}
          {project && stats.hasValidDates && stats.total > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Project Health</h3>
              <div className={`p-3 rounded-lg bg-white border-l-4 border-t border-r border-b border-gray-200 ${
                stats.projectHealth === 'on-track'
                  ? 'border-l-green-500'
                  : stats.projectHealth === 'at-risk'
                  ? 'border-l-yellow-500'
                  : stats.projectHealth === 'behind'
                  ? 'border-l-red-500'
                  : 'border-l-gray-400'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-semibold ${
                    stats.projectHealth === 'on-track'
                      ? 'text-green-700'
                      : stats.projectHealth === 'at-risk'
                      ? 'text-yellow-700'
                      : stats.projectHealth === 'behind'
                      ? 'text-red-700'
                      : 'text-gray-700'
                  }`}>
                    {stats.projectHealth === 'on-track' && '✓ On Track'}
                    {stats.projectHealth === 'at-risk' && '⚠ At Risk'}
                    {stats.projectHealth === 'behind' && '✕ Behind Schedule'}
                    {stats.projectHealth === 'unknown' && '? Unknown'}
                  </span>
                  <span className={`text-2xl ${
                    stats.projectHealth === 'on-track'
                      ? 'text-green-600'
                      : stats.projectHealth === 'at-risk'
                      ? 'text-yellow-600'
                      : stats.projectHealth === 'behind'
                      ? 'text-red-600'
                      : 'text-gray-600'
                  }`}>
                    {stats.projectHealth === 'on-track' && '💚'}
                    {stats.projectHealth === 'at-risk' && '🟡'}
                    {stats.projectHealth === 'behind' && '🔴'}
                  </span>
                </div>
                <div className="text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span>Timeline: {stats.timelineProgress}%</span>
                    <span>Completed: {stats.completionRate}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Timeline Status */}
          {project && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Timeline Status</h3>
              {stats.total > 0 && stats.hasValidDates ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>{format(project.startDate, 'MMM dd, yyyy')}</span>
                    <span>{format(project.endDate, 'MMM dd, yyyy')}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-blue-600 h-3 rounded-full transition-all"
                      style={{ width: `${stats.timelineProgress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">{stats.timelineProgress}% complete</span>
                    <span className="font-semibold text-gray-900">
                      {stats.daysRemaining > 0 ? `${stats.daysRemaining} days left` : 'Overdue'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-500">No tasks scheduled yet</p>
                </div>
              )}
            </div>
          )}

          {/* Next Milestone Status */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Next Milestone</h3>
            <div className="space-y-2">
              {stats.nextMilestone ? (
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-purple-900 mb-1">
                        {stats.nextMilestone.name}
                      </p>
                      <p className="text-xs text-purple-700">
                        Due: {format(stats.nextMilestone.endDate, 'MMM dd, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        stats.nextMilestone.status === 'in progress'
                          ? 'bg-blue-100 text-blue-800'
                          : stats.nextMilestone.status === 'not started'
                          ? 'bg-gray-100 text-gray-800'
                          : stats.nextMilestone.status === 'blocked'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {stats.nextMilestone.status}
                    </div>
                    <span className="text-xs text-purple-600">
                      {differenceInDays(stats.nextMilestone.endDate, new Date()) >= 0
                        ? `${differenceInDays(stats.nextMilestone.endDate, new Date())} days away`
                        : `${Math.abs(differenceInDays(stats.nextMilestone.endDate, new Date()))} days overdue`}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-500">No milestones defined</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Stats</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Total Tasks</span>
                <span className="text-sm font-semibold text-gray-900">{stats.total}</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                <span className="text-sm text-green-700">Completed</span>
                <span className="text-sm font-semibold text-green-900">{stats.completed}</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                <span className="text-sm text-blue-700">In Progress</span>
                <span className="text-sm font-semibold text-blue-900">{stats.inProgress}</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                <span className="text-sm text-red-700">Blocked</span>
                <span className="text-sm font-semibold text-red-900">{stats.blocked}</span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
