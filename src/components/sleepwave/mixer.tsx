import { Bookmark } from "lucide-react";
import { SOUND_ICONS } from "@/components/sleepwave/icons";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import type { SoundDefinitionWithVolume } from "@/hooks/use-audio-mixer";

export function Mixer({
  layers,
  onVolume,
  onSave,
}: {
  layers: SoundDefinitionWithVolume[];
  onVolume: (id: string, volume: number) => void;
  onSave: () => void;
}) {
  if (layers.length === 0) return null;
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl tracking-[-0.03em] text-fg">
            Your mix
          </h2>
          <p className="mt-1 text-sm text-muted">Balance each layer</p>
        </div>
        <Button variant="muted" size="icon" onClick={onSave} aria-label="Save mix">
          <Bookmark className="size-4" />
        </Button>
      </div>
      <div className="rounded-[24px] bg-surface px-3 py-1 shadow-[var(--shadow-border)]">
        {layers.map((sound, index) => {
          const Icon = SOUND_ICONS[sound.id];
          return (
            <div
              key={sound.id}
              className={
                index < layers.length - 1
                  ? "border-b border-border py-1"
                  : "py-1"
              }
            >
              <div className="flex items-center gap-3">
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-[12px]"
                  style={{
                    background: `color-mix(in oklab, ${sound.color} 22%, transparent)`,
                    color: sound.color,
                  }}
                >
                  {Icon ? <Icon className="size-3.5" /> : null}
                </span>
                <span className="w-24 shrink-0 truncate text-xs font-medium text-fg">
                  {sound.name}
                </span>
                <Slider
                  min={0}
                  max={1}
                  step={0.01}
                  value={[sound.volume]}
                  onValueChange={([value]) => onVolume(sound.id, value ?? 0)}
                  aria-label={`Volume for ${sound.name}`}
                  rangeClassName="bg-fg/80"
                />
                <span className="w-9 shrink-0 text-right text-xs tabular-nums text-muted">
                  {Math.round(sound.volume * 100)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
