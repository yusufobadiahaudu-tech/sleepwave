import {
  AudioLines,
  Bug,
  CloudLightning,
  CloudRain,
  CircleDot,
  Droplets,
  Fan,
  Flame,
  Music2,
  Orbit,
  Trees,
  Waves,
  Wind,
  type LucideIcon,
} from "lucide-react";

export const SOUND_ICONS: Record<string, LucideIcon> = {
  rain: CloudRain,
  ocean: Waves,
  "white-noise": AudioLines,
  fan: Fan,
  wind: Wind,
  forest: Trees,
  fireplace: Flame,
  thunder: CloudLightning,
  crickets: Bug,
  stream: Droplets,
  space: Orbit,
  meditation: CircleDot,
  piano: Music2,
};

export function WaveMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
      fill="none"
    >
      <circle cx="16" cy="16" r="15" className="stroke-border" strokeWidth="1" />
      <circle cx="16" cy="16" r="9.5" className="fill-accent/15 stroke-accent/50" strokeWidth="1" />
      <circle cx="13.4" cy="14.2" r="6.2" className="fill-bg" />
    </svg>
  );
}
