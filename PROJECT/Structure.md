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
- `MobSymbolDef` interface: Exported type for symbol definitions used by SlotMachine
- `preloadMobTextures(scene)`: Preloads raw mob sprite PNGs via `scene.load.image()` using raw frame keys (`slot_mob_raw_X_f_Y`)
- `createMobAnimations(scene)`: Creates Phaser animations from bordered composite frame textures (uses default `MOB_SYMBOLS`)
- `createMobAnimationsFor(scene, symbols)`: Generic version accepting custom symbol array (used by Sleepywood)
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

## `src/game/slots/SleepywoodSymbolData.ts`

Sleepywood-specific mob symbol definitions. Exports the same interface shape as `SlotSymbolData`:
- `SLEEPYWOOD_MOB_SYMBOLS`: Array of 7 `MobSymbolDef` entries for Sleepywood dungeon mobs
- `preloadMobTextures(scene)`: Preloads Sleepywood mob PNGs
- All key helper functions (`getSlotTextureKey`, `getAnimKey`, `getFrameKey`, `getRawFrameKey`, `getBorderColor`)

Symbol mapping:
| Symbol | Mob ID | Name | CDN Path | Frames | Border |
|--------|--------|------|----------|--------|--------|
| 0 | 2600224 | Drake | Mob/5130100/stand/0.png | 1 | Dark Red #aa3333 |
| 1 | 6230100 | Wild Kargo | Mob/6230100/stand/0.png | 1 | Orange-Brown #cc6633 |
| 2 | 7130100 | Tauromacis | Mob/7130100/stand/0-2.png | 3 | Forest Green #448844 |
| 3 | 6130100 | Red Drake | Mob/6130100/stand/0.png | 1 | Red #cc4444 |
| 4 | 6230600 | Ice Drake | Mob/6230600/stand/0-1.png | 2 | Ice Blue #44aacc |
| 5 | 2230101 | Zombie Mushroom | Mob/2230101/stand/0,move/2.png | 2 | Purple #7733aa |
| 6 | 8130100 | Jr. Balrog | Mob/8130100/stand/0-1.png | 2 | Fire Orange #ff5500 |

## `src/game/slots/LudibriumSymbolData.ts`

Ludibrium-specific mob symbol definitions. Exports the same interface shape as `SlotSymbolData`:
- `LUDIBRIUM_MOB_SYMBOLS`: Array of 7 `MobSymbolDef` entries for Ludibrium toy-themed mobs
- `preloadMobTextures(scene)`: Preloads Ludibrium mob PNGs
- All key helper functions (`getSlotTextureKey`, `getAnimKey`, `getFrameKey`, `getRawFrameKey`, `getBorderColor`)

Symbol mapping:
| Symbol | Mob ID | Name | CDN Path | Frames | Border |
|--------|--------|------|----------|--------|--------|
| 0 | 3000005 | Brown Teddy | Mob/3000005/stand/0-1.png | 2 | Brown #8B6914 |
| 1 | 3110101 | Pink Teddy | Mob/3110101/stand/0-1.png | 2 | Pink #ff88aa |
| 2 | 4230113 | Tick-Tock | Mob/4230113/stand/0-2.png | 3 | Gold #ddaa44 |
| 3 | 4230115 | Master Chronos | Mob/4230115/stand/0-1.png | 2 | Purple #8844aa |
| 4 | 3230305 | Toy Horse | Mob/3230305/stand/0-1.png | 2 | Orange #dd8844 |
| 5 | 4230111 | Robo | Mob/4230111/stand/0-1.png | 2 | Blue-Gray #8888cc |
| 6 | 2600631 | Papulatus | Mob/2600631/stand/0-1.png | 2 | Red #dd3333 |

## `src/game/slots/SlotMachine.ts`

Main slot machine class. Updated to support custom symbol sets:
- Constructor accepts optional `customSymbols?: MobSymbolDef[]` (7th parameter) — when provided, uses those symbols instead of the default `MOB_SYMBOLS`
- `createTextures()`: Uses `this.symbols` array to generate bordered composite textures for all animation frames
- `createMobAnimationsFor()`: Called with custom symbols when provided, otherwise uses default `createMobAnimations()`
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

## `src/game/scenes/towns/SceneSleepywood.ts`

Sleepywood slot machine town scene with:
- **Slot Machine**: Uses `SlotMachine` with `SLEEPYWOOD_MOB_SYMBOLS` (7 dungeon mobs: Drake, Wild Kargo, Tauromacis, Red Drake, Ice Drake, Zombie Mushroom, Jr. Balrog)
- **BGM**: `Bgm00:SleepyWood` (looping), paused during win presentation
- **Win SFX**: Celebration chime fanfare (3s)
- **Boss**: Jr. Balrog (mob ID 8130100, 2 stand frames) with HP bar and hit animation
- **Player**: MapleSprite with spear weapon, attacks boss on slot wins
- **throwKnife()**: Projectile animation from player to boss on win
- **HP save/load**: `fetchBossHP("JrBalrog")` / `saveBossHP("JrBalrog", hp)` with 1,000,000 max HP

## `src/game/scenes/towns/SceneLudibrium.ts`

Ludibrium slot machine town scene with:
- **Slot Machine**: Uses `SlotMachine` with `LUDIBRIUM_MOB_SYMBOLS` (7 toy-themed mobs: Brown Teddy, Pink Teddy, Tick-Tock, Master Chronos, Toy Horse, Robo, Papulatus)
- **Custom Paylines**: 10 LUDI_PAYLINES with payline preview toggle (Lines button)
- **BGM**: `Bgm06:FantasticThinking` (looping), paused during win presentation
- **Win SFX**: Celebration chime fanfare (3s)
- **Boss**: Papulatus (mob ID 2600631, 6 stand frames) with HP bar and hit animation
- **Player**: MapleSprite with spear weapon, attacks boss on slot wins
- **throwKnife()**: Projectile animation from player to boss on win
- **HP save/load**: `fetchBossHP("Papulatus")` / `saveBossHP("Papulatus", hp)` with 30,000,000 max HP

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
- `src/assets.json` → `audio.bgm`: `Bgm00:GoPicnic` background music (Henesys)
- `src/assets.json` → `audio.bgmSleepywood`: `Bgm00:SleepyWood` background music (Sleepywood)
- `src/assets.json` → `audio.bgmLudibrium`: `Bgm06:FantasticThinking` background music (Ludibrium)
- `src/assets.json` → `audio.sfxWin`: Celebration win sound effect
- `data/maple/mob_9833419.json`: Mush render plan (2 stand frames)
- `data/maple/mob_100000.json`: Snail render plan (1 stand frame)
- `data/maple/mob_100001.json`: Blue Snail render plan (1 stand frame)
- `data/maple/mob_100002.json`: Red Snail render plan (1 stand frame)
- `data/maple/mob_100003.json`: Spore render plan (3 stand frames)
- `data/maple/mob_100004.json`: Orange Mushroom render plan (2 stand frames)
- `data/maple/mob_2220100.json`: Blue Mushroom render plan (2 stand frames)

- `data/maple/body_2000.json`: Body render plan (48 entries, stand1/swingO1/swingO2/swingO3/stabO1/stabO2/shoot1/shoot2)
- `data/maple/head_12000.json`: Head render plan (120 entries, stand1/swingO1/swingO2/swingO3/stabO1/stabO2/shoot1/shoot2)
- `data/maple/face_20000.json`: Face render plan (4 entries, default/blink expressions)
- `data/maple/hair_30000.json`: Hair render plan (48 entries, stand1/swingO1/swingO2/swingO3/stabO1/stabO2/shoot1/shoot2)
- `data/maple/weapon_1472263.json`: Maple Treasure Thief Claw render plan (7 entries, stand1/stabO1/stabO2/shoot1/shoot2)

- `data/maple/weapon_1472001.json`: Steel Titans claw weapon render plan (14 entries, stand1/swingO1/swingO2/swingO3/stabO1/stabO2/shoot1/shoot2)
- `data/maple/weapon_1472150.json`: Steel Titans claw weapon render plan (7 entries, stand1/stabO1/stabO2/shoot1/shoot2)
- `data/maple/coat_1040110.json`: Dark Pirate Top render plan (48 entries, stand1/swingO1/swingO2/swingO3/stabO1/stabO2/shoot1/shoot2)
- `data/maple/coat_1040165.json`: Dark Nightshift coat render plan (30 entries, stand1/stabO1/stabO2/shoot1/shoot2)
- `data/maple/pants_1060099.json`: Dark Pirate Pants render plan (24 entries, stand1/swingO1/swingO2/swingO3/stabO1/stabO2/shoot1/shoot2)
- `data/maple/pants_1060024.json`: Dark Nightshift Pants render plan (15 entries, stand1/stabO1/stabO2/shoot1/shoot2)
