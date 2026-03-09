import React, { useMemo } from 'react';

interface StatusData {
  status: string;
  count: number;
  color: string;
  label: string;
}

interface StatusDonutChartProps {
  data: StatusData[];
}

export const StatusDonutChart: React.FC<StatusDonutChartProps> = ({ data }) => {
  const chartData = useMemo(() => {
    const total = data.reduce((sum, item) => sum + item.count, 0);

    if (total === 0) {
      return { segments: [], total: 0 };
    }

    let currentAngle = -90; // Start at top
    const segments = data
      .filter(item => item.count > 0)
      .map(item => {
        const percentage = (item.count / total) * 100;
        const angle = (percentage / 100) * 360;
        const startAngle = currentAngle;
        const endAngle = currentAngle + angle;
        currentAngle = endAngle;

        return {
          ...item,
          percentage,
          startAngle,
          endAngle,
        };
      });

    return { segments, total };
  }, [data]);

  // SVG donut chart parameters - larger size for better visibility
  const size = 300;
  const strokeWidth = 50;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;

  // Function to convert angle to SVG path coordinates
  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  };

  // Function to create arc path
  const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return [
      'M', start.x, start.y,
      'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
    ].join(' ');
  };

  if (chartData.total === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-sm">No task data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center h-full">
      {/* Donut Chart - centered and taking up primary space */}
      <div className="relative flex-1 flex items-center justify-center w-full min-h-0">
        <svg width={size} height={size} className="transform -rotate-90 max-w-full max-h-full">
          {/* Background circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#f3f4f6"
            strokeWidth={strokeWidth}
          />

          {/* Segments */}
          {chartData.segments.map((segment, index) => (
            <path
              key={index}
              d={describeArc(center, center, radius, segment.startAngle, segment.endAngle)}
              fill="none"
              stroke={segment.color}
              strokeWidth={strokeWidth}
              className="transition-all duration-300 hover:opacity-80"
            />
          ))}
        </svg>

        {/* Center text - positioned absolutely over the chart */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="text-4xl font-bold text-gray-900">{chartData.total}</div>
          <div className="text-sm text-gray-600">Total Tasks</div>
        </div>
      </div>

      {/* Legend - compact grid layout below chart */}
      <div className="w-full grid grid-cols-2 gap-x-4 gap-y-2 mt-4 pt-4 border-t border-gray-200">
        {chartData.segments.map((segment, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: segment.color }}
              />
              <span className="text-sm text-gray-700 truncate">{segment.label}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-sm font-semibold text-gray-900">{segment.count}</span>
              <span className="text-sm text-gray-500">
                {segment.percentage.toFixed(0)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
