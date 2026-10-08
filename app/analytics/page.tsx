"use client";

import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";
import {
  BarChart3,
  Flame,
  Clock,
  CheckCircle2,
  Calendar,
  Layers,
  Award,
} from "lucide-react";
import { useStudyStore } from "@/store/useStudyStore";
import { useProgress } from "@/hooks/useProgress";
import { useStreak } from "@/hooks/useStreak";
import { ActivityHeatmap } from "@/components/ActivityHeatmap";
import {
  format,
  subDays,
  eachDayOfInterval,
  isSameDay,
  parseISO,
} from "date-fns";
import { formatDurationHuman } from "@/lib/utils";

export default function AnalyticsPage() {
  const subjects = useStudyStore((s) => s.subjects);
  const lectures = useStudyStore((s) => s.lectures);
  const sessions = useStudyStore((s) => s.sessions);

  const { stats, subjectProgressList, completionPercentage } = useProgress();
  const { currentStreak, longestStreak } = useStreak();

  // 1. Weekly Bar Chart Data (Last 7 days)
  const weeklyData = useMemo(() => {
    const today = new Date();
    const last7Days = eachDayOfInterval({ start: subDays(today, 6), end: today });

    return last7Days.map((day) => {
      const dateStr = format(day, "yyyy-MM-dd");
      const dayLabel = format(day, "EEE");

      let count = 0;
      let minutes = 0;

      lectures.forEach((l) => {
        if (l.completed && l.completedAt) {
          try {
            if (isSameDay(parseISO(l.completedAt), day)) {
              count++;
              minutes += Math.round((l.durationSec || 0) / 60);
            }
          } catch {}
        }
      });

      sessions.forEach((s) => {
        if (s.date === dateStr) {
          minutes += s.minutes || 0;
        }
      });

      return {
        day: dayLabel,
        lectures: count,
        hours: Math.round((minutes / 60) * 10) / 10,
      };
    });
  }, [lectures, sessions]);

  // 2. Last 30 Days Line Chart Data (Cumulative or daily pace)
  const thirtyDaysData = useMemo(() => {
    const today = new Date();
    const days30 = eachDayOfInterval({ start: subDays(today, 29), end: today });

    return days30.map((day) => {
      const dayLabel = format(day, "dd MMM");

      let count = 0;
      lectures.forEach((l) => {
        if (l.completed && l.completedAt) {
          try {
            if (isSameDay(parseISO(l.completedAt), day)) {
              count++;
            }
          } catch {}
        }
      });

      return {
        date: dayLabel,
        lectures: count,
      };
    });
  }, [lectures]);

  // 3. Subject-wise Donut Chart Data
  const donutData = useMemo(() => {
    return subjectProgressList
      .filter((s) => s.total > 0)
      .map((s) => ({
        name: s.subject.name,
        value: s.completed,
        color: s.subject.color,
      }));
  }, [subjectProgressList]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-heading flex items-center gap-2.5">
          <BarChart3 className="w-7 h-7 text-[#00f0ff]" />
          <span>Analytics & Study Velocity</span>
        </h1>
        <p className="text-xs sm:text-sm text-gray-400 mt-1">
          Historical trends, weekly distribution, streak durability, and subject balance
        </p>
      </div>

      {/* Top 4 Performance Badges */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Current & Longest Streak */}
        <div className="p-5 rounded-2xl glass-panel bg-white/[0.02] border border-white/10">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
            <span>Streak Durability</span>
            <Flame className="w-4 h-4 text-[#ff2e97]" />
          </div>
          <div className="font-mono text-2xl sm:text-3xl font-black text-white flex items-baseline gap-2">
            <span>{currentStreak}</span>
            <span className="text-xs text-gray-400 font-normal">
              (Best: {longestStreak}d)
            </span>
          </div>
          <div className="text-[11px] text-gray-400 mt-2 font-mono">
            Daily commitment index
          </div>
        </div>

        {/* Completed This Month */}
        <div className="p-5 rounded-2xl glass-panel bg-white/[0.02] border border-white/10">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
            <span>Monthly Output</span>
            <Calendar className="w-4 h-4 text-[#a855f7]" />
          </div>
          <div className="font-mono text-2xl sm:text-3xl font-black text-white flex items-baseline gap-1.5">
            <span>{stats.completedThisMonth}</span>
            <span className="text-xs text-gray-400 font-normal">lectures</span>
          </div>
          <div className="text-[11px] text-gray-400 mt-2 font-mono">
            {stats.completedThisWeek} completed this week
          </div>
        </div>

        {/* Total Time Invested */}
        <div className="p-5 rounded-2xl glass-panel bg-white/[0.02] border border-white/10">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
            <span>Total Study Hours</span>
            <Clock className="w-4 h-4 text-[#00f0ff]" />
          </div>
          <div className="font-mono text-2xl sm:text-3xl font-black text-white flex items-baseline gap-1.5">
            <span>{stats.totalHours}</span>
            <span className="text-xs text-gray-400 font-normal">hrs</span>
          </div>
          <div className="text-[11px] text-gray-400 mt-2 font-mono">
            Lectures + Deep Work Pomodoros
          </div>
        </div>

        {/* Overall Completion */}
        <div className="p-5 rounded-2xl glass-panel bg-white/[0.02] border border-white/10">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
            <span>Syllabus Completion</span>
            <Award className="w-4 h-4 text-[#39ff14]" />
          </div>
          <div className="font-mono text-2xl sm:text-3xl font-black text-white flex items-baseline gap-1.5">
            <span>{completionPercentage}%</span>
          </div>
          <div className="text-[11px] text-gray-400 mt-2 font-mono">
            Across {subjects.length} active subject(s)
          </div>
        </div>
      </div>

      {/* 6-Month Heatmap */}
      <div>
        <ActivityHeatmap lectures={lectures} sessions={sessions} />
      </div>

      {/* Recharts Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Bar Chart */}
        <div className="p-5 rounded-2xl glass-panel bg-white/[0.02] border border-white/10">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
            <h3 className="text-xs uppercase tracking-wider font-semibold text-gray-300 font-heading">
              Weekly Volume (Last 7 Days)
            </h3>
            <span className="text-[10px] font-mono text-gray-500">Lectures Completed</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" stroke="#6b7280" fontSize={11} />
                <YAxis stroke="#6b7280" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0d0d18",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: "0.75rem",
                    fontSize: "12px",
                  }}
                  itemStyle={{ color: "#00f0ff" }}
                />
                <Bar
                  dataKey="lectures"
                  fill="#00f0ff"
                  radius={[6, 6, 0, 0]}
                  name="Lectures Done"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 30-Day Velocity Line Chart */}
        <div className="p-5 rounded-2xl glass-panel bg-white/[0.02] border border-white/10">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
            <h3 className="text-xs uppercase tracking-wider font-semibold text-gray-300 font-heading">
              Daily Study Pace (Last 30 Days)
            </h3>
            <span className="text-[10px] font-mono text-gray-500">Pace Trend</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={thirtyDaysData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={10} interval={4} />
                <YAxis stroke="#6b7280" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0d0d18",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: "0.75rem",
                    fontSize: "12px",
                  }}
                  itemStyle={{ color: "#a855f7" }}
                />
                <Line
                  type="monotone"
                  dataKey="lectures"
                  stroke="#a855f7"
                  strokeWidth={2.5}
                  dot={{ r: 2, fill: "#a855f7" }}
                  activeDot={{ r: 5 }}
                  name="Lectures Completed"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Donut Chart & Subject Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Subject Donut Chart */}
        <div className="p-5 rounded-2xl glass-panel bg-white/[0.02] border border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-2">
              <h3 className="text-xs uppercase tracking-wider font-semibold text-gray-300 font-heading">
                Subject Distribution
              </h3>
            </div>

            {donutData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-xs text-gray-500">
                Complete some lectures to see distribution
              </div>
            ) : (
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {donutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0d0d18",
                        border: "1px solid rgba(255,255,255,0.15)",
                        borderRadius: "0.75rem",
                        fontSize: "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="space-y-1.5 pt-2 border-t border-white/10">
            {donutData.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: d.color }}
                  />
                  <span className="text-gray-300 truncate max-w-[150px]">
                    {d.name}
                  </span>
                </div>
                <span className="font-mono text-gray-400">{d.value} done</span>
              </div>
            ))}
          </div>
        </div>

        {/* Detailed Subject Completion Table (2 Cols) */}
        <div className="lg:col-span-2 p-5 rounded-2xl glass-panel bg-white/[0.02] border border-white/10">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
            <h3 className="text-xs uppercase tracking-wider font-semibold text-gray-300 font-heading">
              Subject Pace & Estimated Finish
            </h3>
          </div>

          <div className="space-y-3">
            {subjectProgressList.map((item) => (
              <div
                key={item.subject.id}
                className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.subject.color }}
                    />
                    <span className="font-semibold text-xs text-white">
                      {item.subject.name}
                    </span>
                  </div>
                  <span className="font-mono text-xs font-bold text-white">
                    {item.percentage}%
                  </span>
                </div>

                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: item.subject.color,
                    }}
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-400 font-mono pt-1">
                  <span>
                    {item.completed} / {item.total} lectures •{" "}
                    {formatDurationHuman(item.remainingDurationSec)} remaining
                  </span>

                  {item.estimation.estimatedDate ? (
                    <span className="text-[#00f0ff]">
                      Estimated completion: {item.estimation.estimatedDate} ({item.estimation.pacePerDay} lec/day)
                    </span>
                  ) : (
                    <span className="text-gray-500">Need 2-3 more days of activity to forecast finish date</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
