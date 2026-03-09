import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';
import { format, addDays, addWeeks, addMonths, addQuarters, addYears, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, isSameDay, getDay, getQuarter, getWeek } from 'date-fns';
import { getAllTasks } from '../../utils/taskUtils';
import { getStatusColor } from '../../utils/taskUtils';
import type { ResourceCalendarViewMode } from '../../types';

// Helper function to check if a date is the sentinel value
const isSentinelDate = (date: Date): boolean => {
  return date.getFullYear() === 1900 && date.getMonth() === 0 && date.getDate() === 1;
};

export const ResourceCalendar: React.FC = () => {
  const project = useProjectStore(state => state.project);
  const viewMode = useUIStore(state => state.resourceCalendarViewMode);
  const setViewMode = useUIStore(state => state.setResourceCalendarViewMode);

  const [centerDate, setCenterDate] = useState(new Date());
  const [showViewModeDropdown, setShowViewModeDropdown] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isTransitioningRef = useRef(false);

  // Generate calendar data for each scroll period
  const allCalendarData = useMemo(() => {
    if (!project) return [];

    const allTasks = getAllTasks(project.lineItems);

    // Find the earliest start date and latest end date from all tasks
    // Skip sentinel dates (1900-01-01)
    let minDate: Date | null = null;
    let maxDate: Date | null = null;

    allTasks.forEach(task => {
      if (!isSentinelDate(task.startDate)) {
        if (!minDate || task.startDate < minDate) {
          minDate = task.startDate;
        }
      }
      if (!isSentinelDate(task.endDate)) {
        if (!maxDate || task.endDate > maxDate) {
          maxDate = task.endDate;
        }
      }
    });

    // If no tasks with valid dates, use current date
    if (!minDate || !maxDate) {
      minDate = new Date();
      maxDate = new Date();
    }

    // Adjust buffer based on view mode requirements
    let bufferStart: Date;
    let bufferEnd: Date;

    switch (viewMode) {
      case 'day':
      case 'week':
        // Show project date range with small buffer
        bufferStart = addWeeks(startOfWeek(minDate, { weekStartsOn: 1 }), -1);
        bufferEnd = addWeeks(endOfWeek(maxDate, { weekStartsOn: 1 }), 2);
        break;
      case 'month':
        // Show all months for the calendar years covered by the project
        // Start from Jan 1st of the year containing the earliest task
        // End at Dec 31st of the year containing the latest task
        bufferStart = startOfYear(minDate);
        bufferEnd = endOfYear(maxDate);
        break;
      case 'quarter':
        // Show quarters for current year + following year (minimum)
        // But extend if project dates go beyond this
        const currentYear = new Date().getFullYear();
        const quarterMinStart = startOfYear(new Date(currentYear, 0, 1));
        const quarterMinEnd = endOfYear(new Date(currentYear + 1, 11, 31));

        bufferStart = minDate < quarterMinStart ? startOfYear(minDate) : quarterMinStart;
        bufferEnd = maxDate > quarterMinEnd ? endOfYear(maxDate) : quarterMinEnd;
        break;
      case 'year':
        // Show current year + next 4 years (minimum)
        // But extend if project dates go beyond this
        const thisYear = new Date().getFullYear();
        const yearMinStart = startOfYear(new Date(thisYear, 0, 1));
        const yearMinEnd = endOfYear(new Date(thisYear + 4, 11, 31));

        bufferStart = minDate < yearMinStart ? startOfYear(minDate) : yearMinStart;
        bufferEnd = maxDate > yearMinEnd ? endOfYear(maxDate) : yearMinEnd;
        break;
      default:
        bufferStart = minDate;
        bufferEnd = maxDate;
    }

    // Generate periods covering the entire date range
    const getPeriodsForDateRange = () => {
      const periods = [];
      let currentPeriod = bufferStart;

      switch (viewMode) {
        case 'day':
        case 'week':
          while (currentPeriod <= bufferEnd) {
            periods.push(new Date(currentPeriod));
            currentPeriod = addWeeks(currentPeriod, 1);
          }
          break;
        case 'month':
          while (currentPeriod <= bufferEnd) {
            periods.push(new Date(currentPeriod));
            currentPeriod = addMonths(currentPeriod, 1);
          }
          break;
        case 'quarter':
          while (currentPeriod <= bufferEnd) {
            periods.push(new Date(currentPeriod));
            currentPeriod = addQuarters(currentPeriod, 1);
          }
          break;
        case 'year':
          while (currentPeriod <= bufferEnd) {
            periods.push(new Date(currentPeriod));
            currentPeriod = addYears(currentPeriod, 1);
          }
          break;
      }

      return periods;
    };

    const scrollPeriods = getPeriodsForDateRange();

    return scrollPeriods.map(periodDate => {
      const allTasks = getAllTasks(project.lineItems);

      // Get date range based on view mode
      let rangeStart: Date;
      let rangeEnd: Date;
      let periods: Date[];
      let periodLabel: string;
      let majorHeaders: Array<{ label: string; colspan: number }> = [];

      switch (viewMode) {
        case 'day':
          // Day view: show individual business days (Mon-Fri) across a complete week
          // Row 1: Week date range (Jan 5-9) + Week indicator (W2)
          // Row 2: Individual days with day numbers

          // Find the Monday before or at periodDate to show complete weeks
          let weekAlignedStart = startOfWeek(periodDate, { weekStartsOn: 1 });

          // Find the Friday of that week
          let weekAlignedEnd = endOfWeek(periodDate, { weekStartsOn: 1 });
          // Adjust to Friday
          while (getDay(weekAlignedEnd) !== 5) {
            weekAlignedEnd = addDays(weekAlignedEnd, -1);
          }

          rangeStart = weekAlignedStart;
          rangeEnd = weekAlignedEnd;
          periods = eachDayOfInterval({ start: rangeStart, end: rangeEnd })
            .filter(day => getDay(day) >= 1 && getDay(day) <= 5);

          // Calculate week number
          const dayWeekStart = periods[0];
          const dayWeekEnd = periods[periods.length - 1];
          const dayWeekNumber = getWeek(dayWeekStart, { weekStartsOn: 1 });

          periodLabel = `${format(dayWeekStart, 'MMM d')}-${format(dayWeekEnd, 'd')}`;
          majorHeaders = [{ label: `${format(dayWeekStart, 'MMM d')}-${format(dayWeekEnd, 'd')} • W${dayWeekNumber}`, colspan: periods.length }];
          break;

        case 'week':
          // Week view: show individual days (Mon-Fri) within a week
          // Row 1: Week date range (Jan 5-9) + Week indicator (W2)
          // Row 2: M, T, W, T, F
          rangeStart = startOfWeek(periodDate, { weekStartsOn: 1 });
          rangeEnd = endOfWeek(periodDate, { weekStartsOn: 1 });
          periods = eachDayOfInterval({ start: rangeStart, end: rangeEnd })
            .filter(day => getDay(day) >= 1 && getDay(day) <= 5);

          // Calculate week number
          const weekStart = periods[0];
          const weekEnd = periods[periods.length - 1];
          const weekNumber = getWeek(weekStart, { weekStartsOn: 1 });

          periodLabel = `${format(weekStart, 'MMM d')}-${format(weekEnd, 'd')}`;
          majorHeaders = [{ label: `${format(weekStart, 'MMM d')}-${format(weekEnd, 'd')} • W${weekNumber}`, colspan: periods.length }];
          break;

        case 'month':
          // Month view: show weeks across a month (OLD week view)
          // Row 1: Each month header, Row 2: Week start dates (day of month)
          rangeStart = startOfMonth(periodDate);
          rangeEnd = endOfMonth(periodDate);

          // Get all weeks in the month
          const allWeeks = eachWeekOfInterval({ start: rangeStart, end: rangeEnd }, { weekStartsOn: 1 });

          // Only include weeks that START in the current month to avoid duplicates
          // This prevents a week starting Jan 26 from appearing in both Jan and Feb
          periods = allWeeks.filter(weekStart =>
            weekStart.getMonth() === periodDate.getMonth() &&
            weekStart.getFullYear() === periodDate.getFullYear()
          );

          periodLabel = format(periodDate, 'MMMM yyyy');

          // Group weeks by month and create a major header for each month
          majorHeaders = [];
          let currentMonth = -1;
          let monthWeekCount = 0;

          periods.forEach((weekStart, index) => {
            const weekMonth = weekStart.getMonth();
            if (weekMonth !== currentMonth) {
              if (monthWeekCount > 0) {
                // Push the previous month's header
                majorHeaders.push({
                  label: format(periods[index - monthWeekCount], 'MMM yyyy'),
                  colspan: monthWeekCount
                });
              }
              currentMonth = weekMonth;
              monthWeekCount = 1;
            } else {
              monthWeekCount++;
            }
          });
          // Push the last month's header
          if (monthWeekCount > 0) {
            majorHeaders.push({
              label: format(periods[periods.length - monthWeekCount], 'MMM yyyy'),
              colspan: monthWeekCount
            });
          }
          break;

        case 'quarter':
          // Quarter view: show months across a quarter (OLD month view)
          // Row 1: Each quarter header (Q1 2026), Row 2: Month names (Jan, Feb, Mar)
          rangeStart = startOfQuarter(periodDate);
          rangeEnd = endOfQuarter(periodDate);
          periods = eachMonthOfInterval({ start: rangeStart, end: rangeEnd });
          periodLabel = `Q${Math.floor(periodDate.getMonth() / 3) + 1} ${format(periodDate, 'yyyy')}`;

          // Group months by quarter and create a major header for each quarter
          majorHeaders = [];
          let currentQuarter = -1;
          let quarterMonthCount = 0;

          periods.forEach((month, index) => {
            const monthQuarter = getQuarter(month);
            if (monthQuarter !== currentQuarter) {
              if (quarterMonthCount > 0) {
                // Push the previous quarter's header
                const prevMonth = periods[index - quarterMonthCount];
                majorHeaders.push({
                  label: `Q${getQuarter(prevMonth)} ${format(prevMonth, 'yyyy')}`,
                  colspan: quarterMonthCount
                });
              }
              currentQuarter = monthQuarter;
              quarterMonthCount = 1;
            } else {
              quarterMonthCount++;
            }
          });
          // Push the last quarter's header
          if (quarterMonthCount > 0) {
            const lastMonth = periods[periods.length - quarterMonthCount];
            majorHeaders.push({
              label: `Q${getQuarter(lastMonth)} ${format(lastMonth, 'yyyy')}`,
              colspan: quarterMonthCount
            });
          }
          break;

        case 'year':
          // Year view: show quarters across multiple years (OLD quarter view)
          // Row 1: Each year header (2026), Row 2: Quarter labels (Q1, Q2, Q3, Q4)
          rangeStart = startOfYear(periodDate);
          rangeEnd = endOfYear(periodDate);
          periods = [
            startOfQuarter(new Date(periodDate.getFullYear(), 0, 1)),
            startOfQuarter(new Date(periodDate.getFullYear(), 3, 1)),
            startOfQuarter(new Date(periodDate.getFullYear(), 6, 1)),
            startOfQuarter(new Date(periodDate.getFullYear(), 9, 1)),
          ];
          periodLabel = format(periodDate, 'yyyy');

          // Group quarters by year and create a major header for each year
          majorHeaders = [];
          let currentYear = -1;
          let yearQuarterCount = 0;

          periods.forEach((quarter, index) => {
            const quarterYear = quarter.getFullYear();
            if (quarterYear !== currentYear) {
              if (yearQuarterCount > 0) {
                // Push the previous year's header
                majorHeaders.push({
                  label: format(periods[index - yearQuarterCount], 'yyyy'),
                  colspan: yearQuarterCount
                });
              }
              currentYear = quarterYear;
              yearQuarterCount = 1;
            } else {
              yearQuarterCount++;
            }
          });
          // Push the last year's header
          if (yearQuarterCount > 0) {
            majorHeaders.push({
              label: format(periods[periods.length - yearQuarterCount], 'yyyy'),
              colspan: yearQuarterCount
            });
          }
          break;
      }

      // Collect unique DRI names from tasks
      const driNames = new Set<string>();
      allTasks.forEach(task => {
        if (task.driId && task.driId.trim() !== '') {
          driNames.add(task.driId.trim());
        }
      });

      // Group tasks by DRI name
      const peopleWithTasks = Array.from(driNames).sort().map(driName => {
        const personTasks = allTasks.filter(task => task.driId === driName);

        const tasksByPeriod = periods.map(period => {
          let periodStart: Date;
          let periodEnd: Date;

          switch (viewMode) {
            case 'day':
              // Day view: each period is a single day
              periodStart = new Date(period);
              periodEnd = new Date(period);
              periodStart.setHours(0, 0, 0, 0);
              periodEnd.setHours(23, 59, 59, 999);
              break;

            case 'week':
              // Week view: each period is a single day
              periodStart = new Date(period);
              periodEnd = new Date(period);
              periodStart.setHours(0, 0, 0, 0);
              periodEnd.setHours(23, 59, 59, 999);
              break;

            case 'month':
              // Month view: each period is a week
              periodStart = period;
              periodEnd = addDays(period, 6);
              break;

            case 'quarter':
              // Quarter view: each period is a month
              periodStart = startOfMonth(period);
              periodEnd = endOfMonth(period);
              break;

            case 'year':
              // Year view: each period is a quarter
              periodStart = period;
              periodEnd = endOfQuarter(period);
              break;
          }

          const periodTasks = personTasks.filter(task => {
            const taskStart = new Date(task.startDate);
            const taskEnd = new Date(task.endDate);
            taskStart.setHours(0, 0, 0, 0);
            taskEnd.setHours(0, 0, 0, 0);

            const skipWeekends = (date: Date) => {
              const day = getDay(date);
              return day >= 1 && day <= 5;
            };

            // For day and week views (day-level), check exact overlap (each column is one day)
            if (viewMode === 'day' || viewMode === 'week') {
              return taskStart <= periodEnd && taskEnd >= periodStart;
            }

            // For month/quarter/year views, check if task has any workdays in the period
            let currentDate = new Date(Math.max(taskStart.getTime(), periodStart.getTime()));
            const endDate = new Date(Math.min(taskEnd.getTime(), periodEnd.getTime()));

            while (currentDate <= endDate) {
              if (skipWeekends(currentDate)) {
                return true;
              }
              currentDate = addDays(currentDate, 1);
            }

            return false;
          });

          return {
            date: period,
            tasks: periodTasks,
          };
        });

        return {
          person: { name: driName, id: driName },
          tasksByPeriod,
          totalTasks: personTasks.length,
        };
      });

      return {
        periodDate,
        rangeStart,
        rangeEnd,
        periods,
        periodLabel,
        majorHeaders,
        peopleWithTasks,
      };
    });
  }, [project, viewMode]);

  const goToPrev = useCallback(() => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;

    switch (viewMode) {
      case 'day':
        setCenterDate(addWeeks(centerDate, -1));
        break;
      case 'week':
        setCenterDate(addWeeks(centerDate, -1));
        break;
      case 'month':
        setCenterDate(addMonths(centerDate, -1));
        break;
      case 'quarter':
        setCenterDate(addQuarters(centerDate, -1));
        break;
      case 'year':
        setCenterDate(addYears(centerDate, -1));
        break;
    }

    setTimeout(() => {
      isTransitioningRef.current = false;
    }, 500);
  }, [centerDate, viewMode]);

  const goToNext = useCallback(() => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;

    switch (viewMode) {
      case 'day':
        setCenterDate(addWeeks(centerDate, 1));
        break;
      case 'week':
        setCenterDate(addWeeks(centerDate, 1));
        break;
      case 'month':
        setCenterDate(addMonths(centerDate, 1));
        break;
      case 'quarter':
        setCenterDate(addQuarters(centerDate, 1));
        break;
      case 'year':
        setCenterDate(addYears(centerDate, 1));
        break;
    }

    setTimeout(() => {
      isTransitioningRef.current = false;
    }, 500);
  }, [centerDate, viewMode]);

  const goToToday = useCallback(() => {
    // Scroll to today's position in the calendar
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    // Calculate today's position based on the calendar data
    const today = new Date();
    let todayPeriodIndex = -1;

    // Find which period contains today
    allCalendarData.forEach((calendarData, periodIdx) => {
      calendarData.periods.forEach((period, index) => {
        if (viewMode === 'day' || viewMode === 'week') {
          if (isSameDay(period, today)) {
            todayPeriodIndex = calendarData.periods.slice(0, index).length;
          }
        } else if (viewMode === 'month') {
          const weekEnd = addDays(period, 6);
          if (today >= period && today <= weekEnd) {
            todayPeriodIndex = calendarData.periods.slice(0, index).length;
          }
        } else if (viewMode === 'quarter') {
          const monthStart = startOfMonth(period);
          const monthEnd = endOfMonth(period);
          if (today >= monthStart && today <= monthEnd) {
            todayPeriodIndex = calendarData.periods.slice(0, index).length;
          }
        } else if (viewMode === 'year') {
          const quarterStart = startOfQuarter(period);
          const quarterEnd = endOfQuarter(period);
          if (today >= quarterStart && today <= quarterEnd) {
            todayPeriodIndex = calendarData.periods.slice(0, index).length;
          }
        }
      });
    });

    if (todayPeriodIndex !== -1) {
      // Scroll to today's column (approximate pixel position)
      const columnWidth = 192; // w-48 = 192px
      const scrollPosition = todayPeriodIndex * columnWidth;
      scrollContainer.scrollTo({ left: scrollPosition, behavior: 'smooth' });
    }
  }, [viewMode, allCalendarData]);

  if (!project || allCalendarData.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>No project data available</p>
      </div>
    );
  }

  // Use the first period (index 0) for display info - this is the current period
  const currentCalendarData = allCalendarData[0];

  const getPeriodLabel = (date: Date): string => {
    switch (viewMode) {
      case 'day':
        // Show day abbreviation for each day column (Mon, Tue, etc.)
        return format(date, 'EEE');
      case 'week':
        // Show single letter for each weekday (M, T, W, T, F)
        return format(date, 'EEEEE');
      case 'month':
        // Show week start date (day of month) for each week column
        return format(date, 'd');
      case 'quarter':
        // Show month name for each month column
        return format(date, 'MMM');
      case 'year':
        // Show quarter label for each quarter column (Q1, Q2, Q3, Q4)
        return `Q${getQuarter(date)}`;
      default:
        return '';
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-300 p-4 bg-white">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Resource Calendar</h2>
            <p className="text-sm text-gray-600 mt-1">{currentCalendarData.periodLabel}</p>
          </div>

          <div className="flex items-center gap-2 mr-[11px]">
            {/* Time Range Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowViewModeDropdown(!showViewModeDropdown)}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm font-medium flex items-center gap-2"
                title="Change Time Range"
              >
                <span>{viewMode === 'day' ? 'Days' : viewMode === 'week' ? 'Weeks' : viewMode === 'month' ? 'Months' : viewMode === 'quarter' ? 'Quarters' : 'Years'}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showViewModeDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowViewModeDropdown(false)}
                  />
                  <div className="absolute top-full right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-xl z-50 min-w-[140px] overflow-hidden">
                    {(['day', 'week', 'month', 'quarter', 'year'] as ResourceCalendarViewMode[]).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => {
                          setViewMode(mode);
                          setShowViewModeDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-blue-50 transition-colors ${
                          viewMode === mode ? 'bg-blue-100 font-semibold text-blue-700' : 'text-gray-700'
                        }`}
                      >
                        {mode === 'day' ? 'Days' : mode === 'week' ? 'Weeks' : mode === 'month' ? 'Months' : mode === 'quarter' ? 'Quarters' : 'Years'}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Today button */}
            <button
              onClick={goToToday}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm font-medium"
            >
              Today
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid - Horizontally Scrollable */}
      <div ref={scrollContainerRef} className="flex-1 overflow-x-auto overflow-y-auto scroll-smooth">
        <table className="min-w-max" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead className="sticky top-0 bg-gray-100 z-30">
            {/* Row 1: Major Headers (Week/Month/Quarter/Year) */}
            <tr>
              <th rowSpan={2} className="border border-gray-300 px-4 py-3 text-left font-semibold w-48 bg-gray-100 sticky left-0 z-40">
                Resource
              </th>
              {allCalendarData.map((calendarData, periodIdx) =>
                calendarData.majorHeaders.map((header, headerIdx) => {
                  // For year view, check if this year's last quarter is included
                  const isLastYearHeader = viewMode === 'year' && headerIdx < calendarData.majorHeaders.length && (() => {
                    // Check if this is the last header OR if the next header is a different year
                    if (headerIdx === calendarData.majorHeaders.length - 1) return true;
                    const currentYear = parseInt(header.label);
                    const nextYear = parseInt(calendarData.majorHeaders[headerIdx + 1]?.label || '0');
                    return currentYear !== nextYear;
                  })();

                  // For month view, check if this is the last header in a set (quarter boundary)
                  const isLastQuarterHeader = viewMode === 'month' && (() => {
                    if (headerIdx === calendarData.majorHeaders.length - 1) return true;
                    // Check if next header is different quarter
                    const currentLabel = header.label;
                    const nextLabel = calendarData.majorHeaders[headerIdx + 1]?.label || '';
                    return currentLabel !== nextLabel;
                  })();

                  return (
                    <th
                      key={`${periodIdx}-${headerIdx}`}
                      colSpan={header.colspan}
                      className="border border-gray-300 px-4 py-3 text-center font-bold text-sm text-gray-900 bg-gray-100"
                    >
                      {header.label}
                    </th>
                  );
                })
              )}
            </tr>
            {/* Row 2: Detailed Period Labels (Days/Weeks/Months/Quarters) */}
            <tr>
              {allCalendarData.map((calendarData, periodIdx) =>
                calendarData.periods.map((period, index) => {
                  const isToday = (viewMode === 'day' || viewMode === 'week') ? isSameDay(period, new Date()) : false;

                  return (
                    <th
                      key={`${periodIdx}-${index}`}
                      className={`border border-gray-300 px-4 py-2 text-center font-semibold text-xs w-48 ${
                        isToday ? 'bg-blue-100' : 'bg-gray-50'
                      }`}
                    >
                      {(viewMode === 'day' || viewMode === 'week') ? (
                        <>
                          <div className={`text-sm font-medium ${isToday ? 'text-blue-700' : 'text-gray-700'}`}>
                            {getPeriodLabel(period)}
                          </div>
                          <div className={`text-lg font-bold ${isToday ? 'text-blue-700' : 'text-gray-900'}`}>
                            {format(period, 'dd')}
                          </div>
                        </>
                      ) : (
                        <div className={`text-sm font-medium ${isToday ? 'text-blue-700' : 'text-gray-700'}`}>
                          {getPeriodLabel(period)}
                        </div>
                      )}
                    </th>
                  );
                })
              )}
            </tr>
          </thead>
          <tbody>
            {/* Get unique list of all people across all periods */}
            {(() => {
              const allPeopleSet = new Set<string>();
              allCalendarData.forEach(cd => {
                cd.peopleWithTasks.forEach(p => allPeopleSet.add(p.person.name));
              });
              const allPeople = Array.from(allPeopleSet).sort();

              return allPeople.length > 0 ? (
                allPeople.map(personName => {
                  // Get total tasks for this person from center period
                  const centerPersonData = currentCalendarData.peopleWithTasks.find(p => p.person.name === personName);
                  const totalTasks = centerPersonData?.totalTasks || 0;

                  return (
                    <tr key={personName} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-3 bg-white sticky left-0 z-20">
                        <div>
                          <div className="font-medium text-gray-900">{personName}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {totalTasks} total tasks
                          </div>
                        </div>
                      </td>
                      {allCalendarData.map((calendarData, periodIdx) => {
                        const personData = calendarData.peopleWithTasks.find(p => p.person.name === personName);

                        return personData ? personData.tasksByPeriod.map((periodData, cellIdx) => {
                          const isToday = viewMode === 'week' ? isSameDay(periodData.date, new Date()) : false;

                          // For quarter view, check if this is the last month in a quarter
                          const isLastMonthInQuarter = viewMode === 'quarter' && (periodData.date.getMonth() + 1) % 3 === 0;

                          // For month view, check if this is the last week before a new quarter
                          const isLastWeekBeforeQuarter = viewMode === 'month' && (() => {
                            const nextWeek = addDays(periodData.date, 7);
                            const currentQuarter = getQuarter(periodData.date);
                            const nextQuarter = getQuarter(nextWeek);
                            return currentQuarter !== nextQuarter;
                          })();

                          // For year view, check if this is Q4 (last quarter of year)
                          const isLastQuarterInYear = viewMode === 'year' && getQuarter(periodData.date) === 4;

                          return (
                            <td
                              key={`${periodIdx}-${cellIdx}`}
                              className={`border border-gray-300 px-2 py-2 align-top ${
                                isToday ? 'bg-blue-50' : 'bg-white'
                              }`}
                            >
                              <div className="space-y-1">
                                {periodData.tasks.map((task) => (
                                  <div
                                    key={task.id}
                                    className="text-xs rounded px-2 py-1 text-white cursor-pointer hover:shadow-md transition-shadow"
                                    style={{ backgroundColor: getStatusColor(task.status) }}
                                    title={`${task.name} - ${task.status} (${task.progress}%)`}
                                  >
                                    <div className="font-medium truncate">{task.name}</div>
                                    <div className="text-xs opacity-90">{task.progress}%</div>
                                  </div>
                                ))}
                                {periodData.tasks.length === 0 && (
                                  <div className="text-xs text-gray-400 text-center py-2">-</div>
                                )}
                              </div>
                            </td>
                          );
                        }) : (
                          // If person doesn't exist in this period, show empty cells
                          calendarData.periods.map((period, cellIdx) => {
                            const isLastMonthInQuarter = viewMode === 'quarter' && (period.getMonth() + 1) % 3 === 0;

                            const isLastWeekBeforeQuarter = viewMode === 'month' && (() => {
                              const nextWeek = addDays(period, 7);
                              const currentQuarter = getQuarter(period);
                              const nextQuarter = getQuarter(nextWeek);
                              return currentQuarter !== nextQuarter;
                            })();

                            const isLastQuarterInYear = viewMode === 'year' && getQuarter(period) === 4;

                            return (
                              <td
                                key={`${periodIdx}-${cellIdx}`}
                                className="border border-gray-300 px-2 py-2 align-top bg-white"
                              >
                                <div className="text-xs text-gray-400 text-center py-2">-</div>
                              </td>
                            );
                          })
                        );
                      })}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={allCalendarData.reduce((sum, cd) => sum + cd.periods.length, 1)} className="border border-gray-300 px-4 py-8 text-center text-gray-500">
                    No resources assigned yet
                  </td>
                </tr>
              );
            })()}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="border-t border-gray-300 p-4 bg-white">
        <div className="flex items-center gap-6 text-sm">
          <span className="font-semibold text-gray-700">Status Legend:</span>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: getStatusColor('not started') }}></div>
            <span className="text-gray-600">Not Started</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: getStatusColor('in progress') }}></div>
            <span className="text-gray-600">In Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: getStatusColor('complete') }}></div>
            <span className="text-gray-600">Complete</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: getStatusColor('on-hold') }}></div>
            <span className="text-gray-600">On Hold</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: getStatusColor('blocked') }}></div>
            <span className="text-gray-600">Blocked</span>
          </div>
        </div>
      </div>
    </div>
  );
};
