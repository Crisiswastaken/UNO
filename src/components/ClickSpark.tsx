"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * A burst of short lines radiating from every click, drawn on a fixed,
 * click-through canvas that covers the whole viewport. Adapted from
 * reactbits.dev/animations/click-spark.
 *
 * Our twist: each click picks one random color from the four UNO accents, so
 * the whole burst flashes red / yellow / green / blue and the next one differs.
 * Kept in sync with the @theme accents in globals.css.
 */
const SPARK_COLORS = ["#ea6833", "#f8c368", "#97b16c", "#3595c6"];

type Spark = {
  x: number;
  y: number;
  angle: number;
  startTime: number;
  color: string;
};

const SPARK_SIZE = 11;
const SPARK_RADIUS = 18;
const SPARK_COUNT = 8;
const DURATION = 420;
const LINE_WIDTH = 2.4;

export function ClickSpark() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sparksRef = useRef<Spark[]>([]);

  // ease-out: fast then settling, matching the reference feel.
  const ease = useCallback((t: number) => t * (2 - t), []);

  // Keep the canvas backing store sized to the viewport (DPR-aware).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // The render loop: advance + draw live sparks, drop the expired ones.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const dpr = () => window.devicePixelRatio || 1;

    const draw = (now: number) => {
      ctx.clearRect(0, 0, canvas.width / dpr(), canvas.height / dpr());
      ctx.lineWidth = LINE_WIDTH;

      sparksRef.current = sparksRef.current.filter((spark) => {
        const elapsed = now - spark.startTime;
        if (elapsed >= DURATION) return false;

        const eased = ease(elapsed / DURATION);
        const distance = eased * SPARK_RADIUS;
        const lineLength = SPARK_SIZE * (1 - eased);
        const cos = Math.cos(spark.angle);
        const sin = Math.sin(spark.angle);

        ctx.strokeStyle = spark.color;
        ctx.beginPath();
        ctx.moveTo(spark.x + distance * cos, spark.y + distance * sin);
        ctx.lineTo(
          spark.x + (distance + lineLength) * cos,
          spark.y + (distance + lineLength) * sin,
        );
        ctx.stroke();
        return true;
      });

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [ease]);

  // Spawn a fresh, single-colored burst wherever the pointer went down.
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const color = SPARK_COLORS[(Math.random() * SPARK_COLORS.length) | 0];
      const now = performance.now();
      for (let i = 0; i < SPARK_COUNT; i++) {
        sparksRef.current.push({
          x: e.clientX,
          y: e.clientY,
          angle: (2 * Math.PI * i) / SPARK_COUNT,
          startTime: now,
          color,
        });
      }
    };

    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 9999,
      }}
    />
  );
}
