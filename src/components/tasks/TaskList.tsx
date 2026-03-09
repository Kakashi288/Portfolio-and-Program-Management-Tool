import React from 'react';
import type { LineItem } from '../../types';
import { useProjectStore } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';
import { Button } from '../common/Button';
import { StatusBadge } from '../common/StatusBadge';
import { formatDate } from '../../utils/dateUtils';

export const TaskList: React.FC = () => {
  const project = useProjectStore(state => state.project);
  const { openTaskForm, setSelectedTask } = useUIStore();

  const handleTaskClick = (task: LineItem) => {
    setSelectedTask(task.id);
    openTaskForm();
  };

  if (!project || project.lineItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <svg className="w-24 h-24 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks yet</h3>
        <p className="text-gray-500 mb-4">Get started by creating your first task</p>
        <Button onClick={openTaskForm}>
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Task
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Tasks</h2>
        <Button onClick={openTaskForm}>
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Task
        </Button>
      </div>

      <div className="space-y-3">
        {project.lineItems.map(task => (
          <div
            key={task.id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => handleTaskClick(task)}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900 mb-1">{task.name}</h3>
                {task.notes && (
                  <p className="text-sm text-gray-500 mb-2">{task.notes}</p>
                )}
              </div>
              <StatusBadge status={task.status} />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Start:</span>
                <span className="ml-2 text-gray-900">{formatDate(task.startDate)}</span>
              </div>
              <div>
                <span className="text-gray-500">End:</span>
                <span className="ml-2 text-gray-900">{formatDate(task.endDate)}</span>
              </div>
              <div>
                <span className="text-gray-500">Duration:</span>
                <span className="ml-2 text-gray-900">{task.duration} days</span>
              </div>
              <div>
                <span className="text-gray-500">Progress:</span>
                <span className="ml-2 text-gray-900">{task.progress}%</span>
              </div>
            </div>

            {task.subtasks.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-sm text-gray-600">
                  {task.subtasks.length} subtask{task.subtasks.length !== 1 ? 's' : ''}
                </p>
              </div>
            )}

            {task.progress > 0 && task.progress < 100 && (
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
