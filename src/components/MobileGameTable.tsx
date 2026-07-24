"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Card, ClientView, Color } from "../engine/types";
import { canPlay, isWild } from "../engine/rules";
import type { ClientMessage } from "../shared/protocol";
import { avatarFor } from "../lib/avatars";
import { usePlaySound } from "../hooks/use-play-sound";
import { CardBack, CardFace, swatch } from "./Card";
import { ColorPicker } from "./ColorPicker";
import { CountdownRing } from "./TurnTimer";
import { Card as Img } from "./ui/Card";
import { centerOf, FlightLayer, useFlights } from "./cardFlight";

/* Portrait mobile game screen. A completely separate layout from the desktop
   GameTable, built for phones and the groovy MOBILE-BG (a scalloped cream star
   in the middle where the piles land). The game *logic* is duplicated from
   GameTable verbatim so behavior is identical — every action still flows
   through `send`, driven by the shared `view`. */

type Orientation = "top" | "left" | "right";

/** Where each opponent sits, by index in turn order (mirrors GameTable). */
function orientationFor(i: number, n: number): Orientation {
  if (n <= 1) return "top";
  if (i === 0) return "left";
  if (i === n - 1) return "right";
  return "top";
}

export function MobileGameTable({
  view,
  send,
}: {
  view: ClientView;
  send: (m: ClientMessage) => void;
}) {
  const me = view.players.find((p) => p.playerId === view.youPlayerId);
  const mySeat = me?.seat ?? -1;
  const isMyTurn = view.currentSeat === mySeat && view.phase === "in_round";

  // Sound cues for the local player's own actions (same keys as desktop).
  const playCardSfx = usePlaySound({ sound: "interaction.confirm" });
  const drawSfx = usePlaySound({ sound: "interaction.tap" });
  const passSfx = usePlaySound({ sound: "interaction.subtle" });
  const selectSfx = usePlaySound({ sound: "interaction.subtle" });
  const unoSfx = usePlaySound({ sound: "notification.success" });
  const catchSfx = usePlaySound({ sound: "notification.warning" });

  // Track viewport width so the hand fan spreads to fit any phone.
  const [vw, setVw] = useState(390);
  useEffect(() => {
    const f = () => setVw(window.innerWidth);
    f();
    window.addEventListener("resize", f);
    return () => window.removeEventListener("resize", f);
  }, []);

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

  const myHand = view.yourHand;
  const stackingOn = view.config.stacking;
  const mustPlay = view.pendingPass?.mustPlay ?? false;
  const drawnUids = view.pendingPass?.drawnUids ?? [];

  const handByUid = useMemo(() => {
    const m = new Map<string, Card>();
    for (const c of myHand) m.set(c.uid, c);
    return m;
  }, [myHand]);

  /** True if `card` can legally open a turn right now (draw stack + forcePlay). */
  const canOpenWith = (card: Card) =>
    isMyTurn &&
    canPlay(card, {
      activeColor: view.activeColor,
      discardTop: view.discardTop,
      pendingDraw: view.pendingDraw,
      config: view.config,
    }) &&
    (!mustPlay || drawnUids.includes(card.uid));

  // Stacking selection — uids in click order; the first sets the shared rank.
  const [selected, setSelected] = useState<string[]>([]);
  const selRank = selected.length ? handByUid.get(selected[0])?.value ?? null : null;

  // Drop the selection whenever the turn or the board shifts under us.
  useEffect(() => {
    setSelected([]);
  }, [isMyTurn, view.discardTop?.uid, view.currentSeat]);

  // Cards awaiting a color pick (a wild being played), as uids; null when none.
  const [pendingWild, setPendingWild] = useState<string[] | null>(null);

  // Announce, to everyone but the player who chose it, the color picked when a
  // wild / wild-draw-4 lands on the pile.
  const [wildPopup, setWildPopup] = useState<{ color: Color; key: number } | null>(null);
  const myWildUid = useRef<string | null>(null); // a wild I just played — skip its popup
  const lastWildUid = useRef<string | null>(null);
  useEffect(() => {
    const top = view.discardTop;
    if (!top || !isWild(top.value) || !view.activeColor) return;
    if (top.uid === lastWildUid.current) return; // already announced this one
    lastWildUid.current = top.uid;
    if (top.uid === myWildUid.current) return; // I'm the one who chose it
    setWildPopup({ color: view.activeColor, key: Date.now() });
    const t = setTimeout(() => setWildPopup(null), 1700);
    return () => clearTimeout(t);
  }, [view.discardTop, view.activeColor]);

  // Card-flight overlay (hand -> discard on a play, draw pile -> hand on a draw).
  const { flights, fly } = useFlights();
  const flewToDiscard = useRef<string | null>(null);
  const [flyingDiscardUid, setFlyingDiscardUid] = useState<string | null>(null);
  const [flyingHandUids, setFlyingHandUids] = useState<Set<string>>(new Set());

  const sendPlay = (uids: string[], color?: Color) => {
    if (uids.length === 0) return;
    playCardSfx.play();

    const to = centerOf("[data-discard]");
    const froms = uids.map((u) => centerOf(`[data-hand-uid="${u}"]`));
    const topUid = uids[uids.length - 1];
    let launched = false;
    uids.forEach((uid, i) => {
      const from = froms[i];
      const c = handByUid.get(uid);
      if (from && to && c) {
        const onDone = uid === topUid ? () => setFlyingDiscardUid(null) : undefined;
        fly({ card: c, from, to, toRot: -6, width: 116, duration: 340, lift: 40 }, onDone);
        launched = true;
      }
    });
    if (launched) {
      flewToDiscard.current = topUid;
      setFlyingDiscardUid(topUid);
    }

    if (uids.length === 1) send({ type: "playCard", uid: uids[0], chosenColor: color });
    else send({ type: "playCards", uids, chosenColor: color });
    setSelected([]);
  };

  const handleDraw = () => {
    drawSfx.play();
    send({ type: "drawCard" });
  };

  // Draw reveal: a card entering the hand flies off the draw pile, flips to
  // reveal its face at the center, then tucks into the tray.
  const knownHandUids = useRef<Set<string>>(new Set());
  useEffect(() => {
    const prev = knownHandUids.current;
    const added = myHand.filter((c) => !prev.has(c.uid));
    const isInitialFill = prev.size === 0;
    if (!isInitialFill && added.length > 0 && added.length <= 4) {
      setFlyingHandUids((s) => {
        const n = new Set(s);
        added.forEach((c) => n.add(c.uid));
        return n;
      });
      const unhide = (uid: string) =>
        setFlyingHandUids((s) => {
          const n = new Set(s);
          n.delete(uid);
          return n;
        });
      added.forEach((c, i) => {
        window.setTimeout(() => {
          const from = centerOf("[data-draw]");
          const via = centerOf("[data-discard]");
          const to =
            centerOf(`[data-hand-uid="${c.uid}"]`) ??
            centerOf("[data-hand-target]") ??
            (from ? { x: from.x, y: window.innerHeight - 90 } : null);
          if (from && to) {
            fly(
              { card: c, from, via: via ?? undefined, to, reveal: true, width: 96, duration: 640, lift: 30 },
              () => unhide(c.uid),
            );
          } else {
            unhide(c.uid);
          }
        }, i * 130);
      });
    }
    knownHandUids.current = new Set(myHand.map((c) => c.uid));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myHand]);

  // Auto-resolve a draw penalty when nothing in hand can continue the stack.
  const autoDrawGuard = useRef<string>("");
  useEffect(() => {
    if (!isMyTurn || view.pendingDraw <= 0 || view.pendingPass) return;
    const canRespond = myHand.some((c) => canOpenWith(c));
    if (canRespond) return;
    const key = `${view.discardTop?.uid ?? ""}:${view.pendingDraw}`;
    if (autoDrawGuard.current === key) return;
    autoDrawGuard.current = key;
    const t = window.setTimeout(() => send({ type: "drawCard" }), 400);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMyTurn, view.pendingDraw, view.pendingPass, view.discardTop?.uid]);

  /** Commit a set of cards; wilds route through the color picker first. */
  const commit = (uids: string[]) => {
    const cards = uids.map((u) => handByUid.get(u)).filter(Boolean) as Card[];
    if (cards.length === 0 || !cards.some(canOpenWith)) return;
    if (isWild(cards[cards.length - 1].value)) setPendingWild(uids);
    else sendPlay(uids);
  };

  // Tappable if it's a legal opener, or (mid-stack) matches the selected rank.
  const cardClickable = (card: Card) =>
    canOpenWith(card) ||
    (stackingOn && selected.length > 0 && card.value === selRank);

  const onCardClick = (card: Card) => {
    if (!isMyTurn) return;

    if (!stackingOn) {
      if (canOpenWith(card)) commit([card.uid]);
      return;
    }

    if (selected.length === 0) {
      if (!canOpenWith(card)) return;
      const sameRank = myHand.filter((c) => c.value === card.value);
      if (sameRank.length <= 1) commit([card.uid]);
      else {
        selectSfx.play();
        setSelected([card.uid]);
      }
      return;
    }

    if (card.value !== selRank) {
      if (!canOpenWith(card)) return;
      const sameRank = myHand.filter((c) => c.value === card.value);
      if (sameRank.length <= 1) commit([card.uid]);
      else {
        selectSfx.play();
        setSelected([card.uid]);
      }
      return;
    }

    selectSfx.play();
    setSelected((sel) =>
      sel.includes(card.uid) ? sel.filter((u) => u !== card.uid) : [...sel, card.uid],
    );
  };

  const confirmWild = (color: Color) => {
    if (pendingWild) {
      myWildUid.current = pendingWild[pendingWild.length - 1];
      sendPlay(pendingWild, color);
    }
    setPendingWild(null);
  };

  const selectionPlayable = selected.some((u) => {
    const c = handByUid.get(u);
    return c ? canOpenWith(c) : false;
  });

  const canDraw = isMyTurn && !view.pendingPass;
  const canPass = isMyTurn && !!view.pendingPass && !mustPlay;
  const noPlayable = canDraw && myHand.length > 0 && !myHand.some((c) => canOpenWith(c));
  const canCallUno = myHand.length === 1 && !me?.hasCalledUno;

  const renderSeat = (p: (typeof opponents)[number], o: Orientation) => (
    <MobileSeat
      key={p.playerId}
      player={p}
      orientation={o}
      isCurrent={view.currentSeat === p.seat}
      turnEndsAt={view.currentSeat === p.seat ? view.turnEndsAt : null}
      onCatch={() => {
        catchSfx.play();
        send({ type: "catchMissedUno", targetPlayerId: p.playerId });
      }}
    />
  );

  return (
    <main className="fixed inset-0 overflow-hidden select-none font-body overscroll-none">
      {/* Top opponent + a pointer toward the center star. */}
      {seats.top.length > 0 && (
        <div className="absolute top-[1.5vh] left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
          {seats.top.map((p) => renderSeat(p, "top"))}
        </div>
      )}

      {/* Left opponents, pinned to the edge. */}
      <div className="absolute left-[1.5vw] top-[33vh] flex flex-col gap-6">
        {seats.left.map((p) => renderSeat(p, "left"))}
      </div>

      {/* Right opponents. */}
      <div className="absolute right-[1.5vw] top-[33vh] flex flex-col gap-6">
        {seats.right.map((p) => renderSeat(p, "right"))}
      </div>

      {/* Center piles. The SEAM between the draw & discard is pinned to the
          screen centre (≈ the star's centre at 50% of the art), with each pile
          flanking it, so the pair reads centred despite the two cards being
          different widths — and the direction arcs orbit that exact point. */}
      <div className="absolute left-1/2 top-1/2 -translate-y-1/2">
        <MobileArrows direction={view.direction} activeColor={view.activeColor} />
        <div className="absolute top-1/2 right-0 -translate-y-1/2 mr-1.5">
          <MobileDrawPile
            count={view.drawPileCount}
            pendingDraw={view.pendingDraw}
            canDraw={canDraw}
            highlight={noPlayable}
            onDraw={handleDraw}
          />
        </div>
        <div className="absolute top-1/2 left-0 -translate-y-1/2 ml-1.5">
          <MobileDiscard
            top={view.discardTop}
            activeColor={view.activeColor}
            drop={view.discardTop?.uid !== flewToDiscard.current}
            hideTopUid={flyingDiscardUid}
          />
        </div>
      </div>

      {/* Bottom hand tray. Its children (action bar, UNO) anchor to the tray's
          top edge via `bottom-full`, so they sit just above the cards on every
          screen height instead of guessing a vh offset. */}
      <div className="absolute bottom-0 left-0 right-0">
        {/* Contextual actions, floating just above the tray: Play/Cancel
            (stacking selection) or Pass (after a draw). */}
        {(selected.length > 0 || canPass) && (
          <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 flex items-center gap-3 z-30">
            {selected.length > 0 ? (
              <>
                <button
                  onClick={() => setSelected([])}
                  className="bg-uno-cream text-uno-ink font-bold text-sm px-4 py-2.5 rounded-[16px] border-2 border-uno-ink/15 shadow-[0_3px_0_rgba(43,42,39,0.22)] active:translate-y-[2px] active:shadow-none transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => commit(selected)}
                  disabled={!selectionPlayable}
                  className="bg-uno-green text-uno-cream font-extrabold text-sm uppercase tracking-wide px-5 py-2.5 rounded-[16px] border-2 border-uno-ink/15 shadow-[0_4px_0_rgba(43,42,39,0.25)] active:translate-y-[2px] active:shadow-none disabled:opacity-40 disabled:translate-y-0 disabled:shadow-none transition"
                >
                  Play {selected.length}
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  passSfx.play();
                  send({ type: "passAfterDraw" });
                }}
                className="bg-uno-cream text-uno-ink font-extrabold text-sm uppercase tracking-wide px-6 py-2.5 rounded-[16px] border-2 border-uno-ink/15 shadow-[0_4px_0_rgba(43,42,39,0.22)] active:translate-y-[2px] active:shadow-none transition"
              >
                Pass
              </button>
            )}
          </div>
        )}

        {/* UNO! call, floating above the tray's right edge. */}
        {canCallUno && (
          <button
            type="button"
            onClick={() => {
              unoSfx.play();
              send({ type: "callUno" });
            }}
            title="Call UNO!"
            className="absolute right-[4vw] bottom-full mb-3 z-30 grid place-items-center px-5 py-2 rounded-[20px] bg-uno-red border-[3px] border-uno-cream shadow-[0_5px_0_rgba(43,42,39,0.28)] active:translate-y-[3px] active:shadow-none uno-wiggle"
          >
            <span className="font-display text-uno-cream text-[26px] leading-none tracking-wide drop-shadow-[0_2px_2px_rgba(43,42,39,0.35)]">
              UNO
            </span>
          </button>
        )}

        <div
          className="relative w-full bg-uno-cream/45 backdrop-blur-2xl rounded-t-[26px] border-t border-white/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] pt-3 pb-3"
          data-hand-target
        >
          <MobileHand
            cards={myHand}
            vw={vw}
            isPlayable={cardClickable}
            isHighlighted={(c) => mustPlay && drawnUids.includes(c.uid)}
            isSelected={(c) => selected.includes(c.uid)}
            isHidden={(c) => flyingHandUids.has(c.uid)}
            onPlay={onCardClick}
          />
        </div>

        {/* "You" avatar + label, overlapping the tray bottom. */}
        <div className="absolute left-1/2 bottom-2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none">
          <MyAvatar seat={mySeat} glow={isMyTurn} turnEndsAt={isMyTurn ? view.turnEndsAt : null} />
          <span className="px-3 py-0.5 rounded-[10px] bg-uno-ink text-uno-cream text-[12px] font-extrabold leading-none shadow-[0_2px_5px_rgba(43,42,39,0.3)]">
            You
          </span>
        </div>
      </div>

      {pendingWild && (
        <ColorPicker onPick={confirmWild} onCancel={() => setPendingWild(null)} />
      )}

      {wildPopup && <WildColorPopup key={wildPopup.key} color={wildPopup.color} />}

      <FlightLayer flights={flights} />
    </main>
  );
}

/* ----------------------------------------------------------- Local avatar --- */

function MyAvatar({
  seat,
  glow,
  turnEndsAt,
}: {
  seat: number;
  glow: boolean;
  turnEndsAt?: number | null;
}) {
  const size = 48;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div
        style={{ width: size, height: size }}
        className={`shrink-0 rounded-[10px] card-shadow overflow-hidden ${glow ? "turn-glow" : ""}`}
      >
        <Img
          src={avatarFor(seat)}
          alt=""
          width={size}
          height={size}
          rounded={false}
          unoptimized
          draggable={false}
          style={{ width: "100%", height: "100%" }}
          className="object-cover pointer-events-none rounded-[10px]"
        />
      </div>
      {glow && <CountdownRing deadline={turnEndsAt ?? null} size={size} radius={10} />}
    </div>
  );
}

/* ------------------------------------------------------- Wild color popup --- */

function WildColorPopup({ color }: { color: Color }) {
  const label = color[0].toUpperCase() + color.slice(1);
  return (
    <div className="pointer-events-none fixed inset-0 z-40 grid place-items-center">
      <div className="wild-pop flex flex-col items-center gap-3">
        <span
          className="grid place-items-center w-24 h-24 rounded-full border-[6px] border-uno-cream shadow-[0_16px_50px_rgba(43,42,39,0.45)]"
          style={{ background: swatch[color] }}
        >
          <span aria-hidden className="w-12 h-12 rounded-full" style={{ background: "rgba(241,231,220,0.35)" }} />
        </span>
        <span className="font-display text-3xl text-uno-cream tracking-wide drop-shadow-[0_3px_8px_rgba(43,42,39,0.6)]">
          {label}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- Draw pile --- */

function MobileDrawPile({
  count,
  pendingDraw,
  canDraw,
  highlight = false,
  onDraw,
}: {
  count: number;
  pendingDraw: number;
  canDraw: boolean;
  highlight?: boolean;
  onDraw: () => void;
}) {
  const W = 74;
  const layers = Math.min(3, Math.max(1, Math.ceil(count / 8)));
  return (
    <button
      type="button"
      onClick={() => canDraw && onDraw()}
      disabled={!canDraw}
      data-draw
      style={{ width: W, height: Math.round((W * 3) / 2) }}
      className={`group relative shrink-0 transition-transform duration-200 ${
        canDraw ? "active:translate-y-[2px]" : ""
      } ${highlight ? "draw-hint" : ""}`}
      title="Draw a card"
    >
      <span
        aria-hidden
        className="absolute left-1/2 -translate-x-1/2 rounded-[50%] blur-md pointer-events-none"
        style={{ width: W * 0.82, height: 16, bottom: -8, zIndex: 0, background: "rgba(43,42,39,0.30)" }}
      />
      {highlight && (
        <span
          aria-hidden
          className="draw-hint-halo absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 rounded-[16px] pointer-events-none"
          style={{ width: W + 18, height: Math.round((W * 3) / 2) + 18 }}
        />
      )}
      {Array.from({ length: layers }).map((_, i) => {
        const isTop = i === layers - 1;
        return (
          <div
            key={i}
            className={isTop ? "relative card-shadow" : "absolute inset-x-0 top-0"}
            style={{ transform: `translate(${i * -2}px, ${i * 2.5}px)`, zIndex: i }}
          >
            <CardBack width={W} />
          </div>
        );
      })}
      {pendingDraw > 0 && (
        <span className="absolute -top-2 -right-2 z-20 bg-uno-red text-uno-cream text-xs font-extrabold px-2 py-0.5 rounded-full border-2 border-uno-cream shadow-[0_2px_5px_rgba(43,42,39,0.35)]">
          +{pendingDraw}
        </span>
      )}
    </button>
  );
}

/* ---------------------------------------------------------- Discard pile --- */

function MobileDiscard({
  top,
  activeColor,
  drop = true,
  hideTopUid = null,
}: {
  top: Card | null;
  activeColor: Color | null;
  drop?: boolean;
  hideTopUid?: string | null;
}) {
  const W = 90;
  const h = Math.round((W * 3) / 2);
  const hidden = !!top && top.uid === hideTopUid;

  return (
    <div data-discard className="relative shrink-0" style={{ width: W, height: h }}>
      {top ? (
        <div
          className={`absolute inset-0 card-shadow-lg ${drop && !hidden ? "animate-card-drop" : ""}`}
          style={{
            visibility: hidden ? "hidden" : "visible",
            transform: "rotate(-6deg)",
          }}
        >
          <CardFace card={top} width={W} />
          {isWild(top.value) && activeColor && (
            <span
              className="absolute left-1/2 -bottom-3 -translate-x-1/2 grid place-items-center w-8 h-8 rounded-full bg-uno-cream border-2 border-uno-ink/15 shadow-[0_3px_8px_rgba(43,42,39,0.35)]"
              style={{ zIndex: 2 }}
            >
              <span className="w-5 h-5 rounded-full" style={{ background: swatch[activeColor] }} />
            </span>
          )}
        </div>
      ) : (
        <div
          className="absolute inset-0 rounded-[12px] border-2 border-dashed border-uno-ink/20"
          aria-hidden
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------- Direction arcs --- */

function MobileArrows({
  direction,
  activeColor,
}: {
  direction: 1 | -1;
  activeColor: Color | null;
}) {
  const color = activeColor ? swatch[activeColor] : "var(--color-uno-ink1)";
  const cx = 200;
  const cy = 200;
  const R = 150;
  const rad = (d: number) => (d * Math.PI) / 180;
  const pt = (deg: number) => ({ x: cx + R * Math.cos(rad(deg)), y: cy + R * Math.sin(rad(deg)) });

  const arrow = (a0: number, a1: number) => {
    const p0 = pt(a0);
    const p1 = pt(a1);
    const d = `M ${p0.x} ${p0.y} A ${R} ${R} 0 0 1 ${p1.x} ${p1.y}`;
    const t = rad(a1 + 90);
    const dx = Math.cos(t);
    const dy = Math.sin(t);
    const px = -dy;
    const py = dx;
    const L = 22;
    const Wt = 12;
    const tip = { x: p1.x + dx * L * 0.5, y: p1.y + dy * L * 0.5 };
    const back = { x: p1.x - dx * L * 0.5, y: p1.y - dy * L * 0.5 };
    const head = `M ${tip.x} ${tip.y} L ${back.x + px * Wt} ${back.y + py * Wt} L ${back.x - px * Wt} ${back.y - py * Wt} Z`;
    return { d, head };
  };

  // The two arcs are exact mirrors across the vertical axis so the rig reads
  // symmetric around the pile (θ ↔ 180−θ): right spans −52°→40°, left 140°→232°.
  const right = arrow(-52, 40);
  const left = arrow(140, 232);

  return (
    <div
      aria-hidden
      className="absolute left-1/2 top-1/2 pointer-events-none arrow-orbit"
      style={{
        width: 300,
        height: 300,
        color,
        transform: `translate(-50%,-50%) scaleX(${direction === -1 ? -1 : 1})`,
      }}
    >
      <svg viewBox="0 0 400 400" className="w-full h-full" fill="none">
        <path d={right.d} stroke="currentColor" strokeWidth="10" strokeLinecap="round" />
        <path d={right.head} fill="currentColor" />
        <path d={left.d} stroke="currentColor" strokeWidth="10" strokeLinecap="round" />
        <path d={left.head} fill="currentColor" />
      </svg>
    </div>
  );
}

/* --------------------------------------------------------- Opponent seat --- */

type PlayerView = ClientView["players"][number];

function MobileSeat({
  player,
  isCurrent,
  orientation,
  turnEndsAt,
  onCatch,
}: {
  player: PlayerView;
  isCurrent: boolean;
  orientation: Orientation;
  turnEndsAt?: number | null;
  onCatch?: () => void;
}) {
  const count = player.handCount;
  const backs = Math.min(Math.max(count, 1), 7);
  const size = 42;

  const avatar = (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        style={{ width: size, height: size }}
        className={`rounded-[10px] overflow-hidden card-shadow ${isCurrent ? "turn-glow" : ""}`}
      >
        <Img
          src={avatarFor(player.seat)}
          alt=""
          width={size}
          height={size}
          rounded={false}
          unoptimized
          draggable={false}
          style={{ width: "100%", height: "100%" }}
          className="object-cover pointer-events-none rounded-[10px]"
        />
      </div>
      {isCurrent && <CountdownRing deadline={turnEndsAt ?? null} size={size} radius={10} />}
      {!player.connected && (
        <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-uno-cream rounded-full border border-uno-ink/15" title="disconnected" />
      )}
    </div>
  );

  const namePill = (
    <span
      className={`max-w-[6rem] truncate px-2 py-0.5 rounded-[9px] text-[10px] font-extrabold leading-none shadow-[0_2px_5px_rgba(43,42,39,0.28)] ${
        isCurrent ? "bg-uno-ink text-uno-cream" : "bg-uno-cream text-uno-ink border-2 border-uno-ink/10"
      } ${player.connected ? "" : "line-through opacity-70"}`}
    >
      {player.displayName}
    </span>
  );

  const countBadge = (
    <span className="grid place-items-center min-w-6 h-6 px-1 rounded-[8px] bg-uno-cream text-uno-ink text-xs font-extrabold border-2 border-uno-ink/12 shadow-[0_2px_5px_rgba(43,42,39,0.3)]">
      {count}
    </span>
  );

  const catchBtn = player.isCatchable && onCatch && (
    <button
      onClick={onCatch}
      className="text-[10px] bg-uno-red text-uno-cream font-bold px-2 py-0.5 rounded-full border-2 border-uno-cream shadow-[0_2px_4px_rgba(43,42,39,0.3)] animate-pulse"
    >
      Catch!
    </button>
  );

  const backing = isCurrent
    ? "bg-uno-cream/40 ring-2 ring-uno-ink/10 shadow-[0_6px_18px_rgba(43,42,39,0.16)]"
    : "bg-uno-cream/25";

  // Top seat: avatar + name on the left, a horizontal fan of backs on the right.
  if (orientation === "top") {
    const W = 30;
    const mid = (backs - 1) / 2;
    return (
      <div className={`flex items-center gap-2 rounded-[18px] p-2 ${backing}`}>
        <div className="flex flex-col items-center gap-1">
          {avatar}
          {namePill}
        </div>
        <div className="relative">
          <div className="flex flex-row items-end">
            {Array.from({ length: backs }).map((_, i) => {
              const d = i - mid;
              const rot = d * 2.6;
              const y = Math.abs(d) * Math.abs(d) * 0.6;
              return (
                <div
                  key={i}
                  className="card-shadow-sm"
                  style={{
                    marginLeft: i > 0 ? -W * 0.5 : 0,
                    transform: `translateY(${y}px) rotate(${rot}deg)`,
                    transformOrigin: "bottom center",
                    zIndex: i,
                  }}
                >
                  <CardBack width={W} />
                </div>
              );
            })}
          </div>
          <div className="absolute -bottom-2 -right-2 z-20">{countBadge}</div>
        </div>
        {catchBtn}
      </div>
    );
  }

  // Side seats: avatar on top, a compact vertical stack of backs below.
  const W = 30;
  const step = 16;
  return (
    <div className={`flex flex-col items-center gap-1.5 rounded-[18px] p-2 w-[64px] ${backing}`}>
      {avatar}
      {namePill}
      <div className="relative mt-0.5" style={{ height: step * (backs - 1) + Math.round((W * 3) / 2) }}>
        {Array.from({ length: backs }).map((_, i) => (
          <div
            key={i}
            className="absolute left-1/2 -translate-x-1/2 card-shadow-sm"
            style={{ top: i * step, zIndex: i }}
          >
            <CardBack width={W} />
          </div>
        ))}
        <div className="absolute -bottom-1 -right-1 z-20">{countBadge}</div>
      </div>
      {catchBtn}
    </div>
  );
}

/* ----------------------------------------------------------------- Hand --- */

const JITTER = [0.9, -1.4, 0.5, -0.7, 1.2, -0.4, 0.8, -1.1];

function MobileHand({
  cards,
  vw,
  isPlayable,
  isHighlighted,
  isSelected,
  isHidden,
  onPlay,
}: {
  cards: Card[];
  vw: number;
  isPlayable: (c: Card) => boolean;
  isHighlighted: (c: Card) => boolean;
  isSelected: (c: Card) => boolean;
  isHidden?: (c: Card) => boolean;
  onPlay: (c: Card) => void;
}) {
  const n = cards.length;
  // Card width scales gently with the viewport so it stays readable on any
  // phone. Crucially the cards keep this size no matter how many there are —
  // when the fan is wider than the screen the tray turns into a horizontal
  // carousel the player can swipe, rather than crushing the cards to slivers.
  const W = Math.round(Math.max(54, Math.min(72, vw * 0.19)));
  const h = Math.round((W * 3) / 2);

  // Vertical room reserved above/below the card baseline for the arc + the
  // lift on playable/selected cards, so nothing is clipped by the scroller.
  const LIFT_UP = 44; // max a card rises (playable + selected, center) + headroom
  const DROP = 16; // max the fan's edges dip below the baseline

  // Keep the fan centred in the tray: on mount / resize / hand-size change, park
  // the scroll position in the middle so the centre cards sit under the screen
  // centre and the player can swipe either way to reach the ends — rather than
  // the fan being pinned to the left edge with the far cards stranded off-screen
  // and untappable.
  const scrollerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollLeft = Math.max(0, (el.scrollWidth - el.clientWidth) / 2);
  }, [n, vw]);

  if (n === 0) {
    return (
      <div className="flex justify-center items-end text-uno-ink2 text-sm" style={{ height: h }}>
        no cards
      </div>
    );
  }

  // A fixed, comfortable overlap keeps every card the same readable size and
  // preserves the fan angle regardless of hand size. Content wider than the
  // viewport simply scrolls.
  const step = n > 1 ? Math.round(W * 0.58) : 0;
  // Breathing room at both ends so the first & last cards (and their fan
  // rotation) are fully reachable once the tray scrolls, not pinned under the
  // screen edges.
  const PAD = Math.round(W * 0.6);
  const contentW = step * (n - 1) + W;
  const mid = (n - 1) / 2;

  return (
    <div
      ref={scrollerRef}
      className="no-scrollbar w-full overflow-x-auto overflow-y-hidden overscroll-x-contain"
      style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-x" }}
    >
      <div
        className="relative mx-auto"
        style={{ width: contentW + PAD * 2, height: h + LIFT_UP + DROP }}
      >
        {cards.map((card, i) => {
          const canPlayIt = isPlayable(card);
          const selected = isSelected(card);
          const d = i - mid;
          const jit = JITTER[i % JITTER.length];
          // Same fan angle as before, capped so a big hand doesn't over-rotate.
          const rot = Math.max(-15, Math.min(15, d * 3.0 + jit));
          // Gentle valley arc; linear + capped so the edges never dip far enough
          // to clip in the carousel.
          const arc = Math.min(Math.abs(d) * 3.2, DROP);
          const baseY = arc + (canPlayIt ? -8 : 0);
          const y = baseY + (selected ? -22 : 0);
          const hidden = isHidden?.(card) ?? false;

          return (
            <div
              key={card.uid}
              data-hand-uid={card.uid}
              className="absolute"
              style={{
                left: PAD + i * step,
                bottom: DROP,
                transform: `translateY(${y}px) rotate(${rot}deg)`,
                transformOrigin: "bottom center",
                zIndex: selected ? 100 + i : i,
                visibility: hidden ? "hidden" : "visible",
                // A light, tight shadow per card instead of the shared
                // `.card-shadow` (whose soft spread pooled into a dark band
                // behind the overlapping fan). A lifted/selected card gets a
                // touch more to read as picked up.
                filter: selected
                  ? "drop-shadow(0 9px 11px rgba(43,42,39,0.26))"
                  : "drop-shadow(0 2px 3px rgba(43,42,39,0.16))",
                transition: "transform 200ms cubic-bezier(0.22,1,0.36,1)",
              }}
            >
              <CardFace
                card={card}
                width={W}
                playable={canPlayIt}
                highlight={isHighlighted(card) || selected}
                onClick={() => onPlay(card)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
