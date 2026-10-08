"use client";

import React, { useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  X,
  CheckCircle2,
  Circle,
  Play,
  Clock,
  Layers,
  Wand2,
} from "lucide-react";
import { useStudyStore } from "@/store/useStudyStore";
import {
  format,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  parseISO,
  isBefore,
  startOfDay,
  addDays,
} from "date-fns";
import { calculateAutoPlan, rescheduleOverdueLectures } from "@/lib/scheduling";
import { formatDurationHuman } from "@/lib/utils";
import { CalendarEventType } from "@/types";
import { toast } from "sonner";

export default function CalendarPage() {
  const subjects = useStudyStore((s) => s.subjects);
  const playlists = useStudyStore((s) => s.playlists);
  const lectures = useStudyStore((s) => s.lectures);
  const events = useStudyStore((s) => s.events);
  const settings = useStudyStore((s) => s.settings);

  const scheduleLecture = useStudyStore((s) => s.scheduleLecture);
  const batchScheduleLectures = useStudyStore((s) => s.batchScheduleLectures);
  const toggleLectureComplete = useStudyStore((s) => s.toggleLectureComplete);
  const setActiveVideoLecture = useStudyStore((s) => s.setActiveVideoLecture);
  const addEvent = useStudyStore((s) => s.addEvent);
  const deleteEvent = useStudyStore((s) => s.deleteEvent);

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [isDayPanelOpen, setIsDayPanelOpen] = useState(false);

  // Auto-Plan Modal State
  const [isAutoPlanOpen, setIsAutoPlanOpen] = useState(false);
  const [autoPlanPlaylistId, setAutoPlanPlaylistId] = useState<string>(
    playlists[0]?.id || ""
  );
  const [autoPlanMode, setAutoPlanMode] = useState<"by_rate" | "by_date" | "alternate_days" | "preset_duration">("by_rate");
  const [autoPlanRate, setAutoPlanRate] = useState<number>(settings.dailyGoalLectures || 2);
  const [autoPlanTargetDate, setAutoPlanTargetDate] = useState<string>(
    format(addDays(new Date(), 14), "yyyy-MM-dd")
  );
  const [autoPlanSkipSundays, setAutoPlanSkipSundays] = useState(true);
  const [autoPlanSkipSaturdays, setAutoPlanSkipSaturdays] = useState(false);
  const [autoPlanDayGap, setAutoPlanDayGap] = useState<number>(2);
  const [autoPlanPresetDays, setAutoPlanPresetDays] = useState<number>(7);
  const [autoPlanPreview, setAutoPlanPreview] = useState<{ lectureId: string; date: string }[] | null>(null);

  // Custom Event Add Modal State
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventType, setNewEventType] = useState<CalendarEventType>("exam");
  const [newEventDate, setNewEventDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [newEventTime, setNewEventTime] = useState("10:00");
  const [newEventSubjectId, setNewEventSubjectId] = useState(subjects[0]?.id || "");

  const todayStr = format(new Date(), "yyyy-MM-dd");

  // Overdue lectures
  const overdueLectures = lectures.filter(
    (l) => !l.completed && l.scheduledDate && l.scheduledDate < todayStr
  );

  // Month day grid calculation
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const monthDays = eachDayOfInterval({ start: startDate, end: endDate });

  // Week day calculation
  const weekStart = startOfWeek(selectedDay, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const activeDays = viewMode === "month" ? monthDays : weekDays;

  // Reschedule all overdue lectures
  const handleRescheduleOverdue = () => {
    const assignments = rescheduleOverdueLectures(
      lectures,
      settings.dailyGoalLectures || 3,
      true
    );
    if (assignments.length === 0) {
      toast.info("No overdue lectures to reschedule.");
      return;
    }
    batchScheduleLectures(assignments);
    toast.success(`Rescheduled ${assignments.length} overdue lectures starting today!`);
  };

  // Preview Auto Plan
  const handleGenerateAutoPlanPreview = () => {
    const targetLectures = autoPlanPlaylistId
      ? lectures.filter((l) => l.playlistId === autoPlanPlaylistId)
      : lectures;

    const assignments = calculateAutoPlan(targetLectures, {
      mode: autoPlanMode,
      targetDate: autoPlanTargetDate,
      lecturesPerDay: autoPlanRate,
      dayGap: autoPlanDayGap,
      presetDays: autoPlanPresetDays,
      skipSundays: autoPlanSkipSundays,
      skipSaturdays: autoPlanSkipSaturdays,
    });

    if (assignments.length === 0) {
      toast.info("All lectures in this playlist are already completed!");
      return;
    }

    setAutoPlanPreview(assignments);
  };

  // Apply Auto Plan
  const handleApplyAutoPlan = () => {
    if (!autoPlanPreview || autoPlanPreview.length === 0) return;
    batchScheduleLectures(autoPlanPreview);
    toast.success(`Scheduled ${autoPlanPreview.length} lectures successfully!`);
    setIsAutoPlanOpen(false);
    setAutoPlanPreview(null);
  };

  // Handle Event Creation
  const handleCreateEvent = () => {
    if (!newEventTitle.trim()) {
      toast.error("Please enter an event title");
      return;
    }
    addEvent({
      title: newEventTitle.trim(),
      type: newEventType,
      date: newEventDate,
      time: newEventTime,
      subjectId: newEventSubjectId || undefined,
    });
    toast.success("Event added to calendar!");
    setIsAddEventOpen(false);
    setNewEventTitle("");
  };

  const selectedDateStr = format(selectedDay, "yyyy-MM-dd");
  const selectedDayLectures = lectures.filter((l) => l.scheduledDate === selectedDateStr);
  const selectedDayEvents = events.filter((e) => e.date === selectedDateStr);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header & View Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-heading flex items-center gap-2.5">
            <CalendarDays className="w-7 h-7 text-[#00f0ff]" />
            <span>Study Schedule & Calendar</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Visual planner, drag-n-drop scheduling, and automated smart pacing
          </p>
        </div>

        {/* Global Calendar Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              if (playlists.length > 0) {
                setAutoPlanPlaylistId(playlists[0].id);
              }
              setIsAutoPlanOpen(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#00f0ff] to-[#a855f7] text-black font-semibold text-xs hover:brightness-110 shadow-[0_0_15px_rgba(0,240,255,0.3)] cursor-pointer"
          >
            <Wand2 className="w-4 h-4 text-black" />
            <span>Auto-Plan</span>
          </button>

          <button
            onClick={() => setIsAddEventOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-white font-semibold text-xs hover:bg-white/10 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Event</span>
          </button>
        </div>
      </div>

      {/* Overdue Warning & Quick Reschedule Banner */}
      {overdueLectures.length > 0 && (
        <div className="p-4 rounded-2xl glass-panel bg-red-500/[0.07] border border-red-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <div className="text-xs">
              <span className="font-bold text-white block">
                {overdueLectures.length} Incomplete Overdue Lectures
              </span>
              <span className="text-gray-300">
                Lectures scheduled in the past that were missed. Push them forward with one click.
              </span>
            </div>
          </div>

          <button
            onClick={handleRescheduleOverdue}
            className="px-4 py-2 rounded-xl bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30 font-semibold text-xs transition-colors flex items-center gap-2 cursor-pointer shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reschedule All Overdue</span>
          </button>
        </div>
      )}

      {/* Calendar Controls & Month/Week Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl glass-panel bg-white/[0.02] border border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-1.5 rounded-lg bg-white/[0.04] text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentMonth(new Date())}
              className="px-2.5 py-1 rounded-lg text-xs font-mono text-gray-300 hover:text-white cursor-pointer"
            >
              Today
            </button>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-1.5 rounded-lg bg-white/[0.04] text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <h2 className="text-base sm:text-lg font-bold text-white font-heading">
            {format(currentMonth, "MMMM yyyy")}
          </h2>
        </div>

        {/* View Switcher: Month / Week */}
        <div className="flex items-center gap-1 p-1 bg-white/[0.04] rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setViewMode("month")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              viewMode === "month"
                ? "bg-[#00f0ff] text-black shadow-sm"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Month View
          </button>
          <button
            onClick={() => setViewMode("week")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              viewMode === "week"
                ? "bg-[#00f0ff] text-black shadow-sm"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Week View
          </button>
        </div>
      </div>

      {/* Days of Week Header */}
      <div className="grid grid-cols-7 gap-2 text-center text-xs font-mono font-semibold text-gray-400 py-1">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>

      {/* Main Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {activeDays.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isToday = isSameDay(day, new Date());
          const isSelected = isSameDay(day, selectedDay);

          const dayLectures = lectures.filter((l) => l.scheduledDate === dateStr);
          const dayEvents = events.filter((e) => e.date === dateStr);
          const isOverdue = !dayLectures.every((l) => l.completed) && dateStr < todayStr;
          const isWorkloadHigh = dayLectures.length > (settings.dailyGoalLectures || 3);

          return (
            <div
              key={dateStr}
              onClick={() => {
                setSelectedDay(day);
                setIsDayPanelOpen(true);
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const lectureId = e.dataTransfer.getData("text/plain");
                if (lectureId) {
                  scheduleLecture(lectureId, dateStr);
                  toast.success(`Rescheduled to ${dateStr}`);
                }
              }}
              className={`min-h-[105px] sm:min-h-[125px] p-2 rounded-xl border flex flex-col justify-between transition-all cursor-pointer relative ${
                isCurrentMonth ? "bg-white/[0.02]" : "bg-white/[0.005] opacity-40"
              } ${
                isToday
                  ? "border-[#00f0ff] shadow-[0_0_15px_rgba(0,240,255,0.25)] ring-1 ring-[#00f0ff]"
                  : isSelected
                  ? "border-white/30 bg-white/[0.06]"
                  : "border-white/10 hover:border-white/20"
              }`}
            >
              {/* Day Cell Header: Number + Badges */}
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-mono font-bold ${
                    isToday ? "text-[#00f0ff]" : isCurrentMonth ? "text-white" : "text-gray-500"
                  }`}
                >
                  {format(day, "d")}
                </span>

                <div className="flex items-center gap-1">
                  {isWorkloadHigh && (
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-amber-400"
                      title="Workload exceeds daily goal"
                    />
                  )}
                  {isOverdue && (
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-red-400"
                      title="Overdue lectures pending"
                    />
                  )}
                </div>
              </div>

              {/* Lecture & Event Badges inside Cell */}
              <div className="space-y-1 mt-1 overflow-hidden flex-1">
                {dayEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="text-[10px] px-1.5 py-0.5 rounded truncate font-mono font-semibold bg-[#ffb800]/20 text-[#ffb800] border border-[#ffb800]/30"
                  >
                    ★ {evt.title}
                  </div>
                ))}

                {dayLectures.slice(0, 3).map((lec) => {
                  const sub = subjects.find((s) => s.id === lec.subjectId);
                  return (
                    <div
                      key={lec.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", lec.id);
                      }}
                      className={`text-[10px] px-1.5 py-0.5 rounded truncate flex items-center gap-1 font-mono transition-transform active:scale-95 ${
                        lec.completed
                          ? "bg-white/5 text-gray-500 line-through"
                          : "bg-white/10 text-white"
                      }`}
                      style={{
                        borderLeft: `2.5px solid ${sub?.color || "#00f0ff"}`,
                      }}
                    >
                      {lec.completed ? (
                        <CheckCircle2 className="w-2.5 h-2.5 text-[#39ff14] shrink-0" />
                      ) : (
                        <Circle className="w-2.5 h-2.5 text-gray-500 shrink-0" />
                      )}
                      <span className="truncate">#{lec.order} {lec.title}</span>
                    </div>
                  );
                })}

                {dayLectures.length > 3 && (
                  <div className="text-[9px] font-mono text-gray-400 text-center">
                    +{dayLectures.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Day Details Drawer Modal / Side Panel */}
      {isDayPanelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md h-full bg-[#0d0d18] border-l border-white/10 p-6 flex flex-col justify-between shadow-2xl overflow-y-auto">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white font-heading">
                    {format(selectedDay, "EEEE, dd MMMM yyyy")}
                  </h3>
                  <p className="text-xs text-gray-400 font-mono">
                    {selectedDayLectures.length} lectures scheduled
                  </p>
                </div>
                <button
                  onClick={() => setIsDayPanelOpen(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Events for this day */}
              {selectedDayEvents.length > 0 && (
                <div className="space-y-2 mb-6">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-gray-400 block">
                    Events & Milestones
                  </span>
                  {selectedDayEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className="p-3 rounded-xl bg-[#ffb800]/10 border border-[#ffb800]/30 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-amber-300">
                          {evt.title} ({evt.type})
                        </div>
                        {evt.time && (
                          <div className="text-[10px] text-gray-400 font-mono">
                            Time: {evt.time}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          deleteEvent(evt.id);
                          toast.success("Event deleted");
                        }}
                        className="text-gray-400 hover:text-red-400 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Lectures List for this day */}
              <div className="space-y-3">
                <span className="text-[11px] font-mono uppercase tracking-wider text-gray-400 block">
                  Scheduled Lectures
                </span>

                {selectedDayLectures.length === 0 ? (
                  <div className="p-6 text-center text-xs text-gray-500 rounded-xl bg-white/[0.02] border border-white/5">
                    No lectures scheduled for this date.
                  </div>
                ) : (
                  selectedDayLectures.map((lec) => {
                    const sub = subjects.find((s) => s.id === lec.subjectId);
                    return (
                      <div
                        key={lec.id}
                        className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <button
                            onClick={() => {
                              toggleLectureComplete(lec.id);
                              toast.success(
                                lec.completed ? "Marked pending" : "Completed!"
                              );
                            }}
                            className="cursor-pointer shrink-0"
                          >
                            {lec.completed ? (
                              <CheckCircle2 className="w-4 h-4 text-[#39ff14]" />
                            ) : (
                              <Circle className="w-4 h-4 text-gray-500" />
                            )}
                          </button>

                          <div className="min-w-0">
                            <h5
                              onClick={() => {
                                setIsDayPanelOpen(false);
                                setActiveVideoLecture(lec);
                              }}
                              className="font-medium text-white truncate cursor-pointer hover:text-[#00f0ff]"
                            >
                              #{lec.order} {lec.title}
                            </h5>
                            <div className="flex items-center gap-2 text-[10px] font-mono text-gray-400">
                              {sub && <span>{sub.name}</span>}
                              <span>•</span>
                              <span>{formatDurationHuman(lec.durationSec)}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setIsDayPanelOpen(false);
                            setActiveVideoLecture(lec);
                          }}
                          className="p-2 rounded-lg bg-[#00f0ff] text-black hover:bg-[#00f0ff]/90 cursor-pointer shrink-0"
                          title="Watch Lecture"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Bottom Panel Actions */}
            <div className="pt-4 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setIsDayPanelOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-gray-300 hover:text-white bg-white/[0.05] border border-white/10"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto-Plan Generator Modal */}
      {isAutoPlanOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-xl max-h-[85vh] overflow-y-auto p-6 sm:p-8 rounded-2xl glass-panel bg-[#0d0d18] border border-white/10 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <Wand2 className="w-5 h-5 text-[#00f0ff]" />
                <h3 className="text-lg font-bold text-white font-heading">
                  Auto-Plan Pacing Engine
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsAutoPlanOpen(false);
                  setAutoPlanPreview(null);
                }}
                className="p-1 rounded-lg text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step 1: Select Playlist */}
            <div>
              <label className="text-xs text-gray-300 block mb-1.5 font-medium">
                Select Playlist to Schedule
              </label>
              <select
                value={autoPlanPlaylistId}
                onChange={(e) => {
                  setAutoPlanPlaylistId(e.target.value);
                  setAutoPlanPreview(null);
                }}
                className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs focus:outline-none focus:border-[#00f0ff]"
              >
                {playlists.map((pl) => (
                  <option key={pl.id} value={pl.id} className="bg-[#0d0d18] text-white">
                    {pl.title} ({lectures.filter((l) => l.playlistId === pl.id && !l.completed).length} pending)
                  </option>
                ))}
              </select>
            </div>

            {/* Step 2: Choose Mode */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { mode: "by_rate" as const, label: "Daily Quota", desc: "Fixed N lectures per day", color: "#00f0ff" },
                { mode: "by_date" as const, label: "Finish by Date", desc: "Distribute evenly till target", color: "#a855f7" },
                { mode: "alternate_days" as const, label: "Alternate Days", desc: "Study every other day / gap", color: "#39ff14" },
                { mode: "preset_duration" as const, label: "Quick Duration", desc: "Finish in 1 week / 2 weeks / month", color: "#ffb800" },
              ].map((opt) => (
                <button
                  key={opt.mode}
                  onClick={() => {
                    setAutoPlanMode(opt.mode);
                    setAutoPlanPreview(null);
                  }}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    autoPlanMode === opt.mode
                      ? `bg-white/[0.08] shadow-[0_0_15px_rgba(0,240,255,0.15)]`
                      : "bg-white/[0.02] border-white/10 hover:bg-white/[0.04]"
                  }`}
                  style={{
                    borderColor: autoPlanMode === opt.mode ? opt.color : undefined,
                  }}
                >
                  <span className="font-bold text-xs text-white block">
                    {opt.label}
                  </span>
                  <span className="text-[11px] text-gray-400">
                    {opt.desc}
                  </span>
                </button>
              ))}
            </div>

            {/* Conditional Parameters per Mode */}
            {autoPlanMode === "by_rate" && (
              <div>
                <label className="text-xs text-gray-300 block mb-1.5 font-medium">
                  Lectures per day:
                </label>
                <input
                  type="number"
                  min="1"
                  max="15"
                  value={autoPlanRate}
                  onChange={(e) => setAutoPlanRate(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-[#00f0ff]"
                />
              </div>
            )}

            {autoPlanMode === "by_date" && (
              <div>
                <label className="text-xs text-gray-300 block mb-1.5 font-medium">
                  Target Finish Date:
                </label>
                <input
                  type="date"
                  value={autoPlanTargetDate}
                  min={format(new Date(), "yyyy-MM-dd")}
                  onChange={(e) => setAutoPlanTargetDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-[#a855f7]"
                />
              </div>
            )}

            {autoPlanMode === "alternate_days" && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-300 block mb-1.5 font-medium">
                    Study every:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { gap: 2, label: "Alternate Day", sub: "Every 2nd day" },
                      { gap: 3, label: "Every 3rd Day", sub: "2 days gap" },
                      { gap: 4, label: "Every 4th Day", sub: "3 days gap" },
                    ].map((opt) => (
                      <button
                        key={opt.gap}
                        type="button"
                        onClick={() => { setAutoPlanDayGap(opt.gap); setAutoPlanPreview(null); }}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                          autoPlanDayGap === opt.gap
                            ? "bg-white/[0.08] border-[#39ff14] shadow-[0_0_10px_rgba(57,255,20,0.15)]"
                            : "bg-white/[0.02] border-white/10 hover:bg-white/[0.04]"
                        }`}
                      >
                        <span className="font-bold text-xs text-white block">{opt.label}</span>
                        <span className="text-[10px] text-gray-400">{opt.sub}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-300 block mb-1.5 font-medium">
                    Lectures per study day:
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="15"
                    value={autoPlanRate}
                    onChange={(e) => setAutoPlanRate(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-[#39ff14]"
                  />
                </div>
              </div>
            )}

            {autoPlanMode === "preset_duration" && (
              <div>
                <label className="text-xs text-gray-300 block mb-1.5 font-medium">
                  Complete playlist within:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { days: 7, label: "1 Week", sub: "7 days" },
                    { days: 14, label: "2 Weeks", sub: "14 days" },
                    { days: 30, label: "1 Month", sub: "30 days" },
                  ].map((opt) => (
                    <button
                      key={opt.days}
                      type="button"
                      onClick={() => { setAutoPlanPresetDays(opt.days); setAutoPlanPreview(null); }}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        autoPlanPresetDays === opt.days
                          ? "bg-white/[0.08] border-[#ffb800] shadow-[0_0_10px_rgba(255,184,0,0.15)]"
                          : "bg-white/[0.02] border-white/10 hover:bg-white/[0.04]"
                      }`}
                    >
                      <span className="font-bold text-sm text-white block">{opt.label}</span>
                      <span className="text-[10px] text-gray-400">{opt.sub}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Skip Days Options */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="skipSundays"
                  checked={autoPlanSkipSundays}
                  onChange={(e) => setAutoPlanSkipSundays(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#00f0ff]"
                />
                <label htmlFor="skipSundays" className="text-xs text-gray-300 cursor-pointer">
                  Skip Sundays (revision / rest day)
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="skipSaturdays"
                  checked={autoPlanSkipSaturdays}
                  onChange={(e) => setAutoPlanSkipSaturdays(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#a855f7]"
                />
                <label htmlFor="skipSaturdays" className="text-xs text-gray-300 cursor-pointer">
                  Skip Saturdays (keep weekends free)
                </label>
              </div>
            </div>

            {/* Preview Section */}
            {autoPlanPreview && (
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 text-xs text-gray-300 space-y-1">
                <span className="font-semibold text-white block">Schedule Preview:</span>
                <div>
                  Will distribute{" "}
                  <span className="text-[#00f0ff] font-mono">{autoPlanPreview.length}</span>{" "}
                  lectures from{" "}
                  <span className="font-mono text-gray-200">
                    {autoPlanPreview[0]?.date}
                  </span>{" "}
                  to{" "}
                  <span className="font-mono text-gray-200">
                    {autoPlanPreview[autoPlanPreview.length - 1]?.date}
                  </span>.
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
              <button
                onClick={() => {
                  setIsAutoPlanOpen(false);
                  setAutoPlanPreview(null);
                }}
                className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white"
              >
                Cancel
              </button>

              {!autoPlanPreview ? (
                <button
                  onClick={handleGenerateAutoPlanPreview}
                  className="px-5 py-2 rounded-xl bg-white/10 text-white font-semibold text-xs hover:bg-white/20 transition-colors"
                >
                  Generate Preview
                </button>
              ) : (
                <button
                  onClick={handleApplyAutoPlan}
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-[#00f0ff] to-[#39ff14] text-black font-semibold text-xs hover:brightness-110 shadow-[0_0_15px_rgba(57,255,20,0.3)]"
                >
                  Apply Schedule
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Custom Event Modal */}
      {isAddEventOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl glass-panel bg-[#0d0d18] border border-white/10 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-base font-bold text-white font-heading">
                Add Calendar Event
              </h3>
              <button
                onClick={() => setIsAddEventOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs text-gray-300 block mb-1">Event Title</label>
              <input
                type="text"
                placeholder="e.g. End Semester Exam, Mock Test 2, Revision Sprint"
                value={newEventTitle}
                onChange={(e) => setNewEventTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-300 block mb-1">Type</label>
                <select
                  value={newEventType}
                  onChange={(e) => setNewEventType(e.target.value as CalendarEventType)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0d0d18] border border-white/10 text-white text-xs"
                >
                  <option value="exam">Exam</option>
                  <option value="test">Test</option>
                  <option value="revision">Revision</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-300 block mb-1">Time (Optional)</label>
                <input
                  type="time"
                  value={newEventTime}
                  onChange={(e) => setNewEventTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-300 block mb-1">Date</label>
              <input
                type="date"
                value={newEventDate}
                onChange={(e) => setNewEventDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs font-mono"
              />
            </div>

            {subjects.length > 0 && (
              <div>
                <label className="text-xs text-gray-300 block mb-1">
                  Associate with Subject (Optional)
                </label>
                <select
                  value={newEventSubjectId}
                  onChange={(e) => setNewEventSubjectId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0d0d18] border border-white/10 text-white text-xs"
                >
                  <option value="">None</option>
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3">
              <button
                onClick={() => setIsAddEventOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateEvent}
                className="px-5 py-2 rounded-xl bg-[#00f0ff] text-black font-semibold text-xs hover:bg-[#00f0ff]/90"
              >
                Save Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
