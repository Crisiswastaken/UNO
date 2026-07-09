import { create } from "zustand";
import type { ClientView } from "../engine/types";

export interface Toast {
  id: number;
  text: string;
  kind: "info" | "error";
}

interface GameStore {
  view: ClientView | null;
  connected: boolean;
  toasts: Toast[];
  setView: (v: ClientView) => void;
  setConnected: (c: boolean) => void;
  pushToast: (text: string, kind?: Toast["kind"]) => void;
  dismissToast: (id: number) => void;
  reset: () => void;
}

let toastSeq = 1;

export const useGameStore = create<GameStore>((set) => ({
  view: null,
  connected: false,
  toasts: [],
  setView: (view) => set({ view }),
  setConnected: (connected) => set({ connected }),
  pushToast: (text, kind = "info") =>
    set((s) => ({ toasts: [...s.toasts, { id: toastSeq++, text, kind }].slice(-4) })),
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  reset: () => set({ view: null, connected: false, toasts: [] }),
}));
