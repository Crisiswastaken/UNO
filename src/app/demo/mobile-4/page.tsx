import { MobileDemoFrame } from "../../../components/MobileDemoFrame";

// Portrait mobile board (4-player) framed in the iPhone bezel. Dev-only review
// route, gated by ../layout.tsx. Renders /demo/part/mobile-4p inside the frame.
export default function MobileDemo4() {
  return <MobileDemoFrame src="/demo/part/mobile-4p" title="Mobile — 4 player" />;
}
