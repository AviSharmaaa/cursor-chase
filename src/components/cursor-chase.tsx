"use client";
import {
  TARGET_MIN_R,
  TARGET_MAX_R,
  SAFE_RADIUS,
  CURSOR_R,
  CHASER_R,
  SPAWN_MIN,
  SPAWN_MAX,
  CHASER_SPEED_BASE,
  CHASER_SPEED_PER_POINT,
  ORB_GLOW_MULTIPLIER,
} from "@/lib/constants";
import {
  rand,
  dist2,
  pickOrbColor,
  currentOrbRadius,
  hexToRgb,
} from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

export default function CursorChaseGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);

  // Store mutable game state in refs to avoid re-renders each frame
  const dprRef = useRef(1);
  const sizeRef = useRef({ w: 0, h: 0 });
  const cursorRef = useRef<Vec>({ x: 0, y: 0 });
  const hasPointerRef = useRef(false);
  const chaserRef = useRef<Vec>({ x: 0, y: 0 });
  const targetsRef = useRef<TargetBall[]>([]);
  const nextSpawnAtRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);
  const idCounterRef = useRef(1);
  const isSmallRef = useRef(false);
  const speedScaleRef = useRef(1);

  // --- Animation frame control ---
  const rafRef = useRef<number | null>(null);
  const runningRef = useRef(false);

  // Keep runningRef in sync with latest state so RAF loop doesn't see stale values
  useEffect(() => {
    runningRef.current = isRunning && !isGameOver;
  }, [isRunning, isGameOver]);

  useEffect(() => {
    const coarse = window.matchMedia("(pointer: coarse)");
    const small = window.matchMedia("(max-width: 768px)");

    const update = () => {
      isSmallRef.current = small.matches;
      speedScaleRef.current = coarse.matches ? 0.75 : small.matches ? 0.85 : 1;
    };

    update();
    const onChange = () => update();
    coarse.addEventListener?.("change", onChange);
    small.addEventListener?.("change", onChange);
    return () => {
      coarse.removeEventListener?.("change", onChange);
      small.removeEventListener?.("change", onChange);
    };
  }, []);

  // --- Resize canvas to full window ---
  useEffect(() => {
    const canvas = canvasRef.current!;

    const resize = () => {
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      dprRef.current = dpr;
      const w = window.innerWidth;
      const h = window.innerHeight;
      sizeRef.current = { w, h };
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // --- Pointer handling (mouse + touch) ---
  useEffect(() => {
    const handlePointer = (e: PointerEvent) => {
      hasPointerRef.current = true;
      const rect = canvasRef.current!.getBoundingClientRect();
      cursorRef.current.x = e.clientX - rect.left;
      cursorRef.current.y = e.clientY - rect.top;
    };
    const leave = () => {
      hasPointerRef.current = false;
    };

    window.addEventListener("pointermove", handlePointer);
    window.addEventListener("pointerdown", handlePointer);
    window.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", handlePointer);
      window.removeEventListener("pointerdown", handlePointer);
      window.removeEventListener("pointerleave", leave);
    };
  }, []);

  // --- Core game loop ---
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    const spawnTarget = () => {
      const { w, h } = sizeRef.current;
      for (let i = 0; i < 10; i++) {
        const baseR = rand(TARGET_MIN_R, TARGET_MAX_R);
        const pos = { x: rand(baseR, w - baseR), y: rand(baseR, h - baseR) };
        const tooCloseToCursor =
          dist2(pos, cursorRef.current) < (SAFE_RADIUS + baseR + CURSOR_R) ** 2;
        const tooCloseToChaser =
          dist2(pos, chaserRef.current) < (SAFE_RADIUS + baseR + CHASER_R) ** 2;
        if (!tooCloseToCursor && !tooCloseToChaser) {
          targetsRef.current.push({
            id: idCounterRef.current++,
            pos,
            baseR,
            pulsePhase: Math.random() * Math.PI * 2,
            color: pickOrbColor(),
          });
          break;
        }
      }
    };

    const scheduleNextSpawn = (now: number) => {
      nextSpawnAtRef.current = now + rand(SPAWN_MIN, SPAWN_MAX);
    };

    const resetGame = () => {
      setScore(0);
      setIsGameOver(false);
      targetsRef.current = [];
      const { w, h } = sizeRef.current;
      // Place chaser somewhere away from center to start
      chaserRef.current = { x: w * 0.8, y: h * 0.2 };
      // Cursor to center by default
      cursorRef.current = { x: w * 0.5, y: h * 0.5 };
      lastTimeRef.current = null;
      scheduleNextSpawn(0);
    };

    const drawCircle = (p: Vec, r: number, fill: string, glow = false) => {
      const dpr = dprRef.current;
      ctx.beginPath();
      ctx.arc(p.x * dpr, p.y * dpr, r * dpr, 0, Math.PI * 2);
      if (glow) {
        ctx.shadowColor = fill;
        ctx.shadowBlur = 20 * dpr;
      } else {
        ctx.shadowBlur = 0;
      }
      ctx.fillStyle = fill;
      ctx.fill();
    };

    const drawOrb = (
      ctx: CanvasRenderingContext2D,
      orb: TargetBall,
      elapsedSec: number
    ) => {
      const dpr = dprRef.current;
      const r = currentOrbRadius(orb, elapsedSec);

      // Glow halo via radial gradient
      const haloR = r * ORB_GLOW_MULTIPLIER;
      const [cr, cg, cb] = hexToRgb(orb.color);
      const grad = ctx.createRadialGradient(
        orb.pos.x * dpr,
        orb.pos.y * dpr,
        0,
        orb.pos.x * dpr,
        orb.pos.y * dpr,
        haloR * dpr
      );
      grad.addColorStop(0.0, `rgba(${cr},${cg},${cb},0.9)`);
      grad.addColorStop(0.6, `rgba(${cr},${cg},${cb},0.25)`);
      grad.addColorStop(1.0, `rgba(${cr},${cg},${cb},0.0)`);

      const prevOp = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      ctx.beginPath();
      ctx.arc(orb.pos.x * dpr, orb.pos.y * dpr, haloR * dpr, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.globalCompositeOperation = prevOp;

      // Core circle
      ctx.beginPath();
      ctx.arc(orb.pos.x * dpr, orb.pos.y * dpr, r * dpr, 0, Math.PI * 2);
      ctx.fillStyle = orb.color;
      ctx.shadowColor = orb.color;
      ctx.shadowBlur = Math.max(6, r * 0.6) * dpr;
      ctx.fill();
      ctx.shadowBlur = 0;
    };

    const draw = (nowSec: number) => {
      const { w, h } = sizeRef.current;
      const dpr = dprRef.current;
      ctx.clearRect(0, 0, w * dpr, h * dpr);

      // Background
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, w * dpr, h * dpr);

      // Targets (use pulsing glow)
      for (const t of targetsRef.current) {
        drawOrb(ctx, t, nowSec); // <-- new (see next step)
      }

      if (hasPointerRef.current && isSmallRef.current) {
        drawCircle(cursorRef.current, CURSOR_R, "rgba(255,255,255,0.15)");
        drawCircle(cursorRef.current, 3, "white");
      }

      // Chaser
      drawCircle(chaserRef.current, CHASER_R, "#fe456c", true);
    };

    const update = (dt: number, nowSec: number) => {
      // Spawn
      if (nowSec >= nextSpawnAtRef.current) {
        spawnTarget();
        scheduleNextSpawn(nowSec);
      }

      // Move chaser toward cursor
      const chaser = chaserRef.current;
      const target = cursorRef.current;
      const dx = target.x - chaser.x;
      const dy = target.y - chaser.y;
      const len = Math.hypot(dx, dy) || 1;
      const speed =
        (CHASER_SPEED_BASE + score * CHASER_SPEED_PER_POINT) *
        speedScaleRef.current;
      const step = Math.min(len, speed * dt);
      chaser.x += (dx / len) * step;
      chaser.y += (dy / len) * step;

      // Clamp inside screen
      const { w, h } = sizeRef.current;
      chaser.x = Math.max(CHASER_R, Math.min(w - CHASER_R, chaser.x));
      chaser.y = Math.max(CHASER_R, Math.min(h - CHASER_R, chaser.y));

      // Check collisions: cursor with targets
      const cPos = cursorRef.current;
      let removed = 0;
      targetsRef.current = targetsRef.current.filter((t) => {
        const r = currentOrbRadius(t, nowSec);
        const hit = dist2(t.pos, cPos) <= (r + CURSOR_R) * (r + CURSOR_R);
        if (hit) removed++;
        return !hit;
      });
      if (removed > 0) setScore((s) => s + removed);

      // Check game over: chaser touches cursor
      const over = dist2(chaserRef.current, cPos) <= (CHASER_R + CURSOR_R) ** 2;
      if (over) {
        setIsGameOver(true);
        setIsRunning(false);
      }
    };

    const loop = (timeMs: number) => {
      if (!runningRef.current) return; // stop drawing when paused/over

      const nowSec = timeMs / 1000;
      let dt = 0.016;
      if (lastTimeRef.current != null) {
        dt = Math.min(
          0.033,
          Math.max(0.001, (timeMs - lastTimeRef.current) / 1000)
        );
      }
      lastTimeRef.current = timeMs;

      update(dt, nowSec);
      draw(nowSec);
      rafRef.current = requestAnimationFrame(loop); // store id for cancel
    };

    // Start / pause / initial render
    if (isRunning && !isGameOver) {
      if (lastTimeRef.current === null) {
        resetGame();
      }
      rafRef.current = requestAnimationFrame(loop);
    } else if (!isRunning && !isGameOver) {
      // render paused background once
      const { w, h } = sizeRef.current;
      const dpr = dprRef.current;
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, w * dpr, h * dpr);
    }

    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isRunning, isGameOver, score]);

  const startGame = () => {
    // Cancel any stray RAF before starting fresh
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    // Place chaser away from cursor at start
    const { w, h } = sizeRef.current;
    chaserRef.current = { x: w * 0.8, y: h * 0.2 };
    cursorRef.current = { x: w * 0.5, y: h * 0.5 };
    targetsRef.current = [];
    nextSpawnAtRef.current = 0;
    lastTimeRef.current = null;
    setScore(0);
    setIsGameOver(false);
    setIsRunning(true);
  };

  const restart = () => {
    startGame();
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* HUD */}
      <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 z-20 flex items-center gap-4 rounded-2xl bg-white/5 px-4 py-2 backdrop-blur">
        <div className="text-sm opacity-80">Score</div>
        <div className="text-2xl font-semibold tabular-nums">{score}</div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="block h-full w-full touch-none select-none"
      />

      {/* Start overlay */}
      {!isRunning && !isGameOver && (
        <div className="absolute inset-0 z-30 grid place-items-center">
          <div className="mx-4 max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 text-center shadow-2xl backdrop-blur">
            <h1 className="mb-2 text-2xl font-semibold">Cursor Chase</h1>
            <p className="mb-4 text-sm text-white/80">
              Move your mouse (or finger). Touch the white orbs with your cursor
              to score. Avoid the pink-red chaser — if it touches your cursor,
              the game ends.
            </p>
            <button
              onClick={startGame}
              className="rounded-2xl bg-white px-5 py-2 font-medium text-slate-900 shadow hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white/40"
            >
              Start
            </button>
          </div>
        </div>
      )}

      {/* Game Over overlay */}
      {isGameOver && (
        <div className="absolute inset-0 z-30 grid place-items-center">
          <div className="mx-4 max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 text-center shadow-2xl backdrop-blur">
            <h2 className="mb-2 text-2xl font-semibold">Game Over</h2>
            <p className="mb-4 text-white/80">
              Final score: <span className="font-semibold">{score}</span>
            </p>
            <button
              onClick={restart}
              className="rounded-2xl bg-white px-5 py-2 font-medium text-slate-900 shadow hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white/40"
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
