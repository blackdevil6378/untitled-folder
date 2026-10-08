"use client";

import React, { useMemo } from "react";
import { format, subDays, eachDayOfInterval, isSameDay, parseISO } from "date-fns";
import { Lecture, StudySession } from "@/types";

interface ActivityHeatmapProps {
  lectures: Lecture[];
  sessions: StudySession[];
}

export function ActivityHeatmap({ lectures, sessions }: ActivityHeatmapProps) {
  // Generate days for the last 180 days (~6 months)
  const { days, activityCountMap } = useMemo(() => {
    const today = new Date();
    const startDate = subDays(today, 175); // 25 weeks * 7 days
    const allDays = eachDayOfInterval({ start: startDate, end: today });

    const map = new Map<string, { lectures: number; minutes: number }>();

    lectures.forEach((l) => {
      if (l.completed && l.completedAt) {
        try {
          const dateStr = format(parseISO(l.completedAt), "yyyy-MM-dd");
          const existing = map.get(dateStr) || { lectures: 0, minutes: 0 };
          existing.lectures += 1;
          existing.minutes += Math.round((l.durationSec || 0) / 60);
          map.set(dateStr, existing);
        } catch {}
      }
    });

    sessions.forEach((s) => {
      if (s.date && s.minutes > 0) {
        const existing = map.get(s.date) || { lectures: 0, minutes: 0 };
        existing.minutes += s.minutes;
        map.set(s.date, existing);
      }
    });

    return { days: allDays, activityCountMap: map };
  }, [lectures, sessions]);

  // Color intensity bucket
  const getCellColor = (data?: { lectures: number; minutes: number }) => {
    if (!data || (data.lectures === 0 && data.minutes === 0)) {
      return "bg-white/[0.04] border-white/[0.05]";
    }
    const score = data.lectures * 2 + Math.floor(data.minutes / 30);
    if (score >= 6) {
      return "bg-[#00f0ff] border-[#00f0ff] shadow-[0_0_8px_#00f0ff]";
    }
    if (score >= 4) {
      return "bg-[#00f0ff]/80 border-[#00f0ff]/80";
    }
    if (score >= 2) {
      return "bg-[#00f0ff]/50 border-[#00f0ff]/50";
    }
    return "bg-[#00f0ff]/25 border-[#00f0ff]/30";
  };

  // Group days into 7-day columns (weeks)
  const weeks = useMemo(() => {
    const grouped: Date[][] = [];
    let currentWeek: Date[] = [];

    days.forEach((day, index) => {
      currentWeek.push(day);
      if (currentWeek.length === 7 || index === days.length - 1) {
        grouped.push(currentWeek);
        currentWeek = [];
      }
    });

    return grouped;
  }, [days]);

  return (
    <div className="w-full overflow-x-auto p-4 rounded-2xl glass-panel bg-[#0d0d18]/60 border border-white/10">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-gray-300 font-heading">
          Study Intensity Heatmap (Last 6 Months)
        </span>
        <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-mono">
          <span>Less</span>
          <div className="w-2.5 h-2.5 rounded-sm bg-white/[0.04] border border-white/[0.05]" />
          <div className="w-2.5 h-2.5 rounded-sm bg-[#00f0ff]/25" />
          <div className="w-2.5 h-2.5 rounded-sm bg-[#00f0ff]/50" />
          <div className="w-2.5 h-2.5 rounded-sm bg-[#00f0ff]/80" />
          <div className="w-2.5 h-2.5 rounded-sm bg-[#00f0ff] shadow-[0_0_6px_#00f0ff]" />
          <span>More</span>
        </div>
      </div>

      <div className="flex gap-1.5 pb-2">
        {weeks.map((week, weekIdx) => (
          <div key={weekIdx} className="flex flex-col gap-1.5">
            {week.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const data = activityCountMap.get(dateStr);
              const colorClass = getCellColor(data);

              const tooltipText = data
                ? `${format(day, "dd MMM yyyy")}: ${data.lectures} lectures completed, ${data.minutes}m studied`
                : `${format(day, "dd MMM yyyy")}: No study activity`;

              return (
                <div
                  key={dateStr}
                  title={tooltipText}
                  className={`w-3.5 h-3.5 rounded-sm border transition-transform duration-150 hover:scale-125 cursor-pointer ${colorClass}`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
