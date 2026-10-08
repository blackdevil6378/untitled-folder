import { addDays, format, isSunday, isSaturday, isBefore, startOfDay, parseISO } from "date-fns";
import { Lecture } from "@/types";

export interface AutoPlanOptions {
  mode: "by_date" | "by_rate" | "alternate_days" | "preset_duration";
  targetDate?: string; // YYYY-MM-DD (used in by_date mode)
  lecturesPerDay?: number; // e.g. 2 or 3 (used in by_rate & alternate_days)
  dayGap?: number; // gap between study days: 2 = every other day, 3 = every 3rd day (alternate_days)
  presetDays?: number; // 7 = 1 week, 14 = 2 weeks, 30 = 1 month (preset_duration)
  startDate?: string; // YYYY-MM-DD, defaults to today
  skipSundays: boolean;
  skipSaturdays?: boolean;
  excludedDates?: string[]; // YYYY-MM-DD
}

export interface PlanAssignment {
  lectureId: string;
  date: string; // YYYY-MM-DD
}

/**
 * Calculates lecture schedule assignments based on user criteria.
 */
export function calculateAutoPlan(
  lectures: Lecture[],
  options: AutoPlanOptions
): PlanAssignment[] {
  // Only plan incomplete lectures, sorted in order
  const pending = [...lectures]
    .filter((l) => !l.completed)
    .sort((a, b) => a.order - b.order);

  if (pending.length === 0) return [];

  const start = options.startDate ? parseISO(options.startDate) : startOfDay(new Date());
  const excludedSet = new Set(options.excludedDates || []);

  const isValidDay = (d: Date): boolean => {
    if (options.skipSundays && isSunday(d)) return false;
    if (options.skipSaturdays && isSaturday(d)) return false;
    const dateStr = format(d, "yyyy-MM-dd");
    if (excludedSet.has(dateStr)) return false;
    return true;
  };

  const assignments: PlanAssignment[] = [];

  if (options.mode === "by_rate") {
    // Fixed N lectures per day, every valid day
    const rate = Math.max(1, options.lecturesPerDay || 2);
    let currDate = start;
    let pendingIdx = 0;

    while (pendingIdx < pending.length) {
      if (isValidDay(currDate)) {
        const countToAssign = Math.min(rate, pending.length - pendingIdx);
        const dateStr = format(currDate, "yyyy-MM-dd");
        for (let i = 0; i < countToAssign; i++) {
          assignments.push({
            lectureId: pending[pendingIdx].id,
            date: dateStr,
          });
          pendingIdx++;
        }
      }
      currDate = addDays(currDate, 1);
    }
  } else if (options.mode === "alternate_days") {
    // Study every N days (e.g. every other day = gap 2, every 3rd day = gap 3)
    const gap = Math.max(2, options.dayGap || 2);
    const rate = Math.max(1, options.lecturesPerDay || 2);
    let currDate = start;
    let pendingIdx = 0;
    let daysSinceLastStudy = gap; // start on first valid day

    while (pendingIdx < pending.length) {
      if (daysSinceLastStudy >= gap && isValidDay(currDate)) {
        const countToAssign = Math.min(rate, pending.length - pendingIdx);
        const dateStr = format(currDate, "yyyy-MM-dd");
        for (let i = 0; i < countToAssign; i++) {
          assignments.push({
            lectureId: pending[pendingIdx].id,
            date: dateStr,
          });
          pendingIdx++;
        }
        daysSinceLastStudy = 1;
      } else {
        daysSinceLastStudy++;
      }
      currDate = addDays(currDate, 1);
    }
  } else if (options.mode === "preset_duration") {
    // Finish within preset days (1 week, 2 weeks, 1 month)
    const durationDays = options.presetDays || 7;
    const target = addDays(start, durationDays - 1);

    // Collect all valid days within the preset window
    const validDays: string[] = [];
    let currDate = start;
    while (!isBefore(target, currDate)) {
      if (isValidDay(currDate)) {
        validDays.push(format(currDate, "yyyy-MM-dd"));
      }
      currDate = addDays(currDate, 1);
    }

    if (validDays.length === 0) {
      validDays.push(format(target, "yyyy-MM-dd"));
    }

    // Distribute lectures evenly across valid days
    const totalLectures = pending.length;
    const numDays = validDays.length;
    let lectureIdx = 0;
    for (let dayIdx = 0; dayIdx < numDays && lectureIdx < totalLectures; dayIdx++) {
      const remainingLectures = totalLectures - lectureIdx;
      const remainingDays = numDays - dayIdx;
      const quota = Math.ceil(remainingLectures / remainingDays);
      for (let k = 0; k < quota && lectureIdx < totalLectures; k++) {
        assignments.push({
          lectureId: pending[lectureIdx].id,
          date: validDays[dayIdx],
        });
        lectureIdx++;
      }
    }
  } else {
    // mode === "by_date"
    const target = options.targetDate ? parseISO(options.targetDate) : addDays(start, 14);
    
    // Find all valid days between start and target
    const validDays: string[] = [];
    let currDate = start;
    while (!isBefore(target, currDate)) {
      if (isValidDay(currDate)) {
        validDays.push(format(currDate, "yyyy-MM-dd"));
      }
      currDate = addDays(currDate, 1);
    }

    if (validDays.length === 0) {
      // Fallback: at least assign to target day or today
      validDays.push(format(target, "yyyy-MM-dd"));
    }

    // Distribute pending lectures as evenly as possible across validDays
    const totalLectures = pending.length;
    const numDays = validDays.length;

    // Distribute using round-robin / bucket distribution
    let lectureIdx = 0;
    for (let dayIdx = 0; dayIdx < numDays && lectureIdx < totalLectures; dayIdx++) {
      // Calculate how many lectures this day should take
      const remainingLectures = totalLectures - lectureIdx;
      const remainingDays = numDays - dayIdx;
      const quota = Math.ceil(remainingLectures / remainingDays);

      for (let k = 0; k < quota && lectureIdx < totalLectures; k++) {
        assignments.push({
          lectureId: pending[lectureIdx].id,
          date: validDays[dayIdx],
        });
        lectureIdx++;
      }
    }
  }

  return assignments;
}

/**
 * Reschedule overdue lectures:
 * Any lecture that was scheduled in the past (< today) and is still incomplete
 * is rescheduled starting from today across upcoming days.
 */
export function rescheduleOverdueLectures(
  lectures: Lecture[],
  dailyQuota: number = 3,
  skipSundays: boolean = true
): PlanAssignment[] {
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const overdue = lectures
    .filter((l) => !l.completed && l.scheduledDate && l.scheduledDate < todayStr)
    .sort((a, b) => a.order - b.order);

  if (overdue.length === 0) return [];

  let currDate = startOfDay(new Date());
  let idx = 0;
  const assignments: PlanAssignment[] = [];

  while (idx < overdue.length) {
    if (!skipSundays || !isSunday(currDate)) {
      const dateStr = format(currDate, "yyyy-MM-dd");
      const batch = Math.min(dailyQuota, overdue.length - idx);
      for (let i = 0; i < batch; i++) {
        assignments.push({
          lectureId: overdue[idx].id,
          date: dateStr,
        });
        idx++;
      }
    }
    currDate = addDays(currDate, 1);
  }

  return assignments;
}
