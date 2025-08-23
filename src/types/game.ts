interface Vec {
  x: number;
  y: number;
}

interface TargetBall {
  id: number;
  pos: Vec;
  baseR: number; // immutable base radius
  pulsePhase: number; // random phase so each orb pulses out of sync
  color: string;
}