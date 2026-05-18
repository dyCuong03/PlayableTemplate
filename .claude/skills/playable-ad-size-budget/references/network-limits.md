# Ad-network playable size limits

Sizes are the limit for the **single-file exported HTML** (the output of running Super HTML on `build/web-mobile/`), not the unzipped build folder. Verify against the network's current docs before shipping — these change.

| Network | Hard limit | Soft / recommended | Notes |
| --- | --- | --- | --- |
| Meta (Facebook / Instagram / Audience Network) | **5 MB** | 4 MB | Single HTML, no external requests. Tested via Playable Preview. |
| Google Ads (DV360 / AdWords) | **2 MB** ZIP | 1 MB HTML | Strictest mainstream limit. Often need aggressive texture compression. |
| AppLovin | **5 MB** | 4 MB | SparkLabs validates. |
| IronSource | **5 MB** | — | Single HTML; some products allow ZIP. |
| Mintegral | **2 MB** | 1.5 MB | Strict; aligned with Chinese mobile networks. |
| Unity Ads | **5 MB** | 4 MB | |
| Vungle | **5 MB** | 4 MB | |
| TikTok / Pangle | **5 MB** | 4 MB | |
| AdColony | **5 MB** | — | Now part of DigitalTurbine. |

## Where the bytes usually go

In order of frequency-of-being-the-culprit:

1. **Texture atlases** — PNG sprites baked into the HTML as base64. A single 2048×2048 RGBA8 atlas is ~2 MB before compression. Convert to JPG where alpha isn't needed; use ASTC/ETC2 if the engine pipeline supports it for web (Cocos 3.8 has limited web texture-compression support — verify per build).
2. **Audio** — MP3/OGG/M4A at 128 kbps + 30 s of music = ~480 KB each. Drop to 64 kbps mono for SFX; trim BGM aggressively.
3. **3D models and animations** — `.fbx`/`.gltf` with high vertex counts. Decimate or rebake.
4. **Engine runtime** — Cocos 3.8 engine bundle is ~700–900 KB after Super HTML's UglifyJS pass. There's a floor here you can't go below without dropping engine features in the build settings (disable physics, particles, etc. you don't use).
5. **Fonts** — TTFs added by hand. A latin-only subset is usually under 50 KB; a full TTF can be 1 MB+.

## Compression tactics (cheapest to most invasive)

1. **Enable obfuscation + minification** in the Super HTML panel — usually default, but verify.
2. **Re-export textures as JPG** where alpha isn't needed. Per atlas, often 60–80% smaller.
3. **Drop unused atlases.** Check `build/web-mobile/assets/` for textures that aren't referenced by any active prefab.
4. **Drop audio variants.** Many games ship 3 SFX variants of the same hit — pick one.
5. **Trim engine modules.** In Cocos Creator: Project Settings → Modules → uncheck Physics 3D, 2D Physics, WebView, VideoPlayer, etc., as appropriate.
6. **Reduce texture resolution.** Power-of-two halving (2048→1024→512) gives 4× savings each step. Eyeball quality on the target device — most playables don't need >1024 atlases.
7. **Replace 3D models with sprites.** Last resort, but a 2D-rendered version of the same gameplay can be 10× smaller.

## What a "compressed playable size" report should show

For each playable build, output:

- **Total HTML size** (the post-Super-HTML single file) vs the target network's limit.
- **Pass/fail** for each network's limit.
- **Top 10 inlined assets** by byte size, with their original path under `assets/` so the user knows what to compress.
- **Engine vs assets breakdown** (rough; engine is the JS code, assets are the base64 blobs).
- **Suggested cut list** — for the top 3 offenders, propose a specific action (re-encode, lower resolution, remove).
