import {
  ENTITLEMENT_KEY,
  MIXES_KEY,
  RC_API_KEY_STORAGE,
  RC_EMAIL_KEY,
  RC_USER_KEY,
  SESSION_KEY,
} from "./library";
import type { SavedMix, SessionState } from "./types";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function loadMixes(): SavedMix[] {
  const mixes = readJson<SavedMix[]>(MIXES_KEY, []);
  return mixes.filter(
    (mix) =>
      mix &&
      typeof mix.id === "string" &&
      typeof mix.name === "string" &&
      Array.isArray(mix.layers),
  );
}

export function saveMixes(mixes: SavedMix[]) {
  writeJson(MIXES_KEY, mixes);
}

export function loadSession(): SessionState {
  const session = readJson<SessionState | null>(SESSION_KEY, null);
  if (!session || !Array.isArray(session.layers)) {
    return { layers: [], volumes: {} };
  }
  return {
    layers: session.layers.filter(
      (layer) => layer && typeof layer.id === "string",
    ),
    volumes: session.volumes ?? {},
  };
}

export function saveSession(session: SessionState) {
  writeJson(SESSION_KEY, session);
}

export function loadEntitlement(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(ENTITLEMENT_KEY) === "1";
}

export function saveEntitlement(unlocked: boolean) {
  if (typeof window === "undefined") return;
  if (unlocked) window.localStorage.setItem(ENTITLEMENT_KEY, "1");
  else window.localStorage.removeItem(ENTITLEMENT_KEY);
}

export function loadAppUserId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(RC_USER_KEY);
}

export function saveAppUserId(id: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(RC_USER_KEY, id);
}

export function loadPublicApiKey(): string | null {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(RC_API_KEY_STORAGE)?.trim();
  return stored || null;
}

export function savePublicApiKey(key: string | null) {
  if (typeof window === "undefined") return;
  if (key) window.localStorage.setItem(RC_API_KEY_STORAGE, key.trim());
  else window.localStorage.removeItem(RC_API_KEY_STORAGE);
}

export function loadBillingEmail(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(RC_EMAIL_KEY) ?? "";
}

export function saveBillingEmail(email: string) {
  if (typeof window === "undefined") return;
  const trimmed = email.trim();
  if (trimmed) window.localStorage.setItem(RC_EMAIL_KEY, trimmed);
  else window.localStorage.removeItem(RC_EMAIL_KEY);
}

export function newMixId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
