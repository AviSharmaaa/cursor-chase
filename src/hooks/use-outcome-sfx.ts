import React, { useEffect, useRef } from "react";

export function useOutcomeSfx(newUrl: string, notUrl: string, volume = 1.0) {
  const newHighPoolRef = useRef<HTMLAudioElement[]>([]);
  const notBestPoolRef = useRef<HTMLAudioElement[]>([]);
  const newHighIdxRef = useRef(0);
  const notBestIdxRef = useRef(0);
  const unlockedRef = useRef(false);

  useEffect(() => {
    const makePool = (url: string, vol: number, n = 3) =>
      Array.from({ length: n }, () => {
        const el = new Audio(url);
        el.preload = "auto";
        el.crossOrigin = "anonymous";
        el.volume = vol;
        return el;
      });

    newHighPoolRef.current = makePool(newUrl, volume);
    notBestPoolRef.current = makePool(notUrl, volume);

    return () => {
      [...newHighPoolRef.current, ...notBestPoolRef.current].forEach((el) => {
        try {
          el.pause();
          el.src = "";
        } catch {}
      });
      newHighPoolRef.current = [];
      notBestPoolRef.current = [];
    };
  }, [newUrl, notUrl, volume]);

  const unlockOutcomeSfx = () => {
    if (unlockedRef.current) return;
    const prime = (pool: HTMLAudioElement[]) =>
      pool.forEach((el) => {
        try {
          el.muted = true;
          el.play()
            .then(() => {
              el.pause();
              el.currentTime = 0;
              el.muted = false;
            })
            .catch(() => {
              el.muted = false;
            });
        } catch {}
      });
    prime(newHighPoolRef.current);
    prime(notBestPoolRef.current);
    unlockedRef.current = true;
  };

  const playFromPool = (
    poolRef: React.MutableRefObject<HTMLAudioElement[]>,
    idxRef: React.MutableRefObject<number>
  ) => {
    const pool = poolRef.current;
    if (!pool.length) return;
    const el = pool[idxRef.current++ % pool.length];
    try {
      el.currentTime = 0;
      el.play().catch(() => {});
    } catch {}
  };

  const playNewHigh = () => playFromPool(newHighPoolRef, newHighIdxRef);
  const playNotBest = () => playFromPool(notBestPoolRef, notBestIdxRef);

  return { unlockOutcomeSfx, playNewHigh, playNotBest };
}
