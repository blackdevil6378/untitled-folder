"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  FolderKanban,
  PlusCircle,
  Play,
  CheckCircle2,
  Circle,
  Bookmark,
  BookmarkCheck,
  Calendar,
  Clock,
  Search,
  Filter,
  Trash2,
  Edit2,
  FileText,
  ChevronRight,
  MoreVertical,
  CheckSquare,
  Square,
  Sparkles,
} from "lucide-react";
import { useStudyStore } from "@/store/useStudyStore";
import { formatDurationHuman } from "@/lib/utils";
import { EmptyState } from "@/components/EmptyState";
import { format, differenceInCalendarDays, parseISO } from "date-fns";
import { toast } from "sonner";

function SubjectsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const subjectIdParam = searchParams.get("id");

  const subjects = useStudyStore((s) => s.subjects);
  const playlists = useStudyStore((s) => s.playlists);
  const lectures = useStudyStore((s) => s.lectures);
  const setIsAddPlaylistOpen = useStudyStore((s) => s.setIsAddPlaylistOpen);
  const setActiveVideoLecture = useStudyStore((s) => s.setActiveVideoLecture);
  const toggleLectureComplete = useStudyStore((s) => s.toggleLectureComplete);
  const toggleLectureDifficult = useStudyStore((s) => s.toggleLectureDifficult);
  const deleteSubject = useStudyStore((s) => s.deleteSubject);
  const deletePlaylist = useStudyStore((s) => s.deletePlaylist);
  const updateSubject = useStudyStore((s) => s.updateSubject);
  const scheduleLecture = useStudyStore((s) => s.scheduleLecture);
  const batchToggleComplete = useStudyStore((s) => s.batchToggleComplete);
  const batchScheduleLectures = useStudyStore((s) => s.batchScheduleLectures);

  // Active selected subject
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(
    subjectIdParam || (subjects.length > 0 ? subjects[0].id : null)
  );

  // Selected playlist tab
  const [activePlaylistId, setActivePlaylistId] = useState<string | "all">("all");

  // Lecture filters & search
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "pending" | "completed" | "difficult">("all");

  // Bulk selection
  const [selectedLectureIds, setSelectedLectureIds] = useState<Set<string>>(new Set());
  const [bulkScheduleDate, setBulkScheduleDate] = useState("");

  // Quick edit modal / states
  const [editingSubject, setEditingSubject] = useState<{ id: string; name: string; examDate?: string } | null>(null);

  const activeSubject = subjects.find((s) => s.id === selectedSubjectId);

  // Filtered lectures for active subject
  const subjectLectures = lectures.filter((l) => {
    if (!selectedSubjectId) return true;
    return l.subjectId === selectedSubjectId;
  });

  const displayLectures = subjectLectures.filter((l) => {
    if (activePlaylistId !== "all" && l.playlistId !== activePlaylistId) return false;
    if (filterType === "pending" && l.completed) return false;
    if (filterType === "completed" && !l.completed) return false;
    if (filterType === "difficult" && !l.difficult) return false;
    if (searchQuery.trim() && !l.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Calculate subject progress stats
  const getSubjectStats = (subjId: string) => {
    const list = lectures.filter((l) => l.subjectId === subjId);
    const completed = list.filter((l) => l.completed).length;
    const total = list.length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    const totalDuration = list.reduce((acc, l) => acc + (l.durationSec || 0), 0);
    const remainingDuration = list.reduce((acc, l) => {
      if (l.completed) return acc;
      return acc + Math.max(0, (l.durationSec || 0) - (l.watchedSec || 0));
    }, 0);
    return { completed, total, pct, totalDuration, remainingDuration };
  };

  const handleToggleSelectLecture = (id: string) => {
    const next = new Set(selectedLectureIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedLectureIds(next);
  };

  const handleSelectAllVisible = () => {
    if (selectedLectureIds.size === displayLectures.length) {
      setSelectedLectureIds(new Set());
    } else {
      setSelectedLectureIds(new Set(displayLectures.map((l) => l.id)));
    }
  };

  const handleBulkComplete = (completed: boolean) => {
    batchToggleComplete(Array.from(selectedLectureIds), completed);
    toast.success(`Marked ${selectedLectureIds.size} lectures as ${completed ? "completed" : "pending"}!`);
    setSelectedLectureIds(new Set());
  };

  const handleBulkSchedule = () => {
    if (!bulkScheduleDate) {
      toast.error("Please pick a date first.");
      return;
    }
    const assignments = Array.from(selectedLectureIds).map((id) => ({
      lectureId: id,
      date: bulkScheduleDate,
    }));
    batchScheduleLectures(assignments);
    toast.success(`Scheduled ${assignments.length} lectures for ${bulkScheduleDate}!`);
    setSelectedLectureIds(new Set());
  };

  if (subjects.length === 0) {
    return (
      <div className="p-4 sm:p-8 max-w-5xl mx-auto">
        <EmptyState
          icon={FolderKanban}
          title="No Subjects Yet"
          description="Create your first subject by adding a YouTube playlist. Each playlist is organized with order, completion, notes, and speed control."
          actionLabel="+ Add YouTube Playlist"
          onAction={() => setIsAddPlaylistOpen(true)}
          accentColor="purple"
        />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-heading flex items-center gap-2.5">
            <FolderKanban className="w-7 h-7 text-[#00f0ff]" />
            <span>Subjects & Playlists</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Browse structured courses, watch embedded with notes, and schedule lectures
          </p>
        </div>

        <button
          onClick={() => setIsAddPlaylistOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#00f0ff] to-[#a855f7] text-black font-semibold text-xs hover:brightness-110 shadow-[0_0_20px_rgba(0,240,255,0.3)] transition-all cursor-pointer self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4 text-black stroke-[2.5]" />
          <span>Add Playlist</span>
        </button>
      </div>

      {/* Subject Horizontal Pill Cards Bar */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
        {subjects.map((sub) => {
          const stats = getSubjectStats(sub.id);
          const isSelected = sub.id === selectedSubjectId;

          return (
            <button
              key={sub.id}
              onClick={() => {
                setSelectedSubjectId(sub.id);
                setActivePlaylistId("all");
                setSelectedLectureIds(new Set());
              }}
              className={`p-3.5 rounded-2xl border text-left min-w-[220px] transition-all cursor-pointer shrink-0 ${
                isSelected
                  ? "bg-white/[0.08] border-[#00f0ff] shadow-[0_0_20px_rgba(0,240,255,0.2)]"
                  : "bg-white/[0.02] border-white/10 hover:bg-white/[0.05]"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: sub.color }}
                  />
                  <span className="font-bold text-xs text-white truncate font-heading">
                    {sub.name}
                  </span>
                </div>
                <span className="text-[11px] font-mono font-bold text-gray-300">
                  {stats.pct}%
                </span>
              </div>

              <div className="w-full bg-white/10 h-1.5 rounded-full mt-2.5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${stats.pct}%`,
                    backgroundColor: sub.color,
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono mt-2">
                <span>
                  {stats.completed}/{stats.total} lectures
                </span>
                <span>{formatDurationHuman(stats.remainingDuration)} left</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Subject Detail Area */}
      {activeSubject && (
        <div className="space-y-6">
          {/* Subject Banner & Actions */}
          <div className="p-6 rounded-2xl glass-panel bg-white/[0.02] border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: activeSubject.color }}
                />
                <h2 className="text-xl sm:text-2xl font-black text-white font-heading">
                  {activeSubject.name}
                </h2>
                {activeSubject.examDate && (
                  <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-[#ffb800]/15 text-[#ffb800] border border-[#ffb800]/30">
                    Exam: {activeSubject.examDate}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 font-mono">
                {playlists.filter((p) => p.subjectId === activeSubject.id).length} playlist(s) •{" "}
                {subjectLectures.length} total lectures
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setEditingSubject({
                    id: activeSubject.id,
                    name: activeSubject.name,
                    examDate: activeSubject.examDate || "",
                  })
                }
                className="p-2 rounded-xl bg-white/[0.04] border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Edit Subject"
              >
                <Edit2 className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  if (
                    confirm(
                      `Are you sure you want to delete "${activeSubject.name}" and all its playlists/lectures?`
                    )
                  ) {
                    deleteSubject(activeSubject.id);
                    setSelectedSubjectId(
                      subjects.filter((s) => s.id !== activeSubject.id)[0]?.id || null
                    );
                    toast.success("Subject deleted.");
                  }
                }}
                className="p-2 rounded-xl bg-white/[0.04] border border-white/10 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer"
                title="Delete Subject"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Playlist Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setActivePlaylistId("all")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activePlaylistId === "all"
                  ? "bg-[#00f0ff] text-black shadow-[0_0_15px_rgba(0,240,255,0.3)]"
                  : "bg-white/[0.04] text-gray-400 hover:text-white border border-white/5"
              }`}
            >
              All Playlists ({subjectLectures.length})
            </button>

            {playlists
              .filter((p) => p.subjectId === activeSubject.id)
              .map((pl) => (
                <button
                  key={pl.id}
                  onClick={() => setActivePlaylistId(pl.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer truncate max-w-xs ${
                    activePlaylistId === pl.id
                      ? "bg-[#00f0ff] text-black shadow-[0_0_15px_rgba(0,240,255,0.3)]"
                      : "bg-white/[0.04] text-gray-400 hover:text-white border border-white/5"
                  }`}
                >
                  {pl.title}
                </button>
              ))}
          </div>

          {/* Search, Filter & Bulk Action Toolbar */}
          <div className="p-4 rounded-2xl glass-panel bg-white/[0.02] border border-white/10 space-y-3">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              {/* Search input */}
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search lectures..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-[#00f0ff]"
                />
              </div>

              {/* Status Filter Buttons */}
              <div className="flex gap-1.5 w-full sm:w-auto overflow-x-auto">
                {(["all", "pending", "completed", "difficult"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-3 py-1.5 rounded-lg text-xs capitalize transition-colors cursor-pointer ${
                      filterType === type
                        ? "bg-white/15 text-white font-semibold border border-white/20"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Bulk Selection Actions Bar */}
            {selectedLectureIds.size > 0 && (
              <div className="p-3 rounded-xl bg-[#00f0ff]/10 border border-[#00f0ff]/30 flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in duration-150">
                <span className="font-semibold text-white font-mono">
                  {selectedLectureIds.size} lecture(s) selected
                </span>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleBulkComplete(true)}
                    className="px-2.5 py-1 rounded-lg bg-[#39ff14] text-black font-semibold hover:brightness-110 cursor-pointer"
                  >
                    Mark Done
                  </button>
                  <button
                    onClick={() => handleBulkComplete(false)}
                    className="px-2.5 py-1 rounded-lg bg-white/10 text-white hover:bg-white/20 cursor-pointer"
                  >
                    Mark Pending
                  </button>

                  <div className="flex items-center gap-1.5">
                    <input
                      type="date"
                      value={bulkScheduleDate}
                      onChange={(e) => setBulkScheduleDate(e.target.value)}
                      className="px-2 py-1 rounded-lg bg-black/40 border border-white/20 text-white text-[11px] font-mono"
                    />
                    <button
                      onClick={handleBulkSchedule}
                      className="px-2.5 py-1 rounded-lg bg-[#00f0ff] text-black font-semibold hover:brightness-110 cursor-pointer"
                    >
                      Schedule
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Lecture List Header & Select All */}
          <div className="flex items-center justify-between text-xs text-gray-400 px-2">
            <button
              onClick={handleSelectAllVisible}
              className="flex items-center gap-2 hover:text-white cursor-pointer"
            >
              {selectedLectureIds.size === displayLectures.length && displayLectures.length > 0 ? (
                <CheckSquare className="w-4 h-4 text-[#00f0ff]" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              <span>Select All Visible ({displayLectures.length})</span>
            </button>

            <span className="font-mono">
              Showing {displayLectures.length} of {subjectLectures.length}
            </span>
          </div>

          {/* Lecture Cards List */}
          <div className="space-y-2.5">
            {displayLectures.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-500 rounded-2xl glass-panel bg-white/[0.01] border border-white/5">
                No lectures found matching your filter or search query.
              </div>
            ) : (
              displayLectures.map((lec) => {
                const isSelected = selectedLectureIds.has(lec.id);

                return (
                  <div
                    key={lec.id}
                    className={`p-3.5 sm:p-4 rounded-2xl glass-panel border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                      lec.completed
                        ? "bg-white/[0.015] border-white/5 opacity-80"
                        : "bg-white/[0.03] border-white/10 hover:border-white/25"
                    } ${isSelected ? "border-[#00f0ff]/50 bg-[#00f0ff]/[0.03]" : ""}`}
                  >
                    {/* Left: Checkbox + Thumbnail + Info */}
                    <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                      {/* Checkbox for bulk */}
                      <button
                        onClick={() => handleToggleSelectLecture(lec.id)}
                        className="mt-1 sm:mt-0 text-gray-500 hover:text-white cursor-pointer"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-[#00f0ff]" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>

                      {/* Video Thumbnail */}
                      <div
                        onClick={() => setActiveVideoLecture(lec)}
                        className="relative w-24 sm:w-28 h-16 rounded-xl overflow-hidden bg-black shrink-0 border border-white/10 group cursor-pointer"
                      >
                        <img
                          src={lec.thumbnail}
                          alt={lec.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Play className="w-5 h-5 text-[#00f0ff] fill-current" />
                        </div>
                        {lec.watchedSec > 0 && lec.durationSec > 0 && (
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/60">
                            <div
                              className="bg-[#00f0ff] h-full"
                              style={{
                                width: `${Math.min(
                                  100,
                                  (lec.watchedSec / lec.durationSec) * 100
                                )}%`,
                              }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Title & Metadata */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="font-mono text-xs text-gray-400">
                            #{lec.order}
                          </span>
                          <h4
                            onClick={() => setActiveVideoLecture(lec)}
                            className="font-semibold text-xs sm:text-sm text-white hover:text-[#00f0ff] transition-colors cursor-pointer truncate"
                          >
                            {lec.title}
                          </h4>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px] font-mono text-gray-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-gray-500" />
                            {formatDurationHuman(lec.durationSec)}
                          </span>

                          {lec.scheduledDate && (
                            <span className="flex items-center gap-1 text-[#00f0ff]">
                              <Calendar className="w-3 h-3" />
                              {lec.scheduledDate}
                            </span>
                          )}

                          {lec.notes && (
                            <span className="flex items-center gap-1 text-gray-300">
                              <FileText className="w-3 h-3 text-[#a855f7]" />
                              Note saved
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Quick Action Buttons */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {/* Difficult flag toggle */}
                      <button
                        onClick={() => {
                          toggleLectureDifficult(lec.id);
                          toast.info(
                            lec.difficult
                              ? "Removed from difficult"
                              : "Flagged as difficult for revision"
                          );
                        }}
                        className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                          lec.difficult
                            ? "bg-[#ff2e97]/20 border-[#ff2e97]/40 text-[#ff2e97]"
                            : "bg-white/[0.04] border-white/5 text-gray-500 hover:text-white"
                        }`}
                        title={lec.difficult ? "Difficult Flagged" : "Flag Difficult"}
                      >
                        {lec.difficult ? (
                          <BookmarkCheck className="w-3.5 h-3.5" />
                        ) : (
                          <Bookmark className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {/* Single Schedule Date Picker */}
                      <input
                        type="date"
                        value={lec.scheduledDate || ""}
                        onChange={(e) => {
                          scheduleLecture(lec.id, e.target.value || undefined);
                          toast.success("Schedule updated!");
                        }}
                        className="p-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-[11px] font-mono"
                        title="Schedule Date"
                      />

                      {/* Complete Checkbox Toggle */}
                      <button
                        onClick={() => {
                          toggleLectureComplete(lec.id);
                          toast.success(
                            lec.completed ? "Marked as pending" : "Completed!"
                          );
                        }}
                        className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                          lec.completed
                            ? "bg-[#39ff14]/15 border-[#39ff14]/40 text-[#39ff14]"
                            : "bg-white/[0.04] border-white/10 text-gray-400 hover:text-white"
                        }`}
                        title={lec.completed ? "Completed" : "Mark Done"}
                      >
                        {lec.completed ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <Circle className="w-4 h-4" />
                        )}
                      </button>

                      {/* Watch Video Button */}
                      <button
                        onClick={() => setActiveVideoLecture(lec)}
                        className="px-3 py-1.5 rounded-xl bg-[#00f0ff] text-black font-semibold text-xs hover:bg-[#00f0ff]/90 flex items-center gap-1.5 shadow-[0_0_12px_rgba(0,240,255,0.3)] cursor-pointer"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span className="hidden md:inline">Watch</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Subject Edit Modal */}
      {editingSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl glass-panel bg-[#0d0d18] border border-white/10 space-y-4">
            <h3 className="text-base font-bold text-white font-heading">
              Edit Subject
            </h3>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Subject Name</label>
              <input
                type="text"
                value={editingSubject.name}
                onChange={(e) =>
                  setEditingSubject({ ...editingSubject, name: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">
                Exam Date (Optional)
              </label>
              <input
                type="date"
                value={editingSubject.examDate || ""}
                onChange={(e) =>
                  setEditingSubject({ ...editingSubject, examDate: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingSubject(null)}
                className="px-4 py-1.5 rounded-xl text-xs text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  updateSubject(editingSubject.id, {
                    name: editingSubject.name,
                    examDate: editingSubject.examDate || undefined,
                  });
                  setEditingSubject(null);
                  toast.success("Subject updated.");
                }}
                className="px-4 py-1.5 rounded-xl bg-[#00f0ff] text-black font-semibold text-xs hover:bg-[#00f0ff]/90"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SubjectsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading subjects...</div>}>
      <SubjectsContent />
    </Suspense>
  );
}
