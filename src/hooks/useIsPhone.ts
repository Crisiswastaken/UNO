"use client";

import { useEffect, useState } from "react";

/**
 * True when the viewport is a phone-width portrait screen. Detection is keyed
 * on *width* alone (≤ 500px): modern phones are 360–430px wide in portrait but
 * frequently 900–1000px *tall* (e.g. 412×915), so the old `max-height: 899px`
 * clause wrongly kicked those tall phones back to the cramped desktop layout.
 * Tablets/laptops/desktops stay ≥ 600px wide and keep the desktop layout; a
 * phone rotated to landscape becomes > 500px wide and is caught by the
 * separate "rotate to portrait" prompt.
 *
 * SSR-safe: returns `false` on the server and the first client render, then
 * updates on mount and on every media-query change, so there is no hydration
 * mismatch (the desktop tree is what the server rendered).
 */
const PHONE_QUERY = "(max-width: 500px)";

export function useIsPhone(): boolean {
  const [isPhone, setIsPhone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(PHONE_QUERY);
    const update = () => setIsPhone(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  return isPhone;
}
