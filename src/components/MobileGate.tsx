/**
 * Small-screen gate. The game is a desktop-first, non-responsive layout
 * (hover affordances, fixed table), so on phone-sized viewports we show a
 * full-screen notice instead of the broken UI. Tablets and laptops are allowed.
 *
 * Visibility is pure CSS (`.mobile-gate` in globals.css, toggled by media
 * queries), so there's no JS detection, no hydration flash, and it sits above
 * everything — including the splash — via a max z-index. Remove once the app
 * has a real responsive layout.
 */
export function MobileGate() {
  return (
    <div className="mobile-gate" role="alertdialog" aria-label="Screen too small">
      <div className="mobile-gate__panel">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/home/uno-wordmark.png"
          alt="UNO"
          width={556}
          height={330}
          className="mobile-gate__logo"
        />
        <h1 className="mobile-gate__title">Screen too small</h1>
        <p className="mobile-gate__text">
          Custom UNO isn&apos;t ready for phone screens yet. Open it on a
          tablet, laptop, or desktop to play.
        </p>
      </div>
    </div>
  );
}
