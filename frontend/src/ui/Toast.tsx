import React, { createContext, useCallback, useContext, useState } from "react";

type Tone = "success" | "error" | "info";
interface Toast { id: number; tone: Tone; message: string; }

interface Ctx { push: (tone: Tone, message: string) => void; }
const ToastCtx = createContext<Ctx>({ push: () => {} });

export function useToast() { return useContext(ToastCtx); }

const toneStyles: Record<Tone, string> = {
  success: "border-success/30 bg-success-soft text-success",
  error: "border-danger/30 bg-danger-soft text-danger",
  info: "border-default bg-surface text-content",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((tone: Tone, message: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, tone, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2" role="region" aria-label="Notifications">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`min-w-[260px] max-w-sm rounded-md border px-4 py-3 text-sm shadow-md ${toneStyles[t.tone]}`}
            style={{ animation: "of-toast-in .15s ease-out" }}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export default ToastProvider;
