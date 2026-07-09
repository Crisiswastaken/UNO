import { GameDemo } from "../../components/GameDemo";

// Always-on scratch route for redesigning the game-room table in isolation.
// Static scene only — no engine, no socket. Remove once the redesign lands in
// /room/[code].
export default function DemoPage() {
  return <GameDemo />;
}
