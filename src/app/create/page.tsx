"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DEFAULT_CONFIG, RuleConfig } from "../../engine/types";
import { randomRoomCode, stashCreate } from "../../lib/identity";

export default function CreatePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [config, setConfig] = useState<RuleConfig>({ ...DEFAULT_CONFIG });

  const set = <K extends keyof RuleConfig>(k: K, v: RuleConfig[K]) =>
    setConfig((c) => ({ ...c, [k]: v }));

  const create = () => {
    if (!name.trim()) return;
    const code = randomRoomCode();
    stashCreate(code, { displayName: name.trim(), config });
    router.push(`/room/${code}`);
  };

  return (
    <main className="min-h-screen flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-md">
        <h1 className="font-display text-5xl mb-6">Create Room</h1>

        <label className="block text-sm font-semibold text-uno-ink1 mb-1.5">
          Your name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Host name"
          maxLength={20}
          className="w-full bg-uno-white1 border-2 border-uno-ink/15 rounded-card px-4 py-3 mb-6 outline-none placeholder:text-uno-ink2 focus:border-uno-blue transition"
        />

        <h2 className="text-lg font-bold mb-3">House Rules</h2>
        <div className="flex flex-col bg-uno-white1 border-2 border-uno-ink/10 rounded-card px-4 py-1">
          <Toggle
            label="UNO call required"
            hint="Players at 1 card must call UNO"
            value={config.unoCall}
            onChange={(v) => set("unoCall", v)}
          />
          {config.unoCall && (
            <NumberRow
              label="Missed-UNO penalty"
              value={config.unoPenalty}
              min={1}
              max={10}
              onChange={(v) => set("unoPenalty", v)}
            />
          )}
          <Toggle
            label="Stack +2 on +2"
            hint="Pass along an accumulating +2 penalty"
            value={config.stackDraw2OnDraw2}
            onChange={(v) => set("stackDraw2OnDraw2", v)}
          />
          <Toggle
            label="Stack +4 on +2 or +4"
            hint="+2 onto +4 stays forbidden"
            value={config.stackDraw4OnDraw2Or4}
            onChange={(v) => set("stackDraw4OnDraw2Or4", v)}
          />
          <SelectRow
            label="Draw penalty"
            value={config.drawPenaltyBehavior}
            options={[
              ["drawOneAndPass", "Draw one & pass"],
              ["drawUntilPlayable", "Draw until playable"],
            ]}
            onChange={(v) => set("drawPenaltyBehavior", v as RuleConfig["drawPenaltyBehavior"])}
          />
          <Toggle
            label="Force play"
            hint="Must play a drawn card if it's playable"
            value={config.forcePlay}
            onChange={(v) => set("forcePlay", v)}
          />
          <NumberRow
            label="Deal size"
            value={config.dealSize}
            min={3}
            max={10}
            onChange={(v) => set("dealSize", v)}
          />
          <SelectRow
            label="Scoring"
            value={config.scoringMode}
            options={[
              ["singleRound", "Single round"],
              ["targetScore", "Target score"],
            ]}
            onChange={(v) => set("scoringMode", v as RuleConfig["scoringMode"])}
          />
          {config.scoringMode === "targetScore" && (
            <NumberRow
              label="Target score"
              value={config.targetScore}
              min={100}
              max={2000}
              step={50}
              onChange={(v) => set("targetScore", v)}
            />
          )}
        </div>

        <button
          onClick={create}
          disabled={!name.trim()}
          className="w-full mt-6 bg-uno-red text-uno-cream font-extrabold uppercase tracking-wide py-3.5 rounded-card border-2 border-uno-ink/15 shadow-[0_5px_0_rgba(43,42,39,0.25)] active:translate-y-[3px] active:shadow-none disabled:opacity-40 disabled:shadow-none transition"
        >
          Create &amp; Open Lobby
        </button>
        <button
          onClick={() => router.push("/")}
          className="w-full mt-3 text-uno-ink1 hover:text-uno-ink text-sm font-medium py-2"
        >
          ← back
        </button>
      </div>
    </main>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-uno-ink/10 last:border-b-0">
      <div>
        <div className="font-semibold">{label}</div>
        {hint && <div className="text-xs text-uno-ink2">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function Toggle({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Row label={label} hint={hint}>
      <button
        onClick={() => onChange(!value)}
        className={`shrink-0 w-14 h-8 rounded-full p-1 border-2 transition ${
          value
            ? "bg-uno-green border-uno-ink/15"
            : "bg-uno-white2 border-uno-ink/10"
        }`}
      >
        <div
          className={`w-5 h-5 rounded-full bg-uno-cream transition-transform ${
            value ? "translate-x-6" : ""
          }`}
        />
      </button>
    </Row>
  );
}

function NumberRow({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  return (
    <Row label={label}>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => onChange(clamp(value - step))}
          className="w-8 h-8 rounded-[12px] bg-uno-cream border-2 border-uno-ink/15 hover:bg-uno-white2 font-bold transition"
        >
          −
        </button>
        <span className="w-10 text-center font-bold tabular-nums">{value}</span>
        <button
          onClick={() => onChange(clamp(value + step))}
          className="w-8 h-8 rounded-[12px] bg-uno-cream border-2 border-uno-ink/15 hover:bg-uno-white2 font-bold transition"
        >
          +
        </button>
      </div>
    </Row>
  );
}

function SelectRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (v: string) => void;
}) {
  return (
    <Row label={label}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="shrink-0 bg-uno-cream border-2 border-uno-ink/15 rounded-[12px] px-3 py-2 outline-none font-medium focus:border-uno-blue transition"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </Row>
  );
}
