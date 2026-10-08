"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Sidebar, MobileTabBar } from "@/components/Navigation";
import { AddPlaylistModal } from "@/components/AddPlaylistModal";
import { YouTubePlayerModal } from "@/components/YouTubePlayerModal";
import { PomodoroWidget } from "@/components/PomodoroWidget";
import { CommandPalette } from "@/components/CommandPalette";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/login";

  if (isAuthPage) {
    return <main className="min-h-screen bg-[#07070c]">{children}</main>;
  }

  return (
    <>
      <div className="flex min-h-screen">
        {/* Desktop Left Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <main className="flex-1 md:ml-64 pb-20 md:pb-8 min-h-screen">
          {children}
        </main>
      </div>

      {/* Mobile Navigation Tab Bar */}
      <MobileTabBar />

      {/* Global Overlays & Modals */}
      <AddPlaylistModal />
      <YouTubePlayerModal />
      <PomodoroWidget />
      <CommandPalette />
    </>
  );
}
