---
name: playable-ad-bootstrap
description: Scaffold a new Cocos Creator 3.8.7 playable ad in this PlayableTemplate repo. Sets up the main scene structure (Main Camera, Main Light, LifecycleManager, Canvas), creates assets/configs/constant.ts with tracking/store/audio/effect keys, and initializes the playable-foundation submodule. Use whenever the user wants to start a new playable, clone an existing one as a template, scaffold the scene graph for a playable, or stand up the lifecycle/canvas/constants triplet — even if they don't say "scaffold" explicitly (e.g., "let's start a new variant", "set up the project for the next ad"). The cocos-mcp-server plugin must be running for scene/node operations; if it isn't, this skill tells the user how to start it.
---

# Playable Ad Bootstrap

You are helping the user stand up a new playable ad in this repo. The project layout, framework, and build pipeline are already established — your job is to make the predictable setup happen correctly and quickly, so the user can move to gameplay.

## Why this exists

Every playable in this repo shares the same skeleton: one scene, three lifecycle components on a `LifecycleManager` node, a `Canvas` for UI, a `constant.ts` file that holds all the per-playable knobs, and the `playable-foundation` submodule that supplies the framework (signal bus, lifecycle, object pool, audio, effects, tracking). Doing this by hand is repetitive and easy to get subtly wrong (e.g., forgetting to wire `canvasNode` on the canvas-wirer component, or leaving the package name as the previous playable's). This skill captures the steps and the order they need to happen in.

## Preconditions

Confirm these before doing anything destructive. If any fails, stop and tell the user how to fix it.

1. **Cocos Creator 3.8.7 project.** Check that `package.json` at the repo root has `"creator": { "version": "3.8.7" }`. If absent or different, ask the user — newer/older versions may need different scene serialization.
2. **`cocos-mcp-server` is installed.** Check `extensions/cocos-mcp-server/package.json` exists. If not, run `git clone https://github.com/dyCuong03/cocos-mcp-server.git extensions/cocos-mcp-server && npm install --omit=dev --prefix extensions/cocos-mcp-server`.
3. **`cocos-mcp-server` is running.** Try `curl -sS http://127.0.0.1:3000/mcp` (or the configured port). If unreachable, tell the user: *"Open Cocos Creator, go to Extension → Cocos MCP Server, click Start Server, then tell me the port."* Don't proceed without it — scene mutations go through this MCP.
4. **MCP client is configured.** If the user's Claude doesn't have the `cocos-creator` MCP registered, suggest: `claude mcp add --transport http --scope local cocos-creator http://127.0.0.1:{port}/mcp` and have them restart this session.

## Steps

### 1. Initialize the framework submodule

`assets/plugins/playable-foundation` is a git submodule. If empty:

```bash
git submodule update --init --recursive
```

If the user doesn't have access (private remote), ask them how they want to proceed. The lifecycle components referenced by the scene live there — without it, the scene loads but does nothing.

### 2. Create or update `assets/configs/constant.ts`

This file is the **single retargeting surface** for the playable. Write it with placeholders that match the user's brief and ask them to confirm. Template:

```ts
export class constant {
    static STORE_LINK = {
        ANDROID_LINK: '<https://play.google.com/store/apps/details?id=...>',
        IOS_LINK: '<https://apps.apple.com/app/id...>',
    }

    static AUDIO_NAME = {
        BGM: 'BGM',
        WIN: 'Win',
        LOSE: 'Lose',
        INPUT: 'Input',
        SHOOT: 'shoot',
        DEFAULT: ''
    }

    static TRACKING = {
        PLAYABLE_ID: '<PAxxxx>',
        PACKAGE_NAME: '<com.publisher.gamename>',
        BASE_URL: '<https://your-tracking-host/p.gif>',
        MAX_TRACKING_DURATION_SEC: 60,
        ENV: 'production'  // or 'test' while iterating
    }

    static EFFECT_NAME = {
        EFFECT_TEST: 'effect_ex',
        EFFECT_EX: 'effect_ex',
        DEFAULT: ''
    }
}
```

Confirm each placeholder with the user before writing. If `BASE_URL` looks like a test host but `ENV` says `production`, flag it — this trips people up.

### 3. Create the main scene structure via MCP

Use the `cocos-mcp-server` tools — these mutate the live scene in the editor, no manual JSON editing of `.scene` files. Aim for this hierarchy:

```
main-scene (cc.Scene)
├── Main Light            (cc.DirectionalLight)
├── Main Camera           (cc.Camera, 3D)
├── LifecycleManager      (empty cc.Node — attach 3 framework components from playable-foundation)
└── Canvas                (cc.Canvas + cc.UITransform + cc.Widget anchored full-screen, alignFlags=45, alignMode=2)
    └── (UI mount point — empty child node, named to taste)
```

The three components on `LifecycleManager` come from the `playable-foundation` submodule. Their UUIDs in the existing template are `ddae...`, `edcd...`, `387e...` (bootstrap, canvas-wirer, tracker — verify names by reading the submodule). **The canvas-wirer needs its `canvasNode` field pointing at the `Canvas` node** — this is the most common wiring mistake.

If a `main-scene.scene` already exists and looks healthy (has all four children), do **not** recreate it. Ask the user whether to keep it or replace.

### 4. Verify

After scene + constants are in place:

1. Have the user open the scene in Cocos Creator simulator (`Ctrl+P`). The console should be quiet — no missing-script errors.
2. Build HTML5: `CocosCreator --project . --build "platform=html5;debug=false"`. Output lands in `build/web-mobile/`.
3. Open `build/web-mobile/index.html` and confirm the canvas renders.

### 5. Hand off

Tell the user what's next: add gameplay prefabs under `assets/prefabs/`, runtime-loaded assets under `assets/resources/`, wire CTAs (offer the `playable-ad-cta-wiring` skill), and when ready to ship, audit size (offer the `playable-ad-size-budget` skill).

## What this skill does NOT do

- Doesn't write gameplay logic. That's the user's job (or a different skill).
- Doesn't run the Super HTML exporter — that happens later in the build phase.
- Doesn't add ad-network SDKs. CTA wiring lives in `playable-ad-cta-wiring`.

## Common pitfalls

- **Forgetting the submodule.** Scene loads, but `LifecycleManager` components are dead refs. Symptoms: silent failure, no audio, no tracking.
- **`canvasNode` not wired.** UI components instantiate but can't find their parent canvas.
- **`PACKAGE_NAME` left as the previous playable's.** Tracking events get attributed to the wrong title. Always confirm.
- **`ENV: 'production'` with a `test.*` `BASE_URL`.** The pixel fires fine but goes to the wrong bucket. Read both fields together.
