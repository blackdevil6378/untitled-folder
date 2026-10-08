"use client";

import React, { useState, useEffect } from "react";
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  X,
  Coffee,
  Flame,
  CheckCircle2,
} from "lucide-react";
import { useStudyStore } from "@/store/useStudyStore";
import { toast } from "sonner";

type PomodoroMode = "focus" | "shortBreak" | "longBreak";

const MODE_DURATIONS: Record<PomodoroMode, number> = {
  focus: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
};

export function PomodoroWidget() {
  const isPomodoroOpen = useStudyStore((s) => s.isPomodoroOpen);
  const setIsPomodoroOpen = useStudyStore((s) => s.setIsPomodoroOpen);
  const logStudySession = useStudyStore((s) => s.logStudySession);

  const [mode, setMode] = useState<PomodoroMode>("focus");
  const [timeLeft, setTimeLeft] = useState<number>(MODE_DURATIONS.focus);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [completedSessions, setCompletedSessions] = useState<number>(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (isRunning && timeLeft === 0) {
      setIsRunning(false);
      handleSessionComplete();
    }
    return () => clearInterval(timer);
  }, [isRunning, timeLeft]);

  const handleSessionComplete = () => {
    if (mode === "focus") {
      logStudySession(25);
      setCompletedSessions((prev) => prev + 1);
      toast.success("🔥 25-minute Pomodoro finished! Logged to your heatmap.");
      // Switch to break
      setMode("shortBreak");
      setTimeLeft(MODE_DURATIONS.shortBreak);
    } else {
      toast.info("☕ Break finished! Ready for the next deep work sprint?");
      setMode("focus");
      setTimeLeft(MODE_DURATIONS.focus);
    }
  };

  const switchMode = (newMode: PomodoroMode) => {
    setMode(newMode);
    setIsRunning(false);
    setTimeLeft(MODE_DURATIONS[newMode]);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(MODE_DURATIONS[mode]);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  if (!isPomodoroOpen) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-300">
      <div className="w-80 rounded-2xl glass-panel bg-[#0d0d18]/95 border border-[#ff2e97]/30 shadow-[0_0_30px_rgba(255,46,151,0.25)] p-5 backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#ff2e97]/20 border border-[#ff2e97]/40 flex items-center justify-center text-[#ff2e97]">
              <Timer className="w-4 h-4" />
            </div>
            <span className="font-heading font-bold text-sm text-white">
              Deep Work Pomodoro
            </span>
          </div>
          <button
            onClick={() => setIsPomodoroOpen(false)}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-white/[0.04] rounded-xl my-4">
          <button
            onClick={() => switchMode("focus")}
            className={`py-1.5 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
              mode === "focus"
                ? "bg-[#ff2e97] text-white shadow-[0_0_12px_rgba(255,46,151,0.4)]"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Focus (25m)
          </button>
          <button
            onClick={() => switchMode("shortBreak")}
            className={`py-1.5 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
              mode === "shortBreak"
                ? "bg-[#00f0ff] text-black shadow-[0_0_12px_rgba(0,240,255,0.4)]"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Rest (5m)
          </button>
          <button
            onClick={() => switchMode("longBreak")}
            className={`py-1.5 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
              mode === "longBreak"
                ? "bg-[#a855f7] text-white shadow-[0_0_12px_rgba(168,85,247,0.4)]"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Break (15m)
          </button>
        </div>

        {/* Big Digit Display */}
        <div className="text-center py-4">
          <div className="font-mono text-5xl font-black tracking-tight text-white drop-shadow-[0_0_15px_rgba(255,46,151,0.3)]">
            {formattedTime}
          </div>
          <div className="mt-2 text-xs text-gray-400 flex items-center justify-center gap-1.5">
            {mode === "focus" ? (
              <>
                <Flame className="w-3.5 h-3.5 text-[#ff2e97]" />
                <span>Stay laser-focused, no phone check!</span>
              </>
            ) : (
              <>
                <Coffee className="w-3.5 h-3.5 text-[#00f0ff]" />
                <span>Relax your eyes and stretch.</span>
              </>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg ${
              isRunning
                ? "bg-amber-400 text-black hover:bg-amber-300"
                : "bg-gradient-to-r from-[#ff2e97] to-[#a855f7] text-white hover:brightness-110 shadow-[0_0_20px_rgba(255,46,151,0.4)]"
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Start Focus</span>
              </>
            )}
          </button>

          <button
            onClick={resetTimer}
            className="p-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Reset"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Completed Count Pill */}
        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-gray-400 font-mono">
          <span>Today&apos;s Sprints:</span>
          <span className="flex items-center gap-1 text-[#39ff14]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {completedSessions} cycles ({completedSessions * 25} min logged)
          </span>
        </div>
      </div>
    </div>
  );
}
