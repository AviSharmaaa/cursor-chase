"use client";
import React, { useRef, useState } from "react";
import { resumeAudio } from "@/lib/audio-utils";
import {
  HIGHSCORE_KEY,
  HIGHSCORE_SFX_VOL,
  NEW_HIGHSCORE_SFX_URL,
  NOT_BEST_SFX_URL,
} from "@/lib/constants";
import { useChaseEngine } from "@/hooks/use-chase-engine";
import { useHighScore } from "@/hooks/use-high-score";
import { useOutcomeSfx } from "@/hooks/use-outcome-sfx";

export default function CursorChaseGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);

  const { highScore, setHighScore, highScoreRef } = useHighScore(HIGHSCORE_KEY);
  const { unlockOutcomeSfx, playNewHigh, playNotBest } = useOutcomeSfx(
    NEW_HIGHSCORE_SFX_URL,
    NOT_BEST_SFX_URL,
    HIGHSCORE_SFX_VOL
  );

  const { startGame } = useChaseEngine({
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
  });

  const restart = () => startGame();

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <div className="pointer-events-none absolute left-1/2 top-4 z-20 -translate-x-1/2 flex items-center gap-4 rounded-2xl bg-white/5 px-4 py-2 backdrop-blur">
        <div className="text-sm opacity-80">Score</div>
        <div className="text-2xl font-semibold tabular-nums">{score}</div>
        <div className="mx-2 opacity-30">•</div>
        <div className="text-sm opacity-80">High</div>
        <div className="text-2xl font-semibold tabular-nums">{highScore}</div>
      </div>

      <canvas
        ref={canvasRef}
        className="block h-full w-full select-none touch-none"
      />

      {!isRunning && !isGameOver && (
        <div className="absolute inset-0 z-30 grid place-items-center">
          <div className="mx-4 max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 text-center shadow-2xl backdrop-blur">
            <h1 className="mb-2 text-2xl font-semibold">Cursor Chase</h1>
            <p className="mb-4 text-sm text-white/80">
              Move your mouse (or finger). Touch the orbs to score. Avoid the
              chaser.
            </p>
            <button
              onClick={() => {
                resumeAudio();
                unlockOutcomeSfx();
                startGame();
              }}
              className="rounded-2xl bg-white px-5 py-2 font-medium text-slate-900 shadow hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white/40"
            >
              Start
            </button>
          </div>
        </div>
      )}

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
