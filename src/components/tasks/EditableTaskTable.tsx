import React, { useState, useRef, useEffect } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { useTaskStore, findTaskInTree } from '../../store/taskStore';
import { useUIStore } from '../../store/uiStore';
import { TASK_STATUSES } from '../../constants';
import { formatDate } from '../../utils/dateUtils';
import { format } from 'date-fns';
import { FilterBar } from '../common/FilterBar';
import { DateInput } from '../common/DateInput';
import { filterTasks } from '../../utils/filterUtils';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';
import { autoScheduleTasks } from '../../utils/scheduleUtils';
import { importTasksFromCSV } from '../../utils/importUtils';

// Sentinel date to indicate "no date set"
const SENTINEL_DATE = new Date(1900, 0, 1);

// Helper function to check if a date is the sentinel value
const isSentinelDate = (date: Date): boolean => {
  return date.getFullYear() === 1900 && date.getMonth() === 0 && date.getDate() === 1;
};

export const EditableTaskTable: React.FC = () => {
  const project = useProjectStore(state => state.project);
  const { addLineItem, updateLineItem, deleteLineItem, addSubTask, updateSubTask, deleteSubTask, addTask, deleteTask, updateTask } = useTaskStore();
  const { setSelectedTask, openTaskForm, tableExpandedTasks: expandedTasks, toggleTableExpandedTask: toggleExpandedTask, expandAllTable: expandAll, collapseAllTable: collapseAll, filters } = useUIStore();
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [showBulkMenu, setShowBulkMenu] = useState(false);
  const bulkMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Apply filters to tasks
  const filteredLineItems = project ? filterTasks(project.lineItems, filters, project.teams, project.people) : [];

  // Close bulk menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bulkMenuRef.current && !bulkMenuRef.current.contains(event.target as Node)) {
        setShowBulkMenu(false);
      }
    };

    if (showBulkMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showBulkMenu]);

  // Helper function to get task number from task ID (now recursive)
  const getTaskNumber = (taskId: string): string => {
    if (!project) return '';

    const findInTree = (
      tasks: typeof project.lineItems,
      id: string,
      prefix: string = ''
    ): string | null => {
      if (!tasks) return null;

      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        const number = prefix ? `${prefix}.${i + 1}` : `${i + 1}`;

        if (task.id === id) return number;

        // Search subtasks recursively
        if (task.subtasks && task.subtasks.length > 0) {
          const found = findInTree(task.subtasks, id, number);
          if (found) return found;
        }
      }
      return null;
    };

    return findInTree(project.lineItems, taskId) || '';
  };

  // Helper function to get task ID from task number (now recursive)
  const getTaskIdFromNumber = (taskNumber: string): string | null => {
    if (!project) return null;

    const parts = taskNumber.trim().split('.').map(n => parseInt(n) - 1);

    let currentLevel = project.lineItems;
    let currentTask: typeof project.lineItems[0] | null = null;

    for (const index of parts) {
      if (!currentLevel || index < 0 || index >= currentLevel.length) return null;
      currentTask = currentLevel[index];
      currentLevel = currentTask.subtasks || [];
    }

    return currentTask?.id || null;
  };

  const toggleExpand = (taskId: string) => {
    toggleExpandedTask(taskId);
  };

  const toggleSelectTask = (taskId: string) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTasks(newSelected);
  };

  // Helper to count all tasks at all levels
  const countAllTasks = (tasks: any[]): number => {
    return tasks.reduce((count, task) => {
      let total = 1; // Count the task itself
      if (task.subtasks && task.subtasks.length > 0) {
        total += countAllTasks(task.subtasks); // Recursively count subtasks
      }
      return count + total;
    }, 0);
  };

  const toggleSelectAll = () => {
    if (!project) return;

    if (selectedTasks.size > 0) {
      setSelectedTasks(new Set());
    } else {
      const allTaskIds = new Set<string>();

      // Recursively collect all task IDs at all levels
      const collectTaskIds = (tasks: any[]) => {
        tasks.forEach(task => {
          allTaskIds.add(task.id);
          if (task.subtasks && task.subtasks.length > 0) {
            collectTaskIds(task.subtasks);
          }
        });
      };

      collectTaskIds(project.lineItems);
      setSelectedTasks(allTaskIds);
    }
  };

  const handleBulkDelete = () => {
    if (selectedTasks.size === 0) return;

    if (confirm(`Are you sure you want to delete ${selectedTasks.size} selected task(s)?`)) {
      selectedTasks.forEach(taskId => {
        // Use the unified recursive deleteTask method for all deletions
        deleteTask(taskId);
      });
      setSelectedTasks(new Set());
    }
  };

  const handleAddTask = () => {
    // Use a sentinel date (1900-01-01) that will display as blank
    // User must manually enter the actual dates
    const SENTINEL_DATE = new Date(1900, 0, 1);

    addLineItem({
      name: 'New Task',
      startDate: SENTINEL_DATE,
      duration: 1,
      teamId: '',
      driId: '',
      status: 'not started',
      dependencies: [],
    });
  };

  const handleAutoSchedule = () => {
    if (!project) return;

    if (confirm('Auto-schedule will recalculate all task dates based on dependencies. Continue?')) {
      const scheduledLineItems = autoScheduleTasks(project.lineItems);

      // Helper function to recursively update all tasks and subtasks
      const updateTasksRecursively = (tasks: typeof project.lineItems) => {
        tasks.forEach(task => {
          // Update the task itself
          updateTask(task.id, {
            startDate: task.startDate,
            endDate: task.endDate,
          });

          // Recursively update subtasks
          if (task.subtasks && task.subtasks.length > 0) {
            updateTasksRecursively(task.subtasks);
          }
        });
      };

      // Update all tasks recursively
      updateTasksRecursively(scheduledLineItems);
    }
  };

  const handleExpandAll = () => {
    if (!project) return;
    const allParentTaskIds: string[] = [];

    // Collect top-level tasks with subtasks
    project.lineItems.forEach(item => {
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

  const handleBulkStatusChange = (status: import('../../types').TaskStatus) => {
    if (selectedTasks.size === 0) return;

    selectedTasks.forEach(taskId => {
      // Use the unified recursive updateTask method
      updateTask(taskId, { status });
    });

    setShowBulkMenu(false);
  };

  const handleBulkTeamAssign = () => {
    if (selectedTasks.size === 0 || !project) return;

    const teamId = prompt('Enter Team ID to assign to selected tasks:');
    if (!teamId) return;

    selectedTasks.forEach(taskId => {
      // Use the unified recursive updateTask method
      updateTask(taskId, { teamId });
    });

    setShowBulkMenu(false);
  };

  const handleBulkDriAssign = () => {
    if (selectedTasks.size === 0 || !project) return;

    const driId = prompt('Enter DRI ID to assign to selected tasks:');
    if (!driId) return;

    selectedTasks.forEach(taskId => {
      // Use the unified recursive updateTask method
      updateTask(taskId, { driId });
    });

    setShowBulkMenu(false);
  };

  const handleBulkDateShift = () => {
    if (selectedTasks.size === 0 || !project) return;

    const daysStr = prompt('Enter number of days to shift (positive to delay, negative to advance):');
    if (!daysStr) return;

    const days = parseInt(daysStr);
    if (isNaN(days)) {
      alert('Please enter a valid number');
      return;
    }

    selectedTasks.forEach(taskId => {
      // Find the task recursively
      const found = findTaskInTree(project.lineItems, taskId);
      if (found) {
        const task = found.task;
        const newStartDate = new Date(task.startDate);
        newStartDate.setDate(newStartDate.getDate() + days);
        const newEndDate = new Date(task.endDate);
        newEndDate.setDate(newEndDate.getDate() + days);
        // Use the unified recursive updateTask method
        updateTask(taskId, { startDate: newStartDate, endDate: newEndDate });
      }
    });

    setShowBulkMenu(false);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      alert('Please select a CSV file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;

        // Create maps for existing teams and people
        const teamMap = new Map<string, string>();
        const peopleMap = new Map<string, string>();

        project?.teams.forEach(team => {
          teamMap.set(team.name, team.id);
        });

        project?.people.forEach(person => {
          peopleMap.set(person.name, person.id);
        });

        const importedTasks = importTasksFromCSV(content, teamMap, peopleMap);

        // Add all imported tasks
        importedTasks.forEach(task => {
          addLineItem({
            name: task.name,
            startDate: task.startDate,
            duration: task.duration,
            teamId: task.teamId,
            driId: task.driId,
            status: task.status,
            dependencies: task.dependencies,
            notes: task.notes,
            progress: task.progress,
            isMilestone: task.isMilestone,
          });

          // Add subtasks after parent is created
          // Note: This is simplified - in a real implementation, we'd need to handle this better
          // by getting the actual created parent ID
        });

        alert(`Successfully imported ${importedTasks.length} tasks!`);

        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (error) {
        console.error('Import error:', error);
        alert(`Error importing file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    reader.readAsText(file);
  };

  const handleAddSubTask = (parentId: string) => {
    // Use a sentinel date (1900-01-01) that will display as blank
    const SENTINEL_DATE = new Date(1900, 0, 1);

    addTask(parentId, {
      name: 'New Subtask',
      startDate: SENTINEL_DATE,
      duration: 1,
      teamId: '',
      driId: '',
      status: 'not started',
      dependencies: [],
    });

    // Ensure parent task is expanded after adding subtask
    if (!expandedTasks.includes(parentId)) {
      toggleExpandedTask(parentId);
    }
  };

  const handleCellEdit = (taskId: string, field: string, value: any, isSubtask: boolean, parentId?: string) => {
    // Use the unified recursive updateTask method for all updates
    updateTask(taskId, { [field]: value });
  };

  const handleDelete = (taskId: string, isSubtask: boolean, parentId?: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      // Use the unified recursive deleteTask method for all deletions
      deleteTask(taskId);
    }
  };

  const handleTaskClick = (taskId: string) => {
    setSelectedTask(taskId);
    openTaskForm();
  };

  const handleToggleMilestone = (taskId: string, currentValue: boolean, isSubtask: boolean, parentId?: string) => {
    // Use the unified recursive updateTask method
    updateTask(taskId, { isMilestone: !currentValue });
  };

  // Actions Menu Component
  const ActionsMenu: React.FC<{
    taskId: string;
    taskName: string;
    isSubtask: boolean;
    parentId?: string;
    depth?: number;
  }> = ({ taskId, taskName, isSubtask, parentId, depth = 0 }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
      }
    }, [isOpen]);

    // Can only add subtasks if depth < 2 (0=parent, 1=subtask, 2=child subtask)
    const canAddSubtask = depth < 2;

    return (
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1 hover:bg-gray-200 rounded transition-colors"
          title="Actions"
        >
          <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 16 16">
            <circle cx="8" cy="2" r="1.5" />
            <circle cx="8" cy="8" r="1.5" />
            <circle cx="8" cy="14" r="1.5" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute left-0 top-full mt-1 bg-white border border-gray-300 rounded shadow-lg z-50 min-w-[180px]">
            <button
              onClick={() => {
                handleTaskClick(taskId);
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              View Details
            </button>
            {canAddSubtask && (
              <button
                onClick={() => {
                  handleAddSubTask(taskId);
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm border-t border-gray-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Subtask
              </button>
            )}
            <button
              onClick={() => {
                handleDelete(taskId, isSubtask, parentId);
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2 text-sm border-t border-gray-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </div>
        )}
      </div>
    );
  };

  const EditableCell: React.FC<{
    value: any;
    taskId: string;
    field: string;
    type?: 'text' | 'number' | 'date' | 'select' | 'status';
    options?: { value: string; label: string }[];
    isSubtask?: boolean;
    parentId?: string;
  }> = ({ value, taskId, field, type = 'text', options, isSubtask = false, parentId }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(value);
    const inputRef = useRef<HTMLInputElement | HTMLSelectElement | HTMLDivElement>(null);

    useEffect(() => {
      if (isEditing && inputRef.current) {
        if (type !== 'status' && type !== 'date') {
          (inputRef.current as HTMLInputElement | HTMLSelectElement).focus?.();
        }
      }
    }, [isEditing, type]);

    // Close status dropdown on click outside
    useEffect(() => {
      if (isEditing && type === 'status') {
        const handleClickOutside = (event: MouseEvent) => {
          if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
            setIsEditing(false);
          }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
      }
    }, [isEditing, type]);

    const handleSave = () => {
      if (editValue !== value) {
        let processedValue = editValue;
        if (type === 'date' && typeof editValue === 'string') {
          processedValue = new Date(editValue);
        } else if (type === 'number') {
          processedValue = parseInt(editValue) || 1;
        }
        handleCellEdit(taskId, field, processedValue, isSubtask, parentId);
      }
      setIsEditing(false);
    };

    const handleDateChange = (date: Date | null) => {
      const newDate = date || SENTINEL_DATE;
      handleCellEdit(taskId, field, newDate, isSubtask, parentId);
      // Don't close here - let DateInput's onClose handle it
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSave();
      } else if (e.key === 'Escape') {
        setEditValue(value);
        setIsEditing(false);
      }
    };

    const displayValue = type === 'date'
      ? (value instanceof Date && !isSentinelDate(value) ? formatDate(value) : '')
      : value;

    if (isEditing) {
      if (type === 'date') {
        return (
          <div className="px-2 py-1">
            <DateInput
              value={value instanceof Date && !isSentinelDate(value) ? value : null}
              onChange={handleDateChange}
              onClose={() => setIsEditing(false)}
            />
          </div>
        );
      }

      if (type === 'status' && options) {
        // Custom status dropdown with colors - positioned absolutely
        return (
          <div className="relative w-full px-2 py-1">
            <div
              ref={inputRef as React.RefObject<HTMLDivElement>}
              className="absolute top-full left-0 z-50 mt-1 flex flex-col gap-1 p-1 bg-white border-2 border-blue-500 rounded-lg shadow-xl min-w-[200px] max-h-[200px] overflow-y-auto"
            >
              {TASK_STATUSES.map(status => (
                <button
                  key={status.value}
                  type="button"
                  onClick={() => {
                    setEditValue(status.value);
                    handleCellEdit(taskId, field, status.value, isSubtask, parentId);
                    setIsEditing(false);
                  }}
                  className={`text-left px-2 py-1.5 rounded hover:bg-gray-100 transition-colors ${
                    editValue === status.value ? 'bg-blue-50 ring-1 ring-blue-500' : ''
                  }`}
                >
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                    {status.label}
                  </span>
                </button>
              ))}
            </div>
            {/* Display current status while dropdown is open */}
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${TASK_STATUSES.find(s => s.value === value)?.color}`}>
              {TASK_STATUSES.find(s => s.value === value)?.label}
            </span>
          </div>
        );
      }

      if (type === 'select' && options) {
        return (
          <select
            ref={inputRef as React.RefObject<HTMLSelectElement>}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="w-full px-2 py-1 border border-blue-500 rounded focus:outline-none text-sm"
          >
            {options.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );
      }

      return (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type={type === 'number' ? 'number' : 'text'}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="w-full px-2 py-1 border border-blue-500 rounded focus:outline-none text-sm"
          min={type === 'number' ? 1 : undefined}
        />
      );
    }

    // Special display for status type
    if (type === 'status') {
      const status = TASK_STATUSES.find(s => s.value === value);
      return (
        <div
          onClick={() => setIsEditing(true)}
          className="w-full px-2 py-1 cursor-pointer hover:bg-blue-50 rounded text-sm"
        >
          {status ? (
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
              {status.label}
            </span>
          ) : (
            '-'
          )}
        </div>
      );
    }

    // Special display for external links - make them clickable

    return (
      <div
        onClick={() => setIsEditing(true)}
        className="w-full px-2 py-1 cursor-text hover:bg-blue-50 rounded text-sm"
      >
        {displayValue || '-'}
      </div>
    );
  };

  const PredecessorCell: React.FC<{
    dependencies: import('../../types').Dependency[];
    taskId: string;
    isSubtask?: boolean;
    parentId?: string;
  }> = ({ dependencies, taskId, isSubtask = false, parentId }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      if (isEditing && inputRef.current) {
        // Set initial value when editing starts
        const taskNumbers = dependencies.map(d => getTaskNumber(d.taskId)).filter(n => n).join(', ');
        setEditValue(taskNumbers);
        inputRef.current.focus();
      }
    }, [isEditing]);

    const handleSave = () => {
      // Parse comma-separated task numbers and convert to dependencies
      const taskNumbers = editValue.split(',').map(n => n.trim()).filter(n => n);
      const newDependencies = taskNumbers
        .map(num => {
          const taskId = getTaskIdFromNumber(num);
          if (taskId) {
            return {
              taskId,
              type: 'finish-to-start' as import('../../types').DependencyType,
            };
          }
          return null;
        })
        .filter((d): d is import('../../types').Dependency => d !== null);

      handleCellEdit(taskId, 'dependencies', newDependencies, isSubtask, parentId);
      setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSave();
      } else if (e.key === 'Escape') {
        setIsEditing(false);
      }
    };

    const displayValue = dependencies.map(d => getTaskNumber(d.taskId)).filter(n => n).join(', ') || '-';

    if (isEditing) {
      return (
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          placeholder="e.g., 1, 3, 2.1"
          className="w-full px-2 py-1 border border-blue-500 rounded focus:outline-none text-sm"
        />
      );
    }

    return (
      <div
        onClick={() => setIsEditing(true)}
        className="w-full px-2 py-1 cursor-text hover:bg-blue-50 rounded text-sm"
      >
        {displayValue}
      </div>
    );
  };

  if (!project) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>Please create a project first.</p>
      </div>
    );
  }

  const statusOptions = TASK_STATUSES.map(s => ({ value: s.value, label: s.label }));

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="border-b border-gray-300 p-3 bg-white space-y-3">
        <div className="flex items-center justify-between gap-3 pr-3">
          <div className="flex items-center gap-3">
            <button
              onClick={handleAddTask}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
            >
              + Add New Task
            </button>

            <button
              onClick={handleAutoSchedule}
              className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 font-medium flex items-center gap-2"
              title="Recalculate task dates based on dependencies"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Auto-Schedule
            </button>

            {selectedTasks.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  {selectedTasks.size} task{selectedTasks.size > 1 ? 's' : ''} selected
                </span>
                <div className="relative" ref={bulkMenuRef}>
                  <button
                    onClick={() => setShowBulkMenu(!showBulkMenu)}
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 font-medium flex items-center gap-2"
                  >
                    Bulk Actions
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showBulkMenu && (
                    <div className="absolute top-full right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-50 min-w-[240px]">
                      {/* Status Change Submenu */}
                      <div className="border-b border-gray-200 max-h-[250px] overflow-y-auto">
                        <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase sticky top-0 bg-white">Change Status</div>
                        {TASK_STATUSES.map(status => (
                          <button
                            key={status.value}
                            onClick={() => handleBulkStatusChange(status.value)}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                              {status.label}
                            </span>
                          </button>
                        ))}
                      </div>

                      {/* Assignment Options */}
                      <div className="border-b border-gray-200">
                        <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Assign</div>
                        <button
                          onClick={handleBulkTeamAssign}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          Assign Team
                        </button>
                        <button
                          onClick={handleBulkDriAssign}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          Assign DRI
                        </button>
                      </div>

                      {/* Date Operations */}
                      <div className="border-b border-gray-200">
                        <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Dates</div>
                        <button
                          onClick={handleBulkDateShift}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Shift Dates
                        </button>
                      </div>

                      {/* Delete */}
                      <button
                        onClick={handleBulkDelete}
                        className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete Selected
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Export Buttons */}
          {project && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleImportClick}
                className="p-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
                title="Import CSV"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileImport}
                className="hidden"
              />
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
            </div>
          )}
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-3">
          <FilterBar />

          {/* Expand/Collapse Controls */}
          <button
            type="button"
            onClick={handleExpandAll}
            className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded cursor-pointer hover:bg-gray-50"
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
            className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded cursor-pointer hover:bg-gray-50"
            title="Collapse all tasks"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
            <span>Collapse All</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-sm relative min-w-max">
          <thead className="sticky top-0 bg-gray-100 z-10">
            <tr className="border-b border-gray-300">
              <th className="border-r border-gray-300 px-2 py-2 text-left font-semibold w-8">
                <input
                  type="checkbox"
                  checked={selectedTasks.size > 0 && project && selectedTasks.size === countAllTasks(project.lineItems)}
                  onChange={toggleSelectAll}
                  className="cursor-pointer"
                  title="Select All"
                />
              </th>
              <th className="border-r border-gray-300 px-2 py-2 text-center font-semibold w-10">⋮</th>
              <th className="border-r border-gray-300 px-2 py-2 text-left font-semibold w-8">#</th>
              <th className="border-r border-gray-300 px-2 py-2 text-left font-semibold w-64">Name</th>
              <th className="border-r border-gray-300 px-2 py-2 text-left font-semibold w-28">Start Date</th>
              <th className="border-r border-gray-300 px-2 py-2 text-left font-semibold w-28">End Date</th>
              <th className="border-r border-gray-300 px-2 py-2 text-left font-semibold w-24">Duration (days)</th>
              <th className="border-r border-gray-300 px-2 py-2 text-left font-semibold w-32">Status</th>
              <th className="border-r border-gray-300 px-2 py-2 text-left font-semibold w-32">Team</th>
              <th className="border-r border-gray-300 px-2 py-2 text-left font-semibold w-32">DRI</th>
              <th className="px-2 py-2 text-left font-semibold w-32">Predecessor</th>
            </tr>
          </thead>
          <tbody>
            {filteredLineItems.map((task, index) => {
              const isExpanded = expandedTasks.includes(task.id);

              return (
                <React.Fragment key={task.id}>
                  {/* Parent Task (Depth 0) */}
                  <tr className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="border-r border-gray-200 px-2 py-1 text-center">
                      <input
                        type="checkbox"
                        checked={selectedTasks.has(task.id)}
                        onChange={() => toggleSelectTask(task.id)}
                        className="cursor-pointer"
                      />
                    </td>
                    <td className="border-r border-gray-200 px-2 py-1 text-center">
                      <ActionsMenu
                        taskId={task.id}
                        taskName={task.name}
                        isSubtask={false}
                        depth={0}
                      />
                    </td>
                    <td className="border-r border-gray-200 px-2 py-1 text-gray-500">{index + 1}</td>
                    <td className="border-r border-gray-200 px-0 py-0">
                      <div className="flex items-center">
                        {task.subtasks.length > 0 && (
                          <button
                            onClick={() => toggleExpand(task.id)}
                            className="px-2 py-1 hover:bg-gray-200"
                          >
                            {isExpanded ? '▼' : '▶'}
                          </button>
                        )}
                        <button
                          onClick={() => handleToggleMilestone(task.id, task.isMilestone || false, false)}
                          className="px-1 py-1 hover:bg-yellow-50 rounded transition-colors"
                          title={task.isMilestone ? "Remove milestone marker" : "Mark as milestone"}
                        >
                          <svg
                            className={`w-4 h-4 ${task.isMilestone ? 'fill-yellow-400 stroke-yellow-600' : 'fill-none stroke-gray-300'}`}
                            viewBox="0 0 24 24"
                            strokeWidth="2"
                          >
                            <path d="M12 2 L22 12 L12 22 L2 12 Z" />
                          </svg>
                        </button>
                        <div className="flex-1">
                          <EditableCell value={task.name} taskId={task.id} field="name" />
                        </div>
                      </div>
                    </td>
                    <td className="border-r border-gray-200 px-0 py-0">
                      <EditableCell value={task.startDate} taskId={task.id} field="startDate" type="date" />
                    </td>
                    <td className="border-r border-gray-200 px-0 py-0">
                      <EditableCell value={task.endDate} taskId={task.id} field="endDate" type="date" />
                    </td>
                    <td className="border-r border-gray-200 px-0 py-0">
                      <EditableCell value={task.duration} taskId={task.id} field="duration" type="number" />
                    </td>
                    <td className="border-r border-gray-200 px-0 py-0 relative overflow-visible">
                      <EditableCell
                        value={task.status}
                        taskId={task.id}
                        field="status"
                        type="status"
                        options={statusOptions}
                      />
                    </td>
                    <td className="border-r border-gray-200 px-0 py-0">
                      <EditableCell
                        value={task.teamId}
                        taskId={task.id}
                        field="teamId"
                        type="text"
                      />
                    </td>
                    <td className="border-r border-gray-200 px-0 py-0">
                      <EditableCell
                        value={task.driId}
                        taskId={task.id}
                        field="driId"
                        type="text"
                      />
                    </td>
                    <td className="px-0 py-0">
                      <PredecessorCell
                        dependencies={task.dependencies}
                        taskId={task.id}
                      />
                    </td>
                  </tr>

                  {/* Subtasks (Depth 1) */}
                  {isExpanded && task.subtasks.map((subtask, subIndex) => {
                    const isSubtaskExpanded = expandedTasks.includes(subtask.id);

                    return (
                      <React.Fragment key={subtask.id}>
                        <tr className="border-b border-gray-200 bg-blue-50/30 hover:bg-blue-50">
                          <td className="border-r border-gray-200 px-2 py-1 text-center">
                            <input
                              type="checkbox"
                              checked={selectedTasks.has(subtask.id)}
                              onChange={() => toggleSelectTask(subtask.id)}
                              className="cursor-pointer"
                            />
                          </td>
                          <td className="border-r border-gray-200 px-2 py-1 text-center">
                            <ActionsMenu
                              taskId={subtask.id}
                              taskName={subtask.name}
                              isSubtask={true}
                              parentId={task.id}
                              depth={1}
                            />
                          </td>
                          <td className="border-r border-gray-200 px-2 py-1 text-gray-400 text-xs">
                            {index + 1}.{subIndex + 1}
                          </td>
                          <td className="border-r border-gray-200 px-0 py-0">
                            <div className="flex items-center pl-12 relative">
                              <div className="absolute left-6 top-0 bottom-0 w-px bg-gray-300"></div>
                              <div className="absolute left-6 top-1/2 w-4 h-px bg-gray-300"></div>
                              {subtask.subtasks && subtask.subtasks.length > 0 && (
                                <button
                                  onClick={() => toggleExpand(subtask.id)}
                                  className="px-2 py-1 hover:bg-gray-200 mr-1"
                                >
                                  {isSubtaskExpanded ? '▼' : '▶'}
                                </button>
                              )}
                              <button
                                onClick={() => handleToggleMilestone(subtask.id, subtask.isMilestone || false, true, task.id)}
                                className="px-1 py-1 hover:bg-yellow-50 rounded transition-colors"
                                title={subtask.isMilestone ? "Remove milestone marker" : "Mark as milestone"}
                              >
                                <svg
                                  className={`w-4 h-4 ${subtask.isMilestone ? 'fill-yellow-400 stroke-yellow-600' : 'fill-none stroke-gray-300'}`}
                                  viewBox="0 0 24 24"
                                  strokeWidth="2"
                                >
                                  <path d="M12 2 L22 12 L12 22 L2 12 Z" />
                                </svg>
                              </button>
                              <div className="flex-1">
                                <EditableCell
                                  value={subtask.name}
                                  taskId={subtask.id}
                                  field="name"
                                  isSubtask={true}
                                  parentId={task.id}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="border-r border-gray-200 px-0 py-0">
                            <EditableCell
                              value={subtask.startDate}
                              taskId={subtask.id}
                              field="startDate"
                              type="date"
                              isSubtask={true}
                              parentId={task.id}
                            />
                          </td>
                          <td className="border-r border-gray-200 px-0 py-0">
                            <EditableCell
                              value={subtask.endDate}
                              taskId={subtask.id}
                              field="endDate"
                              type="date"
                              isSubtask={true}
                              parentId={task.id}
                            />
                          </td>
                          <td className="border-r border-gray-200 px-0 py-0">
                            <EditableCell
                              value={subtask.duration}
                              taskId={subtask.id}
                              field="duration"
                              type="number"
                              isSubtask={true}
                              parentId={task.id}
                            />
                          </td>
                          <td className="border-r border-gray-200 px-0 py-0 relative overflow-visible">
                            <EditableCell
                              value={subtask.status}
                              taskId={subtask.id}
                              field="status"
                              type="status"
                              options={statusOptions}
                              isSubtask={true}
                              parentId={task.id}
                            />
                          </td>
                          <td className="border-r border-gray-200 px-0 py-0">
                            <EditableCell
                              value={subtask.teamId}
                              taskId={subtask.id}
                              field="teamId"
                              type="text"
                              isSubtask={true}
                              parentId={task.id}
                            />
                          </td>
                          <td className="border-r border-gray-200 px-0 py-0">
                            <EditableCell
                              value={subtask.driId}
                              taskId={subtask.id}
                              field="driId"
                              type="text"
                              isSubtask={true}
                              parentId={task.id}
                            />
                          </td>
                          <td className="px-0 py-0">
                            <PredecessorCell
                              dependencies={subtask.dependencies}
                              taskId={subtask.id}
                              isSubtask={true}
                              parentId={task.id}
                            />
                          </td>
                        </tr>

                        {/* Child Subtasks (Depth 2) - Third Level */}
                        {isSubtaskExpanded && subtask.subtasks && subtask.subtasks.map((childSubtask, childIndex) => (
                          <tr key={childSubtask.id} className="border-b border-gray-200 bg-blue-50/50 hover:bg-blue-50">
                            <td className="border-r border-gray-200 px-2 py-1 text-center">
                              <input
                                type="checkbox"
                                checked={selectedTasks.has(childSubtask.id)}
                                onChange={() => toggleSelectTask(childSubtask.id)}
                                className="cursor-pointer"
                              />
                            </td>
                            <td className="border-r border-gray-200 px-2 py-1 text-center">
                              <ActionsMenu
                                taskId={childSubtask.id}
                                taskName={childSubtask.name}
                                isSubtask={true}
                                parentId={subtask.id}
                                depth={2}
                              />
                            </td>
                            <td className="border-r border-gray-200 px-2 py-1 text-gray-400 text-xs">
                              {index + 1}.{subIndex + 1}.{childIndex + 1}
                            </td>
                            <td className="border-r border-gray-200 px-0 py-0">
                              <div className="flex items-center pl-24 relative">
                                <div className="absolute top-0 bottom-0 w-px bg-gray-300" style={{ left: '1.5rem' }}></div>
                                <div className="absolute top-0 bottom-0 w-px bg-gray-300" style={{ left: '4.5rem' }}></div>
                                <div className="absolute top-1/2 w-4 h-px bg-gray-300" style={{ left: '4.5rem' }}></div>
                                <button
                                  onClick={() => handleToggleMilestone(childSubtask.id, childSubtask.isMilestone || false, true, subtask.id)}
                                  className="px-1 py-1 hover:bg-yellow-50 rounded transition-colors"
                                  title={childSubtask.isMilestone ? "Remove milestone marker" : "Mark as milestone"}
                                >
                                  <svg
                                    className={`w-4 h-4 ${childSubtask.isMilestone ? 'fill-yellow-400 stroke-yellow-600' : 'fill-none stroke-gray-300'}`}
                                    viewBox="0 0 24 24"
                                    strokeWidth="2"
                                  >
                                    <path d="M12 2 L22 12 L12 22 L2 12 Z" />
                                  </svg>
                                </button>
                                <div className="flex-1">
                                  <EditableCell
                                    value={childSubtask.name}
                                    taskId={childSubtask.id}
                                    field="name"
                                    isSubtask={true}
                                    parentId={subtask.id}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="border-r border-gray-200 px-0 py-0">
                              <EditableCell
                                value={childSubtask.startDate}
                                taskId={childSubtask.id}
                                field="startDate"
                                type="date"
                                isSubtask={true}
                                parentId={subtask.id}
                              />
                            </td>
                            <td className="border-r border-gray-200 px-0 py-0">
                              <EditableCell
                                value={childSubtask.endDate}
                                taskId={childSubtask.id}
                                field="endDate"
                                type="date"
                                isSubtask={true}
                                parentId={subtask.id}
                              />
                            </td>
                            <td className="border-r border-gray-200 px-0 py-0">
                              <EditableCell
                                value={childSubtask.duration}
                                taskId={childSubtask.id}
                                field="duration"
                                type="number"
                                isSubtask={true}
                                parentId={subtask.id}
                              />
                            </td>
                            <td className="border-r border-gray-200 px-0 py-0 relative overflow-visible">
                              <EditableCell
                                value={childSubtask.status}
                                taskId={childSubtask.id}
                                field="status"
                                type="status"
                                options={statusOptions}
                                isSubtask={true}
                                parentId={subtask.id}
                              />
                            </td>
                            <td className="border-r border-gray-200 px-0 py-0">
                              <EditableCell
                                value={childSubtask.teamId}
                                taskId={childSubtask.id}
                                field="teamId"
                                type="text"
                                isSubtask={true}
                                parentId={subtask.id}
                              />
                            </td>
                            <td className="border-r border-gray-200 px-0 py-0">
                              <EditableCell
                                value={childSubtask.driId}
                                taskId={childSubtask.id}
                                field="driId"
                                type="text"
                                isSubtask={true}
                                parentId={subtask.id}
                              />
                            </td>
                            <td className="px-0 py-0">
                              <PredecessorCell
                                dependencies={childSubtask.dependencies}
                                taskId={childSubtask.id}
                                isSubtask={true}
                                parentId={subtask.id}
                              />
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
