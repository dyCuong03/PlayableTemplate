---
name: playable-ad-size-budget
description: Audit the size of a Cocos Creator 3.8.7 playable ad's exported HTML against ad-network size limits (Meta 5MB, Google 2MB, AppLovin 5MB, Mintegral 2MB, IronSource 5MB, Vungle 5MB, Unity 5MB) and identify the biggest base64-inlined offenders so the team can cut bytes. Use whenever the user asks about playable size, file weight, "too heavy", "won't pass Google's 2MB limit", "shrink the playable", "audit the build", or whenever a fresh build / Super HTML export just finished and the user is about to ship. Trigger even on indirect mentions like "the network rejected this for being too big".
---

# Playable Ad Size Budget

You are helping the user fit their playable inside the size limit of whichever ad network it's being shipped to. The limits are tight (Google: 2 MB; many others: 5 MB) and asset-driven, so a single forgotten 2048×2048 texture can blow the budget. Your job is to measure objectively, point at the biggest offenders, and recommend specific cuts.

## Why this exists

The most expensive thing in a playable is usually a texture someone forgot was even in the bundle. The team's instinct is to start trimming code — but code is rarely the issue; assets are. A measured, offender-ranked report makes the cut decisions obvious and avoids burning a day on micro-optimizations that don't move the needle.

## What you're measuring

Two artifacts matter:

1. **The build folder**: `build/web-mobile/` — produced by `CocosCreator --project . --build "platform=html5;debug=false"`. Multiple files; assets are still separate.
2. **The single-file HTML**: the output of running the Super HTML extension panel on the build above. This is what the ad network actually receives, with all assets base64-inlined and JS minified/obfuscated.

The network's limit applies to **artifact #2**, not artifact #1. Don't report a "pass" based on the build folder size — Super HTML usually makes things bigger, not smaller, because base64 inflates binary by ~33%.

## Network limits

See [references/network-limits.md](references/network-limits.md) for the full table. Quick reference: **Meta/AppLovin/IronSource/Vungle/Unity = 5 MB, Google = 2 MB, Mintegral = 2 MB.** Verify against the network's current docs — these change.

## Steps

### 1. Locate the artifacts

```bash
ls -lh build/web-mobile/index.html 2>/dev/null || echo "no build folder — run a build first"
```

Then find the Super HTML single-file output. Default name depends on the panel config; it's usually a `.html` next to the build folder or inside it. If the user hasn't run the exporter yet, tell them to:

1. Open Cocos Creator
2. Extension → Super HTML → open panel
3. Point it at `build/web-mobile/`, click Export
4. Note the output path and come back

### 2. Measure total size

```bash
ls -lh <path-to-exported.html>
```

Compare against each relevant network's limit. If the user has named a specific network (most common case), focus there; otherwise compare against the strictest plausible target.

### 3. Find the biggest offenders

For the **build folder** (this gives you the per-asset breakdown that the single-file HTML can't, because once they're base64'd the boundaries are gone):

```bash
find build/web-mobile -type f -printf '%s\t%p\n' | sort -rn | head -20
```

(Bash on Windows: the Cocos export already uses POSIX-style paths in the bundled file. Use Git Bash or WSL for the `find` form, or use PowerShell's `Get-ChildItem -Recurse | Sort-Object Length -Descending | Select -First 20` equivalent — the goal is the same ranking.)

Group the results into:

- **Textures** (`.png`, `.jpg`, `.webp`, atlases) — usually #1–#3 offenders.
- **Audio** (`.mp3`, `.ogg`, `.m4a`)
- **3D models** (`.fbx`, `.gltf`, `.bin`)
- **Fonts** (`.ttf`, `.otf`)
- **Code** (`.js`) — usually a near-fixed floor; if it's huge, check that minification is on in the Super HTML panel.

### 4. Estimate post-inline size

Base64 inflation is `4/3` of the binary size. The Super HTML pipeline also runs uglify-js on the code, which roughly halves the JS payload from what's in the build folder.

A rough formula:

```
final_html ≈ (binary_assets * 1.33) + (js_code * 0.5) + (other_text * 1.0)
```

This is enough to tell whether you're close to a limit. Real measurement comes from running the exporter.

### 5. Recommend cuts

Use the offender list to propose specific actions. The cheapest cuts first:

1. If the top offender is a texture with no alpha — re-export as JPG, quality 85.
2. If the top offender is a power-of-two texture larger than 1024 — halve it.
3. If audio is in the top 5 — drop to 64 kbps mono for SFX, 96 kbps stereo for BGM.
4. If there are atlases that aren't referenced by any active prefab — remove them.
5. If the JS code is large — verify minification/obfuscation are on in Super HTML's panel.

For each suggestion, estimate the byte savings. Don't recommend "compress the textures" generically — recommend "convert `textures/atlas_ui.png` (1.2 MB) to JPG → ~300 KB, saving 900 KB".

### 6. Report

Output looks like:

```
## Size audit: <playable-name>

Exported HTML: 4.2 MB (path: build/web-mobile/playable.html)
Build folder:  5.6 MB

### Limits
- Meta:       4.2 / 5.0 MB  ✅ PASS (16% headroom)
- Google:     4.2 / 2.0 MB  ❌ FAIL (over by 2.2 MB)
- Mintegral:  4.2 / 2.0 MB  ❌ FAIL
- IronSource: 4.2 / 5.0 MB  ✅
- AppLovin:   4.2 / 5.0 MB  ✅

### Top 10 offenders (from build/web-mobile/)
1. assets/textures/bg_main.png         1.8 MB  ← JPG → ~450 KB (-1.35 MB)
2. assets/audio/bgm_loop.mp3           620 KB  ← drop to 96 kbps → 310 KB (-310 KB)
3. assets/textures/atlas_chars.png     580 KB  ← halve to 1024² → ~150 KB (-430 KB)
... etc

### Cut plan to hit Google's 2 MB limit
Apply #1, #3, #5, #6: estimated final 1.9 MB.
```

Hand the report to the user. Don't apply cuts without confirmation — texture/audio re-encoding affects visual/audio quality and the user has to decide what's acceptable.

## What this skill does NOT do

- Doesn't actually re-encode assets. That's a creative decision and reversible-on-the-source-files only; the artist should drive it.
- Doesn't run the build or the Super HTML exporter — the user does those in Cocos Creator. (Build is scriptable; Super HTML's UI flow is not, at the time of writing.)
- Doesn't optimize JavaScript beyond verifying that Super HTML's minification is enabled. Tree-shaking gameplay code is a project-level concern.

## Common pitfalls

- **Reporting build-folder size instead of single-file HTML size.** The network sees the latter, which is bigger.
- **Forgetting base64 inflation.** A "fits" build folder can still blow the budget after inline.
- **Assuming all atlases are used.** Cocos packs everything you reference even indirectly — old test prefabs left in `assets/resources/` get included. Check `build/web-mobile/assets/` for orphans.
- **Aggressive JPG quality.** Quality 60 is fine for backgrounds, terrible for UI. Match quality to the asset's role.
- **Audio compression artifacts.** Below 64 kbps SFX get watery. Listen before shipping.
