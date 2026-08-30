# SleepWave

A calming sleep-sounds mixer. Layer rain, ocean, fan, and night textures, save mixes, and fade out with a timer.

Night Pass unlocks the full library and unlimited saved mixes through RevenueCat Web Billing.

## Features

- Mix looping sleep sounds with per-layer volume
- Sleep timer with fade-out
- Saved mixes stored locally
- Night Pass paywall (RevenueCat public Web Billing key)

## Stack

- React 19
- TanStack Start / Router
- Tailwind CSS v4
- RevenueCat Purchases JS

## Run locally

```bash
npm install
npm run dev
```

The app listens on `0.0.0.0:8080`.

Typecheck:

```bash
npm run typecheck
```

Production build:

```bash
npm run build
```

## Night Pass

Connect a RevenueCat **Web Billing public key** (`rcb_…`) in the in-app paywall. Do not use a secret key.

Optional env (browser-exposed):

```
VITE_REVENUECAT_API_KEY=rcb_...
VITE_REVENUECAT_ENTITLEMENT=night_pass
```

## Native snapshot

The original Expo / React Native prototype lives on the `expo-native` branch.
