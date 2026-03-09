import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useProjectStore } from '../../store/projectStore';
import { useTaskStore } from '../../store/taskStore';
import { useUIStore } from '../../store/uiStore';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { DatePicker } from '../common/DatePicker';
import type { TaskFormData } from '../../types';
import { TASK_STATUSES } from '../../constants';

export const TaskForm: React.FC = () => {
  const project = useProjectStore(state => state.project);
  const { updateLineItem, updateSubTask } = useTaskStore();
  const { isTaskFormOpen, closeTaskForm, selectedTaskId } = useUIStore();

  const [startDate, setStartDate] = useState(new Date());

  // Find the selected task (could be line item or subtask)
  const selectedTask = selectedTaskId && project
    ? (() => {
        // Check if it's a line item
        const lineItem = project.lineItems.find(t => t.id === selectedTaskId);
        if (lineItem) return { task: lineItem, isSubtask: false, parentId: null };

        // Check if it's a subtask
        for (const item of project.lineItems) {
          const subtask = item.subtasks.find(st => st.id === selectedTaskId);
          if (subtask) return { task: subtask, isSubtask: true, parentId: item.id };
        }
        return null;
      })()
    : null;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<TaskFormData>({
    defaultValues: selectedTask?.task || {
      name: '',
      duration: 1,
      status: 'not started',
      dependencies: [],
      notes: '',
      externalLinks: '',
      isMilestone: false,
    },
  });

  useEffect(() => {
    if (selectedTask) {
      setStartDate(selectedTask.task.startDate);
      reset({
        name: selectedTask.task.name,
        duration: selectedTask.task.duration,
        teamId: selectedTask.task.teamId,
        driId: selectedTask.task.driId,
        status: selectedTask.task.status,
        notes: selectedTask.task.notes,
        externalLinks: selectedTask.task.externalLinks,
        isMilestone: selectedTask.task.isMilestone || false,
        dependencies: selectedTask.task.dependencies,
      });
    }
  }, [selectedTask, reset]);

  const onSubmit = (data: TaskFormData) => {
    if (selectedTaskId && selectedTask) {
      const updates = {
        ...data,
        startDate,
      };

      if (selectedTask.isSubtask && selectedTask.parentId) {
        updateSubTask(selectedTask.parentId, selectedTaskId, updates);
      } else {
        updateLineItem(selectedTaskId, updates);
      }
    }
    closeTaskForm();
    reset();
  };

  const handleClose = () => {
    closeTaskForm();
    reset();
  };

  return (
    <Modal
      isOpen={isTaskFormOpen}
      onClose={handleClose}
      title={selectedTask?.isSubtask ? 'Edit Subtask' : 'Edit Task'}
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Task Name"
          {...register('name', { required: 'Task name is required' })}
          error={errors.name?.message}
          placeholder="Enter task name"
        />

        <div className="grid grid-cols-2 gap-4">
          <DatePicker
            label="Start Date"
            value={startDate}
            onChange={setStartDate}
          />

          <Input
            label="Duration (days)"
            type="number"
            {...register('duration', {
              required: 'Duration is required',
              min: { value: 1, message: 'Duration must be at least 1 day' },
            })}
            error={errors.duration?.message}
            min={1}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <div className="flex flex-wrap gap-2">
            {TASK_STATUSES.map(status => (
              <label
                key={status.value}
                className="cursor-pointer"
              >
                <input
                  type="radio"
                  value={status.value}
                  {...register('status')}
                  className="sr-only peer"
                />
                <span className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all border-2 ${status.color} peer-checked:ring-2 peer-checked:ring-blue-500 peer-checked:ring-offset-2 hover:scale-105`}>
                  {status.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Team"
            {...register('teamId')}
            placeholder="Enter team name"
          />
        </div>

        <div className="grid grid-cols-1 gap-4">
          <Input
            label="DRI (Directly Responsible Individual)"
            {...register('driId')}
            placeholder="Enter person name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            {...register('notes')}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Add any additional notes..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            External Links / Tickets
          </label>
          <textarea
            {...register('externalLinks')}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Add external ticket links, JIRA tickets, or other references..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
};
