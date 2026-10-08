"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Flame,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  Calendar,
  Layers,
  ArrowRight,
  PlusCircle,
  HelpCircle,
  BotMessageSquare,
  BookmarkCheck,
} from "lucide-react";
import { useStudyStore } from "@/store/useStudyStore";
import { useProgress } from "@/hooks/useProgress";
import { useStreak } from "@/hooks/useStreak";
import { formatDurationHuman, formatDigitalTime } from "@/lib/utils";
import { getRevisionCandidates } from "@/lib/streak";
import { EmptyState } from "@/components/EmptyState";
import { format, differenceInCalendarDays, parseISO } from "date-fns";
import { toast } from "sonner";

export default function DashboardPage() {
  const settings = useStudyStore((s) => s.settings);
  const subjects = useStudyStore((s) => s.subjects);
  const playlists = useStudyStore((s) => s.playlists);
  const lectures = useStudyStore((s) => s.lectures);
  const events = useStudyStore((s) => s.events);
  const setIsAddPlaylistOpen = useStudyStore((s) => s.setIsAddPlaylistOpen);
  const setActiveVideoLecture = useStudyStore((s) => s.setActiveVideoLecture);
  const toggleLectureComplete = useStudyStore((s) => s.toggleLectureComplete);
  const markRevised = useStudyStore((s) => s.markRevised);
  const loadDemoData = useStudyStore((s) => s.loadDemoData);

  const { stats, dailyGoal, dailyGoalPercentage, subjectProgressList } =
    useProgress();
  const { currentStreak, studiedToday } = useStreak();

  const [aiBriefing, setAiBriefing] = useState<string | null>(null);
  const [loadingAiBriefing, setLoadingAiBriefing] = useState(false);

  // Time-of-day greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const todayStr = format(new Date(), "yyyy-MM-dd");

  // Today's scheduled lectures & overdue
  const todayLectures = lectures.filter((l) => l.scheduledDate === todayStr);
  const overdueLectures = lectures.filter(
    (l) => !l.completed && l.scheduledDate && l.scheduledDate < todayStr
  );

  // Spaced revision items
  const revisionList = getRevisionCandidates(lectures).slice(0, 4);

  // Continue where left off: latest incomplete or watched lecture
  const continueLecture =
    lectures.find((l) => !l.completed && l.watchedSec > 0) ||
    todayLectures.find((l) => !l.completed) ||
    lectures.find((l) => !l.completed);

  const continueSubject = continueLecture
    ? subjects.find((s) => s.id === continueLecture.subjectId)
    : null;

  // Upcoming Exams
  const upcomingExams = events
    .filter((e) => e.type === "exam" && e.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date));

  // Generate / Fetch AI Briefing
  const fetchAiBriefing = async () => {
    if (!settings.geminiKey) {
      setAiBriefing(
        settings.language === "hinglish"
          ? `Focus on consistency aaj! Target: ${dailyGoal} lectures. Agar thoda mushkil lage, ek 25-min Pomodoro se shuru karo. Let's conquer it!`
          : `Keep your consistency alive today! Target: ${dailyGoal} lectures. Start with one 25-minute Pomodoro sprint. Let's make it count!`
      );
      return;
    }

    setLoadingAiBriefing(true);
    try {
      const summaryPayload = {
        name: settings.userName,
        completedToday: stats.completedToday,
        streak: currentStreak,
        overdueCount: overdueLectures.length,
        todayCount: todayLectures.length,
        totalSubjects: subjects.length,
      };

      const promptText = `You are an honest, motivating study mentor for ${settings.userName}. 
Provide a punchy 2-sentence morning briefing in ${settings.language} (casual tone, real-life analogy, actionable focus).
Current status JSON: ${JSON.stringify(summaryPayload)}`;

      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-gemini-key": settings.geminiKey || "",
          "x-ollama-url": settings.ollamaUrl || "http://127.0.0.1:11434",
          "x-ollama-model": settings.ollamaModel || "qwen3.5:2b",
          "x-ai-provider": settings.aiProvider || "auto",
        },
        body: JSON.stringify({
          action: "generate",
          model: settings.geminiModel || "gemini-3.8-flash",
          contents: [{ parts: [{ text: promptText }] }],
        }),
      });

      const data = await res.json();
      if (data.reply) {
        setAiBriefing(data.reply);
      }
    } catch {
      setAiBriefing("Stay focused and tackle your scheduled lectures one by one!");
    } finally {
      setLoadingAiBriefing(false);
    }
  };

  useEffect(() => {
    if (subjects.length > 0) {
      fetchAiBriefing();
    }
  }, [subjects.length]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Greeting Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-heading flex items-center gap-3">
            <span>
              {getGreeting()}, {settings.userName || "Aspirant"}
            </span>
            <span className="text-2xl animate-pulse">⚡</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            {format(new Date(), "EEEE, dd MMMM yyyy")} • Your personal study command center
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAddPlaylistOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#00f0ff] to-[#a855f7] text-black font-semibold text-xs hover:brightness-110 shadow-[0_0_20px_rgba(0,240,255,0.3)] transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-black stroke-[2.5]" />
            <span>Add Playlist</span>
          </button>
        </div>
      </div>

      {/* In-App Alert Banner for Overdue / Today's Pending */}
      {(overdueLectures.length > 0 || todayLectures.length > 0) && (
        <div className="p-4 rounded-2xl glass-panel bg-amber-500/[0.06] border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_0_25px_rgba(255,184,0,0.1)]">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-bold text-white block">
                {overdueLectures.length > 0
                  ? `Attention: You have ${overdueLectures.length} overdue lecture(s)`
                  : `Today's Schedule: ${todayLectures.filter((l) => !l.completed).length} pending lecture(s)`}
              </span>
              <span className="text-gray-300">
                {overdueLectures.length > 0
                  ? "Overdue lectures delay your overall target date. You can reschedule them automatically on the Calendar."
                  : "Finish today's quota to maintain your streak and keep up with your target pace."}
              </span>
            </div>
          </div>
          <Link
            href="/calendar"
            className="self-start sm:self-center px-3.5 py-1.5 rounded-xl bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-semibold hover:bg-amber-400/30 transition-all flex items-center gap-1.5 shrink-0"
          >
            <span>Open Calendar</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Empty State if no subjects/playlists */}
      {subjects.length === 0 ? (
        <div className="space-y-6">
          <EmptyState
            icon={Layers}
            title="Your Command Center is Empty"
            description="Paste a YouTube playlist link (DSA, System Design, Physics, Web Dev) to generate structured courses and start tracking."
            actionLabel="+ Add Your First Playlist"
            onAction={() => setIsAddPlaylistOpen(true)}
            accentColor="cyan"
          />

          <div className="text-center">
            <span className="text-xs text-gray-500 block mb-2">Want to test right now?</span>
            <button
              onClick={loadDemoData}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/[0.05] border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#00f0ff]" />
              <span>Load Demo Playlists & Data</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Key Metric Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Daily Goal Card */}
            <div className="p-4 sm:p-5 rounded-2xl glass-panel bg-white/[0.02] border border-white/10 relative overflow-hidden group hover:border-[#00f0ff]/30 transition-all">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                <span>Today&apos;s Goal</span>
                <span className="font-mono text-[#00f0ff]">
                  {stats.completedToday} / {dailyGoal}
                </span>
              </div>
              <div className="font-mono text-2xl sm:text-3xl font-black text-white">
                {dailyGoalPercentage}%
              </div>
              <div className="w-full bg-white/10 h-1.5 rounded-full mt-3 overflow-hidden">
                <div
                  className="bg-[#00f0ff] h-full rounded-full transition-all duration-500 shadow-[0_0_10px_#00f0ff]"
                  style={{ width: `${dailyGoalPercentage}%` }}
                />
              </div>
            </div>

            {/* Streak Card */}
            <div className="p-4 sm:p-5 rounded-2xl glass-panel bg-white/[0.02] border border-white/10 relative overflow-hidden group hover:border-[#ff2e97]/30 transition-all">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                <span>Streak</span>
                <Flame
                  className={`w-4 h-4 ${
                    currentStreak > 0 ? "text-[#ff2e97] animate-pulse" : "text-gray-600"
                  }`}
                />
              </div>
              <div className="font-mono text-2xl sm:text-3xl font-black text-white flex items-baseline gap-1.5">
                <span>{currentStreak}</span>
                <span className="text-xs font-normal text-gray-400">days</span>
              </div>
              <div className="text-[11px] text-gray-400 mt-2 font-mono">
                {studiedToday ? (
                  <span className="text-[#39ff14]">✓ Active today</span>
                ) : (
                  <span className="text-amber-400">Complete 1 lecture today!</span>
                )}
              </div>
            </div>

            {/* Total Hours Card */}
            <div className="p-4 sm:p-5 rounded-2xl glass-panel bg-white/[0.02] border border-white/10 relative overflow-hidden group hover:border-[#a855f7]/30 transition-all">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                <span>Total Study Time</span>
                <Clock className="w-4 h-4 text-[#a855f7]" />
              </div>
              <div className="font-mono text-2xl sm:text-3xl font-black text-white flex items-baseline gap-1.5">
                <span>{stats.totalHours}</span>
                <span className="text-xs font-normal text-gray-400">hours</span>
              </div>
              <div className="text-[11px] text-gray-400 mt-2 font-mono">
                <span>{stats.completedThisWeek} lectures this week</span>
              </div>
            </div>

            {/* Total Lectures Done Card */}
            <div className="p-4 sm:p-5 rounded-2xl glass-panel bg-white/[0.02] border border-white/10 relative overflow-hidden group hover:border-[#39ff14]/30 transition-all">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                <span>Lectures Done</span>
                <CheckCircle2 className="w-4 h-4 text-[#39ff14]" />
              </div>
              <div className="font-mono text-2xl sm:text-3xl font-black text-white flex items-baseline gap-1.5">
                <span>{lectures.filter((l) => l.completed).length}</span>
                <span className="text-xs font-normal text-gray-500">
                  / {lectures.length}
                </span>
              </div>
              <div className="text-[11px] text-gray-400 mt-2 font-mono">
                <span>
                  {lectures.length > 0
                    ? Math.round(
                        (lectures.filter((l) => l.completed).length / lectures.length) *
                          100
                      )
                    : 0}
                  % total completion
                </span>
              </div>
            </div>
          </div>

          {/* AI Focus Card & Continue Watching Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* AI Focus Card (1 Col) */}
            <div className="p-5 rounded-2xl glass-panel bg-gradient-to-br from-[#00f0ff]/[0.03] to-[#a855f7]/[0.05] border border-white/10 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                  <div className="flex items-center gap-2 text-white font-semibold text-xs tracking-wider uppercase font-heading">
                    <Sparkles className="w-4 h-4 text-[#00f0ff]" />
                    <span>AI Morning Briefing</span>
                  </div>
                  <button
                    onClick={fetchAiBriefing}
                    disabled={loadingAiBriefing}
                    className="p-1 rounded text-gray-400 hover:text-white cursor-pointer"
                    title="Refresh briefing"
                  >
                    <RotateCcw
                      className={`w-3.5 h-3.5 ${
                        loadingAiBriefing ? "animate-spin text-[#00f0ff]" : ""
                      }`}
                    />
                  </button>
                </div>

                <p className="text-xs sm:text-sm text-gray-300 leading-relaxed italic">
                  &ldquo;{aiBriefing || "Loading mentor insights..."}&rdquo;
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                <span className="text-[11px] text-gray-500 font-mono">
                  Gemini Study Intelligence
                </span>
                <Link
                  href="/ai-mentor"
                  className="text-xs text-[#00f0ff] hover:underline flex items-center gap-1"
                >
                  Ask AI <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {/* Continue Where Left Off (2 Cols) */}
            {continueLecture ? (
              <div className="lg:col-span-2 p-5 rounded-2xl glass-panel bg-white/[0.02] border border-white/10 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                    <span className="text-xs uppercase tracking-wider text-gray-400 font-semibold font-heading">
                      Continue Where You Left Off
                    </span>
                    {continueSubject && (
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${continueSubject.color}20`,
                          color: continueSubject.color,
                        }}
                      >
                        {continueSubject.name}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 items-start">
                    {continueLecture.thumbnail && (
                      <div className="relative group shrink-0">
                        <img
                          src={continueLecture.thumbnail}
                          alt={continueLecture.title}
                          className="w-full sm:w-40 h-24 object-cover rounded-xl border border-white/10"
                        />
                        <button
                          onClick={() => setActiveVideoLecture(continueLecture)}
                          className="absolute inset-0 m-auto w-10 h-10 rounded-full bg-[#00f0ff] text-black flex items-center justify-center shadow-[0_0_15px_#00f0ff] opacity-90 group-hover:scale-110 transition-transform cursor-pointer"
                        >
                          <Play className="w-5 h-5 fill-current ml-0.5" />
                        </button>
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm sm:text-base font-bold text-white line-clamp-2">
                        #{continueLecture.order}: {continueLecture.title}
                      </h4>
                      <div className="flex items-center gap-3 mt-2 text-xs font-mono text-gray-400">
                        <span>
                          {formatDurationHuman(continueLecture.durationSec)}
                        </span>
                        {continueLecture.watchedSec > 0 && (
                          <span className="text-[#00f0ff]">
                            Watched: {formatDigitalTime(continueLecture.watchedSec)}
                          </span>
                        )}
                      </div>

                      {continueLecture.notes && (
                        <p className="mt-2 text-xs text-gray-400 line-clamp-1 italic bg-white/[0.03] p-1.5 rounded-lg border border-white/5">
                          Note: {continueLecture.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                  <button
                    onClick={() => {
                      toggleLectureComplete(continueLecture.id);
                      toast.success("Toggled completion!");
                    }}
                    className="text-xs text-gray-400 hover:text-white flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Quick Complete</span>
                  </button>

                  <button
                    onClick={() => setActiveVideoLecture(continueLecture)}
                    className="px-4 py-1.5 rounded-xl bg-[#00f0ff] text-black font-semibold text-xs hover:bg-[#00f0ff]/90 flex items-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(0,240,255,0.3)]"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Resume Video</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="lg:col-span-2 p-5 rounded-2xl glass-panel bg-white/[0.02] border border-white/10 flex items-center justify-center text-center">
                <span className="text-xs text-gray-400">
                  🎉 All current lectures are completed! Add a new playlist or revise.
                </span>
              </div>
            )}
          </div>

          {/* Spaced Revision & Upcoming Exams */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Spaced Revision Card */}
            <div className="p-5 rounded-2xl glass-panel bg-white/[0.02] border border-white/10">
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-gray-300 font-semibold font-heading">
                  <BookmarkCheck className="w-4 h-4 text-[#ff2e97]" />
                  <span>Revise Today (Spaced Repetition)</span>
                </div>
                <span className="text-[10px] font-mono text-gray-500">
                  {revisionList.length} candidate(s)
                </span>
              </div>

              {revisionList.length === 0 ? (
                <div className="text-center py-6 text-xs text-gray-500">
                  No lectures due for revision right now! Mark lectures with the bookmark flag or complete them to trigger 3/7/15 day cycles.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {revisionList.map((lec) => {
                    const sub = subjects.find((s) => s.id === lec.subjectId);
                    return (
                      <div
                        key={lec.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/20 transition-all text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          {sub && (
                            <div
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: sub.color }}
                            />
                          )}
                          <span className="text-gray-200 truncate font-medium">
                            #{lec.order} {lec.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => {
                              markRevised(lec.id);
                              toast.success("Revision counted!");
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#39ff14]/10 text-[#39ff14] border border-[#39ff14]/30 hover:bg-[#39ff14]/20 transition-colors font-mono text-[11px] cursor-pointer"
                          >
                            Mark Revised ({lec.revisionCount || 0})
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Upcoming Exams Countdown */}
            <div className="p-5 rounded-2xl glass-panel bg-white/[0.02] border border-white/10">
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-gray-300 font-semibold font-heading">
                  <Calendar className="w-4 h-4 text-[#ffb800]" />
                  <span>Upcoming Exams & Milestones</span>
                </div>
                <Link
                  href="/calendar"
                  className="text-[10px] text-gray-400 hover:text-white"
                >
                  Manage
                </Link>
              </div>

              {upcomingExams.length === 0 ? (
                <div className="text-center py-6 text-xs text-gray-500">
                  No upcoming exams added. You can add exam dates in Subject settings or on the Calendar.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {upcomingExams.map((exam) => {
                    const daysLeft = differenceInCalendarDays(
                      parseISO(exam.date),
                      new Date()
                    );
                    const sub = subjects.find((s) => s.id === exam.subjectId);

                    return (
                      <div
                        key={exam.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs"
                      >
                        <div className="min-w-0 pr-3">
                          <div className="font-semibold text-white truncate">
                            {exam.title}
                          </div>
                          <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                            {format(parseISO(exam.date), "dd MMM yyyy")}{" "}
                            {sub && `• ${sub.name}`}
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <span
                            className={`px-2.5 py-1 rounded-lg font-mono font-bold text-xs ${
                              daysLeft <= 3
                                ? "bg-red-500/20 text-red-400 border border-red-500/40"
                                : daysLeft <= 14
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                : "bg-[#00f0ff]/15 text-[#00f0ff] border border-[#00f0ff]/30"
                            }`}
                          >
                            {daysLeft === 0
                              ? "TODAY"
                              : daysLeft === 1
                              ? "Tomorrow"
                              : `${daysLeft} days left`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Subjects Progress Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white font-heading">
                Subjects Overview
              </h3>
              <Link
                href="/subjects"
                className="text-xs text-[#00f0ff] hover:underline flex items-center gap-1"
              >
                View all subjects <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subjectProgressList.map((item) => (
                <Link
                  key={item.subject.id}
                  href={`/subjects?id=${item.subject.id}`}
                  className="p-5 rounded-2xl glass-panel bg-white/[0.02] border border-white/10 hover:border-white/20 transition-all group block"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-3.5 h-3.5 rounded-full shadow-sm"
                        style={{ backgroundColor: item.subject.color }}
                      />
                      <h4 className="font-bold text-white text-sm group-hover:text-[#00f0ff] transition-colors truncate">
                        {item.subject.name}
                      </h4>
                    </div>
                    <span className="text-xs font-mono font-bold text-white">
                      {item.percentage}%
                    </span>
                  </div>

                  <div className="w-full bg-white/10 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${item.percentage}%`,
                        backgroundColor: item.subject.color,
                        boxShadow: `0 0 10px ${item.subject.color}`,
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-gray-400 font-mono mt-3">
                    <span>
                      {item.completed} / {item.total} lectures
                    </span>
                    <span>{formatDurationHuman(item.remainingDurationSec)} left</span>
                  </div>

                  {item.estimation.estimatedDate && (
                    <div className="mt-2.5 pt-2 border-t border-white/5 text-[10px] text-gray-500 font-mono">
                      Estimated finish:{" "}
                      <span className="text-gray-300">
                        {item.estimation.estimatedDate}
                      </span>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
