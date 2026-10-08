import React from "react";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  accentColor?: "cyan" | "purple" | "green" | "pink" | "amber";
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  accentColor = "cyan",
}: EmptyStateProps) {
  const colorMap = {
    cyan: "text-[#00f0ff] border-[#00f0ff]/30 bg-[#00f0ff]/10 shadow-[0_0_30px_rgba(0,240,255,0.2)]",
    purple: "text-[#a855f7] border-[#a855f7]/30 bg-[#a855f7]/10 shadow-[0_0_30px_rgba(168,85,247,0.2)]",
    green: "text-[#39ff14] border-[#39ff14]/30 bg-[#39ff14]/10 shadow-[0_0_30px_rgba(57,255,20,0.2)]",
    pink: "text-[#ff2e97] border-[#ff2e97]/30 bg-[#ff2e97]/10 shadow-[0_0_30px_rgba(255,46,151,0.2)]",
    amber: "text-[#ffb800] border-[#ffb800]/30 bg-[#ffb800]/10 shadow-[0_0_30px_rgba(255,184,0,0.2)]",
  };

  const btnColorMap = {
    cyan: "bg-[#00f0ff] text-black hover:bg-[#00f0ff]/90 shadow-[0_0_20px_rgba(0,240,255,0.4)]",
    purple: "bg-[#a855f7] text-white hover:bg-[#a855f7]/90 shadow-[0_0_20px_rgba(168,85,247,0.4)]",
    green: "bg-[#39ff14] text-black hover:bg-[#39ff14]/90 shadow-[0_0_20px_rgba(57,255,20,0.4)]",
    pink: "bg-[#ff2e97] text-white hover:bg-[#ff2e97]/90 shadow-[0_0_20px_rgba(255,46,151,0.4)]",
    amber: "bg-[#ffb800] text-black hover:bg-[#ffb800]/90 shadow-[0_0_20px_rgba(255,184,0,0.4)]",
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl glass-panel border border-white/10 my-4">
      <div
        className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center mb-5 border transition-transform duration-300 hover:scale-105 ${colorMap[accentColor]}`}
      >
        <Icon className="w-8 h-8 sm:w-10 sm:h-10 animate-pulse" />
      </div>
      <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-heading">
        {title}
      </h3>
      <p className="mt-2 text-sm sm:text-base text-gray-400 max-w-md mx-auto leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className={`mt-6 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${btnColorMap[accentColor]}`}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
