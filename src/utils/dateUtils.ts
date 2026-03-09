import {
  addDays,
  addBusinessDays,
  differenceInDays,
  differenceInBusinessDays,
  isWeekend,
  startOfDay,
  endOfDay,
  format,
  isAfter,
  isBefore,
  isEqual,
  isSameDay,
  min,
  max,
  getYear,
} from 'date-fns';

// US Federal Holidays for 2025-2027 (can be extended)
// Format: { month: 0-11, day: 1-31 }
const US_BANK_HOLIDAYS_2025 = [
  { month: 0, day: 1 },   // New Year's Day
  { month: 0, day: 20 },  // MLK Day (3rd Monday of January)
  { month: 1, day: 17 },  // Presidents Day (3rd Monday of February)
  { month: 4, day: 26 },  // Memorial Day (last Monday of May)
  { month: 5, day: 19 },  // Juneteenth
  { month: 6, day: 4 },   // Independence Day
  { month: 8, day: 1 },   // Labor Day (1st Monday of September)
  { month: 9, day: 13 },  // Columbus Day (2nd Monday of October)
  { month: 10, day: 11 }, // Veterans Day
  { month: 10, day: 27 }, // Thanksgiving (4th Thursday of November)
  { month: 11, day: 25 }, // Christmas Day
];

const US_BANK_HOLIDAYS_2026 = [
  { month: 0, day: 1 },   // New Year's Day
  { month: 0, day: 19 },  // MLK Day
  { month: 1, day: 16 },  // Presidents Day
  { month: 4, day: 25 },  // Memorial Day
  { month: 5, day: 19 },  // Juneteenth
  { month: 6, day: 3 },   // Independence Day (observed, 4th is Saturday)
  { month: 8, day: 7 },   // Labor Day
  { month: 9, day: 12 },  // Columbus Day
  { month: 10, day: 11 }, // Veterans Day
  { month: 10, day: 26 }, // Thanksgiving
  { month: 11, day: 25 }, // Christmas Day
];

const US_BANK_HOLIDAYS_2027 = [
  { month: 0, day: 1 },   // New Year's Day
  { month: 0, day: 18 },  // MLK Day
  { month: 1, day: 15 },  // Presidents Day
  { month: 4, day: 31 },  // Memorial Day
  { month: 5, day: 18 },  // Juneteenth (observed, 19th is Saturday)
  { month: 6, day: 5 },   // Independence Day (observed, 4th is Sunday)
  { month: 8, day: 6 },   // Labor Day
  { month: 9, day: 11 },  // Columbus Day
  { month: 10, day: 11 }, // Veterans Day
  { month: 10, day: 25 }, // Thanksgiving
  { month: 11, day: 24 }, // Christmas Day (observed, 25th is Saturday)
];

const BANK_HOLIDAYS_BY_YEAR: { [key: number]: { month: number; day: number }[] } = {
  2025: US_BANK_HOLIDAYS_2025,
  2026: US_BANK_HOLIDAYS_2026,
  2027: US_BANK_HOLIDAYS_2027,
};

/**
 * Check if a date is a bank holiday
 */
export const isBankHoliday = (date: Date): boolean => {
  const year = getYear(date);
  const holidays = BANK_HOLIDAYS_BY_YEAR[year];

  if (!holidays) return false;

  return holidays.some(holiday => {
    const holidayDate = new Date(year, holiday.month, holiday.day);
    return isSameDay(date, holidayDate);
  });
};

/**
 * Check if a date is a working day (not weekend and not bank holiday)
 */
export const isWorkingDay = (date: Date): boolean => {
  return !isWeekend(date) && !isBankHoliday(date);
};

/**
 * Calculate the number of working days between two dates (excluding weekends and bank holidays)
 */
export const calculateWorkingDays = (startDate: Date, endDate: Date): number => {
  if (isBefore(endDate, startDate)) return 0;

  let count = 0;
  let currentDate = startOfDay(startDate);
  const end = startOfDay(endDate);

  while (isBefore(currentDate, end) || isEqual(currentDate, end)) {
    if (isWorkingDay(currentDate)) {
      count++;
    }
    currentDate = addDays(currentDate, 1);
  }

  return count;
};

/**
 * Add working days to a date (skipping weekends and bank holidays)
 */
export const addWorkingDays = (startDate: Date, daysToAdd: number): Date => {
  let currentDate = startOfDay(startDate);
  let daysAdded = 0;

  if (daysToAdd === 0) return currentDate;

  const direction = daysToAdd > 0 ? 1 : -1;
  const absDays = Math.abs(daysToAdd);

  while (daysAdded < absDays) {
    currentDate = addDays(currentDate, direction);
    if (isWorkingDay(currentDate)) {
      daysAdded++;
    }
  }

  return currentDate;
};

/**
 * Get all working days in a date range
 */
export const getWorkingDays = (startDate: Date, endDate: Date): Date[] => {
  return getDateRange(startDate, endDate).filter(date => isWorkingDay(date));
};

export const calculateEndDate = (
  startDate: Date,
  duration: number,
  includeWeekends: boolean = false
): Date => {
  // Duration must be at least 1 (a task occupies at least 1 day)
  if (duration < 1) return startDate;

  // Duration represents the number of working days the task spans
  // For working days: add (duration - 1) working days to start date
  // Example: duration 1 = starts and ends on same day (add 0 working days)
  //          duration 2 = starts Mon, ends Tue (add 1 working day)
  if (includeWeekends) {
    return addDays(startDate, duration - 1);
  } else {
    // Use working days (excluding weekends AND bank holidays)
    return addWorkingDays(startDate, duration - 1);
  }
};

export const calculateDuration = (
  startDate: Date,
  endDate: Date,
  includeWeekends: boolean = false
): number => {
  if (isBefore(endDate, startDate)) return 0;

  // Duration is the number of working days from start to end (inclusive)
  if (includeWeekends) {
    const diff = differenceInDays(endDate, startDate);
    return diff + 1;
  } else {
    // Use working days (excluding weekends AND bank holidays)
    return calculateWorkingDays(startDate, endDate);
  }
};

export const calculateStartDate = (
  endDate: Date,
  duration: number,
  includeWeekends: boolean = false
): Date => {
  // Duration must be at least 1 (a task occupies at least 1 day)
  if (duration < 1) return endDate;

  // Duration represents the number of working days the task spans
  // For working days: subtract (duration - 1) working days from end date
  if (includeWeekends) {
    return addDays(endDate, -(duration - 1));
  } else {
    // Use working days (excluding weekends AND bank holidays)
    return addWorkingDays(endDate, -(duration - 1));
  }
};

export const isValidDateRange = (startDate: Date, endDate: Date): boolean => {
  return isBefore(startDate, endDate) || isEqual(startDate, endDate);
};

export const adjustForWeekend = (date: Date): Date => {
  let adjustedDate = date;
  while (isWeekend(adjustedDate)) {
    adjustedDate = addDays(adjustedDate, 1);
  }
  return adjustedDate;
};

export const getEarliestDate = (dates: Date[]): Date => {
  return min(dates);
};

export const getLatestDate = (dates: Date[]): Date => {
  return max(dates);
};

export const formatDate = (date: Date, dateFormat: string = 'MMM dd, yyyy'): string => {
  return format(date, dateFormat);
};

export const normalizeDate = (date: Date): Date => {
  return startOfDay(date);
};

export const getDateRange = (startDate: Date, endDate: Date): Date[] => {
  const dates: Date[] = [];
  let currentDate = startOfDay(startDate);
  const end = startOfDay(endDate);

  while (isBefore(currentDate, end) || isEqual(currentDate, end)) {
    dates.push(currentDate);
    currentDate = addDays(currentDate, 1);
  }

  return dates;
};

export const getBusinessDays = (startDate: Date, endDate: Date): Date[] => {
  // Updated to use working days (excluding both weekends and bank holidays)
  return getWorkingDays(startDate, endDate);
};

export {
  addDays,
  addBusinessDays,
  differenceInDays,
  differenceInBusinessDays,
  isWeekend,
  startOfDay,
  endOfDay,
  isAfter,
  isBefore,
  isEqual,
  isSameDay,
  getYear,
};
