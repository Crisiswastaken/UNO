/**
 * Landscape rotate prompt for phones.
 *
 * The phone experience (mobile lobby + `MobileGameTable`) is designed for
 * portrait. When a phone is turned to landscape the board would be squashed, so
 * we overlay a "rotate to portrait" notice instead. Larger devices (tablets,
 * laptops, desktops) use the desktop layout in any orientation and never see
 * this.
 *
 * Visibility is pure CSS (`.rotate-prompt` in globals.css, toggled by a
 * phone-landscape media query), so there's no JS detection, no hydration flash,
 * and it sits above everything — including the splash — via a max z-index.
 */
export function RotatePrompt() {
  return (
    <div className="rotate-prompt" role="alertdialog" aria-label="Rotate your device">
      <div className="rotate-prompt__panel">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/home/uno-wordmark.png"
          alt="UNO"
          width={556}
          height={330}
          className="rotate-prompt__logo"
        />
        <h1 className="rotate-prompt__title">Rotate your phone</h1>
        <p className="rotate-prompt__text">
          Custom UNO is built for portrait on phones. Turn your device upright to
          play.
        </p>
      </div>
    </div>
  );
}
