import React, { useMemo } from 'react';
import { format, differenceInDays, addDays } from 'date-fns';

interface BurndownChartProps {
  totalTasks: number;
  completedTasks: number;
  startDate: Date;
  endDate: Date;
  completionHistory?: Array<{ date: Date; completed: number }>;
}

export const BurndownChart: React.FC<BurndownChartProps> = ({
  totalTasks,
  completedTasks,
  startDate,
  endDate,
  completionHistory = [],
}) => {
  const chartData = useMemo(() => {
    const today = new Date();
    const totalDays = differenceInDays(endDate, startDate);
    const daysElapsed = differenceInDays(today, startDate);

    // Generate ideal burndown line (linear)
    const idealLine: Array<{ day: number; remaining: number; date: Date }> = [];
    for (let day = 0; day <= totalDays; day++) {
      idealLine.push({
        day,
        remaining: totalTasks - (totalTasks * day) / totalDays,
        date: addDays(startDate, day),
      });
    }

    // Generate actual progress line
    // If we have historical data, use it; otherwise simulate based on current progress
    const actualLine: Array<{ day: number; remaining: number; date: Date }> = [];

    if (completionHistory.length > 0) {
      // Use historical data
      completionHistory.forEach((point) => {
        const dayFromStart = differenceInDays(point.date, startDate);
        actualLine.push({
          day: dayFromStart,
          remaining: totalTasks - point.completed,
          date: point.date,
        });
      });
    } else {
      // Simulate based on current state (straight line from start to current)
      actualLine.push({ day: 0, remaining: totalTasks, date: startDate });
      if (daysElapsed > 0 && daysElapsed <= totalDays) {
        actualLine.push({
          day: daysElapsed,
          remaining: totalTasks - completedTasks,
          date: today,
        });
      }

      // Project to end based on current velocity
      if (daysElapsed > 0 && completedTasks > 0) {
        const velocity = completedTasks / daysElapsed;
        const daysToComplete = (totalTasks - completedTasks) / velocity;
        const projectedEndDate = addDays(today, Math.ceil(daysToComplete));

        // Only show projection if it's reasonable
        if (daysToComplete > 0 && daysToComplete < 1000) {
          actualLine.push({
            day: differenceInDays(projectedEndDate, startDate),
            remaining: 0,
            date: projectedEndDate,
          });
        }
      }
    }

    return { idealLine, actualLine, totalDays, daysElapsed };
  }, [totalTasks, completedTasks, startDate, endDate, completionHistory]);

  // Chart dimensions
  const width = 600;
  const height = 300;
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Scales
  const xScale = (day: number) => (day / chartData.totalDays) * chartWidth;
  const yScale = (remaining: number) => chartHeight - (remaining / totalTasks) * chartHeight;

  // Generate path for ideal line
  const idealPath = chartData.idealLine
    .map((point, i) => {
      const x = xScale(point.day);
      const y = yScale(point.remaining);
      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    })
    .join(' ');

  // Generate path for actual line
  const actualPath = chartData.actualLine
    .map((point, i) => {
      const x = xScale(point.day);
      const y = yScale(point.remaining);
      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    })
    .join(' ');

  // Calculate projection status
  const currentRemaining = totalTasks - completedTasks;
  const idealRemaining = totalTasks - (totalTasks * chartData.daysElapsed) / chartData.totalDays;
  const isAhead = currentRemaining < idealRemaining;
  const isBehind = currentRemaining > idealRemaining;

  // Y-axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(ratio => ({
    value: Math.round(totalTasks * ratio),
    y: yScale(totalTasks * ratio),
  }));

  // X-axis ticks (show key dates)
  const xTicks = [0, 0.25, 0.5, 0.75, 1].map(ratio => ({
    day: Math.round(chartData.totalDays * ratio),
    x: xScale(chartData.totalDays * ratio),
    date: addDays(startDate, Math.round(chartData.totalDays * ratio)),
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
            <span className="text-xs text-gray-600">Ideal</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
            <span className="text-xs text-gray-600">Actual</span>
          </div>
        </div>
        <div className="text-right">
          {isAhead && (
            <div className="text-xs text-green-600 font-semibold">
              ✓ Ahead of schedule
            </div>
          )}
          {isBehind && (
            <div className="text-xs text-red-600 font-semibold">
              ⚠ Behind schedule
            </div>
          )}
          {!isAhead && !isBehind && (
            <div className="text-xs text-blue-600 font-semibold">
              ● On track
            </div>
          )}
        </div>
      </div>

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

          {/* Ideal line */}
          <path
            d={idealPath}
            fill="none"
            stroke="#9ca3af"
            strokeWidth={2}
            strokeDasharray="5,5"
          />

          {/* Actual line */}
          <path
            d={actualPath}
            fill="none"
            stroke="#2563eb"
            strokeWidth={3}
          />

          {/* Today marker */}
          {chartData.daysElapsed >= 0 && chartData.daysElapsed <= chartData.totalDays && (
            <>
              <line
                x1={xScale(chartData.daysElapsed)}
                y1={0}
                x2={xScale(chartData.daysElapsed)}
                y2={chartHeight}
                stroke="#ef4444"
                strokeWidth={2}
                strokeDasharray="3,3"
              />
              <text
                x={xScale(chartData.daysElapsed)}
                y={-5}
                textAnchor="middle"
                fontSize={10}
                fill="#ef4444"
                fontWeight="bold"
              >
                TODAY
              </text>
            </>
          )}

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
                {tick.value}
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
          {xTicks.map((tick, i) => (
            <g key={`x-tick-${i}`}>
              <line
                x1={tick.x}
                y1={chartHeight}
                x2={tick.x}
                y2={chartHeight + 5}
                stroke="#6b7280"
                strokeWidth={1}
              />
              <text
                x={tick.x}
                y={chartHeight + 20}
                textAnchor="middle"
                fontSize={10}
                fill="#6b7280"
              >
                {format(tick.date, 'MMM d')}
              </text>
            </g>
          ))}

          {/* Axis labels */}
          <text
            x={-30}
            y={chartHeight / 2}
            textAnchor="middle"
            fontSize={11}
            fill="#4b5563"
            fontWeight="600"
            transform={`rotate(-90, -30, ${chartHeight / 2})`}
          >
            Tasks Remaining
          </text>
          <text
            x={chartWidth / 2}
            y={chartHeight + 35}
            textAnchor="middle"
            fontSize={11}
            fill="#4b5563"
            fontWeight="600"
          >
            Timeline
          </text>
        </g>
      </svg>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 text-center pt-2 border-t border-gray-200">
        <div>
          <div className="text-xs text-gray-600">Remaining</div>
          <div className="text-lg font-bold text-gray-900">{currentRemaining}</div>
        </div>
        <div>
          <div className="text-xs text-gray-600">Completed</div>
          <div className="text-lg font-bold text-green-600">{completedTasks}</div>
        </div>
        <div>
          <div className="text-xs text-gray-600">Total</div>
          <div className="text-lg font-bold text-gray-900">{totalTasks}</div>
        </div>
      </div>
    </div>
  );
};
