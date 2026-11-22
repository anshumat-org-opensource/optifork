import React, { useEffect, useRef } from "react";
import { Button } from "./Button";

interface Props {
  open: boolean;
  title: string;
  children?: React.ReactNode;   // body / impact preview
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open, title, children,
  confirmLabel = "Confirm", cancelLabel = "Cancel",
  danger, busy, onConfirm, onCancel,
}: Props) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onCancel(); }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="confirm-title"
           className="w-full max-w-md rounded-lg border border-default bg-surface shadow-lg">
        <div className="px-5 pt-5">
          <h2 id="confirm-title" className="text-base font-semibold text-content">{title}</h2>
          {children && <div className="mt-3 text-sm text-content-muted">{children}</div>}
        </div>
        <div className="mt-5 flex justify-end gap-2 border-t border-default px-5 py-4">
          <Button variant="secondary" onClick={onCancel} disabled={busy}>{cancelLabel}</Button>
          <Button ref={confirmRef as any} variant={danger ? "danger" : "primary"} onClick={onConfirm} disabled={busy}>
            {busy ? "Working…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
