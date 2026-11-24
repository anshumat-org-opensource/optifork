import React from "react";

type Tone = "on" | "off" | "partial" | "neutral";

const tones: Record<Tone, string> = {
  on: "bg-success-soft text-success",
  off: "bg-danger-soft text-danger",
  partial: "bg-warning-soft text-warning",
  neutral: "bg-surface-2 text-content-muted",
};

const dot: Record<Tone, string> = {
  on: "bg-success",
  off: "bg-danger",
  partial: "bg-warning",
  neutral: "bg-content-subtle",
};

export function StatusBadge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot[tone]}`} aria-hidden />
      {children}
    </span>
  );
}

export default StatusBadge;
