# Structure — 2d-phaser-basic

## `src/main.tsx`

Entry point. Mounts `<App />` into `#root` with React 18 `createRoot` under `StrictMode`. Imports `index.css`.

## `src/App.tsx`

Root component. Wraps `<GameComponent />` in a full-viewport `.app` container.

## `src/App.css`, `src/index.css`

Component/global styles. `App.css` pins `html`/`body`/`.app` to `100vw` / `100vh` with `overflow: hidden`. `index.css` holds the Tailwind directives.

## `src/assets.json`

Asset manifest (`{ "sprites": {} }`). Consumed by `MainScene` — populate entries here and load them in `preload()`.

## `src/components/GameComponent.tsx`

React host for Phaser. Renders a `#phaser-game` div (100% × 100vh), calls `createGame(containerId)` in a `useEffect` guarded by a ref, and tears the game down with `game.destroy(true)` on unmount.

## `src/game/Game.ts`

Exports `createGame(parent)`. Builds the `Phaser.Types.Core.GameConfig`:

- `type: Phaser.AUTO`, full-window `width`/`height`, `parent` set to the React container id
- `physics.default: 'arcade'` with `gravity.y: 2000` and `debug: false`
- `scene: [SceneA, SceneB]`
- `scale.mode: Phaser.Scale.RESIZE`, `autoCenter: Phaser.Scale.CENTER_BOTH`

Also installs a `game.events.once('ready', …)` patch that overrides `Sprite`/`Image` `setDisplaySize` + `setScale` and `TweenManager.add` so `scale`/`scaleX`/`scaleY` operate relative to a stored `baseDisplayWidth` / `baseDisplayHeight`. Marked `CRITICAL — LLM/AI MODIFICATION PROHIBITED`.

## `src/game/scenes/SceneA.ts`

First test scene (key: `'SceneA'`). Dark blue background, title/subtitle text, and a "Go to Scene B" button that calls `goToScene(this, 'SceneB')`. On `create()`, input is re-enabled and all elements fade in with a staggered tween (Stage 3 transition-complete effect). Hover/press states on the button rectangle.

## `src/game/scenes/SceneB.ts`

Second test scene (key: `'SceneB'`). Dark green background, title/subtitle text, and a "Go to Scene A" button that calls `goToScene(this, 'SceneA')`. Same transition-complete fade-in effect as SceneA.

## `src/game/utils/SceneTransition.ts`

Exports `goToScene(currentScene, targetSceneKey)` — the single-function scene transition abstraction. Three documented stages with comments:
- **Stage 1 (Before)**: Disable input on current scene; load/prepare target data.
- **Stage 2 (During)**: Call `scene.start()` which destroys all current scene children via Phaser's built-in shutdown and builds the target scene fresh.
- **Stage 3 (After)**: Each scene's `create()` re-enables input and plays a fade-in transition-complete effect.

Also exports `cleanupTextures(scene, textureKeys)` for removing textures between scenes.

## `index.html`

Vite HTML shell. Serves `/src/main.tsx`, renders an inline `Loading` spinner inside `#root` for pre-mount, and posts `GAME_SIZE_RESPONSE` messages to `window.parent` on `load` / `resize` / `REQUEST_GAME_SIZE` for embedding hosts.

## `vite.config.ts`, `tsconfig*.json`, `tailwind.config.js`, `postcss.config.js`

Standard Vite + React + TypeScript + Tailwind toolchain configuration.
