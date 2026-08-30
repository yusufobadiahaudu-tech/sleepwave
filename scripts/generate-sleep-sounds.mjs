#!/usr/bin/env node
/**
 * Unique looping WAVs for SleepWave. Each named sound is its own file
 * with a distinct timbre — fireplace is not ocean, forest is not rain.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "public", "sounds");
const SAMPLE_RATE = 22050;
const DURATION = 8;
const N = SAMPLE_RATE * DURATION;
const LOOP_FADE = Math.floor(SAMPLE_RATE * 0.06);

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function white(rand) {
  return rand() * 2 - 1;
}

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function encodeWav(samples) {
  const n = samples.length;
  const buffer = Buffer.alloc(44 + n * 2);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + n * 2, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const s = clamp(samples[i], -1, 1);
    buffer.writeInt16LE(s < 0 ? Math.round(s * 0x8000) : Math.round(s * 0x7fff), 44 + i * 2);
  }
  return buffer;
}

function normalize(samples, peak = 0.72) {
  let max = 0;
  for (let i = 0; i < samples.length; i++) {
    const a = Math.abs(samples[i]);
    if (a > max) max = a;
  }
  if (max < 1e-8) return samples;
  const g = peak / max;
  for (let i = 0; i < samples.length; i++) samples[i] *= g;
  return samples;
}

function seam(samples) {
  const fade = LOOP_FADE;
  const out = new Float64Array(samples.length - fade);
  for (let i = 0; i < out.length; i++) {
    if (i < fade) {
      const t = i / fade;
      out[i] = samples[i] * t + samples[samples.length - fade + i] * (1 - t);
    } else {
      out[i] = samples[i];
    }
  }
  return out;
}

function finish(samples) {
  return encodeWav(normalize(seam(samples)));
}

function onePole(alpha) {
  let y = 0;
  return (x) => {
    y += alpha * (x - y);
    return y;
  };
}

function highpass(alpha) {
  let prevX = 0;
  let prevY = 0;
  return (x) => {
    const y = alpha * (prevY + x - prevX);
    prevX = x;
    prevY = y;
    return y;
  };
}

function makeRain(rand) {
  const samples = new Float64Array(N);
  const hp = highpass(0.92);
  const lp = onePole(0.18);
  let dropPhase = 0;
  let nextDrop = 0;
  for (let i = 0; i < N; i++) {
    const hiss = hp(white(rand)) * 0.35;
    const bed = lp(white(rand)) * 0.08;
    let drop = 0;
    if (i >= nextDrop) {
      dropPhase = 1;
      nextDrop = i + 200 + Math.floor(rand() * 900);
    }
    if (dropPhase > 0.002) {
      drop = dropPhase * dropPhase * white(rand) * 0.9;
      dropPhase *= 0.82;
    }
    samples[i] = hiss + bed + drop;
  }
  return samples;
}

function makeOcean(rand) {
  const samples = new Float64Array(N);
  const lp = onePole(0.04);
  const lp2 = onePole(0.02);
  for (let i = 0; i < N; i++) {
    const t = i / SAMPLE_RATE;
    const swell = Math.pow(0.5 + 0.5 * Math.sin(2 * Math.PI * 0.11 * t + 0.4), 2.1);
    const swell2 = 0.5 + 0.5 * Math.sin(2 * Math.PI * 0.07 * t);
    const foam = lp(white(rand));
    const deep = lp2(white(rand));
    samples[i] = foam * 0.7 * swell + deep * 0.55 * swell2;
  }
  return samples;
}

function makeWhite(rand) {
  const samples = new Float64Array(N);
  const lp = onePole(0.55);
  for (let i = 0; i < N; i++) samples[i] = lp(white(rand));
  return samples;
}

function makeFan(rand) {
  const samples = new Float64Array(N);
  const air = onePole(0.12);
  const airHp = highpass(0.6);
  for (let i = 0; i < N; i++) {
    const t = i / SAMPLE_RATE;
    const motor =
      0.22 * Math.sin(2 * Math.PI * 58 * t) +
      0.11 * Math.sin(2 * Math.PI * 116 * t) +
      0.05 * Math.sin(2 * Math.PI * 174 * t);
    const wobble = 1 + 0.04 * Math.sin(2 * Math.PI * 0.35 * t);
    const airflow = airHp(air(white(rand))) * 0.28;
    samples[i] = motor * wobble + airflow;
  }
  return samples;
}

function makeWind(rand) {
  const samples = new Float64Array(N);
  let y = 0;
  for (let i = 0; i < N; i++) {
    const t = i / SAMPLE_RATE;
    const gust = 0.45 + 0.55 * Math.pow(0.5 + 0.5 * Math.sin(2 * Math.PI * 0.09 * t), 1.6);
    const cutoff = 0.04 + 0.12 * (0.5 + 0.5 * Math.sin(2 * Math.PI * 0.13 * t + 1.2));
    y += cutoff * (white(rand) - y);
    samples[i] = y * gust;
  }
  return samples;
}

function makeForest(rand) {
  const samples = new Float64Array(N);
  const rustle = onePole(0.2);
  const rustleHp = highpass(0.7);
  const chirps = [];
  let t = 0.4;
  while (t < DURATION - 0.4) {
    chirps.push({
      start: t,
      f0: 1800 + rand() * 1600,
      f1: 2400 + rand() * 1800,
      dur: 0.07 + rand() * 0.09,
    });
    t += 0.55 + rand() * 1.4;
  }
  for (let i = 0; i < N; i++) {
    const time = i / SAMPLE_RATE;
    let s = rustleHp(rustle(white(rand))) * 0.16;
    for (const c of chirps) {
      const u = time - c.start;
      if (u >= 0 && u < c.dur) {
        const env = Math.sin((Math.PI * u) / c.dur);
        const f = c.f0 + (c.f1 - c.f0) * (u / c.dur);
        s += env * 0.22 * Math.sin(2 * Math.PI * f * u);
      }
    }
    samples[i] = s;
  }
  return samples;
}

function makeFireplace(rand) {
  const samples = new Float64Array(N);
  const rumble = onePole(0.03);
  let crackle = 0;
  let next = 0;
  for (let i = 0; i < N; i++) {
    const bed = rumble(white(rand)) * 0.7 + 0.08 * Math.sin((2 * Math.PI * 42 * i) / SAMPLE_RATE);
    if (i >= next) {
      crackle = 0.7 + rand() * 0.9;
      next = i + 80 + Math.floor(rand() * 1400);
    }
    const pop = crackle > 0.01 ? crackle * white(rand) : 0;
    crackle *= 0.72;
    samples[i] = bed * 0.55 + pop * 0.85;
  }
  return samples;
}

function makeThunder(rand) {
  const samples = new Float64Array(N);
  const rumble = onePole(0.015);
  const events = [1.1, 5.4];
  for (let i = 0; i < N; i++) {
    const time = i / SAMPLE_RATE;
    let s = rumble(white(rand)) * 0.12;
    for (const at of events) {
      const u = time - at;
      if (u >= 0 && u < 2.8) {
        const env = Math.exp(-u * 1.6) * (u < 0.04 ? u / 0.04 : 1);
        const crack = u < 0.09 ? white(rand) * Math.exp(-u * 40) : 0;
        const body = rumble(white(rand));
        s += env * (body * 1.4 + crack * 0.6);
      }
    }
    samples[i] = s;
  }
  return samples;
}

function makeCrickets(rand) {
  const samples = new Float64Array(N);
  const fA = 4200;
  const fB = 4680;
  for (let i = 0; i < N; i++) {
    const t = i / SAMPLE_RATE;
    const groupA = t % 0.92;
    const groupB = (t + 0.37) % 1.14;
    const chirp = (group, f, offset) => {
      if (group > 0.22) return 0;
      const pulse = group % 0.055;
      if (pulse > 0.018) return 0;
      const env = Math.sin((Math.PI * pulse) / 0.018);
      return env * 0.22 * Math.sin(2 * Math.PI * f * t + offset);
    };
    const bed = (rand() - 0.5) * 0.02;
    samples[i] = chirp(groupA, fA, 0.2) + chirp(groupB, fB, 1.1) + bed;
  }
  return samples;
}

function makeStream(rand) {
  const samples = new Float64Array(N);
  const bp = onePole(0.22);
  const hp = highpass(0.55);
  for (let i = 0; i < N; i++) {
    const t = i / SAMPLE_RATE;
    const gurgle = 0.65 + 0.35 * Math.sin(2 * Math.PI * 4.7 * t + Math.sin(2 * Math.PI * 1.3 * t));
    const bubble = Math.pow(rand(), 8) * (rand() < 0.08 ? 1 : 0);
    samples[i] = hp(bp(white(rand))) * 0.7 * gurgle + bubble * white(rand) * 0.4;
  }
  return samples;
}

function makeSpace(rand) {
  const samples = new Float64Array(N);
  const pings = [0.8, 3.2, 6.1];
  for (let i = 0; i < N; i++) {
    const t = i / SAMPLE_RATE;
    const drone =
      0.28 * Math.sin(2 * Math.PI * 48 * t) +
      0.16 * Math.sin(2 * Math.PI * 72 * t) +
      0.08 * Math.sin(2 * Math.PI * 96.1 * t);
    const slow = 0.75 + 0.25 * Math.sin(2 * Math.PI * 0.08 * t);
    let ping = 0;
    for (const at of pings) {
      const u = t - at;
      if (u >= 0 && u < 1.8) {
        ping += Math.exp(-u * 2.2) * 0.12 * Math.sin(2 * Math.PI * 1180 * u);
      }
    }
    samples[i] = drone * slow + ping + white(rand) * 0.015;
  }
  return samples;
}

function makeMeditation() {
  const samples = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const t = i / SAMPLE_RATE;
    const a = Math.sin(2 * Math.PI * 136.1 * t);
    const b = Math.sin(2 * Math.PI * 144.1 * t);
    const fifth = 0.22 * Math.sin(2 * Math.PI * 204.15 * t);
    const breath = 0.7 + 0.3 * Math.sin(2 * Math.PI * 0.08 * t);
    samples[i] = (0.42 * a + 0.42 * b + fifth) * breath;
  }
  return samples;
}

function makePiano(rand) {
  const samples = new Float64Array(N);
  const freqs = [130.81, 164.81, 196.0, 220.0, 261.63, 293.66, 329.63];
  const notes = [];
  let t = 0.35;
  while (t < DURATION - 1.2) {
    notes.push({
      start: t,
      freq: freqs[Math.floor(rand() * freqs.length)],
    });
    t += 0.9 + rand() * 1.1;
  }
  for (let i = 0; i < N; i++) {
    const time = i / SAMPLE_RATE;
    let s = 0;
    for (const n of notes) {
      const u = time - n.start;
      if (u >= 0 && u < 2.6) {
        const env = Math.exp(-u * 2.4) * (u < 0.01 ? u / 0.01 : 1);
        const f = n.freq;
        s +=
          env *
          (0.55 * Math.sin(2 * Math.PI * f * u) +
            0.28 * Math.sin(2 * Math.PI * 2 * f * u) +
            0.12 * Math.sin(2 * Math.PI * 3 * f * u) +
            0.06 * Math.sin(2 * Math.PI * 4.02 * f * u));
      }
    }
    samples[i] = s;
  }
  return samples;
}

const SOUNDS = [
  ["rain", () => makeRain(mulberry32(0xa11))],
  ["ocean", () => makeOcean(mulberry32(0xb22))],
  ["white-noise", () => makeWhite(mulberry32(0xc33))],
  ["fan", () => makeFan(mulberry32(0xd44))],
  ["wind", () => makeWind(mulberry32(0xe55))],
  ["forest", () => makeForest(mulberry32(0xf66))],
  ["fireplace", () => makeFireplace(mulberry32(0x177))],
  ["thunder", () => makeThunder(mulberry32(0x288))],
  ["crickets", () => makeCrickets(mulberry32(0x399))],
  ["stream", () => makeStream(mulberry32(0x4aa))],
  ["space", () => makeSpace(mulberry32(0x5bb))],
  ["meditation", () => makeMeditation()],
  ["piano", () => makePiano(mulberry32(0x6cc))],
];

mkdirSync(OUT, { recursive: true });
for (const [id, fn] of SOUNDS) {
  const wav = finish(fn());
  const path = join(OUT, `${id}.wav`);
  writeFileSync(path, wav);
  console.log(`wrote ${id}.wav (${wav.length} bytes)`);
}
