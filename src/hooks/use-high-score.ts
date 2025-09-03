import { useEffect, useRef, useState } from "react";

export function useHighScore(storageKey: string) {
  const [highScore, setHighScore] = useState(0);
  const highScoreRef = useRef(0);

  useEffect(() => {
    const saved = Number(localStorage.getItem(storageKey) || 0);
    if (Number.isFinite(saved)) setHighScore(saved);
  }, [storageKey]);

  useEffect(() => {
    highScoreRef.current = highScore;
  }, [highScore]);

  return { highScore, setHighScore, highScoreRef };
}
