import { ORB_PULSE_AMPLITUDE, ORB_PULSE_SPEED } from "./constants";

export const dist2 = (a: Vec, b: Vec) => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
};

export const rand = (min: number, max: number) =>
  Math.random() * (max - min) + min;

export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export function currentOrbRadius(orb: TargetBall, elapsedSec: number) {
  const pulse =
    1 +
    ORB_PULSE_AMPLITUDE *
      Math.sin(ORB_PULSE_SPEED * elapsedSec + orb.pulsePhase);
  return Math.max(2, orb.baseR * pulse);
}

const ORB_COLORS = [
  "#ffffff",
  "#7dd3fc",
  "#a78bfa",
  "#f472b6",
  "#34d399",
  "#fbbf24",
];

export function pickOrbColor() {
  return ORB_COLORS[(Math.random() * ORB_COLORS.length) | 0];
}
