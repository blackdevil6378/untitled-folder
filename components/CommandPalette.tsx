"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutDashboard,
  FolderKanban,
  CalendarDays,
  BotMessageSquare,
  BarChart3,
  Settings,
  PlusCircle,
  Timer,
  BookOpen,
  ArrowRight,
} from "lucide-react";
import { useStudyStore } from "@/store/useStudyStore";

export function CommandPalette() {
  const router = useRouter();
  const isOpen = useStudyStore((s) => s.commandPaletteOpen);
  const setIsOpen = useStudyStore((s) => s.setCommandPaletteOpen);
  const setIsAddPlaylistOpen = useStudyStore((s) => s.setIsAddPlaylistOpen);
  const setIsPomodoroOpen = useStudyStore((s) => s.setIsPomodoroOpen);
  const setActiveVideoLecture = useStudyStore((s) => s.setActiveVideoLecture);

  const subjects = useStudyStore((s) => s.subjects);
  const lectures = useStudyStore((s) => s.lectures);

  const [query, setQuery] = useState("");

  // Keyboard shortcut listener for Cmd+K / Ctrl+K, N, C, A
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing inside an input or textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
          e.preventDefault();
          setIsOpen(!isOpen);
        }
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen(!isOpen);
      } else if (e.key === "Escape") {
        setIsOpen(false);
      } else if (e.key.toLowerCase() === "n" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setIsAddPlaylistOpen(true);
      } else if (e.key.toLowerCase() === "c" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        router.push("/calendar");
      } else if (e.key.toLowerCase() === "a" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        router.push("/ai-mentor");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, router, setIsOpen, setIsAddPlaylistOpen]);

  if (!isOpen) return null;

  const filteredSubjects = subjects.filter((s) =>
    s.name.toLowerCase().includes(query.toLowerCase())
  );

  const filteredLectures = lectures
    .filter((l) => l.title.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 5);

  const navigationOptions = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard },
    { label: "Subjects", href: "/subjects", icon: FolderKanban },
    { label: "Calendar & Schedule", href: "/calendar", icon: CalendarDays },
    { label: "AI Mentor Doubt Solver", href: "/ai-mentor", icon: BotMessageSquare },
    { label: "Analytics & Streaks", href: "/analytics", icon: BarChart3 },
    { label: "Settings & API Keys", href: "/settings", icon: Settings },
  ].filter((nav) => nav.label.toLowerCase().includes(query.toLowerCase()));

  const handleSelectPage = (href: string) => {
    setIsOpen(false);
    setQuery("");
    router.push(href);
  };

  const handleSelectLecture = (lecture: any) => {
    setIsOpen(false);
    setQuery("");
    setActiveVideoLecture(lecture);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl rounded-2xl glass-panel bg-[#0b0b14]/95 border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden">
        {/* Search input field */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10">
          <Search className="w-5 h-5 text-[#00f0ff] shrink-0" />
          <input
            type="text"
            placeholder="Type a command, subject, or lecture title..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none"
          />
          <kbd className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-gray-400 font-mono">
            ESC
          </kbd>
        </div>

        {/* Results Container */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-4">
          {/* Quick Actions */}
          <div>
            <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-gray-500">
              Quick Actions
            </div>
            <div className="space-y-1">
              <button
                onClick={() => {
                  setIsOpen(false);
                  setIsAddPlaylistOpen(true);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-gray-300 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer text-left"
              >
                <PlusCircle className="w-4 h-4 text-[#00f0ff]" />
                <span className="flex-1 font-medium">Add New YouTube Playlist</span>
                <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 font-mono text-gray-400">
                  N
                </kbd>
              </button>

              <button
                onClick={() => {
                  setIsOpen(false);
                  setIsPomodoroOpen(true);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-gray-300 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer text-left"
              >
                <Timer className="w-4 h-4 text-[#ff2e97]" />
                <span className="flex-1 font-medium">Open Pomodoro Timer</span>
              </button>
            </div>
          </div>

          {/* Navigation Pages */}
          {navigationOptions.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-gray-500">
                Pages
              </div>
              <div className="space-y-1">
                {navigationOptions.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.href}
                      onClick={() => handleSelectPage(item.href)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-gray-300 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer text-left"
                    >
                      <Icon className="w-4 h-4 text-gray-400" />
                      <span className="flex-1 font-medium">{item.label}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-gray-600" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Subjects */}
          {filteredSubjects.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-gray-500">
                Subjects
              </div>
              <div className="space-y-1">
                {filteredSubjects.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => handleSelectPage(`/subjects?id=${sub.id}`)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-gray-300 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer text-left"
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: sub.color }}
                    />
                    <span className="flex-1 font-medium truncate">{sub.name}</span>
                    <span className="text-[10px] text-gray-500 font-mono">Subject</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Lectures */}
          {filteredLectures.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-gray-500">
                Matching Lectures
              </div>
              <div className="space-y-1">
                {filteredLectures.map((lec) => (
                  <button
                    key={lec.id}
                    onClick={() => handleSelectLecture(lec)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-gray-300 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer text-left"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-[#00f0ff] shrink-0" />
                    <span className="flex-1 font-medium truncate">{lec.title}</span>
                    <span className="text-[10px] text-gray-500 font-mono shrink-0">
                      #{lec.order}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
