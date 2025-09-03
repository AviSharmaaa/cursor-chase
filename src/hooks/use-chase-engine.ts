import { useEffect, useRef } from "react";
import { ensureAudio, playDing } from "@/lib/audio-utils";
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
  PARTICLE_LIFETIME,
  PARTICLE_SIZE,
  PARTICLE_PER_FRAME,
  GOLDEN_ORB_CHANCE,
  GOLDEN_ORB_COLOR,
  GOLDEN_ORB_POINTS,
  GOLDEN_GLOW_BOOST,
  HIGHSCORE_KEY,
} from "@/lib/constants";
import {
  rand,
  dist2,
  pickOrbColor,
  currentOrbRadius,
  hexToRgb,
} from "@/lib/utils";

type EngineParams = {
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  score: number;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  isRunning: boolean;
  setIsRunning: (v: boolean) => void;
  isGameOver: boolean;
  setIsGameOver: (v: boolean) => void;
  highScoreRef: React.MutableRefObject<number>;
  setHighScore: (n: number) => void;
  playNewHigh: () => void;
  playNotBest: () => void;
};

export function useChaseEngine({
  canvasRef,
  score,
  setScore,
  isRunning,
  setIsRunning,
  isGameOver,
  setIsGameOver,
  highScoreRef,
  setHighScore,
  playNewHigh,
  playNotBest,
}: EngineParams) {
  const dprRef = useRef(1);
  const sizeRef = useRef({ w: 0, h: 0 });
  const cursorRef = useRef<Vec>({ x: 0, y: 0 });
  const hasPointerRef = useRef(false);
  const chaserRef = useRef<Vec>({ x: 0, y: 0 });
  const targetsRef = useRef<TargetBall[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const nextSpawnAtRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);
  const idCounterRef = useRef(1);
  const isSmallRef = useRef(false);
  const speedScaleRef = useRef(1);
  const rafRef = useRef<number | null>(null);
  const runningRef = useRef(false);
  const playedGameOverRef = useRef(false);

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
  }, [canvasRef]);

  useEffect(() => {
    const handlePointer = (e: PointerEvent) => {
      hasPointerRef.current = true;
      const rect = canvasRef.current!.getBoundingClientRect();
      cursorRef.current.x = e.clientX - rect.left;
      cursorRef.current.y = e.clientY - rect.top;
    };
    const leave = () => (hasPointerRef.current = false);

    window.addEventListener("pointermove", handlePointer);
    window.addEventListener("pointerdown", handlePointer);
    window.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", handlePointer);
      window.removeEventListener("pointerdown", handlePointer);
      window.removeEventListener("pointerleave", leave);
    };
  }, [canvasRef]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    const spawnTarget = () => {
      const { w, h } = sizeRef.current;
      for (let i = 0; i < 10; i++) {
        const baseR = rand(TARGET_MIN_R, TARGET_MAX_R);
        const pos = { x: rand(baseR, w - baseR), y: rand(baseR, h - baseR) };
        const tooCursor =
          dist2(pos, cursorRef.current) < (SAFE_RADIUS + baseR + CURSOR_R) ** 2;
        const tooChaser =
          dist2(pos, chaserRef.current) < (SAFE_RADIUS + baseR + CHASER_R) ** 2;
        if (!tooCursor && !tooChaser) {
          const isGolden = Math.random() < GOLDEN_ORB_CHANCE;
          const baseR2 = baseR * (isGolden ? 1.1 : 1);
          targetsRef.current.push({
            id: idCounterRef.current++,
            pos,
            baseR: baseR2,
            pulsePhase: Math.random() * Math.PI * 2,
            color: isGolden ? GOLDEN_ORB_COLOR : pickOrbColor(),
            value: isGolden ? GOLDEN_ORB_POINTS : 1,
            isGolden,
          });
          break;
        }
      }
    };

    const scheduleNextSpawn = (now: number) => {
      nextSpawnAtRef.current = now + rand(SPAWN_MIN, SPAWN_MAX);
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

    const drawOrb = (orb: TargetBall, elapsedSec: number) => {
      const dpr = dprRef.current;
      const r = currentOrbRadius(orb, elapsedSec);
      const haloR =
        r * ORB_GLOW_MULTIPLIER * (orb.isGolden ? GOLDEN_GLOW_BOOST : 1);
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

      ctx.beginPath();
      ctx.arc(orb.pos.x * dpr, orb.pos.y * dpr, r * dpr, 0, Math.PI * 2);
      ctx.fillStyle = orb.color;
      ctx.shadowColor = orb.color;
      ctx.shadowBlur = Math.max(6, r * 0.6) * dpr;
      ctx.fill();
      ctx.shadowBlur = 0;
    };

    const drawParticles = () => {
      const dpr = dprRef.current;
      ctx.shadowBlur = 0;
      ctx.shadowColor = "transparent";
      for (const p of particlesRef.current) {
        const alpha = Math.max(0, p.life / PARTICLE_LIFETIME);
        const size = PARTICLE_SIZE * alpha * dpr;
        ctx.beginPath();
        ctx.arc(p.x * dpr, p.y * dpr, size, 0, Math.PI * 2);
        ctx.fillStyle = p.color.replace(/[\d.]+\)$/g, `${alpha})`);
        ctx.fill();
      }
    };

    const draw = (nowSec: number) => {
      const { w, h } = sizeRef.current;
      const dpr = dprRef.current;
      ctx.clearRect(0, 0, w * dpr, h * dpr);
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, w * dpr, h * dpr);
      drawParticles();
      for (const t of targetsRef.current) drawOrb(t, nowSec);
      if (hasPointerRef.current && isSmallRef.current) {
        drawCircle(cursorRef.current, CURSOR_R, "rgba(255,255,255,0.15)");
        drawCircle(cursorRef.current, 3, "white");
      }
      drawCircle(chaserRef.current, CHASER_R, "#fe456c", false);
    };

    const update = (dt: number, nowSec: number) => {
      if (nowSec >= nextSpawnAtRef.current) {
        spawnTarget();
        scheduleNextSpawn(nowSec);
      }

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

      if (hasPointerRef.current && Math.random() < 0.3) {
        for (let i = 0; i < PARTICLE_PER_FRAME; i++) {
          particlesRef.current.push({
            x: chaserRef.current.x,
            y: chaserRef.current.y,
            vx: (Math.random() - 0.5) * 30,
            vy: (Math.random() - 0.5) * 30,
            life: PARTICLE_LIFETIME,
            color: "rgba(254,69,108,0.9)",
          });
        }
      }

      particlesRef.current = particlesRef.current.filter((p) => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        return p.life > 0;
      });

      const { w, h } = sizeRef.current;
      chaser.x = Math.max(CHASER_R, Math.min(w - CHASER_R, chaser.x));
      chaser.y = Math.max(CHASER_R, Math.min(h - CHASER_R, chaser.y));

      const cPos = cursorRef.current;
      let gained = 0;
      let removedTotal = 0;
      let goldenHits = 0;

      targetsRef.current = targetsRef.current.filter((t) => {
        const r = currentOrbRadius(t, nowSec);
        const hit = dist2(t.pos, cPos) <= (r + CURSOR_R) * (r + CURSOR_R);
        if (hit) {
          gained += t.value;
          removedTotal++;
          if (t.isGolden) goldenHits++;
        }
        return !hit;
      });

      let nextScore = score;
      ensureAudio();
      if (removedTotal > 0) {
        nextScore = score + gained;
        setScore(nextScore);
        for (let i = 0; i < removedTotal - goldenHits; i++)
          playDing(820 + Math.random() * 120);
        for (let g = 0; g < goldenHits; g++) {
          playDing(1400);
          setTimeout(() => playDing(1800), 70);
        }
      }

      const over = dist2(chaserRef.current, cPos) <= (CHASER_R + CURSOR_R) ** 2;
      if (over) {
        setIsGameOver(true);
        setIsRunning(false);
        if (!playedGameOverRef.current) {
          const finalScore = nextScore;
          if (finalScore > highScoreRef.current) {
            setHighScore(finalScore);
            try {
              localStorage.setItem(HIGHSCORE_KEY, String(finalScore));
            } catch {}
            playNewHigh();
          } else {
            playNotBest();
          }
          playedGameOverRef.current = true;
        }
      }
    };

    const loop = (timeMs: number) => {
      if (!runningRef.current) return;
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
      rafRef.current = requestAnimationFrame(loop);
    };

    const resetGame = () => {
      setScore(0);
      setIsGameOver(false);
      targetsRef.current = [];
      const { w, h } = sizeRef.current;
      chaserRef.current = { x: w * 0.8, y: h * 0.2 };
      cursorRef.current = { x: w * 0.5, y: h * 0.5 };
      lastTimeRef.current = null;
      scheduleNextSpawn(0);
    };

    if (isRunning && !isGameOver) {
      if (lastTimeRef.current === null) resetGame();
      rafRef.current = requestAnimationFrame(loop);
    } else if (!isRunning && !isGameOver) {
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
  }, [
    canvasRef,
    isRunning,
    isGameOver,
    score,
    setScore,
    setIsRunning,
    setIsGameOver,
    highScoreRef,
    setHighScore,
    playNewHigh,
    playNotBest,
  ]);

  const startGame = () => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    playedGameOverRef.current = false;

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

  return { startGame };
}
