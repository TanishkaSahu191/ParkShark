import React from "react";
import type { StandStatus } from "@/data/stands";

interface StatusPillProps {
  status: StandStatus;
  size?: "sm" | "md";
  showDot?: boolean;
  className?: string;
}

export const StatusPill: React.FC<StatusPillProps> = ({
  status,
  size = "md",
  showDot = true,
  className = "",
}) => {
  const configs: Record<StandStatus, { label: string; bg: string; text: string; dot: string; border: string }> = {
    available: {
      label: "Available",
      bg: "bg-emerald-50 dark:bg-emerald-950/40",
      text: "text-emerald-700 dark:text-emerald-400",
      dot: "bg-emerald-500",
      border: "border-emerald-200 dark:border-emerald-800/60",
    },
    occupied: {
      label: "Occupied",
      bg: "bg-rose-50 dark:bg-rose-950/40",
      text: "text-rose-700 dark:text-rose-400",
      dot: "bg-rose-500",
      border: "border-rose-200 dark:border-rose-800/60",
    },
    maintenance: {
      label: "Maintenance",
      bg: "bg-slate-100 dark:bg-slate-800/50",
      text: "text-slate-600 dark:text-slate-400",
      dot: "bg-slate-400",
      border: "border-slate-300 dark:border-slate-700",
    },
  };

  const config = configs[status] || configs.available;
  const sizeStyles = size === "sm" ? "px-2 py-0.5 text-xs font-medium" : "px-2.5 py-1 text-xs font-semibold";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${config.bg} ${config.text} ${config.border} ${sizeStyles} ${className}`}
    >
      {showDot && <span className={`size-1.5 rounded-full ${config.dot} animate-pulse`} />}
      <span>{config.label}</span>
    </span>
  );
};
