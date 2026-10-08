import {
  differenceInCalendarDays,
  format,
  subDays,
  parseISO,
  isSameDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
} from "date-fns";
import { Lecture, StudySession, Subject } from "@/types";

export interface StreakStats {
  currentStreak: number;
  longestStreak: number;
  activeDatesSet: Set<string>;
}

/**
 * Calculates current streak and longest streak.
 * A day counts if at least one lecture is completed (completedAt) OR a study session is logged (date).
 */
export function calculateStreaks(
  lectures: Lecture[],
  studySessions: StudySession[]
): StreakStats {
  const activeDates = new Set<string>();

  lectures.forEach((l) => {
    if (l.completed && l.completedAt) {
      try {
        const dateStr = format(parseISO(l.completedAt), "yyyy-MM-dd");
        activeDates.add(dateStr);
      } catch {
        // fallback if invalid date
      }
    }
  });

  studySessions.forEach((s) => {
    if (s.date && s.minutes > 0) {
      activeDates.add(s.date);
    }
  });

  if (activeDates.size === 0) {
    return { currentStreak: 0, longestStreak: 0, activeDatesSet: activeDates };
  }

  // Sort dates descending
  const sortedDates = Array.from(activeDates).sort().reverse();
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const yesterdayStr = format(subDays(new Date(), 1), "yyyy-MM-dd");

  let currentStreak = 0;
  // If active today or yesterday, streak is currently alive
  let checkDate = activeDates.has(todayStr)
    ? parseISO(todayStr)
    : activeDates.has(yesterdayStr)
    ? parseISO(yesterdayStr)
    : null;

  if (checkDate) {
    let d = checkDate;
    while (activeDates.has(format(d, "yyyy-MM-dd"))) {
      currentStreak++;
      d = subDays(d, 1);
    }
  }

  // Calculate longest streak across all history
  const chronological = Array.from(activeDates).sort();
  let longestStreak = 0;
  let tempStreak = 0;
  let prevDate: Date | null = null;

  for (const dateStr of chronological) {
    const cur = parseISO(dateStr);
    if (!prevDate) {
      tempStreak = 1;
    } else {
      const diff = differenceInCalendarDays(cur, prevDate);
      if (diff === 1) {
        tempStreak++;
      } else if (diff > 1) {
        tempStreak = 1;
      }
    }
    prevDate = cur;
    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
    }
  }

  return {
    currentStreak,
    longestStreak,
    activeDatesSet: activeDates,
  };
}

/**
 * Spaced revision logic:
 * Lectures flagged as difficult OR completed 3, 7, or 15 days ago automatically show up.
 */
export function getRevisionCandidates(lectures: Lecture[]): Lecture[] {
  const today = new Date();
  const candidates: Lecture[] = [];

  lectures.forEach((l) => {
    // We only revise completed lectures or lectures marked as difficult
    if (!l.completed && !l.difficult) return;

    if (l.difficult) {
      // If difficult and hasn't been revised today
      if (!l.lastRevisedAt || !isSameDay(parseISO(l.lastRevisedAt), today)) {
        candidates.push(l);
        return;
      }
    }

    if (l.completed && l.completedAt) {
      try {
        const completedDate = parseISO(l.completedAt);
        const daysDiff = differenceInCalendarDays(today, completedDate);
        // Interval triggers: exactly 3, 7, or 15 days ago
        if (daysDiff === 3 || daysDiff === 7 || daysDiff === 15) {
          if (!l.lastRevisedAt || !isSameDay(parseISO(l.lastRevisedAt), today)) {
            candidates.push(l);
          }
        }
      } catch {
        // ignore date parse errors
      }
    }
  });

  return candidates;
}

/**
 * Estimated finish date per subject based on last 14 days completion pace.
 */
export function estimateFinishDate(
  subjectId: string,
  allLectures: Lecture[]
): { daysRemaining: number; estimatedDate: string | null; pacePerDay: number } {
  const subjectLectures = allLectures.filter((l) => l.subjectId === subjectId);
  const remainingLectures = subjectLectures.filter((l) => !l.completed).length;

  if (remainingLectures === 0) {
    return { daysRemaining: 0, estimatedDate: "Done", pacePerDay: 0 };
  }

  const today = new Date();
  const fourteenDaysAgo = subDays(today, 14);

  const completedInLast14Days = subjectLectures.filter((l) => {
    if (!l.completed || !l.completedAt) return false;
    try {
      const d = parseISO(l.completedAt);
      return isWithinInterval(d, { start: fourteenDaysAgo, end: today });
    } catch {
      return false;
    }
  }).length;

  const pacePerDay = completedInLast14Days / 14;

  if (pacePerDay <= 0.05) {
    // Very slow or no activity recently; fallback to daily goal estimate or none
    return { daysRemaining: -1, estimatedDate: null, pacePerDay: 0 };
  }

  const daysRemaining = Math.ceil(remainingLectures / pacePerDay);
  const estimatedDateObj = subDays(today, -daysRemaining);
  return {
    daysRemaining,
    estimatedDate: format(estimatedDateObj, "dd MMM yyyy"),
    pacePerDay: Math.round(pacePerDay * 10) / 10,
  };
}

/**
 * Aggregates study stats for dashboard and analytics
 */
export function getStudyStats(
  lectures: Lecture[],
  studySessions: StudySession[]
) {
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");

  const weekInterval = { start: startOfWeek(today, { weekStartsOn: 1 }), end: endOfWeek(today, { weekStartsOn: 1 }) };
  const monthInterval = { start: startOfMonth(today), end: endOfMonth(today) };

  let completedToday = 0;
  let completedThisWeek = 0;
  let completedThisMonth = 0;
  let totalWatchedSeconds = 0;

  lectures.forEach((l) => {
    totalWatchedSeconds += l.watchedSec || (l.completed ? l.durationSec : 0);

    if (l.completed && l.completedAt) {
      try {
        const d = parseISO(l.completedAt);
        if (isSameDay(d, today)) {
          completedToday++;
        }
        if (isWithinInterval(d, weekInterval)) {
          completedThisWeek++;
        }
        if (isWithinInterval(d, monthInterval)) {
          completedThisMonth++;
        }
      } catch {}
    }
  });

  // Add minutes from study sessions into total hours
  const totalSessionMinutes = studySessions.reduce((acc, s) => acc + (s.minutes || 0), 0);
  const totalHours = Math.round(((totalWatchedSeconds / 3600) + (totalSessionMinutes / 60)) * 10) / 10;

  return {
    completedToday,
    completedThisWeek,
    completedThisMonth,
    totalHours,
    todayStr,
  };
}
