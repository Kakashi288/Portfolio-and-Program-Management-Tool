import React, { useMemo, useState } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';
import { addDays, startOfYear, endOfYear, getWeek, getDay, format, getYear, startOfDay, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, differenceInDays, differenceInMonths, differenceInQuarters, eachDayOfInterval, eachMonthOfInterval, eachQuarterOfInterval, getMonth, getQuarter, addMonths, addQuarters } from 'date-fns';
import { getAllTasks } from '../../utils/taskUtils';
import { getStatusColor } from '../../utils/taskUtils';
import { filterTasks } from '../../utils/filterUtils';
import { FilterBar } from '../common/FilterBar';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';
import { calculateCriticalPath } from '../../utils/criticalPathUtils';

// Sentinel date to indicate "no date set"
const SENTINEL_DATE = new Date(1900, 0, 1);

// Helper function to check if a date is the sentinel value
const isSentinelDate = (date: Date): boolean => {
  return date.getFullYear() === 1900 && date.getMonth() === 0 && date.getDate() === 1;
};

interface TaskPosition {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  endX: number;
  centerY: number;
}

export const GanttChart: React.FC = () => {
  const project = useProjectStore(state => state.project);
  const expandedTasks = useUIStore(state => state.ganttExpandedTasks);
  const toggleExpandedTask = useUIStore(state => state.toggleGanttExpandedTask);
  const expandAll = useUIStore(state => state.expandAllGantt);
  const collapseAll = useUIStore(state => state.collapseAllGantt);
  const filters = useUIStore(state => state.filters);
  const zoom = useUIStore(state => state.ganttConfig.zoom);
  const setZoom = useUIStore(state => state.setZoom);
  const viewMode = useUIStore(state => state.ganttConfig.viewMode);
  const setViewMode = useUIStore(state => state.setViewMode);
  const showCriticalPath = useUIStore(state => state.ganttConfig.showCriticalPath);
  const toggleShowCriticalPath = useUIStore(state => state.toggleShowCriticalPath);
  const [showViewModeDropdown, setShowViewModeDropdown] = useState(false);

  // Apply filters to project data
  const filteredProject = useMemo(() => {
    if (!project) return null;
    const filteredLineItems = filterTasks(project.lineItems, filters, project.teams, project.people);
    return { ...project, lineItems: filteredLineItems };
  }, [project, filters]);

  // Calculate critical path tasks
  const criticalPathTasks = useMemo(() => {
    if (!filteredProject || !showCriticalPath) return new Set<string>();
    return calculateCriticalPath(filteredProject.lineItems);
  }, [filteredProject, showCriticalPath]);

  /*
    DEPENDENCY ARROW CONFIGURATION
    All values here must remain synchronized for proper arrow rendering.
    If you modify the arrowhead size, update arrowAdjustment accordingly.
  */
  const ARROW_CONFIG = {
    // Arrowhead dimensions (must match marker definition in SVG)
    markerWidth: 6,
    markerHeight: 4,
    refX: 3,
    refY: 2,
    // Polygon points for the arrowhead triangle
    points: '0 0, 6 2, 0 4',
    // Path adjustment to align arrowhead tip with target boundary
    // Since markerUnits="strokeWidth", this equals refX * strokeWidth
    arrowAdjustment: 6, // 3 * 2 (strokeWidth)
    // Arrow styling
    color: '#3b82f6',
    strokeWidth: 2,
    opacity: 0.6,
  };

  const toggleExpand = (taskId: string) => {
    toggleExpandedTask(taskId);
  };

  const handleExpandAll = () => {
    if (!filteredProject) return;
    const allParentTaskIds: string[] = [];

    // Collect top-level tasks with subtasks
    filteredProject.lineItems.forEach(item => {
      if (item.subtasks.length > 0) {
        allParentTaskIds.push(item.id);

        // Also collect subtasks that have sub-subtasks (third level)
        item.subtasks.forEach(subtask => {
          if (subtask.subtasks && subtask.subtasks.length > 0) {
            allParentTaskIds.push(subtask.id);
          }
        });
      }
    });

    expandAll(allParentTaskIds);
  };

  const handleCollapseAll = () => {
    collapseAll();
  };

  const { totalUnits, tasks, taskPositions, timelineHeaders, projectYear, timelineUnits } = useMemo(() => {
    console.log('🔄 Recalculating task positions. Expanded tasks:', expandedTasks.length);

    if (!filteredProject || filteredProject.lineItems.length === 0) {
      return {
        totalUnits: 0,
        tasks: [],
        taskPositions: new Map<string, TaskPosition>(),
        timelineHeaders: [],
        projectYear: new Date().getFullYear(),
        timelineUnits: [] as Date[]
      };
    }

    const allTasks = getAllTasks(filteredProject.lineItems);

    // Filter out tasks with sentinel dates
    const tasksWithValidDates = allTasks.filter(t => !isSentinelDate(t.startDate) && !isSentinelDate(t.endDate));

    // If no tasks have valid dates, return empty timeline
    if (tasksWithValidDates.length === 0) {
      return {
        totalUnits: 0,
        tasks: [],
        taskPositions: new Map<string, TaskPosition>(),
        timelineHeaders: [],
        projectYear: new Date().getFullYear(),
        timelineUnits: [] as Date[]
      };
    }

    const dates = tasksWithValidDates.flatMap(t => [t.startDate, t.endDate]);
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

    // Extend timeline to show full years - add buffer before and after
    const timelineStart = startOfYear(minDate);
    // Extend at least 2 years beyond the latest task, or to end of next year, whichever is longer
    const extendedMaxDate = new Date(Math.max(
      endOfYear(addMonths(maxDate, 24)).getTime(), // 2 years buffer
      endOfYear(new Date(new Date().getFullYear() + 1, 11, 31)).getTime() // At least end of next year
    ));
    const timelineEnd = extendedMaxDate;

    // Determine timeline based on view mode
    let timelineUnits: Date[] = [];
    let timelineHeaders: Array<{ label: string; startIndex: number; unitsCount: number; startDate: Date; endDate: Date }> = [];

    if (viewMode === 'day') {
      // Show all business days - align to Monday to show complete weeks
      const yearStart = timelineStart;
      const yearEnd = timelineEnd;

      // Find the Monday before or at yearStart to show complete weeks
      let weekAlignedStart = new Date(yearStart);
      while (getDay(weekAlignedStart) !== 1) {
        weekAlignedStart = addDays(weekAlignedStart, -1);
      }

      // Find the Friday after or at yearEnd to show complete weeks
      let weekAlignedEnd = new Date(yearEnd);
      while (getDay(weekAlignedEnd) !== 5) {
        weekAlignedEnd = addDays(weekAlignedEnd, 1);
      }

      let currentDate = weekAlignedStart;
      while (currentDate <= weekAlignedEnd) {
        const dayOfWeek = getDay(currentDate);
        if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Mon-Fri only
          timelineUnits.push(new Date(currentDate));
        }
        currentDate = addDays(currentDate, 1);
      }

      // Group by weeks for headers
      let currentWeek = -1;
      let weekStartIndex = 0;
      let weekDayCount = 0;
      let weekStartDate: Date | null = null;
      let weekEndDate: Date | null = null;

      timelineUnits.forEach((date, index) => {
        const weekNum = getWeek(date);
        if (weekNum !== currentWeek) {
          if (currentWeek !== -1 && weekStartDate && weekEndDate) {
            timelineHeaders.push({
              label: `W${currentWeek}`,
              startIndex: weekStartIndex,
              unitsCount: weekDayCount,
              startDate: weekStartDate,
              endDate: weekEndDate
            });
          }
          currentWeek = weekNum;
          weekStartIndex = index;
          weekDayCount = 1;
          weekStartDate = date;
          weekEndDate = date;
        } else {
          weekDayCount++;
          weekEndDate = date;
        }
      });

      if (currentWeek !== -1 && weekStartDate && weekEndDate) {
        timelineHeaders.push({
          label: `W${currentWeek}`,
          startIndex: weekStartIndex,
          unitsCount: weekDayCount,
          startDate: weekStartDate,
          endDate: weekEndDate
        });
      }
    } else if (viewMode === 'week') {
      // Current implementation - show weeks with business days
      const yearStart = timelineStart;
      const yearEnd = timelineEnd;

      let weekStart = yearStart;
      while (getDay(weekStart) !== 1) {
        weekStart = addDays(weekStart, -1);
      }

      let currentDate = weekStart;
      while (currentDate <= yearEnd) {
        const dayOfWeek = getDay(currentDate);
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          timelineUnits.push(new Date(currentDate));
        }
        currentDate = addDays(currentDate, 1);
      }

      // Generate week headers
      let currentWeek = -1;
      let weekStartIndex = 0;
      let weekDayCount = 0;
      let weekStartDate: Date | null = null;
      let weekEndDate: Date | null = null;

      timelineUnits.forEach((date, index) => {
        const weekNum = getWeek(date);
        if (weekNum !== currentWeek) {
          if (currentWeek !== -1 && weekStartDate && weekEndDate) {
            timelineHeaders.push({
              label: `W${currentWeek}`,
              startIndex: weekStartIndex,
              unitsCount: weekDayCount,
              startDate: weekStartDate,
              endDate: weekEndDate
            });
          }
          currentWeek = weekNum;
          weekStartIndex = index;
          weekDayCount = 1;
          weekStartDate = date;
          weekEndDate = date;
        } else {
          weekDayCount++;
          weekEndDate = date;
        }
      });

      if (currentWeek !== -1 && weekStartDate && weekEndDate) {
        timelineHeaders.push({
          label: `W${currentWeek}`,
          startIndex: weekStartIndex,
          unitsCount: weekDayCount,
          startDate: weekStartDate,
          endDate: weekEndDate
        });
      }
    } else if (viewMode === 'month') {
      // Show weeks grouped by months
      // Generate all weeks (Monday-starting) in the timeline
      const yearStart = timelineStart;
      const yearEnd = timelineEnd;

      let currentWeekStart = yearStart;
      // Align to Monday
      while (getDay(currentWeekStart) !== 1) {
        currentWeekStart = addDays(currentWeekStart, -1);
      }

      // Generate all week start dates
      while (currentWeekStart <= yearEnd) {
        timelineUnits.push(new Date(currentWeekStart));
        currentWeekStart = addDays(currentWeekStart, 7); // Move to next Monday
      }

      // Group weeks by month for headers
      let currentMonth = -1;
      let currentYear = -1;
      let monthStartIndex = 0;
      let monthWeekCount = 0;
      let monthStartDate: Date | null = null;
      let monthEndDate: Date | null = null;

      timelineUnits.forEach((weekStart, index) => {
        const month = getMonth(weekStart);
        const year = getYear(weekStart);

        if (month !== currentMonth || year !== currentYear) {
          // Save previous month header
          if (currentMonth !== -1 && monthStartDate && monthEndDate) {
            timelineHeaders.push({
              label: format(monthStartDate, 'MMM yyyy'),
              startIndex: monthStartIndex,
              unitsCount: monthWeekCount,
              startDate: monthStartDate,
              endDate: monthEndDate
            });
          }

          // Start new month
          currentMonth = month;
          currentYear = year;
          monthStartIndex = index;
          monthWeekCount = 1;
          monthStartDate = weekStart;
          monthEndDate = weekStart;
        } else {
          monthWeekCount++;
          monthEndDate = weekStart;
        }
      });

      // Add last month header
      if (currentMonth !== -1 && monthStartDate && monthEndDate) {
        timelineHeaders.push({
          label: format(monthStartDate, 'MMM yyyy'),
          startIndex: monthStartIndex,
          unitsCount: monthWeekCount,
          startDate: monthStartDate,
          endDate: monthEndDate
        });
      }

      // Filter out December 2025
      const filteredHeaders: typeof timelineHeaders = [];
      const filteredUnits: Date[] = [];

      timelineHeaders.forEach(header => {
        const headerMonth = getMonth(header.startDate);
        const headerYear = getYear(header.startDate);

        // Skip December 2025
        if (headerMonth === 11 && headerYear === 2025) {
          return;
        }

        // Add this month's weeks to filtered units
        const weeksToAdd = timelineUnits.slice(header.startIndex, header.startIndex + header.unitsCount);
        const newStartIndex = filteredUnits.length;
        filteredUnits.push(...weeksToAdd);

        // Add header with adjusted index
        filteredHeaders.push({
          ...header,
          startIndex: newStartIndex
        });
      });

      timelineUnits = filteredUnits;
      timelineHeaders = filteredHeaders;
    } else if (viewMode === 'quarter') {
      // Show months grouped by quarters
      const yearStart = timelineStart;
      const yearEnd = timelineEnd;

      // Generate all months
      const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });
      timelineUnits = months;

      // Group months by quarter for headers
      let currentQuarter = -1;
      let currentYear = -1;
      let quarterStartIndex = 0;
      let quarterMonthCount = 0;
      let quarterStartDate: Date | null = null;
      let quarterEndDate: Date | null = null;

      months.forEach((month, index) => {
        const quarter = getQuarter(month);
        const year = getYear(month);

        if (quarter !== currentQuarter || year !== currentYear) {
          // Save previous quarter header
          if (currentQuarter !== -1 && quarterStartDate && quarterEndDate) {
            timelineHeaders.push({
              label: `Q${currentQuarter} ${currentYear}`,
              startIndex: quarterStartIndex,
              unitsCount: quarterMonthCount,
              startDate: quarterStartDate,
              endDate: quarterEndDate
            });
          }

          // Start new quarter
          currentQuarter = quarter;
          currentYear = year;
          quarterStartIndex = index;
          quarterMonthCount = 1;
          quarterStartDate = month;
          quarterEndDate = month;
        } else {
          quarterMonthCount++;
          quarterEndDate = month;
        }
      });

      // Add last quarter header
      if (currentQuarter !== -1 && quarterStartDate && quarterEndDate) {
        timelineHeaders.push({
          label: `Q${currentQuarter} ${currentYear}`,
          startIndex: quarterStartIndex,
          unitsCount: quarterMonthCount,
          startDate: quarterStartDate,
          endDate: quarterEndDate
        });
      }
    } else if (viewMode === 'year') {
      // Show quarters grouped by years
      const yearStart = timelineStart;
      const yearEnd = timelineEnd;

      // Generate all quarters
      const quarters = eachQuarterOfInterval({ start: yearStart, end: yearEnd });
      timelineUnits = quarters;

      // Group quarters by year for headers
      let currentYear = -1;
      let yearStartIndex = 0;
      let yearQuarterCount = 0;
      let yearStartDate: Date | null = null;
      let yearEndDate: Date | null = null;

      quarters.forEach((quarter, index) => {
        const year = getYear(quarter);

        if (year !== currentYear) {
          // Save previous year header
          if (currentYear !== -1 && yearStartDate && yearEndDate) {
            timelineHeaders.push({
              label: `${currentYear}`,
              startIndex: yearStartIndex,
              unitsCount: yearQuarterCount,
              startDate: yearStartDate,
              endDate: yearEndDate
            });
          }

          // Start new year
          currentYear = year;
          yearStartIndex = index;
          yearQuarterCount = 1;
          yearStartDate = quarter;
          yearEndDate = quarter;
        } else {
          yearQuarterCount++;
          yearEndDate = quarter;
        }
      });

      // Add last year header
      if (currentYear !== -1 && yearStartDate && yearEndDate) {
        timelineHeaders.push({
          label: `${currentYear}`,
          startIndex: yearStartIndex,
          unitsCount: yearQuarterCount,
          startDate: yearStartDate,
          endDate: yearEndDate
        });
      }
    }

    // Calculate task positions
    const pixelsPerUnit = viewMode === 'day' || viewMode === 'week' ? 40 * zoom :
                          viewMode === 'month' ? 80 * zoom :
                          viewMode === 'quarter' ? 120 * zoom :
                          160 * zoom; // year (quarters)
    const rowHeight = 50;
    const taskNameWidth = 256;
    const positions = new Map<string, TaskPosition>();
    let currentY = 80 + 1;

    filteredProject.lineItems.forEach((item, itemIndex) => {
      // Debug position calculation for specific tasks
      if (item.name === 'b' || item.name === 'h' || item.name.toLowerCase() === 'hello') {
        console.log(`📍 Calculating position for "${item.name}" at currentY: ${currentY}, isExpanded: ${expandedTasks.includes(item.id)}, hasSubtasks: ${item.subtasks.length}`);
      }

      // Skip tasks with sentinel dates
      if (isSentinelDate(item.startDate) || isSentinelDate(item.endDate)) {
        currentY += rowHeight;
        // Still process subtasks in case they have valid dates, but only if expanded
        if (expandedTasks.includes(item.id)) {
          item.subtasks.forEach((subtask) => {
          if (!isSentinelDate(subtask.startDate) && !isSentinelDate(subtask.endDate)) {
            let subStartIdx = 0;
            let subEndIdx = 0;

            if (viewMode === 'day' || viewMode === 'week') {
              subStartIdx = timelineUnits.findIndex(d => startOfDay(d).getTime() === startOfDay(subtask.startDate).getTime());
              subEndIdx = timelineUnits.findIndex(d => startOfDay(d).getTime() === startOfDay(subtask.endDate).getTime());
            } else if (viewMode === 'month') {
              subStartIdx = timelineUnits.findIndex(weekStart => {
                const weekEnd = addDays(weekStart, 6);
                return subtask.startDate >= weekStart && subtask.startDate <= weekEnd;
              });
              subEndIdx = timelineUnits.findIndex(weekStart => {
                const weekEnd = addDays(weekStart, 6);
                return subtask.endDate >= weekStart && subtask.endDate <= weekEnd;
              });
            } else if (viewMode === 'quarter') {
              subStartIdx = timelineUnits.findIndex(m => getMonth(m) === getMonth(subtask.startDate) && getYear(m) === getYear(subtask.startDate));
              subEndIdx = timelineUnits.findIndex(m => getMonth(m) === getMonth(subtask.endDate) && getYear(m) === getYear(subtask.endDate));
            } else if (viewMode === 'year') {
              subStartIdx = timelineUnits.findIndex(q => getQuarter(q) === getQuarter(subtask.startDate) && getYear(q) === getYear(subtask.startDate));
              subEndIdx = timelineUnits.findIndex(q => getQuarter(q) === getQuarter(subtask.endDate) && getYear(q) === getYear(subtask.endDate));
            }

            const subX = taskNameWidth + (subStartIdx >= 0 ? subStartIdx : 0) * pixelsPerUnit;
            const subWidth = ((subEndIdx >= 0 ? subEndIdx : subStartIdx) - (subStartIdx >= 0 ? subStartIdx : 0) + 1) * pixelsPerUnit;

            positions.set(subtask.id, {
              id: subtask.id,
              x: subX,
              y: currentY,
              width: Math.max(subWidth, 40),
              height: rowHeight - 10,
              endX: subX + Math.max(subWidth, 40),
              centerY: currentY + (rowHeight - 10) / 2,
            });
          }
          currentY += rowHeight - 10;
        });
        } // End of expandedTasks check for sentinel date case
        return; // Skip this task
      }

      let startIndex = 0;
      let endIndex = 0;

      if (viewMode === 'day' || viewMode === 'week') {
        startIndex = timelineUnits.findIndex(d => startOfDay(d).getTime() === startOfDay(item.startDate).getTime());
        endIndex = timelineUnits.findIndex(d => startOfDay(d).getTime() === startOfDay(item.endDate).getTime());
      } else if (viewMode === 'month') {
        // Find the week that contains the start/end date
        startIndex = timelineUnits.findIndex(weekStart => {
          const weekEnd = addDays(weekStart, 6);
          return item.startDate >= weekStart && item.startDate <= weekEnd;
        });
        endIndex = timelineUnits.findIndex(weekStart => {
          const weekEnd = addDays(weekStart, 6);
          return item.endDate >= weekStart && item.endDate <= weekEnd;
        });
      } else if (viewMode === 'quarter') {
        // Find the month that contains the start/end date
        startIndex = timelineUnits.findIndex(m => getMonth(m) === getMonth(item.startDate) && getYear(m) === getYear(item.startDate));
        endIndex = timelineUnits.findIndex(m => getMonth(m) === getMonth(item.endDate) && getYear(m) === getYear(item.endDate));
      } else if (viewMode === 'year') {
        // Find the quarter that contains the start/end date
        startIndex = timelineUnits.findIndex(q => getQuarter(q) === getQuarter(item.startDate) && getYear(q) === getYear(item.startDate));
        endIndex = timelineUnits.findIndex(q => getQuarter(q) === getQuarter(item.endDate) && getYear(q) === getYear(item.endDate));
      }

      const x = taskNameWidth + (startIndex >= 0 ? startIndex : 0) * pixelsPerUnit;
      const width = ((endIndex >= 0 ? endIndex : startIndex) - (startIndex >= 0 ? startIndex : 0) + 1) * pixelsPerUnit;

      positions.set(item.id, {
        id: item.id,
        x,
        y: currentY,
        width: Math.max(width, 60),
        height: rowHeight,
        endX: x + Math.max(width, 60),
        centerY: currentY + rowHeight / 2,
      });
      currentY += rowHeight;

      // Only process subtasks if this item is expanded
      if (expandedTasks.includes(item.id)) {
        // Debug before processing subtasks
        if (item.name === 'b') {
          console.log(`  🔽 Task "b" is expanded, processing ${item.subtasks.length} subtasks. currentY before subtasks: ${currentY}`);
        }

        item.subtasks.forEach((subtask, subtaskIndex) => {
        // Debug position calculation for specific subtasks
        if (subtask.name.toLowerCase() === 'hello' || subtask.name === 'Hey') {
          console.log(`📍 Calculating position for subtask "${subtask.name}" (parent: "${item.name}") at currentY: ${currentY}`);
        }

        // Skip subtasks with sentinel dates
        if (isSentinelDate(subtask.startDate) || isSentinelDate(subtask.endDate)) {
          currentY += rowHeight - 10;
          // Still process child subtasks if they have valid dates and subtask is expanded
          if (subtask.subtasks && subtask.subtasks.length > 0 && expandedTasks.includes(subtask.id)) {
            subtask.subtasks.forEach((childSubtask) => {
              if (!isSentinelDate(childSubtask.startDate) && !isSentinelDate(childSubtask.endDate)) {
                let childStartIdx = 0;
                let childEndIdx = 0;

                if (viewMode === 'day' || viewMode === 'week') {
                  childStartIdx = timelineUnits.findIndex(d => startOfDay(d).getTime() === startOfDay(childSubtask.startDate).getTime());
                  childEndIdx = timelineUnits.findIndex(d => startOfDay(d).getTime() === startOfDay(childSubtask.endDate).getTime());
                } else if (viewMode === 'month') {
                  childStartIdx = timelineUnits.findIndex(weekStart => {
                    const weekEnd = addDays(weekStart, 6);
                    return childSubtask.startDate >= weekStart && childSubtask.startDate <= weekEnd;
                  });
                  childEndIdx = timelineUnits.findIndex(weekStart => {
                    const weekEnd = addDays(weekStart, 6);
                    return childSubtask.endDate >= weekStart && childSubtask.endDate <= weekEnd;
                  });
                } else if (viewMode === 'quarter') {
                  childStartIdx = timelineUnits.findIndex(m => getMonth(m) === getMonth(childSubtask.startDate) && getYear(m) === getYear(childSubtask.startDate));
                  childEndIdx = timelineUnits.findIndex(m => getMonth(m) === getMonth(childSubtask.endDate) && getYear(m) === getYear(childSubtask.endDate));
                } else if (viewMode === 'year') {
                  childStartIdx = timelineUnits.findIndex(q => getQuarter(q) === getQuarter(childSubtask.startDate) && getYear(q) === getYear(childSubtask.startDate));
                  childEndIdx = timelineUnits.findIndex(q => getQuarter(q) === getQuarter(childSubtask.endDate) && getYear(q) === getYear(childSubtask.endDate));
                }

                const childX = taskNameWidth + (childStartIdx >= 0 ? childStartIdx : 0) * pixelsPerUnit;
                const childWidth = ((childEndIdx >= 0 ? childEndIdx : childStartIdx) - (childStartIdx >= 0 ? childStartIdx : 0) + 1) * pixelsPerUnit;

                positions.set(childSubtask.id, {
                  id: childSubtask.id,
                  x: childX,
                  y: currentY,
                  width: Math.max(childWidth, 40),
                  height: rowHeight - 15,
                  endX: childX + Math.max(childWidth, 40),
                  centerY: currentY + (rowHeight - 15) / 2,
                });
              }
              currentY += rowHeight - 15;
            });
          }
          return;
        }

        let subStartIdx = 0;
        let subEndIdx = 0;

        if (viewMode === 'day' || viewMode === 'week') {
          subStartIdx = timelineUnits.findIndex(d => startOfDay(d).getTime() === startOfDay(subtask.startDate).getTime());
          subEndIdx = timelineUnits.findIndex(d => startOfDay(d).getTime() === startOfDay(subtask.endDate).getTime());
        } else if (viewMode === 'month') {
          // Find the week that contains the start/end date
          subStartIdx = timelineUnits.findIndex(weekStart => {
            const weekEnd = addDays(weekStart, 6);
            return subtask.startDate >= weekStart && subtask.startDate <= weekEnd;
          });
          subEndIdx = timelineUnits.findIndex(weekStart => {
            const weekEnd = addDays(weekStart, 6);
            return subtask.endDate >= weekStart && subtask.endDate <= weekEnd;
          });
        } else if (viewMode === 'quarter') {
          // Find the month that contains the start/end date
          subStartIdx = timelineUnits.findIndex(m => getMonth(m) === getMonth(subtask.startDate) && getYear(m) === getYear(subtask.startDate));
          subEndIdx = timelineUnits.findIndex(m => getMonth(m) === getMonth(subtask.endDate) && getYear(m) === getYear(subtask.endDate));
        } else if (viewMode === 'year') {
          // Find the quarter that contains the start/end date
          subStartIdx = timelineUnits.findIndex(q => getQuarter(q) === getQuarter(subtask.startDate) && getYear(q) === getYear(subtask.startDate));
          subEndIdx = timelineUnits.findIndex(q => getQuarter(q) === getQuarter(subtask.endDate) && getYear(q) === getYear(subtask.endDate));
        }

        const subX = taskNameWidth + (subStartIdx >= 0 ? subStartIdx : 0) * pixelsPerUnit;
        const subWidth = ((subEndIdx >= 0 ? subEndIdx : subStartIdx) - (subStartIdx >= 0 ? subStartIdx : 0) + 1) * pixelsPerUnit;

        positions.set(subtask.id, {
          id: subtask.id,
          x: subX,
          y: currentY,
          width: Math.max(subWidth, 40),
          height: rowHeight - 10,
          endX: subX + Math.max(subWidth, 40),
          centerY: currentY + (rowHeight - 10) / 2,
        });

        // Debug stored position for specific subtasks
        if (subtask.name.toLowerCase() === 'hello' || subtask.name === 'Hey') {
          console.log(`✅ Stored position for "${subtask.name}": y=${currentY}, centerY=${currentY + (rowHeight - 10) / 2}`);
        }

        currentY += rowHeight - 10;

        // Process child subtasks (third level) only if subtask is expanded
        if (subtask.subtasks && subtask.subtasks.length > 0 && expandedTasks.includes(subtask.id)) {
          subtask.subtasks.forEach((childSubtask) => {
            // Skip child subtasks with sentinel dates
            if (isSentinelDate(childSubtask.startDate) || isSentinelDate(childSubtask.endDate)) {
              currentY += rowHeight - 15;
              return;
            }

            let childStartIdx = 0;
            let childEndIdx = 0;

            if (viewMode === 'day' || viewMode === 'week') {
              childStartIdx = timelineUnits.findIndex(d => startOfDay(d).getTime() === startOfDay(childSubtask.startDate).getTime());
              childEndIdx = timelineUnits.findIndex(d => startOfDay(d).getTime() === startOfDay(childSubtask.endDate).getTime());
            } else if (viewMode === 'month') {
              childStartIdx = timelineUnits.findIndex(weekStart => {
                const weekEnd = addDays(weekStart, 6);
                return childSubtask.startDate >= weekStart && childSubtask.startDate <= weekEnd;
              });
              childEndIdx = timelineUnits.findIndex(weekStart => {
                const weekEnd = addDays(weekStart, 6);
                return childSubtask.endDate >= weekStart && childSubtask.endDate <= weekEnd;
              });
            } else if (viewMode === 'quarter') {
              childStartIdx = timelineUnits.findIndex(m => getMonth(m) === getMonth(childSubtask.startDate) && getYear(m) === getYear(childSubtask.startDate));
              childEndIdx = timelineUnits.findIndex(m => getMonth(m) === getMonth(childSubtask.endDate) && getYear(m) === getYear(childSubtask.endDate));
            } else if (viewMode === 'year') {
              childStartIdx = timelineUnits.findIndex(q => getQuarter(q) === getQuarter(childSubtask.startDate) && getYear(q) === getYear(childSubtask.startDate));
              childEndIdx = timelineUnits.findIndex(q => getQuarter(q) === getQuarter(childSubtask.endDate) && getYear(q) === getYear(childSubtask.endDate));
            }

            const childX = taskNameWidth + (childStartIdx >= 0 ? childStartIdx : 0) * pixelsPerUnit;
            const childWidth = ((childEndIdx >= 0 ? childEndIdx : childStartIdx) - (childStartIdx >= 0 ? childStartIdx : 0) + 1) * pixelsPerUnit;

            positions.set(childSubtask.id, {
              id: childSubtask.id,
              x: childX,
              y: currentY,
              width: Math.max(childWidth, 40),
              height: rowHeight - 15,
              endX: childX + Math.max(childWidth, 40),
              centerY: currentY + (rowHeight - 15) / 2,
            });
            currentY += rowHeight - 15;
          });
        }
      });

      // Debug after processing subtasks
      if (item.name === 'b') {
        console.log(`  🔼 Task "b" subtasks processed. currentY after subtasks: ${currentY}`);
      }
      } // End of expandedTasks check
      else {
        // Debug when collapsed
        if (item.name === 'b' && item.subtasks.length > 0) {
          console.log(`  ⏸️ Task "b" is collapsed, skipping ${item.subtasks.length} subtasks`);
        }
      }
    });

    return {
      totalUnits: timelineUnits.length,
      tasks: allTasks,
      taskPositions: positions,
      timelineHeaders: timelineHeaders,
      projectYear: getYear(minDate),
      timelineUnits
    };
  }, [filteredProject, zoom, viewMode, expandedTasks]);

  if (!project || tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center">
          <svg className="w-24 h-24 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900">No tasks to display</h3>
          <p className="text-gray-500">Add tasks to see them in the Gantt chart</p>
        </div>
      </div>
    );
  }

  // Calculate pixels per unit dynamically based on view mode
  const pixelsPerUnit = viewMode === 'day' || viewMode === 'week' ? 40 * zoom :
                        viewMode === 'month' ? 80 * zoom :
                        viewMode === 'quarter' ? 120 * zoom :
                        160 * zoom; // year (quarters)
  const rowHeight = 50;
  // Map day numbers to labels: getDay() returns 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  const dayLabels: { [key: number]: string } = {
    1: 'M', // Monday
    2: 'T', // Tuesday
    3: 'W', // Wednesday
    4: 'T', // Thursday
    5: 'F', // Friday
  };

  // Calculate today line position
  const todayLinePosition = useMemo(() => {
    if (viewMode !== 'day' && viewMode !== 'week') return null; // Only show for day/week views

    const today = new Date();
    const todayDayIndex = timelineUnits.findIndex(d =>
      startOfDay(d).getTime() === startOfDay(today).getTime()
    );

    if (todayDayIndex === -1) return null;

    const taskNameWidth = 256;
    return taskNameWidth + (todayDayIndex * pixelsPerUnit) + (pixelsPerUnit / 2);
  }, [timelineUnits, pixelsPerUnit, viewMode]);

  // Generate dependency lines
  const dependencyLines = useMemo(() => {
    const helloPos = taskPositions.get('7823f08e-835b-449d-a8aa-36e795c37997');
    const heyPos = taskPositions.get('c0033115-64bd-4fca-bd1b-0d0bc5d0546b');
    console.log('📊 Dependency calc - Hello pos:', helloPos?.y, 'Hey pos:', heyPos?.y, 'taskPositions size:', taskPositions.size);

    if (!filteredProject) return [];

    const lines: Array<{ path: string; key: string }> = [];
    const allTasksFlat = getAllTasks(filteredProject.lineItems);

    // Debug: Find hello and Hey tasks
    console.log('=== SEARCHING FOR HELLO AND HEY TASKS ===');
    allTasksFlat.forEach((t, index) => {
      console.log(`${index}: "${t.name}" (ID: ${t.id.substring(0, 8)})`);
    });

    const helloTask = allTasksFlat.find(t => t.name.toLowerCase().includes('hello'));
    const heyTask = allTasksFlat.find(t => t.name === 'Hey');

    if (helloTask) {
      console.log('FOUND hello-like task:', {
        id: helloTask.id,
        name: helloTask.name,
        hasPosition: taskPositions.has(helloTask.id),
        position: taskPositions.get(helloTask.id)
      });
    } else {
      console.log('NO task with "hello" in name found');
    }

    if (heyTask) {
      console.log('FOUND Hey task:', {
        id: heyTask.id,
        name: heyTask.name,
        hasPosition: taskPositions.has(heyTask.id),
        hasDependencies: heyTask.dependencies && heyTask.dependencies.length > 0,
        dependencies: heyTask.dependencies,
        position: taskPositions.get(heyTask.id)
      });
    } else {
      console.log('Hey task NOT FOUND in allTasksFlat');
    }

    // Helper function to find a task at any level and check if it has subtasks
    const findTaskAndCheckSubtasks = (taskId: string): boolean => {
      for (const item of filteredProject.lineItems) {
        if (item.id === taskId) {
          return item.subtasks && item.subtasks.length > 0;
        }
        // Check in subtasks
        for (const subtask of item.subtasks) {
          if (subtask.id === taskId) {
            return subtask.subtasks && subtask.subtasks.length > 0;
          }
          // Check in child subtasks
          if (subtask.subtasks) {
            for (const childSubtask of subtask.subtasks) {
              if (childSubtask.id === taskId) {
                return false; // Child subtasks don't have further subtasks
              }
            }
          }
        }
      }
      return false;
    };

    allTasksFlat.forEach((task) => {
      // Check if task has dependencies defined
      if (task.dependencies && task.dependencies.length > 0) {
        // Skip if this task doesn't have a position (parent is collapsed)
        const dependentPos = taskPositions.get(task.id);
        if (!dependentPos) return;

        // Draw a line from each predecessor to this task
        task.dependencies.forEach((dep, index) => {
          const predecessorPos = taskPositions.get(dep.taskId);

          // Skip if predecessor doesn't have a position (is collapsed/hidden)
          if (!predecessorPos) return;

          // Find predecessor task to get its name
          const predecessorTask = allTasksFlat.find(t => t.id === dep.taskId);

          // Debug logging for "Hello" -> "Hey" dependency (case-insensitive)
          if (predecessorTask?.name.toLowerCase() === 'hello' && task.name === 'Hey') {
            console.log('=== HELLO -> HEY Dependency ===');
            console.log('Predecessor (Hello):', {
              x: predecessorPos.x,
              y: predecessorPos.y,
              width: predecessorPos.width,
              height: predecessorPos.height,
              endX: predecessorPos.endX,
              centerY: predecessorPos.centerY
            });
            console.log('Dependent (Hey):', {
              x: dependentPos.x,
              y: dependentPos.y,
              width: dependentPos.width,
              height: dependentPos.height,
              endX: dependentPos.endX,
              centerY: dependentPos.centerY
            });
          }

          // Start: Right edge of predecessor task, at vertical center
          const startX = predecessorPos.endX;
          const startY = predecessorPos.centerY;

          // Go right by 20px, then drop vertically to top edge of dependent task
          const horizontalExtension = 20;
          const midX = startX + horizontalExtension;

          // Calculate the exact top edge of the timeblock
          const storedHeight = dependentPos.height;
          const centerY = dependentPos.centerY;
          let timeblockHeight;

          // Determine actual timeblock height based on task type
          if (storedHeight === 50) {
            // Parent task - check if it has subtasks
            const hasSubtasks = findTaskAndCheckSubtasks(task.id);
            timeblockHeight = hasSubtasks ? 24 : 32;
          } else if (storedHeight === 40) {
            // Subtask - check if it has child subtasks
            const hasSubtasks = findTaskAndCheckSubtasks(task.id);
            timeblockHeight = hasSubtasks ? 24 : 24; // Subtasks are always 24px
          } else if (storedHeight === 35) {
            timeblockHeight = 20; // Child subtask
          } else {
            timeblockHeight = 32; // default
          }

          // Calculate top edge: centerY - half of timeblock height
          const endY = centerY - (timeblockHeight / 2);

          // Debug logging for Hello→Hey line calculation
          if (predecessorTask?.name.toLowerCase() === 'hello' && task.name === 'Hey') {
            console.log('Line calculation:', {
              storedHeight,
              timeblockHeight,
              startX,
              startY,
              midX,
              'dependentPos.centerY': centerY,
              calculatedEndY: endY,
              path: `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY}`
            });
          }

          // Draw path: right edge → extend right → drop straight down to top boundary
          const path = `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY}`;

          // Include position data in key to force re-render when positions change
          lines.push({
            key: `${dep.taskId}-${task.id}-${index}-${startY}-${endY}`,
            path,
          });
        });
      }
    });

    console.log(`📊 Generated ${lines.length} dependency lines`);
    return lines;
  }, [filteredProject, taskPositions, expandedTasks, taskPositions.size]);

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="border-b border-gray-300 p-3 bg-white space-y-3">
        {/* Export Buttons Row */}
        <div className="flex items-center justify-end gap-2 pr-3">
          {project && (
            <>
              <button
                onClick={() => exportToExcel(project)}
                className="p-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                title="Export Excel"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>
              <button
                onClick={() => exportToPDF(project)}
                className="p-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                title="Export PDF"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* Filter Bar and Controls Row */}
        <div className="flex items-center gap-2">
          <FilterBar />

          {/* Expand/Collapse Controls */}
          <button
            type="button"
            onClick={handleExpandAll}
            className="flex items-center gap-1 px-2 py-1.5 text-sm border border-gray-300 rounded cursor-pointer hover:bg-gray-50"
            title="Expand all tasks with subtasks"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            <span>Expand All</span>
          </button>
          <button
            type="button"
            onClick={handleCollapseAll}
            className="flex items-center gap-1 px-2 py-1.5 text-sm border border-gray-300 rounded cursor-pointer hover:bg-gray-50"
            title="Collapse all tasks"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
            <span>Collapse All</span>
          </button>

          {/* Critical Path Toggle */}
          <label className="flex items-center gap-1 px-2 py-1.5 text-sm border border-gray-300 rounded cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={showCriticalPath}
              onChange={toggleShowCriticalPath}
              className="rounded"
            />
            <span>Critical Path</span>
          </label>
        </div>
      </div>

      {/* Floating View Mode Dropdown - Fixed Position */}
      <div className="fixed right-24 bottom-6 z-30 bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-2 shadow-lg border border-gray-300">
        <div className="relative">
          <button
            onClick={() => setShowViewModeDropdown(!showViewModeDropdown)}
            className="w-full p-2 border border-gray-300 rounded hover:bg-gray-50 transition-all flex items-center justify-between gap-2"
            title="Change Time Scale"
          >
            <span className="text-xs font-medium capitalize">{viewMode}</span>
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
              <div className="absolute bottom-full right-0 mb-1 bg-white border border-gray-300 rounded-lg shadow-xl z-50 min-w-[140px] overflow-hidden">
                {(['day', 'week', 'month', 'quarter', 'year'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => {
                      setViewMode(mode);
                      setShowViewModeDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-blue-50 transition-colors capitalize ${
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
      </div>

      {/* Floating Zoom Controls - Fixed Position */}
      <div className="fixed right-6 bottom-6 z-30 flex flex-col gap-2 bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-2 shadow-lg border border-gray-300">
        <button
          onClick={() => setZoom(Math.min(2, zoom + 0.25))}
          disabled={zoom >= 2}
          className="p-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          title="Zoom In"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
          </svg>
        </button>
        <div className="text-center text-xs font-semibold text-gray-700 py-1">
          {Math.round(zoom * 100)}%
        </div>
        <button
          onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
          disabled={zoom <= 0.5}
          className="p-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          title="Zoom Out"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-auto">
      <div className="min-w-max">
        <div className="bg-white border border-gray-200 overflow-visible relative">
          {/* SVG overlay for dependency lines */}
          <svg
            key={`svg-overlay-${taskPositions.size}-${expandedTasks.length}`}
            className="absolute top-0 left-0 pointer-events-none overflow-visible"
            style={{
              zIndex: 10,
              width: '100%',
              height: '100%',
            }}
          >
            <defs>
              {/*
                ARROWHEAD CONFIGURATION - DO NOT MODIFY WITHOUT UPDATING ARROW_CONFIG
                - Size: {ARROW_CONFIG.markerWidth}x{ARROW_CONFIG.markerHeight} units (width x height)
                - Polygon: points="{ARROW_CONFIG.points}" creates a right-pointing triangle
                - refX="{ARROW_CONFIG.refX}": Centers the arrowhead horizontally (tip is at x={ARROW_CONFIG.markerWidth})
                - refY="{ARROW_CONFIG.refY}": Centers the arrowhead vertically
                - The arrowhead tip extends {ARROW_CONFIG.arrowAdjustment}px beyond the path endpoint
                - Path must end at (target_x - {ARROW_CONFIG.arrowAdjustment}) to align tip exactly at target_x
              */}
              <marker
                id="arrowhead"
                markerWidth={ARROW_CONFIG.markerWidth}
                markerHeight={ARROW_CONFIG.markerHeight}
                refX={ARROW_CONFIG.refX}
                refY={ARROW_CONFIG.refY}
                orient="auto"
                markerUnits="strokeWidth"
              >
                <polygon
                  points={ARROW_CONFIG.points}
                  fill={ARROW_CONFIG.color}
                />
              </marker>
            </defs>
            {/* Dependency lines */}
            {dependencyLines.map((line) => {
              // Debug logging for Hello->Hey line
              if (line.key.includes('7823f08e') && line.key.includes('c0033115')) {
                console.log('🎨 Rendering Hello->Hey path:', line.path, 'key:', line.key);
              }

              return (
                <path
                  key={line.key}
                  d={line.path}
                  stroke={ARROW_CONFIG.color}
                  strokeWidth={ARROW_CONFIG.strokeWidth}
                  fill="none"
                  markerEnd="url(#arrowhead)"
                  opacity={ARROW_CONFIG.opacity}
                />
              );
            })}

            {/* Today line */}
            {todayLinePosition !== null && (
              <>
                <line
                  x1={todayLinePosition}
                  y1={0}
                  x2={todayLinePosition}
                  y2="100%"
                  stroke="#ef4444"
                  strokeWidth={2}
                  strokeDasharray="5,5"
                  opacity={0.7}
                />
                <text
                  x={todayLinePosition}
                  y={15}
                  fill="#ef4444"
                  fontSize={12}
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  TODAY
                </text>
              </>
            )}
          </svg>

          {/* Header with week numbers and day labels */}
          <div className="sticky top-0 z-20 bg-white border-b border-gray-200">
            <div className="flex items-stretch">
              <div className="sticky left-0 z-30 w-64 border-r border-gray-200 bg-gray-50">
                <div className="h-10 flex items-center justify-center font-semibold text-gray-700 border-b border-gray-200">
                  <span className="mr-2">Task</span>
                  <span className="text-xs font-bold text-blue-700">({projectYear})</span>
                </div>
                <div className="h-10"></div>
              </div>

              {/* Timeline headers row */}
              <div className="flex-1">
                <div className="flex h-10 border-b border-gray-200 bg-gray-100">
                  {timelineHeaders.map((header, index) => {
                    // For week view, show date range and week number
                    const showDateRange = viewMode === 'day' || viewMode === 'week';
                    const dateRange = showDateRange ? `${format(header.startDate, 'MMM d')}-${format(header.endDate, 'd')}` : '';

                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between px-2 border-l border-gray-300 font-semibold text-xs text-gray-700 transition-all duration-500 ease-in-out"
                        style={{ width: header.unitsCount * pixelsPerUnit }}
                      >
                        {showDateRange && <span>{dateRange}</span>}
                        <span className={!showDateRange ? 'mx-auto' : ''}>{header.label}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Second row - conditional based on view mode */}
                {/* Day numbers row - for day view */}
                {viewMode === 'day' && (
                  <div className="flex h-10 bg-gray-50">
                    {timelineUnits.map((timelineUnit, unitIndex) => {
                      const dayOfMonth = timelineUnit.getDate();
                      return (
                        <div
                          key={unitIndex}
                          className="flex items-center justify-center border-l border-gray-200 text-xs font-medium text-gray-600 transition-all duration-500 ease-in-out"
                          style={{ width: pixelsPerUnit }}
                        >
                          {dayOfMonth}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Day labels row - only show for week view */}
                {viewMode === 'week' && (
                  <div className="flex h-10 bg-gray-50">
                    {timelineUnits.map((timelineUnit, unitIndex) => {
                      const dayOfWeek = getDay(timelineUnit);
                      const dayLabel = dayLabels[dayOfWeek];
                      return (
                        <div
                          key={unitIndex}
                          className="flex items-center justify-center border-l border-gray-200 text-xs font-medium text-gray-600 transition-all duration-500 ease-in-out"
                          style={{ width: pixelsPerUnit }}
                        >
                          {dayLabel}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Week start dates row - only show for month view */}
                {viewMode === 'month' && (
                  <div className="flex h-10 bg-gray-50">
                    {timelineUnits.map((weekStart, unitIndex) => {
                      const dayOfMonth = weekStart.getDate();
                      return (
                        <div
                          key={unitIndex}
                          className="flex items-center justify-center border-l border-gray-200 text-xs font-medium text-gray-600 transition-all duration-500 ease-in-out"
                          style={{ width: pixelsPerUnit }}
                        >
                          {dayOfMonth}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Month names row - only show for quarter view */}
                {viewMode === 'quarter' && (
                  <div className="flex h-10 bg-gray-50">
                    {timelineUnits.map((month, unitIndex) => {
                      const monthLabel = format(month, 'MMM');
                      return (
                        <div
                          key={unitIndex}
                          className="flex items-center justify-center border-l border-gray-200 text-xs font-medium text-gray-600 transition-all duration-500 ease-in-out"
                          style={{ width: pixelsPerUnit }}
                        >
                          {monthLabel}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Quarter labels row - only show for year view */}
                {viewMode === 'year' && (
                  <div className="flex h-10 bg-gray-50">
                    {timelineUnits.map((quarter, unitIndex) => {
                      const quarterNum = getQuarter(quarter);
                      return (
                        <div
                          key={unitIndex}
                          className="flex items-center justify-center border-l border-gray-200 text-xs font-medium text-gray-600 transition-all duration-500 ease-in-out"
                          style={{ width: pixelsPerUnit }}
                        >
                          Q{quarterNum}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Task rows */}
          <div>
            {filteredProject && filteredProject.lineItems.map((item) => (
              <div key={item.id}>
                <div className="flex items-center border-b border-gray-100">
                  <div className="sticky left-0 z-10 w-64 px-4 py-3 font-medium text-gray-900 truncate border-r border-gray-200 bg-white flex items-center gap-2">
                    {item.subtasks.length > 0 && (
                      <button
                        onClick={() => toggleExpand(item.id)}
                        className="flex-shrink-0 w-5 h-5 flex items-center justify-center hover:bg-gray-200 rounded transition-colors"
                        title={expandedTasks.includes(item.id) ? "Collapse subtasks" : "Expand subtasks"}
                      >
                        <svg
                          className={`w-3 h-3 transition-transform ${expandedTasks.includes(item.id) ? 'rotate-90' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    )}
                    <span className="truncate">{item.name}</span>
                  </div>
                  <div className="flex-1 relative" style={{ height: rowHeight }}>
                    <div className="absolute inset-0 flex">
                      {Array.from({ length: totalUnits }).map((_, unitIndex) => (
                        <div
                          key={unitIndex}
                          className="border-l border-gray-100 transition-all duration-500 ease-in-out"
                          style={{ width: pixelsPerUnit }}
                        />
                      ))}
                    </div>

                    {/* Show parent bar for tasks with subtasks, spanning all subtasks */}
                    {item.subtasks.length > 0 && (() => {
                      // Calculate timeline unit indices for each subtask using the same logic as subtask rendering
                      const subtaskIndices = item.subtasks.map(subtask => {
                        // Skip subtasks with sentinel dates
                        if (isSentinelDate(subtask.startDate) || isSentinelDate(subtask.endDate)) {
                          return { subStartIdx: -1, subEndIdx: -1 };
                        }

                        let subStartIdx = 0;
                        let subEndIdx = 0;

                        if (viewMode === 'day' || viewMode === 'week') {
                          subStartIdx = timelineUnits.findIndex(d =>
                            startOfDay(d).getTime() === startOfDay(subtask.startDate).getTime()
                          );
                          subEndIdx = timelineUnits.findIndex(d =>
                            startOfDay(d).getTime() === startOfDay(subtask.endDate).getTime()
                          );
                        } else if (viewMode === 'month') {
                          // Find the week that contains the start/end date
                          subStartIdx = timelineUnits.findIndex(weekStart => {
                            const weekEnd = addDays(weekStart, 6);
                            return subtask.startDate >= weekStart && subtask.startDate <= weekEnd;
                          });
                          subEndIdx = timelineUnits.findIndex(weekStart => {
                            const weekEnd = addDays(weekStart, 6);
                            return subtask.endDate >= weekStart && subtask.endDate <= weekEnd;
                          });
                        } else if (viewMode === 'quarter') {
                          // Find the month that contains the start/end date
                          subStartIdx = timelineUnits.findIndex(m =>
                            getMonth(m) === getMonth(subtask.startDate) && getYear(m) === getYear(subtask.startDate)
                          );
                          subEndIdx = timelineUnits.findIndex(m =>
                            getMonth(m) === getMonth(subtask.endDate) && getYear(m) === getYear(subtask.endDate)
                          );
                        } else if (viewMode === 'year') {
                          // Find the quarter that contains the start/end date
                          subStartIdx = timelineUnits.findIndex(q =>
                            getQuarter(q) === getQuarter(subtask.startDate) && getYear(q) === getYear(subtask.startDate)
                          );
                          subEndIdx = timelineUnits.findIndex(q =>
                            getQuarter(q) === getQuarter(subtask.endDate) && getYear(q) === getYear(subtask.endDate)
                          );
                        }

                        return { subStartIdx, subEndIdx };
                      });

                      // Find the earliest start and latest end among all subtasks
                      const validIndices = subtaskIndices.filter(idx => idx.subStartIdx !== -1);
                      if (validIndices.length === 0) return null;

                      const startIdx = Math.min(...validIndices.map(idx => idx.subStartIdx));
                      const endIdx = Math.max(...validIndices.map(idx => idx.subEndIdx !== -1 ? idx.subEndIdx : idx.subStartIdx));

                      const left = startIdx * pixelsPerUnit;
                      const width = (endIdx - startIdx + 1) * pixelsPerUnit;

                      return (
                        <div
                          className="absolute top-1/2 -translate-y-1/2 rounded px-2 py-1 text-white text-xs font-bold shadow-md cursor-pointer hover:shadow-lg transition-all duration-500 ease-in-out"
                          style={{
                            left,
                            width: Math.max(width, 60),
                            backgroundColor: getStatusColor(item.status),
                            zIndex: 5,
                            height: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            border: criticalPathTasks.has(item.id) ? '3px solid #ef4444' : 'none',
                            boxShadow: criticalPathTasks.has(item.id) ? '0 0 10px rgba(239, 68, 68, 0.5)' : undefined,
                          }}
                          title={`Parent: ${item.name}${criticalPathTasks.has(item.id) ? ' (Critical Path)' : ''}`}
                        >
                          <span className="truncate">{item.name}</span>
                          <span className="text-xs opacity-90 ml-2 whitespace-nowrap">{item.progress}%</span>
                        </div>
                      );
                    })()}

                    {/* Show regular task bar only if NO subtasks */}
                    {item.subtasks.length === 0 && !item.isMilestone && taskPositions.get(item.id) && (
                      <div
                        className="absolute top-1/2 -translate-y-1/2 rounded shadow-sm cursor-pointer hover:shadow-md transition-all duration-500 ease-in-out overflow-hidden"
                        style={{
                          left: taskPositions.get(item.id)?.x ? taskPositions.get(item.id)!.x - 256 : 0,
                          width: taskPositions.get(item.id)?.width || 60,
                          backgroundColor: getStatusColor(item.status),
                          minWidth: 60,
                          zIndex: 5,
                          height: '32px',
                          border: criticalPathTasks.has(item.id) ? '3px solid #ef4444' : 'none',
                          boxShadow: criticalPathTasks.has(item.id) ? '0 0 10px rgba(239, 68, 68, 0.5)' : undefined,
                        }}
                        title={criticalPathTasks.has(item.id) ? `${item.name} (Critical Path)` : item.name}
                      >
                        {/* Progress overlay */}
                        <div
                          className="absolute inset-0 bg-black bg-opacity-20"
                          style={{
                            width: `${item.progress}%`,
                          }}
                        />
                        {/* Content */}
                        <div className="relative px-2 py-1 text-white text-sm font-medium h-full flex flex-col justify-center">
                          <div className="truncate">{item.name}</div>
                          <div className="text-xs opacity-90">{item.progress}%</div>
                        </div>
                      </div>
                    )}

                    {item.isMilestone && taskPositions.get(item.id) && (
                      <div
                        className="absolute top-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer transition-all duration-500 ease-in-out"
                        style={{
                          left: taskPositions.get(item.id)?.endX ? taskPositions.get(item.id)!.endX - 256 - 12 : 0,
                          zIndex: 6,
                          filter: criticalPathTasks.has(item.id) ? 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.8))' : undefined,
                        }}
                        title={`${item.name} (Milestone)${criticalPathTasks.has(item.id) ? ' - Critical Path' : ''}`}
                      >
                        <svg
                          className={`w-6 h-6 stroke-yellow-600 drop-shadow-md ${
                            criticalPathTasks.has(item.id) ? 'fill-red-400' : 'fill-yellow-400'
                          }`}
                          viewBox="0 0 24 24"
                          strokeWidth="2"
                        >
                          <path d="M12 2 L22 12 L12 22 L2 12 Z" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>

                {expandedTasks.includes(item.id) && item.subtasks.map((subtask) => (
                  <React.Fragment key={subtask.id}>
                    <div className="flex items-center border-b border-gray-100 bg-gray-50">
                      <div className="sticky left-0 z-10 w-64 px-4 py-2 text-sm text-gray-600 truncate border-r border-gray-200 bg-gray-50">
                        <div className="flex items-center pl-12 relative">
                          {/* Visual hierarchy lines */}
                          <div className="absolute left-6 top-0 bottom-0 w-px bg-gray-300"></div>
                          <div className="absolute left-6 top-1/2 w-4 h-px bg-gray-300"></div>
                          {subtask.subtasks && subtask.subtasks.length > 0 && (
                            <button
                              onClick={() => toggleExpand(subtask.id)}
                              className="flex-shrink-0 w-5 h-5 flex items-center justify-center hover:bg-gray-200 rounded transition-colors mr-1"
                              title={expandedTasks.includes(subtask.id) ? "Collapse subtasks" : "Expand subtasks"}
                            >
                              <svg
                                className={`w-3 h-3 transition-transform ${expandedTasks.includes(subtask.id) ? 'rotate-90' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          )}
                          <span className="truncate">{subtask.name}</span>
                        </div>
                      </div>
                      <div className="flex-1 relative" style={{ height: rowHeight - 10 }}>
                        <div className="absolute inset-0 flex">
                          {Array.from({ length: totalUnits }).map((_, unitIndex) => (
                            <div
                              key={unitIndex}
                              className="border-l border-gray-100 transition-all duration-500 ease-in-out"
                              style={{ width: pixelsPerUnit }}
                            />
                          ))}
                        </div>

                        {!subtask.isMilestone && taskPositions.get(subtask.id) && (
                          <div
                            className="absolute top-1/2 -translate-y-1/2 rounded shadow-sm overflow-hidden transition-all duration-500 ease-in-out"
                            style={{
                              left: taskPositions.get(subtask.id)?.x ? taskPositions.get(subtask.id)!.x - 256 : 0,
                              width: taskPositions.get(subtask.id)?.width || 40,
                              backgroundColor: getStatusColor(subtask.status),
                              minWidth: 40,
                              opacity: 0.9,
                              zIndex: 5,
                              height: '24px',
                              border: criticalPathTasks.has(subtask.id) ? '3px solid #ef4444' : 'none',
                              boxShadow: criticalPathTasks.has(subtask.id) ? '0 0 10px rgba(239, 68, 68, 0.5)' : undefined,
                            }}
                            title={criticalPathTasks.has(subtask.id) ? `${subtask.name} (Critical Path)` : subtask.name}
                          >
                            {/* Progress overlay */}
                            <div
                              className="absolute inset-0 bg-black bg-opacity-20"
                              style={{
                                width: `${subtask.progress}%`,
                              }}
                            />
                            {/* Content */}
                            <div className="relative px-2 py-1 text-white text-xs font-medium h-full flex items-center">
                              <div className="truncate">{subtask.progress}%</div>
                            </div>
                          </div>
                        )}

                        {subtask.isMilestone && taskPositions.get(subtask.id) && (
                          <div
                            className="absolute top-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer transition-all duration-500 ease-in-out"
                            style={{
                              left: taskPositions.get(subtask.id)?.endX ? taskPositions.get(subtask.id)!.endX - 256 - 10 : 0,
                              zIndex: 6,
                              filter: criticalPathTasks.has(subtask.id) ? 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.8))' : undefined,
                            }}
                            title={`${subtask.name} (Milestone)${criticalPathTasks.has(subtask.id) ? ' - Critical Path' : ''}`}
                          >
                            <svg
                              className={`w-5 h-5 stroke-yellow-600 drop-shadow-md ${
                                criticalPathTasks.has(subtask.id) ? 'fill-red-400' : 'fill-yellow-400'
                              }`}
                              viewBox="0 0 24 24"
                              strokeWidth="2"
                            >
                              <path d="M12 2 L22 12 L12 22 L2 12 Z" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Third level: Subtasks of Subtasks */}
                    {expandedTasks.includes(subtask.id) && subtask.subtasks && subtask.subtasks.map((childSubtask) => (
                      <div key={childSubtask.id} className="flex items-center border-b border-gray-100 bg-blue-50">
                        <div className="sticky left-0 z-10 w-64 px-4 py-2 text-sm text-gray-600 truncate border-r border-gray-200 bg-blue-50">
                          <div className="flex items-center pl-24 relative">
                            {/* Visual hierarchy lines */}
                            <div className="absolute top-0 bottom-0 w-px bg-gray-300" style={{ left: '1.5rem' }}></div>
                            <div className="absolute top-0 bottom-0 w-px bg-gray-300" style={{ left: '4.5rem' }}></div>
                            <div className="absolute top-1/2 w-4 h-px bg-gray-300" style={{ left: '4.5rem' }}></div>
                            <span className="truncate">{childSubtask.name}</span>
                          </div>
                        </div>
                        <div className="flex-1 relative" style={{ height: rowHeight - 15 }}>
                          <div className="absolute inset-0 flex">
                            {Array.from({ length: totalUnits }).map((_, unitIndex) => (
                              <div
                                key={unitIndex}
                                className="border-l border-gray-100 transition-all duration-500 ease-in-out"
                                style={{ width: pixelsPerUnit }}
                              />
                            ))}
                          </div>

                          {!childSubtask.isMilestone && taskPositions.get(childSubtask.id) && (
                            <div
                              className="absolute top-1/2 -translate-y-1/2 rounded shadow-sm overflow-hidden transition-all duration-500 ease-in-out"
                              style={{
                                left: taskPositions.get(childSubtask.id)?.x ? taskPositions.get(childSubtask.id)!.x - 256 : 0,
                                width: taskPositions.get(childSubtask.id)?.width || 40,
                                backgroundColor: getStatusColor(childSubtask.status),
                                minWidth: 40,
                                opacity: 0.85,
                                zIndex: 5,
                                height: '20px',
                                border: criticalPathTasks.has(childSubtask.id) ? '2px solid #ef4444' : 'none',
                                boxShadow: criticalPathTasks.has(childSubtask.id) ? '0 0 8px rgba(239, 68, 68, 0.5)' : undefined,
                              }}
                              title={criticalPathTasks.has(childSubtask.id) ? `${childSubtask.name} (Critical Path)` : childSubtask.name}
                            >
                              {/* Progress overlay */}
                              <div
                                className="absolute inset-0 bg-black bg-opacity-20"
                                style={{
                                  width: `${childSubtask.progress}%`,
                                }}
                              />
                              {/* Content */}
                              <div className="relative px-2 py-0.5 text-white text-xs font-medium h-full flex items-center">
                                <div className="truncate">{childSubtask.progress}%</div>
                              </div>
                            </div>
                          )}

                          {childSubtask.isMilestone && taskPositions.get(childSubtask.id) && (
                            <div
                              className="absolute top-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer transition-all duration-500 ease-in-out"
                              style={{
                                left: taskPositions.get(childSubtask.id)?.endX ? taskPositions.get(childSubtask.id)!.endX - 256 - 8 : 0,
                                zIndex: 6,
                                filter: criticalPathTasks.has(childSubtask.id) ? 'drop-shadow(0 0 6px rgba(239, 68, 68, 0.8))' : undefined,
                              }}
                              title={`${childSubtask.name} (Milestone)${criticalPathTasks.has(childSubtask.id) ? ' - Critical Path' : ''}`}
                            >
                              <svg
                                className={`w-4 h-4 stroke-yellow-600 drop-shadow-md ${
                                  criticalPathTasks.has(childSubtask.id) ? 'fill-red-400' : 'fill-yellow-400'
                                }`}
                                viewBox="0 0 24 24"
                                strokeWidth="2"
                              >
                                <path d="M12 2 L22 12 L12 22 L2 12 Z" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </React.Fragment>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};
