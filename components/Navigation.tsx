"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  CalendarDays,
  BotMessageSquare,
  BarChart3,
  Settings as SettingsIcon,
  PlusCircle,
  Timer,
  Search,
  Sparkles,
  Shield,
  LogIn,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import { useStudyStore } from "@/store/useStudyStore";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Subjects", href: "/subjects", icon: FolderKanban },
  { label: "Ethical Hacking", href: "/ethical-hacking", icon: Shield, badge: "LABS" },
  { label: "Calendar", href: "/calendar", icon: CalendarDays },
  { label: "AI Mentor", href: "/ai-mentor", icon: BotMessageSquare, badge: "AI" },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: SettingsIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  const setIsAddPlaylistOpen = useStudyStore((s) => s.setIsAddPlaylistOpen);
  const setIsPomodoroOpen = useStudyStore((s) => s.setIsPomodoroOpen);
  const setCommandPaletteOpen = useStudyStore((s) => s.setCommandPaletteOpen);
  const user = useStudyStore((s) => s.user);
  const logout = useStudyStore((s) => s.logout);

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 bg-[#07070c]/90 backdrop-blur-xl border-r border-white/[0.08] z-30 select-none">
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center justify-between border-b border-white/[0.08]">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#00f0ff] to-[#a855f7] p-[1.5px] transition-transform duration-300 group-hover:scale-105 shadow-[0_0_15px_rgba(0,240,255,0.4)]">
            <div className="w-full h-full bg-[#07070c] rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-[#00f0ff]" />
            </div>
          </div>
          <div>
            <span className="font-heading font-bold text-lg tracking-wider text-white flex items-center gap-1.5">
              STUDY<span className="text-[#00f0ff]">TRACKER</span>
            </span>
            <span className="text-[10px] font-mono tracking-widest text-gray-500 block uppercase">
              Command Center
            </span>
          </div>
        </Link>
      </div>

      {/* Quick Global Action Buttons */}
      <div className="p-4 space-y-2">
        <button
          onClick={() => setIsAddPlaylistOpen(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#00f0ff] to-[#a855f7] text-black font-semibold text-sm hover:brightness-110 transition-all shadow-[0_0_20px_rgba(0,240,255,0.35)] cursor-pointer"
        >
          <PlusCircle className="w-4 h-4 text-black stroke-[2.5]" />
          <span>Add Playlist</span>
          <kbd className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-black/30 text-black/90 font-mono">
            N
          </kbd>
        </button>

        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs text-gray-400 hover:text-white hover:bg-white/[0.07] transition-all cursor-pointer"
        >
          <Search className="w-3.5 h-3.5 text-gray-400" />
          <span>Quick Find...</span>
          <kbd className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-white/10 font-mono text-gray-300">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group relative ${
                isActive
                  ? "bg-white/[0.08] text-white font-semibold shadow-inner border border-white/10"
                  : "text-gray-400 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              {isActive && (
                <div className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-[#00f0ff] shadow-[0_0_10px_#00f0ff]" />
              )}
              <Icon
                className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${
                  isActive ? "text-[#00f0ff]" : "text-gray-400 group-hover:text-gray-200"
                }`}
              />
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/30">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Pomodoro Timer Dock in Sidebar Footer */}
      <div className="p-4 border-t border-white/[0.08]">
        <button
          onClick={() => setIsPomodoroOpen(true)}
          className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.07] hover:border-[#ff2e97]/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#ff2e97]/15 border border-[#ff2e97]/30 flex items-center justify-center text-[#ff2e97] group-hover:scale-105 transition-transform">
              <Timer className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="text-xs font-semibold text-gray-200">Pomodoro</div>
              <div className="text-[10px] text-gray-500 font-mono">25m focus / 5m rest</div>
            </div>
          </div>
          <span className="text-[10px] font-mono text-[#ff2e97] bg-[#ff2e97]/10 px-2 py-0.5 rounded border border-[#ff2e97]/20">
            Start
          </span>
        </button>
      </div>

      {/* User Auth Profile in Sidebar Footer */}
      <div className="px-4 pb-4">
        {user ? (
          <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/[0.08]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#00f0ff]/30 to-[#a855f7]/30 border border-white/20 flex items-center justify-center text-white text-xs font-bold uppercase shrink-0">
                {user.name?.charAt(0) || "U"}
              </div>
              <div className="min-w-0 text-left">
                <div className="text-xs font-semibold text-white truncate">{user.name}</div>
                <div className="text-[10px] text-gray-400 truncate">{user.email}</div>
              </div>
            </div>
            <button
              onClick={() => logout()}
              title="Log Out"
              className="p-1.5 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-medium text-white transition-all group"
          >
            <LogIn className="w-3.5 h-3.5 text-[#00f0ff] group-hover:scale-110 transition-transform" />
            <span>Sign In / Register</span>
          </Link>
        )}
      </div>
    </aside>
  );
}

export function MobileTabBar() {
  const pathname = usePathname();
  const setIsAddPlaylistOpen = useStudyStore((s) => s.setIsAddPlaylistOpen);

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#07070c]/95 backdrop-blur-xl border-t border-white/[0.08] z-40 px-3 flex items-center justify-around">
      {navItems.slice(0, 2).map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center flex-1 py-1 ${
              isActive ? "text-[#00f0ff]" : "text-gray-400"
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">{item.label}</span>
          </Link>
        );
      })}

      {/* Floating Center Plus on Mobile */}
      <button
        onClick={() => setIsAddPlaylistOpen(true)}
        className="w-11 h-11 -mt-5 rounded-full bg-gradient-to-r from-[#00f0ff] to-[#a855f7] flex items-center justify-center text-black shadow-[0_0_15px_rgba(0,240,255,0.5)] cursor-pointer"
        aria-label="Add Playlist"
      >
        <PlusCircle className="w-6 h-6 stroke-[2.5]" />
      </button>

      {navItems.slice(2, 5).map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center flex-1 py-1 ${
              isActive ? "text-[#00f0ff]" : "text-gray-400"
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
