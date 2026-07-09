"use client";

import { useState } from "react";
import type { Card as CardType, Color } from "../engine/types";
import { CardBack, CardFace } from "./Card";
import { Card as Img } from "./ui/Card";

/* --------------------------------------------------------------------------
   STATIC GAME-ROOM DEMO

   A pixel-faithful reconstruction of the target game-room mock, built as a
   throwaway scene on an always-on route (/demo) so the real /room/[code]
   table can be redesigned against it and swapped in later. Everything here is
   hardcoded — no engine, no socket. Cards are rendered exclusively through the
   <CardFace> / <CardBack> components (never raw <img>), per the brief.
-------------------------------------------------------------------------- */

const c = (color: Color | null, value: CardType["value"], id: string): CardType => ({
  uid: id,
  color,
  value,
});

// The player's hand, left-to-right, matching the mock.
const MY_HAND: CardType[] = [
  c("red", "8", "h1"),
  c("red", "1", "h2"),
  c("yellow", "3", "h3"),
  c(null, "wild_draw4", "h4"),
  c("blue", "5", "h5"),
  c("green", "6", "h6"),
];

const DISCARD_TOP = c("yellow", "reverse", "d0");

// Cosmetic cards fanned under the live discard, so the pile reads with depth.
const GHOSTS: { card: CardType; rot: number; x: number; y: number }[] = [
  { card: c("green", "reverse", "g1"), rot: -15, x: -16, y: 6 },
  { card: c("blue", "reverse", "g2"), rot: 13, x: 14, y: 2 },
  { card: c("red", "reverse", "g3"), rot: -5, x: -3, y: -3 },
];

export function GameDemo() {
  return (
    <main className="fixed inset-0 overflow-hidden select-none font-body">
      {/* Full-bleed groovy backdrop (the card-back universe as a table). */}
      <Img
        src="/game/background.png"
        alt=""
        fill
        rounded={false}
        priority
        unoptimized
        className="object-cover -z-10 pointer-events-none"
      />

      {/* Demo watermark — makes clear this route is a scratch mock. */}
      <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[calc(50%+250px)] text-[11px] font-bold tracking-[0.25em] uppercase text-uno-ink/25 pointer-events-none">
        Demo
      </span>

      {/* --------------------------------------------------- Top-bar chrome */}
      <IconButton className="absolute top-6 left-6" label="Menu">
        <span className="flex flex-col gap-[5px]">
          <span className="block w-6 h-[3px] rounded-full bg-uno-ink" />
          <span className="block w-6 h-[3px] rounded-full bg-uno-ink" />
          <span className="block w-6 h-[3px] rounded-full bg-uno-ink" />
        </span>
      </IconButton>

      <IconButton className="absolute top-6 right-6 rounded-full" round label="Theme">
        <SunIcon />
      </IconButton>

      {/* ---------------------------------------------------- Opponent seats */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2">
        <Seat orientation="top" avatarSeat={1} count={7} />
      </div>

      <div className="absolute left-8 top-[46%] -translate-y-1/2">
        <Seat orientation="left" avatarSeat={0} count={7} />
      </div>

      <div className="absolute right-8 top-[46%] -translate-y-1/2">
        <Seat orientation="right" avatarSeat={3} count={6} />
      </div>

      {/* ----------------------------------------------------- Center piles */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative grid place-items-center">
          <DirectionArrows />

          {/* Draw pile, tucked to the left of the discard. */}
          <div className="absolute right-full top-1/2 -translate-y-1/2 mr-10">
            <DrawPile />
          </div>

          <DiscardPile />
        </div>
      </div>

      {/* ---------------------------------------------------- Bottom hand tray */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[900px]">
        <div className="relative bg-uno-cream/45 backdrop-blur-2xl rounded-t-[34px] border-t border-x border-white/45 shadow-[0_-10px_44px_rgba(43,42,39,0.18),inset_0_1px_0_rgba(255,255,255,0.55)] pl-4 pr-5 pt-3 pb-7">
          <div className="flex items-end">
            {/* You */}
            <div className="flex flex-col items-center gap-1 pb-5 shrink-0 z-10">
              <span className="px-2.5 py-0.5 rounded-[10px] bg-uno-ink text-uno-cream text-[11px] font-extrabold leading-none">
                You
              </span>
              <Avatar seat={2} size={50} glow />
            </div>

            {/* Hand */}
            <div className="flex-1 min-w-0">
              <Hand cards={MY_HAND} />
            </div>
          </div>
        </div>
      </div>

      {/* UNO! call button, floating bottom-right over the tray. */}
      <UnoButton className="absolute bottom-8 right-10" />

      {/* Signature maker's mark, bottom-left. */}
      <div className="absolute bottom-6 left-6 w-11 h-11 grid place-items-center rounded-full bg-uno-ink text-uno-cream shadow-[0_3px_8px_rgba(43,42,39,0.35)]">
        <WaveMark />
      </div>
    </main>
  );
}

/* ============================================================ Opponent seat */

function Seat({
  orientation,
  avatarSeat,
  count,
}: {
  orientation: "top" | "left" | "right";
  avatarSeat: number;
  count: number;
}) {
  const vertical = orientation !== "top";
  const backs = Math.min(count + 1, 8); // one more back than the badge, as in the mock

  // Left/right seats: cards lie on their side (rotated 90°) and stack down the
  // screen edge like a drawn blind. Each portrait card's layout box is swapped
  // for its landscape footprint, then the card itself is rotated within it.
  if (vertical) {
    const W = 44; // portrait width, pre-rotation
    const boxW = W * 1.5; // landscape footprint (the rotated card's visible width)
    const step = W * 0.52; // slice of each stacked card left visible
    return (
      <div className="flex flex-col items-center gap-2">
        <Avatar seat={avatarSeat} size={56} />
        <div className="relative">
          <div className="flex flex-col items-center">
            {Array.from({ length: backs }).map((_, i) => (
              <div
                key={i}
                className="relative card-shadow-sm"
                style={{
                  width: boxW,
                  height: W,
                  marginTop: i > 0 ? -(W - step) : 0,
                  zIndex: i,
                }}
              >
                <div
                  className="absolute left-1/2 top-1/2"
                  style={{ transform: "translate(-50%,-50%) rotate(90deg)" }}
                >
                  <CardBack width={W} />
                </div>
              </div>
            ))}
          </div>
          <div className="absolute -bottom-2 -right-2 z-20">
            <CountBadge n={count} />
          </div>
        </div>
      </div>
    );
  }

  // Top seat: portrait cards fanned horizontally.
  const W = 48;
  return (
    <div className="flex items-center gap-3">
      <Avatar seat={avatarSeat} size={56} />
      <div className="relative">
        <div className="flex flex-row">
          {Array.from({ length: backs }).map((_, i) => {
            const mid = (backs - 1) / 2;
            const rot = backs > 1 ? (i - mid) * 2.2 : 0;
            return (
              <div
                key={i}
                className="card-shadow-sm"
                style={{
                  marginLeft: i > 0 ? -W * 0.6 : 0,
                  transform: `rotate(${rot}deg)`,
                  zIndex: i,
                }}
              >
                <CardBack width={W} />
              </div>
            );
          })}
        </div>
        <div className="absolute bottom-1 right-0 z-20">
          <CountBadge n={count} />
        </div>
      </div>
    </div>
  );
}

const AVATARS = ["/avatars/AV1.png", "/avatars/AV2.png", "/avatars/AV3.png", "/avatars/AV4.png"];

function Avatar({ seat, size, glow }: { seat: number; size: number; glow?: boolean }) {
  return (
    <div
      style={{ width: size, height: size }}
      className={`shrink-0 rounded-[18px] card-shadow ${glow ? "turn-glow rounded-[18px]" : ""}`}
    >
      <Img
        src={AVATARS[seat % AVATARS.length]}
        alt=""
        width={size}
        height={size}
        rounded={false}
        unoptimized
        draggable={false}
        style={{ width: "100%", height: "100%" }}
        className="object-cover pointer-events-none rounded-[18px]"
      />
    </div>
  );
}

function CountBadge({ n }: { n: number }) {
  return (
    <span className="grid place-items-center min-w-7 h-7 px-1.5 rounded-[9px] bg-uno-cream text-uno-ink text-sm font-extrabold border-2 border-uno-ink/12 shadow-[0_2px_5px_rgba(43,42,39,0.3)]">
      {n}
    </span>
  );
}

/* ================================================================ Draw pile */

function DrawPile() {
  const W = 116;
  const layers = 4;
  return (
    <div style={{ width: W, height: Math.round((W * 3) / 2) + 10 }} className="relative shrink-0">
      {Array.from({ length: layers }).map((_, i) => {
        const isTop = i === layers - 1;
        return (
          <div
            key={i}
            className={isTop ? "relative card-shadow" : "absolute inset-x-0 top-0"}
            style={{ transform: `translate(${i * -2}px, ${i * 3}px)`, zIndex: i }}
          >
            <CardBack width={W} />
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================= Discard pile */

function DiscardPile() {
  const W = 132;
  const h = Math.round((W * 3) / 2);
  return (
    <div className="relative shrink-0" style={{ width: W + 34, height: h + 24 }}>
      {GHOSTS.map((g) => (
        <div
          key={g.card.uid}
          className="absolute left-1/2 top-1/2 card-shadow-sm"
          style={{
            marginLeft: -W / 2 + g.x,
            marginTop: -h / 2 + g.y,
            transform: `rotate(${g.rot}deg)`,
          }}
        >
          <CardFace card={g.card} width={W} />
        </div>
      ))}

      <div
        className="absolute left-1/2 top-1/2 card-shadow"
        style={{ marginLeft: -W / 2, marginTop: -h / 2, transform: "rotate(-6deg)" }}
      >
        <CardFace card={DISCARD_TOP} width={W} />
      </div>
    </div>
  );
}

/* =========================================================== Direction arcs */

function DirectionArrows() {
  return (
    <div
      aria-hidden
      className="absolute left-1/2 top-1/2 pointer-events-none text-uno-ink1/45 arrow-drift"
      style={{ width: 340, height: 340, transform: "translate(-50%,-50%)" }}
    >
      <svg viewBox="0 0 320 320" className="w-full h-full" fill="none">
        <path
          d="M250 92 A130 130 0 0 1 250 228"
          stroke="currentColor"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray="1.5 17"
        />
        <path d="M250 228 l-16 -4 l13 -14 z" fill="currentColor" />
        <path
          d="M70 228 A130 130 0 0 1 70 92"
          stroke="currentColor"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray="1.5 17"
        />
        <path d="M70 92 l16 4 l-13 14 z" fill="currentColor" />
      </svg>
    </div>
  );
}

/* ===================================================================== Hand */

function Hand({ cards }: { cards: CardType[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 94;
  const n = cards.length;
  const mid = (n - 1) / 2;
  const overlap = -W * 0.3;

  return (
    <div className="flex justify-center items-end h-[152px]" onMouseLeave={() => setHover(null)}>
      {cards.map((card, i) => {
        const d = i - mid;
        const baseRot = d * 2.4;
        const baseY = Math.abs(d) * Math.abs(d) * 0.8;

        let rot = baseRot;
        let y = baseY;
        let scale = 1;
        let z = i;
        let x = 0;

        if (hover === i) {
          rot = 0;
          y = -30;
          scale = 1.14;
          z = 100;
        } else if (hover !== null) {
          x = Math.sign(i - hover) * 14;
          y = baseY + 6;
          z = 50 - Math.abs(i - hover);
        }

        return (
          <div
            key={card.uid}
            onMouseEnter={() => setHover(i)}
            className="relative card-shadow"
            style={{
              marginLeft: i === 0 ? 0 : overlap,
              transform: `translate(${x}px, ${y}px) rotate(${rot}deg) scale(${scale})`,
              transformOrigin: "bottom center",
              zIndex: z,
              transition: "transform 200ms cubic-bezier(0.22,1,0.36,1), margin 200ms ease",
            }}
          >
            <CardFace card={card} width={W} playable onClick={() => {}} />
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================== UNO! button */

function UnoButton({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none ${className}`}>
      <button
        type="button"
        className="pointer-events-auto group relative grid place-items-center px-8 py-3 rounded-[22px] bg-uno-red border-[3px] border-uno-cream shadow-[0_5px_0_rgba(43,42,39,0.28)] transition hover:-translate-y-0.5 active:translate-y-[3px] active:shadow-none uno-wiggle"
      >
        <span className="font-display text-uno-cream text-[34px] leading-none tracking-wide drop-shadow-[0_2px_2px_rgba(43,42,39,0.35)]">
          UNO!
        </span>
        {/* comic emphasis burst, top-right corner */}
        <svg
          aria-hidden
          className="absolute -top-5 -right-5 text-uno-yellow"
          width="40"
          height="40"
          viewBox="0 0 40 40"
          fill="none"
        >
          {[15, 45, 75].map((deg) => {
            const a = (deg * Math.PI) / 180;
            return (
              <line
                key={deg}
                x1={20 + Math.cos(a) * 9}
                y1={20 - Math.sin(a) * 9}
                x2={20 + Math.cos(a) * 17}
                y2={20 - Math.sin(a) * 17}
                stroke="currentColor"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
            );
          })}
        </svg>
      </button>
    </div>
  );
}

/* =================================================================== Chrome */

function IconButton({
  children,
  className = "",
  round,
  label,
}: {
  children: React.ReactNode;
  className?: string;
  round?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className={`grid place-items-center w-14 h-14 bg-uno-cream border-2 border-uno-ink/10 shadow-[0_3px_10px_rgba(43,42,39,0.18)] hover:-translate-y-0.5 active:translate-y-0 transition ${
        round ? "rounded-full" : "rounded-[18px]"
      } ${className}`}
    >
      {children}
    </button>
  );
}

function SunIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" className="text-uno-ink" fill="none">
      <circle cx="12" cy="12" r="4.5" fill="currentColor" />
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i * Math.PI) / 4;
        const x1 = 12 + Math.cos(a) * 7.5;
        const y1 = 12 + Math.sin(a) * 7.5;
        const x2 = 12 + Math.cos(a) * 10;
        const y2 = 12 + Math.sin(a) * 10;
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}

function WaveMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 15 Q8 6 12 12 T20 9"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
