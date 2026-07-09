"use client";

import type { Color } from "../engine/types";
import { swatch } from "./Card";

const COLORS: Color[] = ["red", "yellow", "green", "blue"];

export function ColorPicker({
  onPick,
  onCancel,
}: {
  onPick: (c: Color) => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-uno-ink/50 flex items-center justify-center p-6"
      onClick={onCancel}
    >
      <div
        className="relative bg-uno-cream border-2 border-uno-ink/15 rounded-card p-6 w-full max-w-[19rem]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onCancel}
          aria-label="Cancel"
          className="absolute top-3 right-3 grid place-items-center w-8 h-8 rounded-full text-uno-ink1 hover:bg-uno-white2 transition"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <h3 className="text-center font-bold mb-4">Pick a color</h3>

        <div className="grid grid-cols-2 gap-3">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => onPick(c)}
              aria-label={c}
              className="aspect-square rounded-card border-2 border-uno-ink/15 transition-transform duration-150 hover:scale-105 hover:-translate-y-0.5 active:scale-95"
              style={{ background: swatch[c] }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
