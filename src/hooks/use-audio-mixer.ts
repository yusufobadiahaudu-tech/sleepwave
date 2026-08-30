import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SOUND_BY_ID, SOUND_LIBRARY } from "@/lib/sleepwave/library";
import { loadSession, saveSession } from "@/lib/sleepwave/storage";
import type { MixLayer } from "@/lib/sleepwave/types";

type Voice = {
  source: AudioBufferSourceNode;
  gain: GainNode;
};

const DEFAULT_VOLUME = 0.62;

function setMediaSession(playing: boolean, titles: string[]) {
  if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
  const subtitle = titles.length ? titles.join(" · ") : "Sleep sounds";
  navigator.mediaSession.metadata = new MediaMetadata({
    title: "SleepWave",
    artist: subtitle,
    album: "Night mix",
  });
  navigator.mediaSession.playbackState = playing ? "playing" : "paused";
}

export function useAudioMixer(isPremium: boolean, ready: boolean) {
  const [layers, setLayers] = useState<MixLayer[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [blockedPremium, setBlockedPremium] = useState<string[]>([]);

  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const voicesRef = useRef<Record<string, Voice>>({});
  const buffersRef = useRef<Record<string, AudioBuffer>>({});
  const fadeTokenRef = useRef(0);
  const volumesRef = useRef<Record<string, number>>({});
  const layersRef = useRef(layers);
  const playingRef = useRef(isPlaying);
  layersRef.current = layers;
  playingRef.current = isPlaying;

  const ensureGraph = useCallback(async () => {
    if (typeof window === "undefined") return null;
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) {
      setAudioError("This browser cannot play Web Audio.");
      return null;
    }
    if (!ctxRef.current) {
      const ctx = new AC();
      const master = ctx.createGain();
      master.gain.value = 1;
      master.connect(ctx.destination);
      ctxRef.current = ctx;
      masterRef.current = master;
    }
    if (ctxRef.current.state === "suspended") {
      await ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  const loadBuffer = useCallback(async (id: string) => {
    if (buffersRef.current[id]) return buffersRef.current[id];
    const def = SOUND_BY_ID[id];
    const ctx = ctxRef.current;
    if (!def || !ctx) return null;
    const res = await fetch(def.file);
    if (!res.ok) throw new Error(`Missing ${def.name}`);
    const arr = await res.arrayBuffer();
    const buffer = await ctx.decodeAudioData(arr.slice(0));
    buffersRef.current[id] = buffer;
    return buffer;
  }, []);

  const stopVoice = useCallback((id: string) => {
    const voice = voicesRef.current[id];
    if (!voice) return;
    try {
      voice.source.stop();
    } catch {
      /* already stopped */
    }
    try {
      voice.source.disconnect();
      voice.gain.disconnect();
    } catch {
      /* ignore */
    }
    delete voicesRef.current[id];
  }, []);

  const startVoice = useCallback(
    async (id: string, volume: number) => {
      const ctx = ctxRef.current;
      const master = masterRef.current;
      if (!ctx || !master) return;
      stopVoice(id);
      const buffer = await loadBuffer(id);
      if (!buffer) return;
      const gain = ctx.createGain();
      gain.gain.value = volume;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.connect(gain);
      gain.connect(master);
      source.start();
      voicesRef.current[id] = { source, gain };
    },
    [loadBuffer, stopVoice],
  );

  const resetMaster = useCallback(() => {
    const ctx = ctxRef.current;
    const master = masterRef.current;
    if (!ctx || !master) return;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(1, ctx.currentTime);
  }, []);

  const syncVoices = useCallback(
    async (nextLayers: MixLayer[], playing: boolean) => {
      const ids = new Set(nextLayers.map((layer) => layer.id));
      for (const id of Object.keys(voicesRef.current)) {
        if (!ids.has(id) || !playing) stopVoice(id);
      }
      if (!playing) return;
      const ctx = await ensureGraph();
      if (!ctx) return;
      resetMaster();
      await Promise.all(
        nextLayers.map((layer) => startVoice(layer.id, layer.volume)),
      );
    },
    [ensureGraph, resetMaster, startVoice, stopVoice],
  );

  useEffect(() => {
    if (!ready || hydrated) return;
    const session = loadSession();
    volumesRef.current = session.volumes ?? {};
    const restored: MixLayer[] = [];
    const blocked: string[] = [];
    for (const layer of session.layers) {
      const def = SOUND_BY_ID[layer.id];
      if (!def) continue;
      const volume = session.volumes[layer.id] ?? layer.volume ?? DEFAULT_VOLUME;
      volumesRef.current[layer.id] = volume;
      if (!def.free && !isPremium) {
        blocked.push(def.name);
        continue;
      }
      restored.push({ id: layer.id, volume });
    }
    setLayers(restored);
    setBlockedPremium(blocked);
    setHydrated(true);
  }, [ready, isPremium, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    saveSession({
      layers,
      volumes: { ...volumesRef.current },
    });
  }, [hydrated, layers]);

  useEffect(() => {
    const titles = layers
      .map((layer) => SOUND_BY_ID[layer.id]?.name)
      .filter(Boolean) as string[];
    setMediaSession(isPlaying && layers.length > 0, titles);
  }, [isPlaying, layers]);

  useEffect(() => {
    return () => {
      for (const id of Object.keys(voicesRef.current)) stopVoice(id);
      void ctxRef.current?.close();
    };
  }, [stopVoice]);

  const play = useCallback(async () => {
    if (layersRef.current.length === 0) return;
    setAudioError(null);
    fadeTokenRef.current += 1;
    try {
      await syncVoices(layersRef.current, true);
      setIsPlaying(true);
    } catch {
      setAudioError("A sound could not be loaded. Try again.");
      setIsPlaying(false);
    }
  }, [syncVoices]);

  const pause = useCallback(() => {
    fadeTokenRef.current += 1;
    for (const id of Object.keys(voicesRef.current)) stopVoice(id);
    setIsPlaying(false);
  }, [stopVoice]);

  const stopAll = useCallback(() => {
    fadeTokenRef.current += 1;
    for (const id of Object.keys(voicesRef.current)) stopVoice(id);
    setLayers([]);
    setIsPlaying(false);
    resetMaster();
  }, [resetMaster, stopVoice]);

  const cancelFade = useCallback(() => {
    fadeTokenRef.current += 1;
    resetMaster();
  }, [resetMaster]);

  const toggleSound = useCallback(
    async (id: string): Promise<"locked" | "ok"> => {
      const def = SOUND_BY_ID[id];
      if (!def) return "ok";
      if (!def.free && !isPremium) return "locked";

      const exists = layersRef.current.some((layer) => layer.id === id);
      if (exists) {
        const next = layersRef.current.filter((layer) => layer.id !== id);
        setLayers(next);
        stopVoice(id);
        if (next.length === 0) setIsPlaying(false);
        return "ok";
      }

      const volume = volumesRef.current[id] ?? DEFAULT_VOLUME;
      volumesRef.current[id] = volume;
      setLayers([...layersRef.current, { id, volume }]);
      setAudioError(null);
      try {
        const ctx = await ensureGraph();
        if (!ctx) return "ok";
        resetMaster();
        await startVoice(id, volume);
        setIsPlaying(true);
      } catch {
        setAudioError(`${def.name} could not be loaded.`);
      }
      return "ok";
    },
    [ensureGraph, isPremium, resetMaster, startVoice, stopVoice],
  );

  const setVolume = useCallback((id: string, volume: number) => {
    const nextVol = Math.min(1, Math.max(0, volume));
    volumesRef.current[id] = nextVol;
    setLayers((current) =>
      current.map((layer) =>
        layer.id === id ? { ...layer, volume: nextVol } : layer,
      ),
    );
    const voice = voicesRef.current[id];
    const ctx = ctxRef.current;
    if (voice && ctx) {
      voice.gain.gain.setTargetAtTime(nextVol, ctx.currentTime, 0.04);
    }
  }, []);

  const restoreMix = useCallback(
    async (incoming: MixLayer[]) => {
      const next: MixLayer[] = [];
      const blocked: string[] = [];
      for (const layer of incoming) {
        const def = SOUND_BY_ID[layer.id];
        if (!def) continue;
        const volume = Math.min(1, Math.max(0.05, layer.volume ?? DEFAULT_VOLUME));
        volumesRef.current[layer.id] = volume;
        if (!def.free && !isPremium) {
          blocked.push(def.name);
          continue;
        }
        next.push({ id: layer.id, volume });
      }
      setBlockedPremium(blocked);
      setLayers(next);
      fadeTokenRef.current += 1;
      for (const id of Object.keys(voicesRef.current)) stopVoice(id);
      setIsPlaying(false);
      return blocked;
    },
    [isPremium, stopVoice],
  );

  const fadeOutAndStop = useCallback(
    async (seconds: number) => {
      const ctx = ctxRef.current;
      const master = masterRef.current;
      const token = ++fadeTokenRef.current;
      if (!ctx || !master || !playingRef.current) {
        stopAll();
        return;
      }
      const dur = Math.max(0.4, seconds);
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), ctx.currentTime);
      master.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + dur);
      await new Promise((resolve) => setTimeout(resolve, dur * 1000 + 40));
      if (token !== fadeTokenRef.current) return;
      stopAll();
    },
    [stopAll],
  );

  const bindMediaHandlers = useCallback(
    (handlers: { play: () => void; pause: () => void; stop: () => void }) => {
      if (typeof navigator === "undefined" || !("mediaSession" in navigator)) {
        return () => {};
      }
      try {
        navigator.mediaSession.setActionHandler("play", handlers.play);
        navigator.mediaSession.setActionHandler("pause", handlers.pause);
        navigator.mediaSession.setActionHandler("stop", handlers.stop);
      } catch {
        /* unsupported */
      }
      return () => {
        try {
          navigator.mediaSession.setActionHandler("play", null);
          navigator.mediaSession.setActionHandler("pause", null);
          navigator.mediaSession.setActionHandler("stop", null);
        } catch {
          /* ignore */
        }
      };
    },
    [],
  );

  const playingCount = isPlaying ? layers.length : 0;

  const activeDefinitions = useMemo(
    () =>
      layers
        .map((layer) => {
          const def = SOUND_BY_ID[layer.id];
          return def ? { ...def, volume: layer.volume } : null;
        })
        .filter((item): item is SoundDefinitionWithVolume => Boolean(item)),
    [layers],
  );

  return {
    layers,
    isPlaying,
    hydrated,
    audioError,
    setAudioError,
    blockedPremium,
    clearBlocked: () => setBlockedPremium([]),
    playingCount,
    activeDefinitions,
    library: SOUND_LIBRARY,
    toggleSound,
    setVolume,
    play,
    pause,
    stopAll,
    restoreMix,
    fadeOutAndStop,
    cancelFade,
    bindMediaHandlers,
  };
}

export type SoundDefinitionWithVolume = (typeof SOUND_LIBRARY)[number] & {
  volume: number;
};
