import { Clock } from "lucide-react";
import { Sheet } from "@/components/sleepwave/sheet";
import { Button } from "@/components/ui/button";
import { TIMER_PRESETS, secondsUntilSunrise } from "@/lib/sleepwave/library";
import { cn } from "@/lib/utils";
import { formatClock } from "@/hooks/use-sleep-timer";

export function TimerSheet({
  open,
  onClose,
  remaining,
  fading,
  onStart,
  onClear,
}: {
  open: boolean;
  onClose: () => void;
  remaining: number | null;
  fading: boolean;
  onStart: (seconds: number | "sunrise") => void;
  onClear: () => void;
}) {
  const sunriseSeconds = secondsUntilSunrise();
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Sleep timer"
      subtitle="The mix fades over the last 45 seconds, then stops."
      labelledBy="timer-title"
    >
      {remaining !== null ? (
        <p className="mb-4 text-sm text-muted">
          {fading ? "Fading out" : "Remaining"}{" "}
          <span className="tabular-nums text-fg">{formatClock(remaining)}</span>
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        {TIMER_PRESETS.map((preset) => {
          const seconds =
            preset.id === "sunrise" ? sunriseSeconds : (preset.seconds ?? 0);
          const selected =
            remaining !== null &&
            preset.id === "sunrise"
              ? remaining > 2 * 60 * 60
              : remaining === preset.seconds;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => {
                onStart(preset.id === "sunrise" ? "sunrise" : seconds);
                onClose();
              }}
              className={cn(
                "flex min-h-[76px] flex-col items-center justify-center gap-2 rounded-[18px] bg-elevated px-3 text-sm font-medium text-fg shadow-[var(--shadow-border)]",
                selected && "bg-accent text-accent-foreground",
              )}
            >
              <Clock className="size-4" />
              {preset.label}
              {preset.id === "sunrise" ? (
                <span
                  className={cn(
                    "text-[10px] font-normal tabular-nums",
                    selected ? "text-accent-foreground/80" : "text-muted",
                  )}
                >
                  {formatClock(sunriseSeconds)}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      {remaining !== null ? (
        <Button variant="outline" className="mt-4 w-full" onClick={onClear}>
          Turn timer off
        </Button>
      ) : null}
    </Sheet>
  );
}
