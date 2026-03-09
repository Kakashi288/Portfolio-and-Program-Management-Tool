import React, { useMemo } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';
import { format } from 'date-fns';
import { getAllTasks } from '../../utils/taskUtils';

// Sentinel date to indicate "no date set"
const SENTINEL_DATE = new Date(1900, 0, 1);

// Helper function to check if a date is the sentinel value
const isSentinelDate = (date: Date): boolean => {
  return date.getFullYear() === 1900 && date.getMonth() === 0 && date.getDate() === 1;
};

export const PathMilestone: React.FC = () => {
  const project = useProjectStore(state => state.project);
  const { isPathMilestoneOpen, closePathMilestone } = useUIStore();

  const milestoneStats = useMemo(() => {
    if (!project) return { milestones: [], total: 0, completed: 0 };

    // Get all tasks (including nested subtasks) and filter for milestones only
    const allTasks = getAllTasks(project.lineItems);
    const milestones = allTasks
      .filter(t => t.isMilestone && !isSentinelDate(t.endDate))
      .sort((a, b) => a.endDate.getTime() - b.endDate.getTime());

    const completed = milestones.filter(m => m.status === 'complete').length;

    return {
      milestones,
      total: milestones.length,
      completed,
    };
  }, [project]);

  if (!isPathMilestoneOpen || !project) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={closePathMilestone}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Path Milestones</h2>
              <p className="text-sm text-gray-500 mt-1">
                Key milestones for {project.name}
              </p>
            </div>
            <button
              onClick={closePathMilestone}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {milestoneStats.milestones.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Milestones</h3>
                <p className="text-gray-500">Mark tasks as milestones to track key deliverables</p>
              </div>
            ) : (
              <div className="space-y-4">
                {milestoneStats.milestones.map((task, index) => {
                  const isCompleted = task.status === 'complete';
                  return (
                    <div
                      key={task.id}
                      className={`border-2 rounded-lg p-4 hover:shadow-md transition-shadow ${
                        isCompleted
                          ? 'bg-gradient-to-r from-green-50 to-green-100 border-green-300'
                          : 'bg-gradient-to-r from-white to-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          {/* Milestone Number */}
                          <div className="flex-shrink-0">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                              isCompleted
                                ? 'bg-green-600 text-white'
                                : 'bg-blue-600 text-white'
                            }`}>
                              {isCompleted ? (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                index + 1
                              )}
                            </div>
                          </div>

                          {/* Milestone Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-4 mb-1">
                              <div className="flex items-center gap-2">
                                <h3 className="text-lg font-semibold text-gray-900">
                                  Milestone {index + 1}
                                </h3>
                                <svg
                                  className="w-5 h-5 fill-yellow-400 stroke-yellow-600"
                                  viewBox="0 0 24 24"
                                  strokeWidth="2"
                                >
                                  <path d="M12 2 L22 12 L12 22 L2 12 Z" />
                                </svg>
                              </div>
                              {/* Committed Delivery Date */}
                              <div className="flex flex-col items-end">
                                <span className="text-xs text-gray-600 font-medium">Committed Delivery Date</span>
                                <span className={`text-base font-bold ${
                                  isCompleted ? 'text-green-600' : 'text-blue-600'
                                }`}>
                                  {format(task.endDate, 'MMM dd, yyyy')}
                                </span>
                              </div>
                            </div>
                            <p className="text-base text-gray-700 font-medium mb-2">
                              {task.name}
                            </p>

                            {/* Additional Info */}
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                <span className={`capitalize font-medium ${
                                  isCompleted ? 'text-green-700' : 'text-gray-700'
                                }`}>
                                  {task.status.replace('-', ' ')}
                                </span>
                              </div>
                            </div>

                            {/* Progress Bar */}
                            {task.progress !== undefined && !isCompleted && (
                              <div className="mt-3">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs text-gray-600">Progress</span>
                                  <span className="text-xs font-semibold text-gray-900">{task.progress}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-blue-600 h-2 rounded-full transition-all"
                                    style={{ width: `${task.progress}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <p className="text-sm text-gray-600">
                  Total Milestones: <span className="font-semibold text-gray-900">{milestoneStats.total}</span>
                </p>
                <p className="text-sm text-green-600">
                  Completed: <span className="font-semibold text-green-700">{milestoneStats.completed}/{milestoneStats.total}</span>
                </p>
              </div>
              <button
                onClick={closePathMilestone}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
