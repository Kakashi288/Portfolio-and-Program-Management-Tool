import React from 'react';
import type { TaskStatus } from '../../types';
import { TASK_STATUSES } from '../../constants';

interface StatusBadgeProps {
  status: TaskStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const statusConfig = TASK_STATUSES.find(s => s.value === status);
  if (!statusConfig) return null;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${statusConfig.color} ${sizeClasses[size]}`}
    >
      {statusConfig.label}
    </span>
  );
};
