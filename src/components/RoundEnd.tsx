"use client";

import type { ClientView } from "../engine/types";
import type { ClientMessage } from "../shared/protocol";

export function RoundEnd({
  view,
  send,
}: {
  view: ClientView;
  send: (m: ClientMessage) => void;
}) {
  const isHost = view.hostPlayerId === view.youPlayerId;
  const isMatchEnd = view.phase === "match_end";
  const winnerId = isMatchEnd ? view.matchWinnerId : view.roundWinnerId;
  const winner = view.players.find((p) => p.playerId === winnerId);
  const showScores = view.config.scoringMode === "targetScore";

  const ranked = [...view.players].sort(
    (a, b) => (view.scores[b.playerId] ?? 0) - (view.scores[a.playerId] ?? 0),
  );

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="bg-uno-white1 border-2 border-uno-ink/10 rounded-card p-8 w-full max-w-md text-center">
        <div className="text-uno-ink1 text-sm font-bold uppercase tracking-widest mb-2">
          {isMatchEnd ? "Match Over" : "Round Over"}
        </div>
        <h1 className="font-display text-5xl mb-6">
          {winner ? `${winner.displayName} wins!` : "Round complete"}
        </h1>

        {showScores && (
          <div className="flex flex-col gap-2 mb-6">
            {ranked.map((p, i) => (
              <div
                key={p.playerId}
                className="flex justify-between items-center bg-uno-cream border-2 border-uno-ink/10 rounded-card px-4 py-2.5"
              >
                <span className="font-semibold">
                  {i === 0 && "🏆 "}
                  {p.displayName}
                </span>
                <span className="font-bold tabular-nums">
                  {view.scores[p.playerId] ?? 0}
                  <span className="text-uno-ink2 text-xs font-medium">
                    {" "}
                    / {view.config.targetScore}
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}

        {isHost ? (
          <button
            onClick={() => send({ type: "startNextRound" })}
            className="w-full bg-uno-green text-uno-cream font-extrabold uppercase tracking-wide py-3.5 rounded-card border-2 border-uno-ink/15 shadow-[0_5px_0_rgba(43,42,39,0.25)] active:translate-y-[3px] active:shadow-none transition"
          >
            {isMatchEnd ? "New Match" : "Next Round"}
          </button>
        ) : (
          <div className="text-uno-ink1 py-3">
            Waiting for host to continue…
          </div>
        )}
      </div>
    </main>
  );
}
