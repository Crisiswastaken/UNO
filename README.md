# Custom UNO

Web-based multiplayer UNO with **host-configurable house rules**, built per `UNO_PRD.md`.

- **Server-authoritative** game logic (the deck and hands never leave the server) → no cheating, and a dropped player can rejoin their exact state.
- 2–4 players per room, shareable 6-char room code / invite link.
- Configurable rules: UNO-call penalty, +2/+4 stacking, draw-until-playable, force-play, deal size, single-round vs target-score scoring.

## Stack

| Layer | Choice |
|---|---|
| UI + lobby | Next.js (App Router) + TypeScript + Tailwind |
| Realtime game server | PartyKit (one stateful "party" per room) |
| Client view state | Zustand |
| Validation | Zod (every inbound action) |
| Card art | PNGs in `public/cards/` (from `UNO-CARDS/`) |

## Project layout

```
party/server.ts          PartyKit room server: identity, validation, broadcast, 30s auto-pass
src/engine/              Pure, unit-tested game engine (no networking)
  types.ts  deck.ts  rules.ts  engine.ts
src/shared/protocol.ts   Zod message schemas + client/server message types
src/store/gameStore.ts   Zustand store (personalized view + toasts)
src/hooks/useRoom.ts     PartySocket connection: rejoin-first-then-join
src/lib/identity.ts      Per-room playerId / name / host-create handoff (localStorage)
src/app/                 Landing, /create (config form), /room/[code]
src/components/          Lobby, GameTable, Hand/Card, ColorPicker, RoundEnd, Toasts, ...
public/cards/            {color}_{value}.png, wild.png, wild_draw4.png
```

## Run locally

Runs two processes: Next.js (`:3000`) and the PartyKit game server (`:1999`).

```bash
npm install
npm run dev        # starts BOTH next + partykit (via concurrently)
```

Then open http://localhost:3000. Create a room, copy the invite link, and open it
in another browser/incognito window to join as a second player.

Run them separately if you prefer:

```bash
npm run dev:next   # http://localhost:3000 (webpack)
npm run dev:party  # http://127.0.0.1:1999
```

> **Windows / OneDrive notes:**
> - Use `partykit` ≥ 0.0.115 (earlier versions have a dev-server path bug).
> - Dev defaults to the **webpack** bundler (`next dev --webpack`). Turbopack is
>   available via `npm run dev:next:turbo`, but when the project lives inside a
>   **OneDrive** folder, OneDrive syncs the `.next` cache and can corrupt
>   Turbopack's client manifest — this shows up as *"Could not find the module …
>   in the React Client Manifest."* If you ever hit a stale-cache error, run
>   `npm run clean` (deletes `.next`) and restart. For the smoothest experience,
>   keep the repo outside OneDrive or pause sync on the `.next` folder.

### Point the client at a different game server

The client reads `NEXT_PUBLIC_PARTYKIT_HOST` (defaults to `127.0.0.1:1999`):

```bash
# .env.local
NEXT_PUBLIC_PARTYKIT_HOST=your-project.your-user.partykit.dev
```

## Test

```bash
npm test           # engine unit tests (deck, playability, stacking, turn flow, scoring)
```

## Deploy

- **Game server:** `npm run deploy:party` (PartyKit → Cloudflare). Set
  `NEXT_PUBLIC_PARTYKIT_HOST` to the deployed party URL.
- **Web app:** deploy the Next.js app to Vercel.

## House rules (set by host at room creation)

| Rule | Default | Effect |
|---|---|---|
| `unoCall` / `unoPenalty` | on / 2 | Player at 1 card must call UNO; catchable until the next player acts. |
| `stackDraw2OnDraw2` | off | +2 may be stacked onto +2. |
| `stackDraw4OnDraw2Or4` | off | +4 may be stacked onto +2 or +4. **+2 onto +4 is never allowed.** |
| `drawPenaltyBehavior` | drawOneAndPass | Draw one then pass, or keep drawing until playable. |
| `forcePlay` | off | Must immediately play a drawn card if it's playable. |
| `dealSize` | 7 | Starting hand size. |
| `scoringMode` / `targetScore` | singleRound / 500 | First to empty hand wins, or accumulate points to a target. |

## Notes / v1 scope

- Per the PRD, room state lives in server memory: a *player* dropping is covered by
  rejoin; a rare *server* restart drops an in-progress game.
- Non-goals for v1: spectators, jump-in / 7-0, accounts, chat, cross-session persistence.
