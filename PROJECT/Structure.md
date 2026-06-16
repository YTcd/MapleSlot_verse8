# Structure — 2d-phaser-basic

## `src/main.tsx`

Entry point. Mounts `<App />` into `#root` with React 18 `createRoot` under `StrictMode`. Imports `index.css`.

## `src/App.tsx`

Root component. Wraps `<GameComponent />` in a full-viewport `.app` container.

## `src/App.css`, `src/index.css`

Component/global styles. `App.css` pins `html`/`body`/`.app` to `100vw` / `100vh` with `overflow: hidden`. `index.css` holds the Tailwind directives.

## `src/assets.json`

Asset manifest. Contains background assets:
- `background.perion`: Perion (dryRock) background set from MSU CDN — mountain, mid-ground, and ground tile images.

## `src/components/GameComponent.tsx`

React host for Phaser. Renders a `#phaser-game` div (100% × 100vh), calls `createGame(containerId)` in a `useEffect` guarded by a ref, and tears the game down with `game.destroy(true)` on unmount.

## `src/game/Game.ts`

Exports `createGame(parent)`. Builds the `Phaser.Types.Core.GameConfig`:

- `type: Phaser.AUTO`, full-window `width`/`height`, `parent` set to the React container id
- `physics.default: 'arcade'` with `gravity.y: 2000` and `debug: false`
  - `scene: [TitleScene, SceneA, SceneB, LoadingScene]`
- `scale.mode: Phaser.Scale.RESIZE`, `autoCenter: Phaser.Scale.CENTER_BOTH`

Also installs a `game.events.once('ready', …)` patch that overrides `Sprite`/`Image` `setDisplaySize` + `setScale` and `TweenManager.add` so `scale`/`scaleX`/`scaleY` operate relative to a stored `baseDisplayWidth` / `baseDisplayHeight`. Marked `CRITICAL — LLM/AI MODIFICATION PROHIBITED`.

## `src/game/scenes/LoadingScene.ts`

Loading transition scene (key: `'LoadingScene'`). Receives `{ targetScene }` via `init()`. Dark navy background with "Loading..." text, a bordered progress bar that fills from left to right with an ease-out curve, and a percentage label. Progress simulates preload completion over ~2.5s with a **minimum 2-second visible duration** — even if loading finishes sooner, the scene stays until both conditions are met. Fades out before starting the target scene. Handles Stage 2 (During) and Stage 3 (After) of the transition internally.

## `src/game/scenes/TitleScene.ts`

Title scene (key: `'TitleScene'`) with Perion-themed background. Preloads 3 `dryRock` background layers from MSU CDN (`Map/Back/dryRock/back/`):
- Mountain silhouette (`26.png`, 348×280)
- Mid-ground terrain band (`1.png`, 900×441), tiled horizontally
- Ground texture (`0.png`, 128×128), tiled both directions

Displays "MapleSlot" title text and a "게임시작" button. Button navigates to `SceneA` via `goToScene`.

## `src/game/scenes/SceneA.ts`

First test scene (key: `'SceneA'`). Dark blue background, title/subtitle text, and a "Go to Scene B" button that calls `goToScene(this, 'SceneB')`. On `create()`, input is re-enabled and all elements fade in with a staggered tween (Stage 3 transition-complete effect). Hover/press states on the button rectangle.

## `src/game/scenes/SceneB.ts`

Second test scene (key: `'SceneB'`). Dark green background, title/subtitle text, and a "Go to Scene A" button that calls `goToScene(this, 'SceneA')`. Same transition-complete fade-in effect as SceneA.

## `src/game/utils/SceneTransition.ts`

Exports `goToScene(currentScene, targetSceneKey)` — the single-function scene transition abstraction. Three documented stages with comments:
- **Stage 1 (Before)**: Disable input on current scene.
- **Stage 2 (During)**: Start `LoadingScene` (passing target scene key), which destroys current scene children via Phaser's shutdown, displays a progress bar, and enforces a 2s minimum display.
- **Stage 3 (After)**: LoadingScene fades out and starts the target scene; target scene's `create()` re-enables input and plays a fade-in transition-complete effect.

All scene transitions go through `LoadingScene` by default.

## `index.html`

Vite HTML shell. Serves `/src/main.tsx`, renders an inline `Loading` spinner inside `#root` for pre-mount, and posts `GAME_SIZE_RESPONSE` messages to `window.parent` on `load` / `resize` / `REQUEST_GAME_SIZE` for embedding hosts.

## `src/game/utils/ServerBridge.ts`

Bridge between Phaser scenes and GameServer SDK. Uses `GameServer.getInstance()` singleton:

- `fetchBalance()`: Calls `server.remoteFunction("getBalance")`. Waits up to 6s for connection. Falls back to 300,000,000 if server unreachable.
- `updateBalanceOnServer(balance, reason)`: Calls `server.remoteFunction("updateBalance", [balance, reason])`.

## `server/` (GameServer SDK Structured Project)

Agent8 GameServer backend:

- `server/src/server.ts`: `getBalance()` auto-initializes new users at 300M, `updateBalance(balance, reason)` validates and persists
- `server/test/server.test.ts`: 6 tests covering init, persistence, update, validation, user isolation
- Built to `server/dist/server.js` (auto-deployed by platform)

## `vite.config.ts`, `tsconfig*.json`, `tailwind.config.js`, `postcss.config.js`

Standard Vite + React + TypeScript + Tailwind toolchain configuration.

## `src/game/slots/SlotSymbolData.ts`

Slot symbol → MapleStory mob mapping. Defines mob CDN paths, frame data, and provides:
- `preloadMobTextures(scene)`: Preloads raw mob sprite PNGs via `scene.load.image()` using raw frame keys (`slot_mob_raw_X_f_Y`)
- `createMobAnimations(scene)`: Creates Phaser animations from bordered composite frame textures
- `getSlotTextureKey(idx)` / `getAnimKey(idx)` / `getFrameKey(idx, frame)` / `getRawFrameKey(idx, frame)`: Key helpers

Symbol mapping (each has a colored border matching the mob theme):
| Symbol | Mob ID | Name | Frames | Border |
|--------|--------|------|--------|--------|
| 0 | 9833419 | Mush | 2 | Gold #ffd700 |
| 1 | 100000 | Snail | 1 | Brown #8B6914 |
| 2 | 100001 | Blue Snail | 1 | Blue #4488cc |
| 3 | 100002 | Red Snail | 1 | Red #cc4444 |
| 4 | 100003 | Spore | 3 | Green #44aa44 |
| 5 | 100004 | Orange Mushroom | 2 | Orange #ff8844 |
| 6 | 2220100 | Blue Mushroom | 2 | Blue #4488dd |

## `src/game/slots/SlotMachine.ts`

Updated to use MapleStory mob sprites:
- `createTextures()`: Generates bordered composite textures for ALL animation frames (not just frame 0) using `RenderTexture`, so animation preserves border and size
- `createMobAnimations()`: Called during construction to create Phaser animations from bordered composite frames
- `getSpritesForPayline(lineIndex)`: Returns sprite references for win animation
- `stopAllSymbolAnimations()`: Stops all playing animations on reels

## `src/game/slots/SlotReel.ts`

Updated to use `Phaser.GameObjects.Sprite` instead of `Phaser.GameObjects.Image` for animation support:
- `buildPool()`: Creates `Sprite` objects instead of `Image` objects
- `positionItems()`: Updates `rowSprites` mapping for `getSpriteAtRow()`
- `getSpriteAtRow(rowIndex)`: Returns sprite at visible grid row for win animation
- `stopAllAnimations()`: Stops all animations on pool items

## `src/game/slots/SlotWinPresentation.ts`

Updated constructor to accept `SlotMachine` reference. `animateMatchedSymbols()` now plays the mob's stand animation on matched symbols along the payline. Each phase:
1. Draws the payline overlay with highlight boxes
2. Plays mob stand animation on matching sprites
3. After timeout, clears overlay, stops animations, advances phase

## `src/game/scenes/towns/SceneHenesys.ts`

Henesys slot machine town scene with:
- **Background**: Tiled `grassySoil_new` background layers from map `323090120` (Henesys - Front of Larhen's House)
- **BGM**: `Bgm00:GoPicnic` (looping), paused during win presentation
- **Win SFX**: Celebration chime fanfare (3s), plays when payline win occurs while BGM is paused
- **Title font**: "Gowun Batang" (Google Fonts) serif Korean font for MapleStory-like title styling
- Preloads mob textures, audio files, and background layers

## MapleStory Asset Data

- `src/assets.json` → `background.perion`: Perion `dryRock` background set
- `src/assets.json` → `background.henesys`: Henesys `grassySoil_new` background set from map `323090120`
- `src/assets.json` → `audio.bgm`: `Bgm00:GoPicnic` background music
- `src/assets.json` → `audio.sfxWin`: Celebration win sound effect
- `data/maple/mob_9833419.json`: Mush render plan (2 stand frames)
- `data/maple/mob_100000.json`: Snail render plan (1 stand frame)
- `data/maple/mob_100001.json`: Blue Snail render plan (1 stand frame)
- `data/maple/mob_100002.json`: Red Snail render plan (1 stand frame)
- `data/maple/mob_100003.json`: Spore render plan (3 stand frames)
- `data/maple/mob_100004.json`: Orange Mushroom render plan (2 stand frames)
- `data/maple/mob_2220100.json`: Blue Mushroom render plan (2 stand frames)

- `data/maple/body_2000.json`: Body render plan (30 entries, stand1/stabO1/stabO2/shoot1/shoot2)
- `data/maple/head_12000.json`: Head render plan (75 entries, stand1/stabO1/stabO2/shoot1/shoot2)
- `data/maple/face_20000.json`: Face render plan (1 entry, default expression)
- `data/maple/hair_30000.json`: Hair render plan (30 entries, stand1/stabO1/stabO2/shoot1/shoot2)
- `data/maple/weapon_1472263.json`: Maple Treasure Thief Claw render plan (7 entries, stand1/stabO1/stabO2/shoot1/shoot2)
