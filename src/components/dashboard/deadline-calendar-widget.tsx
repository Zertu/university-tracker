'use client';

import { useState } from 'react';
import { DeadlineCalendar } from '@/components/deadlines/deadline-calendar';
import { TaskManagement } from './task-management';

interface DeadlineCalendarWidgetProps {
  className?: string;
}

export function DeadlineCalendarWidget({ className = '' }: DeadlineCalendarWidgetProps) {
  const [view, setView] = useState<'calendar' | 'tasks'>('calendar');

  return (
    <div className={`bg-white rounded-lg shadow ${className}`} role="region" aria-labelledby="deadlines-tasks-title">
      <div className="p-4 sm:p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
          <h2 id="deadlines-tasks-title" className="text-lg sm:text-xl font-semibold text-gray-900">Deadlines & Tasks</h2>
          <div className="flex bg-gray-100 rounded-lg p-1" role="tablist" aria-label="View options">
            <button
              onClick={() => setView('calendar')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                view === 'calendar'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              role="tab"
              aria-selected={view === 'calendar'}
              aria-controls="calendar-panel"
            >
              Calendar
            </button>
            <button
              onClick={() => setView('tasks')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                view === 'tasks'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              role="tab"
              aria-selected={view === 'tasks'}
              aria-controls="tasks-panel"
            >
              Tasks
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        {view === 'calendar' ? (
          <div id="calendar-panel" role="tabpanel" aria-labelledby="calendar-tab">
            <DeadlineCalendar showNavigation={true} />
          </div>
        ) : (
          <div id="tasks-panel" role="tabpanel" aria-labelledby="tasks-tab">
            <TaskManagement limit={8} />
          </div>
        )}
      </div>
    </div>
  );
}