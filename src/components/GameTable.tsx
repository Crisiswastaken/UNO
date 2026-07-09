"use client";

import { useMemo, useState } from "react";
import type { Card, ClientView, Color } from "../engine/types";
import { canPlay, isWild } from "../engine/rules";
import type { ClientMessage } from "../shared/protocol";
import { avatarFor } from "../lib/avatars";
import { CardFace, swatch } from "./Card";
import { ColorPicker } from "./ColorPicker";
import { OpponentSeat } from "./OpponentSeat";
import { Card as Img } from "./ui/Card";

type Orientation = "top" | "left" | "right";

/** Where each opponent sits, by index in turn order. */
function orientationFor(i: number, n: number): Orientation {
  if (n <= 1) return "top";
  if (i === 0) return "left";
  if (i === n - 1) return "right";
  return "top";
}

export function GameTable({
  view,
  send,
}: {
  view: ClientView;
  send: (m: ClientMessage) => void;
}) {
  const [pendingWild, setPendingWild] = useState<Card | null>(null);

  const me = view.players.find((p) => p.playerId === view.youPlayerId);
  const mySeat = me?.seat ?? -1;
  const isMyTurn = view.currentSeat === mySeat && view.phase === "in_round";

  const opponents = useMemo(() => {
    const n = view.players.length;
    const ordered = [];
    for (let i = 1; i < n; i++) {
      const seat = (((mySeat + i) % n) + n) % n;
      const p = view.players.find((pl) => pl.seat === seat);
      if (p) ordered.push(p);
    }
    return ordered;
  }, [view.players, mySeat]);

  const seats = useMemo(() => {
    const left: typeof opponents = [];
    const right: typeof opponents = [];
    const top: typeof opponents = [];
    opponents.forEach((p, i) => {
      const o = orientationFor(i, opponents.length);
      (o === "left" ? left : o === "right" ? right : top).push(p);
    });
    return { left, right, top };
  }, [opponents]);

  const playable = (card: Card) =>
    isMyTurn &&
    canPlay(card, {
      activeColor: view.activeColor,
      discardTop: view.discardTop,
      pendingDraw: view.pendingDraw,
      config: view.config,
    });

  const mustPlay = view.pendingPass?.mustPlay ?? false;
  const drawnUids = view.pendingPass?.drawnUids ?? [];

  const onPlay = (card: Card) => {
    if (!playable(card)) return;
    if (mustPlay && !drawnUids.includes(card.uid)) return;
    if (isWild(card.value)) {
      setPendingWild(card);
    } else {
      send({ type: "playCard", uid: card.uid });
    }
  };

  const confirmWild = (color: Color) => {
    if (pendingWild) send({ type: "playCard", uid: pendingWild.uid, chosenColor: color });
    setPendingWild(null);
  };

  const canDraw = isMyTurn && !view.pendingPass;
  const canPass = isMyTurn && !!view.pendingPass && !mustPlay;
  const myHand = view.yourHand;
  const canCallUno = myHand.length <= 2 && !me?.hasCalledUno;

  const current = view.players.find((p) => p.seat === view.currentSeat);

  const renderSeat = (p: (typeof opponents)[number], o: Orientation) => (
    <OpponentSeat
      key={p.playerId}
      player={p}
      orientation={o}
      isCurrent={view.currentSeat === p.seat}
      onCatch={() => send({ type: "catchMissedUno", targetPlayerId: p.playerId })}
    />
  );

  return (
    <main className="fixed inset-0 overflow-hidden select-none">
      {/* Top seats */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-10">
        {seats.top.map((p) => renderSeat(p, "top"))}
      </div>

      {/* Left seats */}
      <div className="absolute left-5 top-1/2 -translate-y-1/2 flex flex-col gap-8">
        {seats.left.map((p) => renderSeat(p, "left"))}
      </div>

      {/* Right seats */}
      <div className="absolute right-5 top-1/2 -translate-y-1/2 flex flex-col gap-8">
        {seats.right.map((p) => renderSeat(p, "right"))}
      </div>

      {/* Center pile — the discard lands dead-center on the star, with the
          draw pile off to its left and the direction arrows hugging it. */}
      <div className="absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2">
        <div className="relative">
          <DirectionArrows direction={view.direction} />

          {/* Discard — angled, layered, shadowed (centered on the star) */}
          <DiscardPile top={view.discardTop} activeColor={view.activeColor} />

          {/* Draw pile, tucked to the left of the discard */}
          <div className="absolute right-full top-1/2 -translate-y-1/2 mr-8">
            <DrawPile
              count={view.drawPileCount}
              pendingDraw={view.pendingDraw}
              canDraw={canDraw}
              onDraw={() => send({ type: "drawCard" })}
            />
          </div>
        </div>
      </div>

      {/* Turn indicator + last action, floating just above the hand tray */}
      <div className="absolute bottom-[188px] left-1/2 -translate-x-1/2 text-center pointer-events-none">
        <div className="text-sm font-bold">
          {isMyTurn ? (
            <span className="text-uno-green">Your turn</span>
          ) : (
            <span className="text-uno-ink1">
              {current?.displayName ?? "…"}'s turn
            </span>
          )}
        </div>
        <div className="text-xs font-medium text-uno-ink2 h-4 mt-0.5 max-w-md truncate">
          {view.lastActionLog[view.lastActionLog.length - 1]?.text}
        </div>
      </div>

      {/* Bottom tray: you + hand */}
      <div className="absolute bottom-0 inset-x-0">
        <div className="mx-auto max-w-6xl bg-uno-cream/85 backdrop-blur-sm rounded-t-[32px] border-t-2 border-x-2 border-uno-ink/10 shadow-[0_-6px_24px_rgba(43,42,39,0.12)] px-6 pt-4 pb-3">
          <div className="flex items-end gap-4">
            {/* You */}
            <div className="flex flex-col items-center gap-1 pb-4 shrink-0">
              <span className="px-2 py-0.5 rounded-full bg-uno-ink text-uno-cream text-[11px] font-bold">
                You
              </span>
              <div
                className={`w-14 h-14 rounded-2xl overflow-hidden border-[3px] border-uno-cream shadow-[0_3px_8px_rgba(43,42,39,0.28)] bg-uno-white1 ${
                  isMyTurn ? "turn-glow" : ""
                }`}
              >
                <Img
                  src={avatarFor(mySeat)}
                  alt=""
                  width={56}
                  height={56}
                  rounded={false}
                  style={{ width: "100%", height: "100%" }}
                  className="object-cover pointer-events-none"
                  draggable={false}
                  unoptimized
                />
              </div>
            </div>

            {/* Hand */}
            <div className="flex-1 min-w-0">
              <Hand
                cards={myHand}
                isPlayable={(c) => playable(c) && (!mustPlay || drawnUids.includes(c.uid))}
                isHighlighted={(c) => mustPlay && drawnUids.includes(c.uid)}
                onPlay={onPlay}
              />
            </div>

            {/* UNO! call button */}
            <div className="flex flex-col items-center gap-2 pb-3 shrink-0">
              {canPass && (
                <button
                  onClick={() => send({ type: "passAfterDraw" })}
                  className="bg-uno-white1 border-2 border-uno-ink/15 hover:bg-uno-white2 hover:-translate-y-0.5 font-bold text-sm px-4 py-1.5 rounded-full transition"
                >
                  Pass
                </button>
              )}
              <UnoButton
                enabled={canCallUno}
                onClick={() => send({ type: "callUno" })}
              />
            </div>
          </div>
          {mustPlay && (
            <div className="text-center text-uno-red text-xs font-bold mt-1">
              You must play the drawn card
            </div>
          )}
        </div>
      </div>

      {pendingWild && (
        <ColorPicker onPick={confirmWild} onCancel={() => setPendingWild(null)} />
      )}
    </main>
  );
}

/* ----------------------------------------------------------- Draw pile --- */

function DrawPile({
  count,
  pendingDraw,
  canDraw,
  onDraw,
}: {
  count: number;
  pendingDraw: number;
  canDraw: boolean;
  onDraw: () => void;
}) {
  const W = 118;
  // A few offset backs beneath the top card imply a thick, tappable deck.
  const layers = Math.min(4, Math.max(1, Math.ceil(count / 8)));
  return (
    <button
      onClick={() => canDraw && onDraw()}
      disabled={!canDraw}
      title="Draw a card"
      style={{ width: W, height: Math.round((W * 3) / 2) + 8 }}
      className={`relative shrink-0 transition-transform duration-200 ${
        canDraw
          ? "hover:-translate-y-2 hover:rotate-[-3deg] cursor-pointer"
          : "cursor-default"
      }`}
    >
      {Array.from({ length: layers }).map((_, i) => {
        const isTop = i === layers - 1;
        return (
          <div
            key={i}
            className={isTop ? "relative card-shadow" : "absolute inset-x-0 top-0"}
            style={{ transform: `translate(${i * -2}px, ${i * 3}px)`, zIndex: i }}
          >
            <Img
              src="/cards/back.png"
              alt={isTop ? "draw pile" : ""}
              width={W}
              height={Math.round((W * 3) / 2)}
              style={{ width: W, height: "auto" }}
              className="rounded-[10px] pointer-events-none"
              draggable={false}
              unoptimized
            />
          </div>
        );
      })}
      {pendingDraw > 0 && (
        <span className="absolute -top-2 -right-2 z-20 bg-uno-red text-uno-cream text-xs font-extrabold px-2.5 py-1 rounded-full border-2 border-uno-cream shadow-[0_2px_5px_rgba(43,42,39,0.35)]">
          +{pendingDraw}
        </span>
      )}
    </button>
  );
}

/* -------------------------------------------------------- Discard pile --- */

function DiscardPile({
  top,
  activeColor,
}: {
  top: Card | null;
  activeColor: Color | null;
}) {
  // Static decorative cards fanned behind the live top card, so the pile
  // always reads with depth. Colors are cosmetic (edges peeking out).
  const ghosts = [
    { rot: -15, x: -14, y: 6, c: "green" as Color },
    { rot: 12, x: 12, y: 2, c: "blue" as Color },
    { rot: -5, x: -4, y: -4, c: "red" as Color },
  ];
  const W = 132;
  const h = Math.round((W * 3) / 2);

  return (
    <div
      className="relative shrink-0"
      style={{ width: W + 30, height: h + 20 }}
    >
      {ghosts.map((g, i) => (
        <div
          key={i}
          className="absolute left-1/2 top-1/2 rounded-[12px] card-shadow-sm"
          style={{
            width: W,
            height: h,
            marginLeft: -W / 2 + g.x,
            marginTop: -h / 2 + g.y,
            transform: `rotate(${g.rot}deg)`,
            background: swatch[g.c],
            border: "5px solid var(--color-uno-cream)",
          }}
        />
      ))}

      {top && (
        <div
          key={top.uid}
          className="absolute left-1/2 top-1/2 animate-card-drop"
          style={
            {
              marginLeft: -W / 2,
              marginTop: -h / 2,
              "--rot": "-6deg",
              transform: "rotate(-6deg)",
            } as React.CSSProperties
          }
        >
          <div className="card-shadow">
            <CardFace card={top} width={W} />
          </div>
          {activeColor && isWild(top.value) && (
            <span
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full border-[3px] border-uno-cream shadow"
              style={{ background: swatch[activeColor] }}
              title={`active color: ${activeColor}`}
            />
          )}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------- Direction arc --- */

function DirectionArrows({ direction }: { direction: 1 | -1 }) {
  const reversed = direction === -1;
  return (
    <div
      aria-hidden
      className="absolute left-1/2 top-1/2 pointer-events-none text-uno-ink1/60 arrow-drift"
      style={{ width: 320, height: 320, transform: `translate(-50%,-50%) scaleX(${reversed ? -1 : 1})` }}
    >
      <svg viewBox="0 0 320 320" className="w-full h-full" fill="none">
        {/* top-right arc, sweeping clockwise */}
        <path
          d="M250 92 A130 130 0 0 1 250 228"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray="1.5 16"
        />
        <path d="M250 228 l-15 -4 l12 -13 z" fill="currentColor" />
        {/* bottom-left arc */}
        <path
          d="M70 228 A130 130 0 0 1 70 92"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray="1.5 16"
        />
        <path d="M70 92 l15 4 l-12 13 z" fill="currentColor" />
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------ UNO button --- */

function UnoButton({ enabled, onClick }: { enabled: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={!enabled}
      title="Call UNO!"
      className={`group relative grid place-items-center px-3 py-2 rounded-[22px] bg-uno-red border-[3px] border-uno-cream shadow-[0_5px_0_rgba(43,42,39,0.28)] transition disabled:opacity-30 disabled:grayscale disabled:shadow-none active:translate-y-[3px] active:shadow-none ${
        enabled ? "hover:-translate-y-0.5 uno-wiggle" : ""
      }`}
    >
      <Img
        src="/game/uno-logo.png"
        alt="Call UNO!"
        width={84}
        height={46}
        rounded={false}
        style={{ width: 72, height: "auto" }}
        className="pointer-events-none drop-shadow-[0_2px_2px_rgba(43,42,39,0.35)] transition-transform group-hover:scale-110"
        draggable={false}
        unoptimized
      />
      {enabled && (
        <>
          <span className="absolute -top-1.5 -left-1.5 text-uno-yellow text-lg drop-shadow">✦</span>
          <span className="absolute -bottom-1.5 -right-1.5 text-uno-yellow text-sm drop-shadow">✦</span>
        </>
      )}
    </button>
  );
}

/* ----------------------------------------------------------------- Hand --- */

/** Arced, overlapping hand that fans and lifts on hover. */
function Hand({
  cards,
  isPlayable,
  isHighlighted,
  onPlay,
}: {
  cards: Card[];
  isPlayable: (c: Card) => boolean;
  isHighlighted: (c: Card) => boolean;
  onPlay: (c: Card) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 92;
  const n = cards.length;

  if (n === 0) {
    return <div className="text-center text-uno-ink2 py-10">no cards</div>;
  }

  const mid = (n - 1) / 2;
  // Tighter overlap as the hand grows so it always fits the tray.
  const overlap = -Math.min(W * 0.5, Math.max(W * 0.2, (n - 5) * 6 + W * 0.28));

  return (
    <div
      className="flex justify-center items-end h-[176px]"
      onMouseLeave={() => setHover(null)}
    >
      {cards.map((card, i) => {
        const canPlayIt = isPlayable(card);
        const d = i - mid;
        // Base arc: rotate outward from center, dip the ends down slightly.
        const baseRot = d * 3.2;
        const baseY = Math.abs(d) * Math.abs(d) * 1.1 + (canPlayIt ? -10 : 0);

        let rot = baseRot;
        let y = baseY;
        let scale = 1;
        let z = i;

        if (hover === i) {
          rot = 0;
          y = -34;
          scale = 1.22;
          z = 100;
        } else if (hover !== null) {
          const away = Math.sign(i - hover) * 16;
          rot = baseRot;
          y = baseY + 6;
          z = 50 - Math.abs(i - hover);
          return (
            <HandCard
              key={card.uid}
              card={card}
              width={W}
              overlap={i === 0 ? 0 : overlap}
              rot={rot}
              y={y}
              x={away}
              scale={scale}
              z={z}
              playable={canPlayIt}
              highlight={isHighlighted(card)}
              onEnter={() => setHover(i)}
              onClick={() => onPlay(card)}
            />
          );
        }

        return (
          <HandCard
            key={card.uid}
            card={card}
            width={W}
            overlap={i === 0 ? 0 : overlap}
            rot={rot}
            y={y}
            x={0}
            scale={scale}
            z={z}
            playable={canPlayIt}
            highlight={isHighlighted(card)}
            onEnter={() => setHover(i)}
            onClick={() => onPlay(card)}
          />
        );
      })}
    </div>
  );
}

function HandCard({
  card,
  width,
  overlap,
  rot,
  y,
  x,
  scale,
  z,
  playable,
  highlight,
  onEnter,
  onClick,
}: {
  card: Card;
  width: number;
  overlap: number;
  rot: number;
  y: number;
  x: number;
  scale: number;
  z: number;
  playable: boolean;
  highlight: boolean;
  onEnter: () => void;
  onClick: () => void;
}) {
  return (
    <div
      onMouseEnter={onEnter}
      style={{
        marginLeft: overlap,
        transform: `translate(${x}px, ${y}px) rotate(${rot}deg) scale(${scale})`,
        transformOrigin: "bottom center",
        zIndex: z,
        transition: "transform 200ms cubic-bezier(0.22,1,0.36,1), margin 200ms ease",
      }}
      className="relative card-shadow"
    >
      <CardFace
        card={card}
        width={width}
        playable={playable}
        highlight={highlight}
        onClick={onClick}
      />
    </div>
  );
}
