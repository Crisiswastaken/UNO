"use client";

import { useEffect } from "react";
import { useGameStore } from "../store/gameStore";

export function Toasts() {
  const { toasts, dismissToast } = useGameStore();

  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((t) =>
      setTimeout(() => dismissToast(t.id), 3200),
    );
    return () => timers.forEach(clearTimeout);
  }, [toasts, dismissToast]);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-2 rounded-card border-2 text-sm font-semibold ${
            t.kind === "error"
              ? "bg-uno-red text-uno-cream border-uno-ink/15"
              : "bg-uno-cream text-uno-ink border-uno-ink/15"
          }`}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}
