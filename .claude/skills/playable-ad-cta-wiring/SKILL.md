---
name: playable-ad-cta-wiring
description: Wire win/lose CTA (click-to-store) handlers in a Cocos Creator 3.8.7 playable ad with ad-network-aware redirects — MRAID, Mintegral, IronSource, Vungle, AppLovin, Unity Ads, Google (DoubleClick), with a fallback to window.open. Provides a drop-in TypeScript module and integration steps. Use whenever the user mentions CTAs, end cards, "tap to install", store redirects, win screens, lose screens, or asks how to make a playable's button send users to the store — and especially when they mention specific networks ("does this work on Mintegral?", "AppLovin doesn't open the store"). Trigger even if they just describe the problem ("the install button does nothing in the previewer").
---

# Playable Ad CTA Wiring

You are helping the user connect the win/lose buttons in their playable to the right "go to store" mechanism for whichever ad network is hosting them. The same playable HTML runs on ~7 different networks and each one wants a different API call to register a click and open the store. Get this wrong and the campaign measures clicks-to-installs as zero.

## Why this exists

A playable doesn't know in advance which network it'll be loaded into — the network injects its own SDK shim onto `window` before the playable runs. The job is to detect what's been injected and call the right thing. Hand-rolling this per playable is error-prone (people forget Vungle, or get the AppLovin postMessage shape wrong). This skill bundles a tested redirect module and tells you exactly where to wire it into a Cocos scene.

## Networks covered

| Network | Detection | Action |
| --- | --- | --- |
| MRAID (Facebook, AdColony, generic) | `window.mraid` | `mraid.open(url)` |
| Mintegral | `window.gameEnd` + `window.install` | `install()` then `gameEnd()` |
| IronSource | `window.dapi` | `dapi.openStoreUrl()` |
| Vungle | `window.vungle` (or in parent frame) | `requestCustomEvent('click')` + postMessage `download` |
| AppLovin | `window.al_onPoke` / `al_onPlayableEvent` | `al_onPoke()` + postMessage + `window.open` |
| Unity Ads | `window.UnityAdsLoadCompleted` | `UnityAdsExit()` + `window.open` |
| Google (DoubleClick) | `window.ExitApi` | `ExitApi.exit()` |
| Fallback | none of the above | `window.open(url, '_blank')` |

If the playable will ship to a network not on this list, ask the user for the network's docs URL and extend the module rather than guessing.

## Steps

### 1. Copy the redirect module into the project

The reference implementation is at [assets/store-redirect.ts](assets/store-redirect.ts) inside this skill's folder. Copy it to **`assets/scripts/store-redirect.ts`** in the user's project (create the `scripts/` directory if needed — the meta directory exists but the folder is empty in this repo).

The module pulls `STORE_LINK.ANDROID_LINK` / `STORE_LINK.IOS_LINK` from `assets/configs/constant.ts`. Don't hardcode URLs in the redirect logic — they need to flow through the retargeting surface.

Adjust the import path if you put `constant.ts` somewhere other than `assets/configs/`.

### 2. Wire the win/lose buttons to call it

In whichever component handles win/lose state (likely something under `assets/plugins/playable-foundation/` once the submodule is initialized — check the framework's documented entry points), call:

```ts
import { onWin, onLose } from './store-redirect';

// in your win handler:
onWin();

// in your lose handler:
onLose();
```

If the framework uses a signal bus (the existing repo mentions one in [AGENTS.md](../../../AGENTS.md:4)), the cleaner pattern is: have `store-redirect.ts` subscribe to the win/lose signals once at boot, and remove the direct calls. Ask the user which pattern the framework prefers.

### 3. Verify per network

You can't test all 7 networks locally. The two minimum checks:

1. **Local browser.** Open the built HTML in a browser. Network detection should fall through to `fallback` and `window.open` should pop up the store URL. Confirm both Android and iOS URLs by spoofing the user agent in DevTools.
2. **Network previewer.** Each network has its own preview tool — at least the one targeted by the current campaign:
   - Meta / Facebook: [Facebook Playable Preview](https://developers.facebook.com/tools/playable-preview/)
   - Google: Google Web Designer or the AdWords playable validator
   - Mintegral: PreviewTool app (iOS/Android)
   - AppLovin: SparkLabs preview
   - IronSource: Creative Studio preview
   - Unity Ads: Unity Editor remote preview
   - Vungle: Vungle Creative Index

Capture a short screen recording in at least the primary network's preview tool. Reviewers want to *see* the redirect work, not just trust the code.

### 4. Add new networks (when needed)

If the user ships to a new network:

1. Find the network's playable docs — look for "exit API" or "click handler".
2. Add a `Network` literal to the type union in `store-redirect.ts`.
3. Add a detection rule in `detectNetwork()` — usually a check for a magic function or namespace on `window`. **Put more specific detections before generic ones.** MRAID is a common umbrella; some networks set both `window.mraid` and their own thing, so test the more specific one first.
4. Add a `case` in `openStore()`. Always end with `window.open(url, '_blank')` in the catch path — never leave a user stuck.

## What this skill does NOT do

- Doesn't implement win/lose detection. That's gameplay.
- Doesn't add network SDKs. Networks inject their own — your job is only to call into them.
- Doesn't handle deep links into apps. If the brief calls for a deep link instead of a store redirect, ask the user — that's a separate flow.

## Common pitfalls

- **Calling `window.open` while inside an iframe with MRAID.** MRAID is sandboxed; `window.open` is a no-op there. Must use `mraid.open`.
- **Mintegral wants both calls.** Calling only `gameEnd()` or only `install()` doesn't reliably register both the dismissal and the click.
- **AppLovin uses postMessage to the parent frame.** Their docs change shape periodically — verify against the current SparkLabs docs before shipping.
- **Detecting too generically.** Don't check `typeof navigator.standalone` or other ambient things — they're true in non-ad contexts too. Stick to network-specific function/namespace names.
- **Forgetting iOS vs Android URL.** The reference module picks via user agent. If the network forces a specific platform, the network-specific API call handles it for you — but the fallback path needs the right URL, so keep the check.
