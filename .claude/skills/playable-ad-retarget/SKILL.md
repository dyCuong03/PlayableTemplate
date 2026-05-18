---
name: playable-ad-retarget
description: Reskin or revariant an existing Cocos Creator 3.8.7 playable in this PlayableTemplate repo by swapping the per-playable knobs — PLAYABLE_ID, PACKAGE_NAME, store links, tracking URL, and prefab art — without touching gameplay code. Use whenever the user wants to ship a new variant of an existing playable (different brand, different store, A/B test), localize, or update tracking IDs across the project. Triggers on phrases like "reskin", "retarget", "new variant", "swap branding", "change package", "update store links", or "duplicate this playable for X" even when the user doesn't say "retarget".
---

# Playable Ad Retarget

You are helping the user produce a new variant of an existing playable by changing only the configuration and art — never the gameplay. The retargeting surface is intentionally small: get it right and you can ship a new variant in minutes.

## Why this exists

Ad networks expect each playable variant to have its own ID, store links, and analytics attribution. The interesting parts of the game don't change between variants, so the team's leverage comes from being able to flip the knobs fast and with zero gameplay regressions. The risk is silent mis-attribution: a wrong `PACKAGE_NAME` ships happily and the team only finds out when the campaign's numbers look wrong a week later. This skill makes the changes deliberate and surfaces the easy-to-miss ones.

## The retargeting surface

Three places carry per-variant state. Everything else should be the same as the parent playable.

1. **[assets/configs/constant.ts](../../../../assets/configs/constant.ts)** — the source of truth for IDs, store links, tracking host, package name, env. Most retargets are 90% this file.
2. **`assets/resources/`** and **`assets/prefabs/`** — art assets (textures, sprites, prefab references). Only swap what visibly changes; structural prefabs stay.
3. **Audio / effect assets** — referenced by string key from `constant.AUDIO_NAME` / `constant.EFFECT_NAME`. If the variant adds new sounds, add the keys here; if it just replaces files at the same key, no code change.

Anything outside these three places is gameplay and shouldn't change during a retarget. If the user asks to change gameplay, treat that as a separate conversation.

## Steps

### 1. Capture the variant brief from the user

Ask for, and record:

- Variant name / nickname (for filenames and PR title)
- New `PLAYABLE_ID` (network-assigned, format `PA####` in this repo's convention)
- New `PACKAGE_NAME` (e.g., `com.publisher.gamename` — verify case)
- New `STORE_LINK.ANDROID_LINK` and `STORE_LINK.IOS_LINK` (full URLs, not just store IDs)
- Tracking `BASE_URL` (test vs prod — confirm `ENV` matches)
- Art swap list: which sprites/prefabs change (or "same art" if it's a non-art variant like a localization)

If the user only gives part of these, ask for the rest before touching files.

### 2. Diff-show the constants change before writing

Edit [assets/configs/constant.ts](../../../../assets/configs/constant.ts) but **show the diff to the user before saving**. Spell out:

- old vs new `PLAYABLE_ID`
- old vs new `PACKAGE_NAME`
- old vs new store URLs
- whether `BASE_URL` and `ENV` are consistent (test host with prod env, or vice versa, is the #1 footgun — call it out loudly)

Have the user confirm. Then save.

### 3. Swap art

For each item on the art-swap list:

- If the new asset is a drop-in replacement at the same path, just overwrite the file (Cocos will reimport).
- If the new asset has a different name, update the prefab/scene reference — easier to do via the editor or `cocos-mcp-server` than by hand-editing `.meta` files.
- For 3D models, watch for material reference breakage — materials are referenced by UUID in `.meta`, swapping a model file usually preserves them, but swapping a material does not.

Don't rename assets unless you have to — UUIDs in prefabs reference the file path.

### 4. Build and verify

```bash
CocosCreator --project . --build "platform=html5;debug=false"
```

Then open `build/web-mobile/index.html` and verify, in this order:

1. **CTA behavior.** Tap win and tap lose flows both open the new store URLs (check console for the actual URL fired; on desktop it'll open in a new tab).
2. **Tracking pixel.** Open DevTools Network tab, filter for `p.gif`. Confirm requests go to the new `BASE_URL` with the new `PLAYABLE_ID`. If `ENV` is `production` but the host says `test.*`, the request will succeed but go to the wrong bucket — verify.
3. **Art.** Eyeball the obvious swaps. Look for missing textures (default magenta/checkerboard).

### 5. Run the size budget check (optional but recommended)

Art swaps frequently bloat the bundle. After verifying, offer to run the `playable-ad-size-budget` skill — particularly if the new art includes high-res textures.

### 6. Hand off

Summarize the change for the PR description: variant name, before/after values for `PLAYABLE_ID` / `PACKAGE_NAME` / store URLs, list of swapped assets, size delta if measured.

## What this skill does NOT do

- Doesn't change gameplay. If the user asks for gameplay changes during a retarget, treat that as scope creep and confirm before doing it.
- Doesn't add new ad-network SDKs. If a variant targets a network the parent didn't, use `playable-ad-cta-wiring`.
- Doesn't run automated visual regression — the user has to eyeball the build.

## Common pitfalls

- **Test tracking host left in a prod variant.** Confirm `BASE_URL` host matches `ENV` semantics. The constants file lets these drift independently and nothing yells about it.
- **`PACKAGE_NAME` left as the parent variant's.** Numbers attribute to the wrong title.
- **Renaming assets instead of overwriting.** Breaks prefab references silently — sprite slots show as empty in the editor.
- **iOS / Android URL swapped.** Easy when copy-pasting from a brief; check both URLs route to the right store.
- **`MAX_TRACKING_DURATION_SEC` left at 60 for a longer-session variant.** The pixel goes silent past this cap; not catastrophic but worth knowing.
