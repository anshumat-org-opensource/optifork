import React from "react";

export function EmptyState({
  icon = "🔭",
  title,
  hint,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <div className="text-3xl" aria-hidden>{icon}</div>
      <h3 className="text-base font-semibold text-content">{title}</h3>
      {hint && <p className="max-w-sm text-sm text-content-muted">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export default EmptyState;
