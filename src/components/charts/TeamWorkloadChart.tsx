import React from 'react';

interface TeamWorkload {
  id: string;
  name: string;
  color: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
}

interface TeamWorkloadChartProps {
  teams: TeamWorkload[];
}

export const TeamWorkloadChart: React.FC<TeamWorkloadChartProps> = ({ teams }) => {
  if (teams.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <p className="text-sm">No team data available</p>
        </div>
      </div>
    );
  }

  // Find max tasks to scale bars
  const maxTasks = Math.max(...teams.map(t => t.totalTasks), 1);

  // Sort teams by total tasks (descending)
  const sortedTeams = [...teams].sort((a, b) => b.totalTasks - a.totalTasks);

  return (
    <div className="space-y-4">
      {sortedTeams.map((team) => {
        const completionRate = team.totalTasks > 0
          ? Math.round((team.completedTasks / team.totalTasks) * 100)
          : 0;

        const remainingTasks = team.totalTasks - team.completedTasks;
        const completedWidth = team.totalTasks > 0
          ? (team.completedTasks / maxTasks) * 100
          : 0;
        const inProgressWidth = team.totalTasks > 0
          ? (team.inProgressTasks / maxTasks) * 100
          : 0;
        const remainingWidth = team.totalTasks > 0
          ? ((remainingTasks - team.inProgressTasks) / maxTasks) * 100
          : 0;

        // Determine workload status
        const avgTasks = teams.reduce((sum, t) => sum + t.totalTasks, 0) / teams.length;
        const isOverloaded = team.totalTasks > avgTasks * 1.3;
        const isUnderutilized = team.totalTasks < avgTasks * 0.7 && team.totalTasks > 0;

        return (
          <div key={team.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: team.color }}
                />
                <span className="text-sm font-medium text-gray-900 truncate">
                  {team.name}
                </span>
                {isOverloaded && (
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">
                    Overloaded
                  </span>
                )}
                {isUnderutilized && (
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-semibold">
                    Underutilized
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="text-gray-600">
                  <span className="font-semibold text-gray-900">{team.completedTasks}</span>
                  /{team.totalTasks} tasks
                </span>
                <span className={`font-semibold min-w-[3rem] text-right ${
                  completionRate >= 75 ? 'text-green-600' :
                  completionRate >= 50 ? 'text-blue-600' :
                  completionRate >= 25 ? 'text-yellow-600' :
                  'text-gray-600'
                }`}>
                  {completionRate}%
                </span>
              </div>
            </div>

            {/* Stacked horizontal bar */}
            <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden">
              <div className="absolute inset-0 flex">
                {/* Completed tasks */}
                {completedWidth > 0 && (
                  <div
                    className="h-full bg-green-500 transition-all duration-500"
                    style={{ width: `${completedWidth}%` }}
                    title={`${team.completedTasks} completed`}
                  />
                )}
                {/* In progress tasks */}
                {inProgressWidth > 0 && (
                  <div
                    className="h-full bg-blue-500 transition-all duration-500"
                    style={{ width: `${inProgressWidth}%` }}
                    title={`${team.inProgressTasks} in progress`}
                  />
                )}
                {/* Remaining tasks */}
                {remainingWidth > 0 && (
                  <div
                    className="h-full bg-gray-400 transition-all duration-500"
                    style={{ width: `${remainingWidth}%` }}
                    title={`${remainingTasks - team.inProgressTasks} remaining`}
                  />
                )}
              </div>

              {/* Task count overlay */}
              {team.totalTasks > 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-white drop-shadow-md">
                    {team.totalTasks} {team.totalTasks === 1 ? 'task' : 'tasks'}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span className="text-xs text-gray-600">Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded"></div>
          <span className="text-xs text-gray-600">In Progress</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-gray-400 rounded"></div>
          <span className="text-xs text-gray-600">Not Started</span>
        </div>
      </div>

      {/* Insights */}
      {teams.length > 1 && (
        <div className="pt-3 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-gray-600">Most Loaded</div>
              <div className="font-semibold text-gray-900 mt-1">
                {sortedTeams[0].name} ({sortedTeams[0].totalTasks} tasks)
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-gray-600">Average Load</div>
              <div className="font-semibold text-gray-900 mt-1">
                {Math.round(teams.reduce((sum, t) => sum + t.totalTasks, 0) / teams.length)} tasks/team
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
