import React, { useMemo } from 'react';
import { format, differenceInDays, eachWeekOfInterval } from 'date-fns';

// Sentinel date to indicate "no date set"
const SENTINEL_DATE = new Date(1900, 0, 1);

// Helper function to check if a date is the sentinel value
const isSentinelDate = (date: Date): boolean => {
  return date.getFullYear() === 1900 && date.getMonth() === 0 && date.getDate() === 1;
};

interface ProgressDataPoint {
  date: Date;
  completionRate: number;
  tasksCompleted: number;
  velocity: number; // tasks completed per day
}

interface Milestone {
  name: string;
  date: Date;
  completed: boolean;
}

interface ProgressTrendChartProps {
  startDate: Date;
  endDate: Date;
  totalTasks: number;
  completedTasks: number;
  milestones?: Milestone[];
  historicalData?: ProgressDataPoint[];
}

export const ProgressTrendChart: React.FC<ProgressTrendChartProps> = ({
  startDate,
  endDate,
  totalTasks,
  completedTasks,
  milestones = [],
  historicalData = [],
}) => {
  // Check if project dates are set
  const hasValidDates = !isSentinelDate(startDate) && !isSentinelDate(endDate);

  const chartData = useMemo(() => {
    if (!hasValidDates) {
      return {
        progressData: [],
        chartMilestones: [],
        daysElapsed: 0,
        totalDays: 0,
        projectedPath: null,
        idealPath: null,
        isOnTrack: true,
      };
    }

    const today = new Date();
    const totalDays = differenceInDays(endDate, startDate);
    const daysElapsed = Math.max(0, Math.min(totalDays, differenceInDays(today, startDate)));

    let progressData: ProgressDataPoint[];

    if (historicalData.length > 0) {
      // Use real historical data
      progressData = historicalData;
    } else {
      // Simulate progress data based on current state
      // Generate weekly data points from start to current
      const weeks = eachWeekOfInterval({
        start: startDate,
        end: today > endDate ? endDate : today,
      });

      // If not enough weekly data, always include start and current points
      if (weeks.length < 2) {
        // Always add start point
        progressData = [{
          date: startDate,
          completionRate: 0,
          tasksCompleted: 0,
          velocity: 0,
        }];

        // Add current point if different from start
        if (differenceInDays(today, startDate) > 0) {
          const currentVelocity = completedTasks / Math.max(1, differenceInDays(today, startDate));
          progressData.push({
            date: today,
            completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
            tasksCompleted: completedTasks,
            velocity: Math.max(0, currentVelocity),
          });
        }
      } else {
        // Use weekly data
        let previousTasksCompleted = 0;
        progressData = weeks.map((weekStart, index) => {
          const daysSinceStart = differenceInDays(weekStart, startDate);

          // Simulate realistic progress with slight variations
          // Progress tends to be slower at start, faster in middle, slower at end
          const progressCurve = (daysSinceStart / totalDays);
          const completionAtPoint = Math.min(
            completedTasks,
            Math.round(totalTasks * progressCurve * (completedTasks / totalTasks))
          );

          const velocity = index > 0
            ? (completionAtPoint - previousTasksCompleted) / 7
            : completionAtPoint / Math.max(1, daysSinceStart);

          previousTasksCompleted = completionAtPoint;

          return {
            date: weekStart,
            completionRate: totalTasks > 0 ? (completionAtPoint / totalTasks) * 100 : 0,
            tasksCompleted: completionAtPoint,
            velocity: Math.max(0, velocity),
          };
        });

        // Add current point if it's been at least a week since last data point
        const lastPoint = progressData[progressData.length - 1];
        if (!lastPoint || differenceInDays(today, lastPoint.date) >= 7) {
          const currentVelocity = progressData.length > 0
            ? (completedTasks - lastPoint.tasksCompleted) / differenceInDays(today, lastPoint.date)
            : completedTasks / Math.max(1, daysElapsed);

          progressData.push({
            date: today,
            completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
            tasksCompleted: completedTasks,
            velocity: Math.max(0, currentVelocity),
          });
        }
      }
    }

    // Filter milestones within the full project timeline
    const chartMilestones = milestones.filter(
      m => m.date >= startDate && m.date <= endDate
    );

    // Count ALL milestones by completion status (not filtered by date)
    const totalMilestones = milestones.length;
    const completedMilestonesCount = milestones.filter(m => m.completed).length;

    // Calculate ideal progress line (linear from 0% to 100%)
    const idealPath = [
      { date: startDate, completionRate: 0 },
      { date: endDate, completionRate: 100 },
    ];

    // Calculate projected completion based on current velocity
    let projectedPath = null;
    let isOnTrack = true;

    if (progressData.length > 0 && today <= endDate) {
      const currentCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
      const currentVelocity = progressData.length > 0
        ? progressData.slice(-Math.min(3, progressData.length)).reduce((sum, p) => sum + p.velocity, 0) / Math.min(3, progressData.length)
        : 0;

      if (currentVelocity > 0) {
        const tasksRemaining = totalTasks - completedTasks;
        const daysToComplete = tasksRemaining / currentVelocity;
        const projectedEndDate = new Date(today.getTime() + daysToComplete * 24 * 60 * 60 * 1000);

        // Create projection line from today to projected end
        projectedPath = [
          { date: today, completionRate: currentCompletionRate },
          { date: projectedEndDate, completionRate: 100 },
        ];

        // Check if on track (will finish before or on end date)
        isOnTrack = projectedEndDate <= endDate;
      }
    }

    return {
      progressData,
      chartMilestones,
      daysElapsed,
      totalDays,
      totalMilestones,
      completedMilestonesCount,
      idealPath,
      projectedPath,
      isOnTrack,
      today,
    };
  }, [startDate, endDate, totalTasks, completedTasks, milestones, historicalData, hasValidDates]);

  // Chart dimensions
  const width = 1000;
  const height = 420;
  const padding = { top: 30, right: 20, bottom: 50, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  if (chartData.progressData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <div className="text-center max-w-md">
          <svg className="w-16 h-16 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-sm font-semibold text-gray-700 mb-1">No Progress Trend Available</p>
          <p className="text-xs text-gray-500">
            {!hasValidDates
              ? "Set your project's start and end dates to see progress trends over time."
              : "Not enough data to show trends. The chart will populate as your project progresses."}
          </p>
        </div>
      </div>
    );
  }

  // Scales - use full project timeline for x-axis
  const minDate = startDate.getTime();
  const maxDate = endDate.getTime();
  const dateRange = maxDate - minDate || 1; // Prevent division by zero

  const xScale = (date: Date) => {
    if (dateRange === 1) return chartWidth / 2; // Center point if no range
    return ((date.getTime() - minDate) / dateRange) * chartWidth;
  };
  const yScale = (percentage: number) => chartHeight - (percentage / 100) * chartHeight;

  // Generate completion rate path
  const completionPath = chartData.progressData
    .map((point, i) => {
      const x = xScale(point.date);
      const y = yScale(point.completionRate);
      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    })
    .join(' ');

  // Y-axis ticks (0%, 25%, 50%, 75%, 100%)
  const yTicks = [0, 25, 50, 75, 100].map(percentage => ({
    value: percentage,
    y: yScale(percentage),
  }));

  // X-axis ticks - distribute evenly across full project timeline
  const numTicks = 6;
  const timeStep = (maxDate - minDate) / (numTicks - 1);
  const xTicks = Array.from({ length: numTicks }, (_, i) => new Date(minDate + timeStep * i));

  // Assign colors to milestones
  const milestoneColors = ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6', '#ef4444'];
  const milestonesWithColors = chartData.chartMilestones.map((milestone, i) => ({
    ...milestone,
    color: milestone.completed ? '#22c55e' : milestoneColors[i % milestoneColors.length],
  }));

  // Calculate trend (improving/declining)
  const recentVelocity = chartData.progressData.slice(-3).reduce((sum, p) => sum + p.velocity, 0) / 3;
  const earlierVelocity = chartData.progressData.slice(0, 3).reduce((sum, p) => sum + p.velocity, 0) / 3;
  const velocityTrend = recentVelocity > earlierVelocity * 1.1 ? 'improving' :
                        recentVelocity < earlierVelocity * 0.9 ? 'declining' : 'stable';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
            <span className="text-xs text-gray-600">Actual Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-gray-400" style={{ width: '16px' }}></div>
            <span className="text-xs text-gray-600">Ideal Progress</span>
          </div>
          {chartData.projectedPath && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5" style={{ width: '16px', borderTop: '2px dashed', borderColor: chartData.isOnTrack ? '#10b981' : '#ef4444' }}></div>
              <span className={`text-xs font-medium ${chartData.isOnTrack ? 'text-green-600' : 'text-red-600'}`}>
                {chartData.isOnTrack ? 'On Track' : 'Behind Schedule'}
              </span>
            </div>
          )}
        </div>
        <div className="text-right">
          <div className={`text-xs font-semibold ${
            velocityTrend === 'improving' ? 'text-green-600' :
            velocityTrend === 'declining' ? 'text-red-600' :
            'text-blue-600'
          }`}>
            {velocityTrend === 'improving' && '↗ Velocity Improving'}
            {velocityTrend === 'declining' && '↘ Velocity Declining'}
            {velocityTrend === 'stable' && '→ Velocity Stable'}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            {recentVelocity.toFixed(1)} tasks/day
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Chart */}
        <div className="flex-1">{/* SVG will be here */}

      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        <g transform={`translate(${padding.left}, ${padding.top})`}>
          {/* Grid lines */}
          {yTicks.map((tick, i) => (
            <line
              key={`grid-${i}`}
              x1={0}
              y1={tick.y}
              x2={chartWidth}
              y2={tick.y}
              stroke="#e5e7eb"
              strokeDasharray="2,2"
            />
          ))}

          {/* Ideal progress line */}
          {chartData.idealPath && (
            <line
              x1={xScale(chartData.idealPath[0].date)}
              y1={yScale(chartData.idealPath[0].completionRate)}
              x2={xScale(chartData.idealPath[1].date)}
              y2={yScale(chartData.idealPath[1].completionRate)}
              stroke="#9ca3af"
              strokeWidth={2}
              strokeDasharray="5,5"
              opacity={0.5}
            />
          )}

          {/* Projected completion line */}
          {chartData.projectedPath && (
            <line
              x1={xScale(chartData.projectedPath[0].date)}
              y1={yScale(chartData.projectedPath[0].completionRate)}
              x2={xScale(chartData.projectedPath[1].date)}
              y2={yScale(chartData.projectedPath[1].completionRate)}
              stroke={chartData.isOnTrack ? '#10b981' : '#ef4444'}
              strokeWidth={2}
              strokeDasharray="5,5"
              opacity={0.7}
            />
          )}

          {/* Today marker */}
          {chartData.today && (
            <g>
              <line
                x1={xScale(chartData.today)}
                y1={0}
                x2={xScale(chartData.today)}
                y2={chartHeight}
                stroke="#6366f1"
                strokeWidth={2}
                strokeDasharray="3,3"
                opacity={0.6}
              />
              <text
                x={xScale(chartData.today)}
                y={-5}
                textAnchor="middle"
                fontSize={10}
                fontWeight="600"
                fill="#6366f1"
              >
                Today
              </text>
            </g>
          )}

          {/* Area under curve */}
          <path
            d={`${completionPath} L ${xScale(chartData.progressData[chartData.progressData.length - 1].date)} ${chartHeight} L ${xScale(chartData.progressData[0].date)} ${chartHeight} Z`}
            fill="url(#gradient)"
            opacity={0.2}
          />

          {/* Completion rate line */}
          <path
            d={completionPath}
            fill="none"
            stroke="#2563eb"
            strokeWidth={3}
          />

          {/* Data points */}
          {chartData.progressData.map((point, i) => (
            <circle
              key={`point-${i}`}
              cx={xScale(point.date)}
              cy={yScale(point.completionRate)}
              r={4}
              fill="#2563eb"
              stroke="white"
              strokeWidth={2}
              className="cursor-pointer hover:r-6 transition-all"
            >
              <title>{`${format(point.date, 'MMM d, yyyy')}: ${point.completionRate.toFixed(1)}% complete (${point.tasksCompleted} tasks)`}</title>
            </circle>
          ))}

          {/* Milestones */}
          {milestonesWithColors.map((milestone, i) => {
            const x = xScale(milestone.date);

            return (
              <g key={`milestone-${i}`}>
                <line
                  x1={x}
                  y1={0}
                  x2={x}
                  y2={chartHeight}
                  stroke={milestone.color}
                  strokeWidth={2}
                  strokeDasharray="4,4"
                  opacity={0.6}
                />
                <svg
                  x={x - 6}
                  y={-20}
                  width={12}
                  height={12}
                  viewBox="0 0 24 24"
                  fill={milestone.color}
                >
                  <path d="M12 2 L22 12 L12 22 L2 12 Z" />
                  <title>{milestone.name}</title>
                </svg>
              </g>
            );
          })}

          {/* Y-axis */}
          <line x1={0} y1={0} x2={0} y2={chartHeight} stroke="#6b7280" strokeWidth={1} />
          {yTicks.map((tick, i) => (
            <g key={`y-tick-${i}`}>
              <line
                x1={-5}
                y1={tick.y}
                x2={0}
                y2={tick.y}
                stroke="#6b7280"
                strokeWidth={1}
              />
              <text
                x={-10}
                y={tick.y}
                textAnchor="end"
                alignmentBaseline="middle"
                fontSize={10}
                fill="#6b7280"
              >
                {tick.value}%
              </text>
            </g>
          ))}

          {/* X-axis */}
          <line
            x1={0}
            y1={chartHeight}
            x2={chartWidth}
            y2={chartHeight}
            stroke="#6b7280"
            strokeWidth={1}
          />
          {xTicks.map((tickDate, i) => (
            <g key={`x-tick-${i}`}>
              <line
                x1={xScale(tickDate)}
                y1={chartHeight}
                x2={xScale(tickDate)}
                y2={chartHeight + 5}
                stroke="#6b7280"
                strokeWidth={1}
              />
              <text
                x={xScale(tickDate)}
                y={chartHeight + 20}
                textAnchor="middle"
                fontSize={10}
                fill="#6b7280"
              >
                {format(tickDate, 'MMM d')}
              </text>
            </g>
          ))}

          {/* Axis labels */}
          <text
            x={-35}
            y={chartHeight / 2}
            textAnchor="middle"
            fontSize={11}
            fill="#4b5563"
            fontWeight="600"
            transform={`rotate(-90, -35, ${chartHeight / 2})`}
          >
            Completion Rate (%)
          </text>
          <text
            x={chartWidth / 2}
            y={chartHeight + 40}
            textAnchor="middle"
            fontSize={11}
            fill="#4b5563"
            fontWeight="600"
          >
            Timeline
          </text>

          {/* Gradient definition */}
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#2563eb" stopOpacity={0.8} />
              <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
            </linearGradient>
          </defs>
        </g>
      </svg>
        </div>

        {/* Milestone Legend */}
        {milestonesWithColors.length > 0 && (
          <div className="w-48 flex-shrink-0 pt-12">
            <h4 className="text-xs font-semibold text-gray-700 mb-3">Milestones</h4>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {milestonesWithColors.map((milestone, i) => (
                <div key={`legend-${i}`} className="flex items-start gap-2">
                  <svg
                    className="flex-shrink-0 mt-0.5"
                    width={10}
                    height={10}
                    viewBox="0 0 24 24"
                    fill={milestone.color}
                  >
                    <path d="M12 2 L22 12 L12 22 L2 12 Z" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-900 font-medium leading-tight break-words">
                      {milestone.name}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {format(milestone.date, 'MMM dd, yyyy')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 pt-2 border-t border-gray-200">
        <div className="text-center">
          <div className="text-xs text-gray-600">Current Rate</div>
          <div className="text-lg font-bold text-blue-600">
            {totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : 0}%
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-600">Avg Velocity</div>
          <div className="text-lg font-bold text-gray-900">
            {recentVelocity.toFixed(1)} tasks/day
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-600">Milestones Hit</div>
          <div className="text-lg font-bold text-green-600">
            {chartData.completedMilestonesCount}/{chartData.totalMilestones}
          </div>
        </div>
      </div>
    </div>
  );
};
