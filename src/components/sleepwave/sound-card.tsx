import { Lock } from "lucide-react";
import { SOUND_ICONS } from "@/components/sleepwave/icons";
import { cn } from "@/lib/utils";
import type { SoundDefinition } from "@/lib/sleepwave/types";

export function SoundCard({
  sound,
  active,
  locked,
  onPress,
}: {
  sound: SoundDefinition;
  active: boolean;
  locked: boolean;
  onPress: () => void;
}) {
  const Icon = SOUND_ICONS[sound.id];
  return (
    <button
      type="button"
      onClick={onPress}
      aria-pressed={active && !locked}
      aria-label={
        locked
          ? `${sound.name}, Night Pass`
          : `${active ? "Remove" : "Add"} ${sound.name}`
      }
      className={cn(
        "group relative flex min-h-[88px] items-center gap-3 rounded-[22px] p-3 text-left shadow-[var(--shadow-border)] transition-[box-shadow,opacity,transform] duration-[var(--motion-quick)] ease-[var(--ease-out)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        locked
          ? "bg-surface/70 opacity-70"
          : active
            ? "bg-elevated shadow-[var(--shadow-border-hover)]"
            : "bg-surface hover:shadow-[var(--shadow-border-hover)]",
      )}
    >
      <span
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-[14px]",
          locked ? "bg-elevated text-muted" : "text-fg",
        )}
        style={locked ? undefined : { background: `color-mix(in oklab, ${sound.color} 22%, transparent)` }}
      >
        {locked ? (
          <Lock className="size-4" />
        ) : Icon ? (
          <Icon className="size-4" style={{ color: sound.color }} />
        ) : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-fg">
          {sound.name}
        </span>
        <span className="mt-0.5 block text-xs text-muted">
          {locked ? "Night Pass" : sound.blurb}
        </span>
      </span>
      {active && !locked ? (
        <span className="absolute top-3 right-3 size-1.5 rounded-full bg-accent" />
      ) : null}
    </button>
  );
}
