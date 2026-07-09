// Deterministic avatar assignment. Four hand-drawn avatars live in
// /public/avatars; we key off the player's seat so every player at the
// table gets a distinct, stable face across renders and reconnects.

const AVATARS = [
  "/avatars/AV1.png",
  "/avatars/AV2.png",
  "/avatars/AV3.png",
  "/avatars/AV4.png",
] as const;

export function avatarFor(seat: number): string {
  const n = AVATARS.length;
  return AVATARS[((seat % n) + n) % n];
}
