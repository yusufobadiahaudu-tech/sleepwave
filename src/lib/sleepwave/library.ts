import type { SoundDefinition } from "./types";

export const SOUND_LIBRARY: SoundDefinition[] = [
  {
    id: "rain",
    name: "Rain",
    category: "Nature",
    free: true,
    color: "var(--sw-rain)",
    file: "/sounds/rain.wav",
    blurb: "Soft drizzle",
  },
  {
    id: "ocean",
    name: "Ocean Waves",
    category: "Nature",
    free: true,
    color: "var(--sw-ocean)",
    file: "/sounds/ocean.wav",
    blurb: "Shoreline swell",
  },
  {
    id: "white-noise",
    name: "White Noise",
    category: "Focus",
    free: true,
    color: "var(--sw-noise)",
    file: "/sounds/white-noise.wav",
    blurb: "Masking hiss",
  },
  {
    id: "fan",
    name: "Fan",
    category: "Focus",
    free: true,
    color: "var(--sw-fan)",
    file: "/sounds/fan.wav",
    blurb: "Motor hum",
  },
  {
    id: "wind",
    name: "Wind",
    category: "Nature",
    free: true,
    color: "var(--sw-wind)",
    file: "/sounds/wind.wav",
    blurb: "Open-field gusts",
  },
  {
    id: "forest",
    name: "Forest",
    category: "Night",
    free: false,
    color: "var(--sw-forest)",
    file: "/sounds/forest.wav",
    blurb: "Leaves and distant birds",
  },
  {
    id: "fireplace",
    name: "Fireplace",
    category: "Night",
    free: false,
    color: "var(--sw-fire)",
    file: "/sounds/fireplace.wav",
    blurb: "Ember crackle and rumble",
  },
  {
    id: "thunder",
    name: "Thunder",
    category: "Night",
    free: false,
    color: "var(--sw-thunder)",
    file: "/sounds/thunder.wav",
    blurb: "Far storms, long decay",
  },
  {
    id: "crickets",
    name: "Night Crickets",
    category: "Night",
    free: false,
    color: "var(--sw-cricket)",
    file: "/sounds/crickets.wav",
    blurb: "Warm-evening chorus",
  },
  {
    id: "stream",
    name: "Water Stream",
    category: "Nature",
    free: false,
    color: "var(--sw-stream)",
    file: "/sounds/stream.wav",
    blurb: "Close brook, small stones",
  },
  {
    id: "space",
    name: "Deep Space",
    category: "Night",
    free: false,
    color: "var(--sw-space)",
    file: "/sounds/space.wav",
    blurb: "Low drone and sparse pings",
  },
  {
    id: "meditation",
    name: "Meditation Tone",
    category: "Focus",
    free: false,
    color: "var(--sw-tone)",
    file: "/sounds/meditation.wav",
    blurb: "Slow beating drone",
  },
  {
    id: "piano",
    name: "Soft Piano",
    category: "Night",
    free: false,
    color: "var(--sw-piano)",
    file: "/sounds/piano.wav",
    blurb: "Sparse, decaying notes",
  },
];

export const SOUND_BY_ID = Object.fromEntries(
  SOUND_LIBRARY.map((sound) => [sound.id, sound]),
) as Record<string, SoundDefinition>;

export const FREE_SOUNDS = SOUND_LIBRARY.filter((sound) => sound.free);
export const PREMIUM_SOUNDS = SOUND_LIBRARY.filter((sound) => !sound.free);

export const FREE_MIX_LIMIT = 1;
export const ENTITLEMENT_KEY = "sleepwave.night-pass";
export const MIXES_KEY = "sleepwave.mixes.v1";
export const SESSION_KEY = "sleepwave.session.v1";
export const RC_USER_KEY = "sleepwave.rc.app-user-id";
export const RC_API_KEY_STORAGE = "sleepwave.rc.public-key";
export const RC_EMAIL_KEY = "sleepwave.rc.email";
export const NIGHT_PASS_ENTITLEMENT = "night_pass";
export const FADE_SECONDS = 45;

export function defaultMixName(ids: string[]) {
  const names = ids
    .map((id) => SOUND_BY_ID[id]?.name)
    .filter(Boolean);
  if (names.length === 0) return "Untitled mix";
  if (names.length <= 3) return names.join(" + ");
  return `${names.slice(0, 2).join(" + ")} + ${names.length - 2} more`;
}

export function secondsUntilSunrise(now = new Date()) {
  const next = new Date(now);
  next.setHours(6, 30, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  return Math.max(60, Math.round((next.getTime() - now.getTime()) / 1000));
}

export const TIMER_PRESETS = [
  { id: "15m", label: "15 min", seconds: 15 * 60 },
  { id: "30m", label: "30 min", seconds: 30 * 60 },
  { id: "1h", label: "1 hour", seconds: 60 * 60 },
  { id: "2h", label: "2 hours", seconds: 2 * 60 * 60 },
  { id: "sunrise", label: "Sunrise", seconds: null as number | null },
] as const;
