import { Pause, Play, Square } from "lucide-react";
import { formatClock } from "@/hooks/use-sleep-timer";
import { cn } from "@/lib/utils";

export function Transport({
  layerCount,
  isPlaying,
  remaining,
  fading,
  onPlayPause,
  onStop,
  onTimer,
}: {
  layerCount: number;
  isPlaying: boolean;
  remaining: number | null;
  fading: boolean;
  onPlayPause: () => void;
  onStop: () => void;
  onTimer: () => void;
}) {
  const disabled = layerCount === 0;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto mx-auto flex max-w-lg items-center gap-2 rounded-[28px] bg-surface/95 p-2 shadow-[var(--shadow-border)] backdrop-blur-sm">
        <button
          type="button"
          onClick={onStop}
          disabled={disabled && remaining === null}
          aria-label="Stop all"
          className="flex size-12 items-center justify-center rounded-full text-muted hover:bg-elevated hover:text-fg disabled:opacity-30"
        >
          <Square className="size-4 fill-current" />
        </button>
        <button
          type="button"
          onClick={onPlayPause}
          disabled={disabled}
          aria-label={isPlaying ? "Pause mix" : "Play mix"}
          className={cn(
            "flex size-14 items-center justify-center rounded-full bg-fg text-bg disabled:opacity-30",
            !isPlaying && "pl-0.5",
          )}
        >
          {isPlaying ? (
            <Pause className="size-5 fill-current" />
          ) : (
            <Play className="size-5 fill-current" />
          )}
        </button>
        <button
          type="button"
          onClick={onTimer}
          className="flex h-12 min-w-0 flex-1 items-center justify-center rounded-full bg-elevated px-3 text-sm font-medium text-fg"
        >
          {remaining === null
            ? "Timer"
            : fading
              ? `Fading ${formatClock(remaining)}`
              : formatClock(remaining)}
        </button>
      </div>
    </div>
  );
}
