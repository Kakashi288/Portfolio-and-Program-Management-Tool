import React, { useState, useRef, useEffect } from 'react';
import { format, parse, isValid } from 'date-fns';

interface DateInputProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  onClose?: () => void;
  placeholder?: string;
  className?: string;
}

export const DateInput: React.FC<DateInputProps> = ({
  value,
  onChange,
  onClose,
  placeholder = 'MM/DD/YYYY',
  className = '',
}) => {
  const [textValue, setTextValue] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date(2026, 0, 1)); // Default to Jan 2026
  const inputRef = useRef<HTMLInputElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Update text value when prop value changes
  useEffect(() => {
    if (value) {
      setTextValue(format(value, 'MM/dd/yyyy'));
      setCalendarDate(value);
    } else {
      setTextValue('');
    }
  }, [value]);

  const parseAndSetDate = (inputText: string) => {
    if (inputText.trim() === '') {
      onChange(null);
      return;
    }

    // Try parsing various formats
    const formats = ['MM/dd/yyyy', 'M/d/yyyy', 'MM-dd-yyyy', 'M-d-yyyy', 'M/d/yy', 'MM/dd/yy'];
    for (const fmt of formats) {
      const parsedDate = parse(inputText, fmt, new Date());
      if (isValid(parsedDate)) {
        onChange(parsedDate);
        setCalendarDate(parsedDate);
        setTextValue(format(parsedDate, 'MM/dd/yyyy'));
        return;
      }
    }
  };

  // Close calendar and notify parent on click outside entire component
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        // Parse the current text value before closing
        parseAndSetDate(textValue);
        setShowCalendar(false);
        // Delay onClose to ensure date is saved first
        setTimeout(() => onClose?.(), 0);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }); // Run on every render to capture latest textValue

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputText = e.target.value;
    setTextValue(inputText);
  };

  const handleInputBlur = () => {
    // Parse the date when user leaves the input field
    parseAndSetDate(textValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      parseAndSetDate(textValue);
      setShowCalendar(false);
      inputRef.current?.blur();
      // Delay onClose to ensure date is saved first
      setTimeout(() => onClose?.(), 0);
    } else if (e.key === 'Escape') {
      setShowCalendar(false);
      inputRef.current?.blur();
      onClose?.();
    }
  };

  const handleCalendarClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowCalendar(!showCalendar);
  };

  const handleDateSelect = (date: Date) => {
    onChange(date);
    setTextValue(format(date, 'MM/dd/yyyy'));
    setCalendarDate(date);
    setShowCalendar(false);
    onClose?.();
  };

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (number | null)[] = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  };

  const isSelectedDate = (day: number) => {
    if (!value) return false;
    return (
      value.getDate() === day &&
      value.getMonth() === calendarDate.getMonth() &&
      value.getFullYear() === calendarDate.getFullYear()
    );
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === calendarDate.getMonth() &&
      today.getFullYear() === calendarDate.getFullYear()
    );
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          type="text"
          value={textValue}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          className={`flex-1 px-2 py-1 border border-blue-500 rounded focus:outline-none text-sm ${className}`}
        />
        <button
          type="button"
          onMouseDown={handleCalendarClick}
          className="px-2 py-1 border border-blue-500 rounded hover:bg-blue-50 transition-colors"
          title="Open calendar"
        >
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>
      </div>

      {showCalendar && (
        <div
          ref={calendarRef}
          className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-50 p-3 min-w-[280px]"
        >
          {/* Month/Year Header */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onMouseDown={handlePrevMonth}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="font-semibold text-sm">
              {format(calendarDate, 'MMMM yyyy')}
            </div>
            <button
              type="button"
              onMouseDown={handleNextMonth}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
              <div key={day} className="text-center text-xs font-semibold text-gray-600 py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {getDaysInMonth(calendarDate).map((day, index) => (
              <div key={index} className="text-center">
                {day ? (
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDateSelect(new Date(calendarDate.getFullYear(), calendarDate.getMonth(), day));
                    }}
                    className={`w-full py-1 text-sm rounded hover:bg-blue-50 transition-colors ${
                      isSelectedDate(day)
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : isToday(day)
                        ? 'bg-blue-100 text-blue-900 font-semibold'
                        : 'text-gray-700'
                    }`}
                  >
                    {day}
                  </button>
                ) : (
                  <div className="w-full py-1" />
                )}
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDateSelect(new Date());
              }}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Today
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onChange(null);
                setTextValue('');
                setShowCalendar(false);
                onClose?.();
              }}
              className="text-xs text-gray-600 hover:text-gray-800"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
