import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bookmark, Clock, X } from "lucide-react";
import { Mixer } from "@/components/sleepwave/mixer";
import { Paywall } from "@/components/sleepwave/paywall";
import { SavedMixesSheet, SaveMixSheet } from "@/components/sleepwave/saved-mixes";
import { SoundCard } from "@/components/sleepwave/sound-card";
import { TimerSheet } from "@/components/sleepwave/timer-sheet";
import { Transport } from "@/components/sleepwave/transport";
import { WaveMark } from "@/components/sleepwave/icons";
import { Button } from "@/components/ui/button";
import { useAudioMixer } from "@/hooks/use-audio-mixer";
import { useNightPass } from "@/hooks/use-night-pass";
import { useSleepTimer } from "@/hooks/use-sleep-timer";
import {
  FREE_MIX_LIMIT,
  FREE_SOUNDS,
  PREMIUM_SOUNDS,
  defaultMixName,
} from "@/lib/sleepwave/library";
import { loadMixes, newMixId, saveMixes } from "@/lib/sleepwave/storage";
import type { SavedMix } from "@/lib/sleepwave/types";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const billing = useNightPass();
  const { ready, isPremium } = billing;
  const [mixes, setMixes] = useState<SavedMix[]>([]);
  const [showTimer, setShowTimer] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [showSave, setShowSave] = useState(false);
  const [mixName, setMixName] = useState("");

  useEffect(() => {
    setMixes(loadMixes());
  }, []);

  const mixer = useAudioMixer(isPremium, ready);

  const onFade = useCallback(
    (seconds: number) => {
      void mixer.fadeOutAndStop(seconds);
    },
    [mixer.fadeOutAndStop],
  );
  const timer = useSleepTimer(onFade);

  useEffect(() => {
    return mixer.bindMediaHandlers({
      play: () => {
        void mixer.play();
      },
      pause: mixer.pause,
      stop: mixer.stopAll,
    });
  }, [mixer.bindMediaHandlers, mixer.play, mixer.pause, mixer.stopAll]);

  useEffect(() => {
    if (mixer.blockedPremium.length > 0) setShowPaywall(true);
  }, [mixer.blockedPremium]);

  useEffect(() => {
    if (isPremium) mixer.clearBlocked();
  }, [isPremium]);

  const persistMixes = (next: SavedMix[]) => {
    setMixes(next);
    saveMixes(next);
  };

  const openSave = () => {
    if (mixer.layers.length === 0) return;
    if (!isPremium && mixes.length >= FREE_MIX_LIMIT) {
      setShowPaywall(true);
      return;
    }
    setMixName(defaultMixName(mixer.layers.map((layer) => layer.id)));
    setShowSave(true);
  };

  const commitSave = () => {
    const name = mixName.trim() || defaultMixName(mixer.layers.map((layer) => layer.id));
    const mix: SavedMix = {
      id: newMixId(),
      name,
      layers: mixer.layers.map((layer) => ({ ...layer })),
      createdAt: Date.now(),
    };
    persistMixes([mix, ...mixes.filter((item) => item.name !== name)]);
    setShowSave(false);
  };

  const restore = async (mix: SavedMix) => {
    const blocked = await mixer.restoreMix(mix.layers);
    setShowSaved(false);
    if (blocked.length > 0) setShowPaywall(true);
  };

  const status = useMemo(() => {
    if (mixer.playingCount > 0) {
      return `${mixer.playingCount} playing`;
    }
    if (mixer.layers.length > 0) return "Paused";
    return null;
  }, [mixer.layers.length, mixer.playingCount]);

  const handleStop = () => {
    mixer.stopAll();
    timer.clear();
    mixer.cancelFade();
  };

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-4 pb-32 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <header className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <WaveMark className="size-9" />
          <div>
            <p className="font-display text-lg tracking-[-0.03em] text-fg">SleepWave</p>
            <p className="text-xs text-muted">Your quiet place to land</p>
          </div>
        </div>
        <Button
          variant="muted"
          size="sm"
          onClick={() => setShowPaywall(true)}
        >
          {isPremium ? "Night Pass" : "Upgrade"}
        </Button>
      </header>

      <section className="relative overflow-hidden rounded-[28px] bg-surface px-5 py-6 shadow-[var(--shadow-border)]">
        <p className="text-[10px] font-semibold tracking-[0.18em] text-accent">TONIGHT</p>
        <h1 className="mt-3 max-w-[14ch] font-display text-[2rem] leading-[1.1] tracking-[-0.03em] text-fg">
          Let the day drift away.
        </h1>
        <p className="mt-3 max-w-[28ch] text-sm text-muted">
          Local night textures. Nothing streams. Nothing starts until you press play.
        </p>
        <div className="pointer-events-none absolute top-4 right-2 size-28" aria-hidden="true">
          <span className="absolute inset-0 rounded-full border border-border" />
          <span className="absolute inset-6 rounded-full border border-accent/40" />
          <span className="absolute top-1/2 left-1/2 size-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/20" />
          <span className="absolute top-4 right-5 size-1 rounded-full bg-accent" />
          <span className="absolute bottom-6 left-5 size-1 rounded-full bg-fg/40" />
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl tracking-[-0.03em] text-fg">Soundscape</h2>
            <p className="mt-1 text-sm text-muted">Blend what feels good tonight</p>
          </div>
          {status ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-elevated px-3 py-1.5 text-xs font-medium text-fg">
              <span
                className={
                  mixer.isPlaying
                    ? "size-1.5 rounded-full bg-accent"
                    : "size-1.5 rounded-full bg-muted"
                }
              />
              {status}
            </span>
          ) : null}
        </div>

        <p className="mb-2 text-[10px] font-semibold tracking-[0.16em] text-muted">
          FREE SOUNDS
        </p>
        <div className="grid grid-cols-2 gap-2">
          {FREE_SOUNDS.map((sound) => (
            <SoundCard
              key={sound.id}
              sound={sound}
              active={mixer.layers.some((layer) => layer.id === sound.id)}
              locked={false}
              onPress={() => {
                void mixer.toggleSound(sound.id);
              }}
            />
          ))}
        </div>

        <div className="mt-6 mb-2 flex items-center justify-between">
          <p className="text-[10px] font-semibold tracking-[0.16em] text-muted">
            NIGHT PASS
          </p>
          {!isPremium ? (
            <button
              type="button"
              className="text-xs font-medium text-accent"
              onClick={() => setShowPaywall(true)}
            >
              Unlock all
            </button>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {PREMIUM_SOUNDS.map((sound) => (
            <SoundCard
              key={sound.id}
              sound={sound}
              active={mixer.layers.some((layer) => layer.id === sound.id)}
              locked={!isPremium}
              onPress={() => {
                void mixer.toggleSound(sound.id).then((result) => {
                  if (result === "locked") setShowPaywall(true);
                });
              }}
            />
          ))}
        </div>
      </section>

      <Mixer
        layers={mixer.activeDefinitions}
        onVolume={mixer.setVolume}
        onSave={openSave}
      />

      <div className="mt-6 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setShowTimer(true)}
          className="flex min-h-[76px] items-center gap-3 rounded-[22px] bg-surface px-3 text-left shadow-[var(--shadow-border)]"
        >
          <span className="flex size-10 items-center justify-center rounded-[14px] bg-elevated text-accent">
            <Clock className="size-4" />
          </span>
          <span>
            <span className="block text-[10px] font-semibold tracking-[0.14em] text-muted">
              SLEEP TIMER
            </span>
            <span className="mt-1 block text-sm font-medium text-fg">
              {timer.remaining === null ? "Off" : timer.fading ? "Fading" : "On"}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => setShowSaved(true)}
          className="flex min-h-[76px] items-center gap-3 rounded-[22px] bg-surface px-3 text-left shadow-[var(--shadow-border)]"
        >
          <span className="flex size-10 items-center justify-center rounded-[14px] bg-elevated text-accent">
            <Bookmark className="size-4" />
          </span>
          <span>
            <span className="block text-[10px] font-semibold tracking-[0.14em] text-muted">
              SAVED MIXES
            </span>
            <span className="mt-1 block text-sm font-medium text-fg">
              {mixes.length === 0 ? "None yet" : mixes.length}
            </span>
          </span>
        </button>
      </div>

      {mixer.audioError ? (
        <button
          type="button"
          onClick={() => mixer.setAudioError(null)}
          className="mt-4 flex w-full items-center gap-2 rounded-[16px] bg-elevated px-3 py-3 text-left text-sm text-fg"
        >
          <span className="flex-1">{mixer.audioError}</span>
          <X className="size-4 text-muted" />
        </button>
      ) : null}

      <Transport
        layerCount={mixer.layers.length}
        isPlaying={mixer.isPlaying}
        remaining={timer.remaining}
        fading={timer.fading}
        onPlayPause={() => {
          if (mixer.isPlaying) mixer.pause();
          else void mixer.play();
        }}
        onStop={handleStop}
        onTimer={() => setShowTimer(true)}
      />

      <TimerSheet
        open={showTimer}
        onClose={() => setShowTimer(false)}
        remaining={timer.remaining}
        fading={timer.fading}
        onStart={(value) => {
          mixer.cancelFade();
          timer.start(value);
        }}
        onClear={() => {
          timer.clear();
          mixer.cancelFade();
          setShowTimer(false);
        }}
      />
      <SaveMixSheet
        open={showSave}
        onClose={() => setShowSave(false)}
        name={mixName}
        onName={setMixName}
        onSave={commitSave}
      />
      <SavedMixesSheet
        open={showSaved}
        onClose={() => setShowSaved(false)}
        mixes={mixes}
        onRestore={(mix) => {
          void restore(mix);
        }}
        onDelete={(id) => persistMixes(mixes.filter((mix) => mix.id !== id))}
      />
      <Paywall
        open={showPaywall}
        onClose={() => {
          setShowPaywall(false);
          mixer.clearBlocked();
        }}
        blocked={mixer.blockedPremium}
        billing={billing}
      />
    </main>
  );
}
