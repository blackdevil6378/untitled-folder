"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Shield,
  ShieldCheck,
  ExternalLink,
  Youtube,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Sparkles,
  RotateCcw,
  BookOpen,
  Terminal,
  Calendar,
  Layers,
  ChevronRight,
  Flame,
} from "lucide-react";
import {
  THM_ROOMS,
  THM_MODULES,
  buildDaySchedule,
  DayPlan,
  ThmRoom,
} from "@/lib/ethicalHackingData";
import { toast } from "sonner";

export default function EthicalHackingPage() {
  const [selectedModuleId, setSelectedModuleId] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL"); // ALL, F, P
  const [statusFilter, setStatusFilter] = useState<string>("ALL"); // ALL, DONE, PENDING
  const [savedState, setSavedState] = useState<Record<string, boolean>>({});
  const [isClient, setIsClient] = useState(false);

  // Load saved progress from localStorage (shared key with standalone HTML)
  useEffect(() => {
    setIsClient(true);
    try {
      const stored = localStorage.getItem("thmlab15");
      if (stored) {
        setSavedState(JSON.parse(stored));
      }
    } catch (err) {
      console.error("Failed to load progress from localStorage", err);
    }
  }, []);

  // Save to localStorage
  const updateProgress = (key: string, value: boolean) => {
    setSavedState((prev) => {
      const updated = { ...prev, [key]: value };
      if (!value) {
        delete updated[key];
      }
      try {
        localStorage.setItem("thmlab15", JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to save progress to localStorage", e);
      }
      return updated;
    });
  };

  // Toggle room completion
  const toggleRoom = (slug: string, title: string) => {
    const nextVal = !savedState[slug];
    updateProgress(slug, nextVal);
    if (nextVal) {
      toast.success(`Completed: ${title}`, {
        icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
      });
    }
  };

  // Toggle revision day
  const toggleRevision = (dayNumber: number) => {
    const key = `rv${dayNumber}`;
    updateProgress(key, !savedState[key]);
  };

  // Toggle watch module video
  const toggleWatchModule = (modId: number) => {
    const key = `w${modId}`;
    updateProgress(key, !savedState[key]);
  };

  // Reset all progress
  const resetAll = () => {
    if (window.confirm("Are you sure you want to reset all Ethical Hacking lab progress?")) {
      try {
        localStorage.removeItem("thmlab15");
        setSavedState({});
        toast.info("Progress reset successfully");
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Build the complete day schedule
  const allDays = useMemo(() => buildDaySchedule(), []);

  // Stats calculation
  const totalRooms = THM_ROOMS.length;
  const completedRoomsCount = useMemo(() => {
    return THM_ROOMS.filter((r) => savedState[r.slug]).length;
  }, [savedState]);

  const completionPercentage = totalRooms > 0 ? Math.round((completedRoomsCount / totalRooms) * 100) : 0;

  // Format minutes into hours and minutes
  const formatTime = (minutes: number) => {
    if (minutes >= 60) {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      return `${h}h${m > 0 ? ` ${m}m` : ""}`;
    }
    return `${minutes}m`;
  };

  // Get active module info
  const activeModule = THM_MODULES.find((m) => m.id === selectedModuleId) || THM_MODULES[0];

  // Days belonging to the active module
  const moduleDays = useMemo(() => {
    return allDays.filter((d) => d.moduleIndex === selectedModuleId);
  }, [allDays, selectedModuleId]);

  // Compute stats for current module
  const moduleStats = useMemo(() => {
    let roomCount = 0;
    let minsCount = 0;
    let doneCount = 0;

    moduleDays.forEach((d) => {
      if (!d.isRevision && d.part < 2) {
        d.rooms.forEach((r) => {
          roomCount++;
          minsCount += r.minutes;
          if (savedState[r.slug]) doneCount++;
        });
      }
    });

    return {
      roomCount,
      minsCount,
      doneCount,
      startDay: moduleDays[0]?.dayNumber || 1,
      endDay: moduleDays[moduleDays.length - 1]?.dayNumber || 1,
    };
  }, [moduleDays, savedState]);

  // Search filter across current view or all
  const filteredDays = useMemo(() => {
    if (!searchQuery.trim() && difficultyFilter === "ALL" && typeFilter === "ALL" && statusFilter === "ALL") {
      return moduleDays;
    }

    const query = searchQuery.toLowerCase().trim();

    return moduleDays
      .map((day) => {
        if (day.isRevision) {
          if (searchQuery.trim() || difficultyFilter !== "ALL" || typeFilter !== "ALL") {
            return null;
          }
          if (statusFilter === "DONE" && !savedState[`rv${day.dayNumber}`]) return null;
          if (statusFilter === "PENDING" && savedState[`rv${day.dayNumber}`]) return null;
          return day;
        }

        const filteredRooms = day.rooms.filter((room) => {
          const matchQuery =
            !query ||
            room.title.toLowerCase().includes(query) ||
            room.slug.toLowerCase().includes(query);

          const matchDiff =
            difficultyFilter === "ALL" ||
            room.difficulty.toLowerCase() === difficultyFilter.toLowerCase();

          const matchType = typeFilter === "ALL" || room.type === typeFilter;

          const isDone = !!savedState[room.slug];
          const matchStatus =
            statusFilter === "ALL" ||
            (statusFilter === "DONE" && isDone) ||
            (statusFilter === "PENDING" && !isDone);

          return matchQuery && matchDiff && matchType && matchStatus;
        });

        if (filteredRooms.length === 0) return null;

        return {
          ...day,
          rooms: filteredRooms,
        };
      })
      .filter(Boolean) as DayPlan[];
  }, [moduleDays, searchQuery, difficultyFilter, typeFilter, statusFilter, savedState]);

  // YouTube search query URL
  const getYoutubeLink = (moduleTitle: string) => {
    const cleanTitle = moduleTitle.replace("Module ", "M").replace(":", " ");
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(
      `Practical Ethical Hacking course ${cleanTitle}`
    )}`;
  };

  const getDifficultyBadge = (diff: string) => {
    switch (diff.toLowerCase()) {
      case "info":
        return "bg-cyan-500/10 text-cyan-400 border-cyan-500/30";
      case "easy":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "medium":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "hard":
        return "bg-rose-500/10 text-rose-400 border-rose-500/30";
      case "insane":
        return "bg-purple-500/10 text-purple-400 border-purple-500/30";
      default:
        return "bg-gray-500/10 text-gray-400 border-gray-500/30";
    }
  };

  return (
    <div className="min-h-screen px-4 md:px-8 py-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c0d1e] via-[#090a14] to-[#120e24] border border-white/[0.08] p-6 md:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-gradient-to-br from-[#00f0ff]/15 to-[#ff2e97]/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00f0ff]/10 border border-[#00f0ff]/30 text-[#00f0ff] text-xs font-mono font-semibold tracking-wide">
              <Shield className="w-3.5 h-3.5" />
              <span>PRACTICAL ETHICAL HACKING LABS</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#00f0ff] animate-pulse" />
            </div>

            <h1 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
              Ethical Hacking Plan
              <span className="text-sm font-mono font-normal text-gray-400 bg-white/[0.05] border border-white/10 px-3 py-1 rounded-xl">
                1.5 hrs/day
              </span>
            </h1>

            <p className="text-sm md:text-base text-gray-400 max-w-2xl leading-relaxed">
              Curated master schedule mapping video modules to all <strong className="text-white">1,057+ TryHackMe</strong> rooms, revision days, and hands-on labs with persistent tracking.
            </p>
          </div>

          {/* Quick Header Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="/ethical-hacking.html"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs font-semibold text-gray-200 transition-all hover:scale-[1.02]"
              title="Open the standalone lightweight HTML single-page view"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#00f0ff]" />
              <span>Standalone HTML</span>
            </a>

            <button
              onClick={resetAll}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-rose-500/10 border border-white/10 hover:border-rose-500/30 text-xs font-semibold text-gray-400 hover:text-rose-400 transition-all cursor-pointer"
              title="Reset all completed room marks"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="mt-8 pt-6 border-t border-white/[0.08] space-y-3">
          <div className="flex flex-wrap items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-4 text-gray-300">
              <span className="flex items-center gap-1.5 text-white font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                {isClient ? completedRoomsCount : 0} / {totalRooms} rooms finished
              </span>
              <span className="text-gray-500">|</span>
              <span className="text-gray-400">
                {allDays.length} total scheduled days
              </span>
            </div>
            <span className="font-bold text-[#00f0ff]">
              {isClient ? completionPercentage : 0}% Complete
            </span>
          </div>

          <div className="w-full h-3 bg-white/[0.06] rounded-full overflow-hidden p-0.5 border border-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-red-500 via-amber-400 via-emerald-400 via-blue-500 to-purple-500 transition-all duration-500"
              style={{ width: `${isClient ? completionPercentage : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Module Selector Tabs (Horizontal Scroll) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-wider text-gray-400 uppercase flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#00f0ff]" />
            Course Modules ({THM_MODULES.length})
          </h2>
          <span className="text-xs text-gray-500 font-mono">Select a module to view daily lab schedule</span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none select-none">
          {THM_MODULES.map((mod) => {
            const isSelected = mod.id === selectedModuleId;
            const daysInMod = allDays.filter((d) => d.moduleIndex === mod.id).length;
            if (daysInMod === 0) return null;

            return (
              <button
                key={mod.id}
                onClick={() => setSelectedModuleId(mod.id)}
                className={`flex-none flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                  isSelected
                    ? "text-white shadow-lg scale-[1.02]"
                    : "bg-white/[0.03] text-gray-400 hover:text-white hover:bg-white/[0.07] border-white/[0.08]"
                }`}
                style={{
                  backgroundColor: isSelected ? mod.color : undefined,
                  borderColor: isSelected ? mod.color : undefined,
                  boxShadow: isSelected ? `0 0 16px ${mod.color}60` : undefined,
                }}
              >
                <span>{mod.title.replace(/^Module /, "M").replace(/^Bonus /, "B")}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                    isSelected ? "bg-black/30 text-white" : "bg-white/10 text-gray-400"
                  }`}
                >
                  {daysInMod}d
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Module Overview Card */}
      <div
        className="rounded-2xl p-6 border text-white relative overflow-hidden transition-all shadow-xl"
        style={{
          background: `linear-gradient(135deg, ${activeModule.color}25 0%, #0d0d18 80%)`,
          borderColor: `${activeModule.color}60`,
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="text-xs font-mono uppercase tracking-widest opacity-80 flex items-center gap-1.5">
              <span>Day {moduleStats.startDay} - Day {moduleStats.endDay}</span>
              <span>•</span>
              <span>{moduleStats.roomCount} Rooms</span>
              <span>•</span>
              <span>~{formatTime(moduleStats.minsCount)} Labs</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">{activeModule.title}</h2>
          </div>

          {/* YouTube Video Link */}
          <div className="flex items-center gap-3">
            <a
              href={getYoutubeLink(activeModule.title)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-lg shadow-red-600/30 transition-all hover:scale-105"
            >
              <Youtube className="w-4 h-4 fill-white" />
              <span>Watch on YouTube</span>
              <span className="text-[10px] bg-black/30 px-2 py-0.5 rounded font-mono">
                {activeModule.videoStart}
              </span>
            </a>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-white/[0.02] p-3 rounded-2xl border border-white/[0.08]">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search rooms in this module by title or room code..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00f0ff]/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-white"
            >
              ×
            </button>
          )}
        </div>

        {/* Filter Badges */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Difficulty Filter */}
          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-gray-300 focus:outline-none focus:border-[#00f0ff]/50 cursor-pointer"
          >
            <option value="ALL">All Difficulties</option>
            <option value="Info">Info</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
            <option value="Insane">Insane</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-gray-300 focus:outline-none focus:border-[#00f0ff]/50 cursor-pointer"
          >
            <option value="ALL">Free & Premium</option>
            <option value="F">Free Rooms Only</option>
            <option value="P">Premium Only</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-gray-300 focus:outline-none focus:border-[#00f0ff]/50 cursor-pointer"
          >
            <option value="ALL">All Status</option>
            <option value="PENDING">Pending Only</option>
            <option value="DONE">Completed Only</option>
          </select>
        </div>
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDays.map((day) => {
          if (day.isRevision) {
            const isDone = isClient && !!savedState[`rv${day.dayNumber}`];
            return (
              <div
                key={`day-${day.dayNumber}`}
                className={`rounded-2xl p-5 border transition-all ${
                  isDone
                    ? "bg-white/[0.02] border-emerald-500/30 opacity-70"
                    : "bg-white/[0.03] border-white/10 hover:border-white/20"
                }`}
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(45deg, rgba(255,255,255,0.02), rgba(255,255,255,0.02) 10px, transparent 10px, transparent 20px)",
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-400 font-mono text-xs font-bold border border-purple-500/30">
                      Day {day.dayNumber}
                    </span>
                    <span className="text-xs font-semibold text-purple-300">
                      Weekly Revision
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-gray-500">~90m</span>
                </div>

                <label className="flex items-start gap-3 p-3 rounded-xl bg-purple-500/5 border border-purple-500/20 cursor-pointer hover:bg-purple-500/10 transition-colors">
                  <input
                    type="checkbox"
                    checked={isDone}
                    onChange={() => toggleRevision(day.dayNumber)}
                    className="w-4 h-4 mt-0.5 rounded border-purple-400 accent-purple-500 cursor-pointer"
                  />
                  <div className="text-xs">
                    <p className={`font-semibold ${isDone ? "line-through text-gray-400" : "text-white"}`}>
                      Revision Day: Review notes & write-ups
                    </p>
                    <p className="text-gray-400 text-[11px] mt-0.5">
                      Review previous 6 days of rooms, solidify methodology, and organize personal notes.
                    </p>
                  </div>
                </label>
              </div>
            );
          }

          const allRoomsDone =
            isClient &&
            day.rooms.length > 0 &&
            day.rooms.every((r) => savedState[r.slug]);

          return (
            <div
              key={`day-${day.dayNumber}`}
              className={`rounded-2xl p-5 border transition-all flex flex-col justify-between ${
                allRoomsDone
                  ? "bg-white/[0.02] border-emerald-500/30 opacity-70"
                  : "bg-white/[0.03] border-white/10 hover:border-white/20"
              }`}
              style={{
                borderLeftWidth: "4px",
                borderLeftColor: activeModule.color,
              }}
            >
              <div>
                {/* Day Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="px-2.5 py-1 rounded-lg text-white font-mono text-xs font-bold"
                      style={{ backgroundColor: activeModule.color }}
                    >
                      Day {day.dayNumber}
                    </span>
                    <span className="text-xs font-mono text-gray-400">
                      ~{formatTime(day.targetMinutes)}
                      {day.parts > 1 && ` • Part ${day.part}/${day.parts}`}
                    </span>
                  </div>
                </div>

                {/* First day of module video banner */}
                {day.isFirstInModule && (
                  <div className="mb-3 p-2.5 rounded-xl bg-white/[0.04] border border-white/10 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isClient && !!savedState[`w${day.moduleIndex}`]}
                        onChange={() => toggleWatchModule(day.moduleIndex)}
                        className="w-4 h-4 rounded border-gray-400 accent-[#00f0ff] cursor-pointer"
                      />
                      <span className="text-xs font-semibold text-gray-200">
                        Watch Module Video
                      </span>
                    </label>
                    <div className="flex items-center justify-between text-[11px] text-gray-400 pl-6">
                      <span>Starts at: {activeModule.videoStart}</span>
                      <a
                        href={getYoutubeLink(activeModule.title)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#00f0ff] hover:underline flex items-center gap-1 font-semibold"
                      >
                        YouTube ↗
                      </a>
                    </div>
                  </div>
                )}

                {/* Rooms List */}
                {day.rooms.length === 0 ? (
                  <p className="text-xs text-gray-500 py-3 italic">
                    Watch the lecture videos and take detailed notes.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {day.rooms.map((room) => {
                      const isCompleted = isClient && !!savedState[room.slug];

                      return (
                        <div
                          key={room.slug}
                          className={`flex items-start gap-2.5 p-2 rounded-xl transition-all ${
                            isCompleted
                              ? "bg-white/[0.01] opacity-60"
                              : "bg-white/[0.03] hover:bg-white/[0.06]"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isCompleted}
                            onChange={() => toggleRoom(room.slug, room.title)}
                            className="w-4 h-4 mt-0.5 rounded border-gray-500 accent-emerald-500 cursor-pointer flex-none"
                            id={`chk-${day.dayNumber}-${room.slug}`}
                          />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <a
                                href={`https://tryhackme.com/room/${room.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`text-xs font-semibold hover:text-[#00f0ff] transition-colors truncate max-w-[200px] sm:max-w-xs ${
                                  isCompleted ? "line-through text-gray-500" : "text-gray-200"
                                }`}
                                title={`Open ${room.title} on TryHackMe`}
                              >
                                {room.title}
                              </a>
                              <ExternalLink className="w-2.5 h-2.5 text-gray-500 flex-none" />
                            </div>

                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              {/* Free / Premium Badge */}
                              <span
                                className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                                  room.type === "F"
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                    : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                }`}
                              >
                                {room.type === "F" ? "FREE" : "PREMIUM"}
                              </span>

                              {/* Difficulty Badge */}
                              <span
                                className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${getDifficultyBadge(
                                  room.difficulty
                                )}`}
                              >
                                {room.difficulty}
                              </span>

                              {/* Duration */}
                              <span className="text-[10px] text-gray-500 font-mono">
                                ~{formatTime(room.minutes)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredDays.length === 0 && (
        <div className="text-center py-16 space-y-3 bg-white/[0.02] rounded-3xl border border-white/[0.08]">
          <Search className="w-8 h-8 text-gray-500 mx-auto" />
          <h3 className="text-base font-semibold text-gray-300">No rooms found</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Try adjusting your search term or filters to see more days in this module.
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setDifficultyFilter("ALL");
              setTypeFilter("ALL");
              setStatusFilter("ALL");
            }}
            className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs text-white"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
}
