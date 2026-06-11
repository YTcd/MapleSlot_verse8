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

## MapleStory Asset Data

- `src/assets.json` → `background.perion`: Perion `dryRock` background set from MSU CDN (`https://resource-static.msu.io/data/Map/Back/dryRock/back/`)
