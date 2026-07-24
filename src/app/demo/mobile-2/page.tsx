import { MobileDemoFrame } from "../../../components/MobileDemoFrame";

// Portrait mobile board (2-player) framed in the iPhone bezel. Dev-only review
// route, gated by ../layout.tsx. Renders /demo/part/mobile-2p inside the frame.
export default function MobileDemo2() {
  return <MobileDemoFrame src="/demo/part/mobile-2p" title="Mobile — 2 player" />;
}
