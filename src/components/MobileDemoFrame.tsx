"use client";

/* --------------------------------------------------------------------------
   MOBILE DEMO FRAME

   Wraps a phone-only route (e.g. /demo/part/mobile-2p) in the iphone-frame.png
   bezel so the portrait MobileGameTable can be reviewed on a desktop exactly as
   it renders on a phone. The board lives in an <iframe>: that's the only way
   MobileGameTable's `fixed inset-0`, its `window.innerWidth` reads, and its
   `vw`/`vh` units all resolve against a phone-sized viewport instead of the
   desktop window.

   The screen-cutout insets below were measured from the PNG's alpha channel
   (846×1784 art). The bezel art is drawn on top with pointer-events-none, so
   its transparent screen reveals the iframe and its opaque frame masks the
   iframe edges — nothing the board renders can escape the phone.

   Dev-only scratch surface (gated with the rest of /demo). Remove with the demos.
-------------------------------------------------------------------------- */

// Frame art is 846×1784. Screen cutout, as a fraction of that art:
const SCREEN = { left: "1.65%", right: "2.01%", top: "1.07%", bottom: "0.95%" };
const FRAME_W = 846;
const FRAME_H = 1784;

export function MobileDemoFrame({ src, title }: { src: string; title: string }) {
  return (
    <main className="fixed inset-0 grid place-items-center overflow-hidden bg-uno-ink p-4">
      <div
        className="relative"
        style={{
          aspectRatio: `${FRAME_W} / ${FRAME_H}`,
          // Fit the whole frame in the viewport, height-first, so the entire
          // phone is always visible with no page scroll.
          height: `min(96vh, calc(96vw * ${FRAME_H} / ${FRAME_W}))`,
        }}
      >
        {/* The live phone screen, sitting in the frame's transparent cutout. */}
        <div
          className="absolute overflow-hidden"
          style={{
            left: SCREEN.left,
            right: SCREEN.right,
            top: SCREEN.top,
            bottom: SCREEN.bottom,
            // Round the corners so the square iframe never pokes past the frame's
            // rounded screen corners (~7% of screen width is a close visual match).
            borderRadius: "7%",
          }}
        >
          <iframe
            src={src}
            title={title}
            className="block h-full w-full border-0 bg-uno-cream"
          />
        </div>

        {/* Bezel art on top — transparent screen reveals the iframe beneath. */}
        <img
          src="/iphone-frame.png"
          alt=""
          aria-hidden
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full select-none"
        />
      </div>
    </main>
  );
}
