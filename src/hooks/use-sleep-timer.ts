import { useCallback, useEffect, useRef, useState } from "react";
import { FADE_SECONDS, secondsUntilSunrise } from "@/lib/sleepwave/library";

export function useSleepTimer(onFadeComplete: (seconds: number) => void) {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [fading, setFading] = useState(false);
  const fadingRef = useRef(false);
  const onFadeRef = useRef(onFadeComplete);
  onFadeRef.current = onFadeComplete;

  useEffect(() => {
    if (remaining === null) return;
    const id = window.setInterval(() => {
      setRemaining((current) => {
        if (current === null) return null;
        if (current <= 1) return 0;
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [remaining === null]);

  useEffect(() => {
    if (remaining === null) return;
    if (remaining === 0) {
      setRemaining(null);
      const wasFading = fadingRef.current;
      fadingRef.current = false;
      setFading(false);
      if (!wasFading) onFadeRef.current(0.6);
      return;
    }
    if (remaining <= FADE_SECONDS && !fadingRef.current) {
      fadingRef.current = true;
      setFading(true);
      onFadeRef.current(Math.min(FADE_SECONDS, remaining));
    }
  }, [remaining]);

  const start = useCallback((seconds: number | "sunrise") => {
    fadingRef.current = false;
    setFading(false);
    const next = seconds === "sunrise" ? secondsUntilSunrise() : seconds;
    setRemaining(next);
  }, []);

  const clear = useCallback(() => {
    fadingRef.current = false;
    setFading(false);
    setRemaining(null);
  }, []);

  return { remaining, fading, start, clear };
}

export function formatClock(seconds: number) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}
