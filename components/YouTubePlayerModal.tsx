"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  CheckCircle2,
  Circle,
  Bookmark,
  BookmarkCheck,
  BotMessageSquare,
  Sparkles,
  Gauge,
  Save,
  BookOpen,
} from "lucide-react";
import { useStudyStore } from "@/store/useStudyStore";
import { useYouTubePlayer } from "@/hooks/useYouTubePlayer";
import { formatDigitalTime } from "@/lib/utils";
import { toast } from "sonner";

export function YouTubePlayerModal() {
  const router = useRouter();
  const activeLecture = useStudyStore((s) => s.activeVideoLecture);
  const setActiveLecture = useStudyStore((s) => s.setActiveVideoLecture);
  const toggleLectureComplete = useStudyStore((s) => s.toggleLectureComplete);
  const toggleLectureDifficult = useStudyStore((s) => s.toggleLectureDifficult);
  const setLectureNotes = useStudyStore((s) => s.setLectureNotes);
  const subjects = useStudyStore((s) => s.subjects);

  const {
    containerId,
    duration,
    currentTime,
    playbackRate,
    changeSpeed,
  } = useYouTubePlayer(activeLecture);

  const [notesText, setNotesText] = useState(activeLecture?.notes || "");
  const [isSavedNotes, setIsSavedNotes] = useState(true);

  useEffect(() => {
    if (activeLecture) {
      setNotesText(activeLecture.notes || "");
      setIsSavedNotes(true);
    }
  }, [activeLecture?.id]);

  if (!activeLecture) return null;

  const currentSubject = subjects.find((s) => s.id === activeLecture.subjectId);

  const handleNotesChange = (val: string) => {
    setNotesText(val);
    setIsSavedNotes(false);
    // Autosave after small debounce
    const timer = setTimeout(() => {
      setLectureNotes(activeLecture.id, val);
      setIsSavedNotes(true);
    }, 600);
    return () => clearTimeout(timer);
  };

  const handleAskAI = () => {
    setActiveLecture(null);
    router.push(
      `/ai-mentor?subjectId=${activeLecture.subjectId}&lectureId=${activeLecture.id}`
    );
  };

  const progressPct =
    duration > 0 ? Math.min(100, Math.round((currentTime / duration) * 100)) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl max-h-[95vh] flex flex-col rounded-2xl glass-panel bg-[#090912]/95 border border-white/10 shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3 min-w-0 pr-4">
            {currentSubject && (
              <span
                className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider shrink-0"
                style={{
                  backgroundColor: `${currentSubject.color}20`,
                  color: currentSubject.color,
                  border: `1px solid ${currentSubject.color}40`,
                }}
              >
                {currentSubject.name}
              </span>
            )}
            <h3 className="text-sm sm:text-base font-bold text-white truncate font-heading">
              #{activeLecture.order}: {activeLecture.title}
            </h3>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Ask AI button */}
            <button
              onClick={handleAskAI}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#a855f7]/20 border border-[#a855f7]/40 text-[#a855f7] text-xs font-semibold hover:bg-[#a855f7]/30 transition-all cursor-pointer shadow-[0_0_12px_rgba(168,85,247,0.25)]"
            >
              <BotMessageSquare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ask AI Mentor</span>
            </button>

            {/* Close */}
            <button
              onClick={() => setActiveLecture(null)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Body: Video Player on Left, Side Panel on Right */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 overflow-y-auto min-h-0">
          {/* Video Player Column */}
          <div className="lg:col-span-2 flex flex-col bg-black">
            <div className="relative w-full aspect-video bg-black flex items-center justify-center">
              <div id={containerId} className="w-full h-full" />
            </div>

            {/* Video Controls Bar */}
            <div className="p-4 bg-[#0a0a14] border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
              {/* Timing & Progress */}
              <div className="flex items-center gap-3 font-mono text-gray-300">
                <span className="text-[#00f0ff]">
                  {formatDigitalTime(currentTime)}
                </span>
                <span className="text-gray-600">/</span>
                <span className="text-gray-400">{formatDigitalTime(duration)}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-white/5 border border-white/10 text-gray-400">
                  {progressPct}% watched
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {/* Speed selector */}
                <div className="flex items-center gap-1 bg-white/[0.05] border border-white/10 rounded-lg p-1 text-gray-300">
                  <Gauge className="w-3 h-3 text-gray-400 ml-1" />
                  {[1, 1.25, 1.5, 2].map((spd) => (
                    <button
                      key={spd}
                      onClick={() => changeSpeed(spd)}
                      className={`px-1.5 py-0.5 rounded text-[11px] font-mono cursor-pointer transition-colors ${
                        playbackRate === spd
                          ? "bg-[#00f0ff] text-black font-bold"
                          : "hover:text-white"
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>

                {/* Mark Complete */}
                <button
                  onClick={() => {
                    toggleLectureComplete(activeLecture.id);
                    toast.success(
                      activeLecture.completed
                        ? "Marked as pending"
                        : "Completed! Great job!"
                    );
                  }}
                  className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 font-medium transition-all cursor-pointer ${
                    activeLecture.completed
                      ? "bg-[#39ff14]/15 border-[#39ff14]/40 text-[#39ff14] shadow-[0_0_12px_rgba(57,255,20,0.2)]"
                      : "bg-white/[0.05] border-white/10 text-gray-300 hover:text-white"
                  }`}
                >
                  {activeLecture.completed ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#39ff14]" />
                      <span>Completed</span>
                    </>
                  ) : (
                    <>
                      <Circle className="w-3.5 h-3.5" />
                      <span>Mark Done</span>
                    </>
                  )}
                </button>

                {/* Mark Difficult */}
                <button
                  onClick={() => {
                    toggleLectureDifficult(activeLecture.id);
                    toast.info(
                      activeLecture.difficult
                        ? "Removed from difficult list"
                        : "Marked as difficult for spaced revision"
                    );
                  }}
                  className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                    activeLecture.difficult
                      ? "bg-[#ff2e97]/20 border-[#ff2e97]/40 text-[#ff2e97]"
                      : "bg-white/[0.05] border-white/10 text-gray-400 hover:text-white"
                  }`}
                  title={activeLecture.difficult ? "Difficult Flagged" : "Flag as Difficult"}
                >
                  {activeLecture.difficult ? (
                    <BookmarkCheck className="w-4 h-4 text-[#ff2e97]" />
                  ) : (
                    <Bookmark className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Notes Side Panel */}
          <div className="flex flex-col border-t lg:border-t-0 lg:border-l border-white/10 bg-[#0d0d18] p-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
              <div className="flex items-center gap-2 text-white font-medium text-xs uppercase tracking-wider font-heading">
                <BookOpen className="w-4 h-4 text-[#00f0ff]" />
                <span>Lecture Notes</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-mono text-gray-400">
                <Save className={`w-3 h-3 ${isSavedNotes ? "text-[#39ff14]" : "text-amber-400"}`} />
                <span>{isSavedNotes ? "Autosaved" : "Saving..."}</span>
              </div>
            </div>

            <textarea
              value={notesText}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Write your key takeaways, formulas, doubts, or timestamps here (e.g. 14:20 recursion stack visual)..."
              className="flex-1 w-full p-3 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-gray-500 text-xs leading-relaxed resize-none focus:outline-none focus:border-[#00f0ff] font-mono"
            />

            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-gray-400">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#a855f7]" />
                Notes automatically sync with AI Mentor context
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
