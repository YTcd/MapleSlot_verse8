# Status — 2d-phaser-basic

## Implemented

- React 18 shell (`main.tsx` → `App.tsx` → `GameComponent`) mounting a full-viewport Phaser canvas
- `Phaser.Game` lifecycle with `StrictMode`-safe single-instance guard and `destroy(true)` cleanup
- `createGame` config: Arcade Physics (`gravity.y: 2000`), `Phaser.Scale.RESIZE`, `autoCenter: CENTER_BOTH`, scenes `[SceneA, SceneB, LoadingScene]`
- Global sprite/tween scaling patch in `Game.ts` (`setDisplaySize` / `setScale` / `TweenManager.add` override, keyed to `baseDisplayWidth`/`baseDisplayHeight`)
- `SceneTransition.goToScene()` — 3-stage scene switching that routes all transitions through `LoadingScene`
- `LoadingScene`: animated progress bar (0-100%) with ease-out curve, minimum 2-second display, fade-out → target scene
- `SceneA`: dark blue background, title/subtitle text, "Go to Scene B" button with hover/press states
- `SceneB`: dark green background, title/subtitle text, "Go to Scene A" button with hover/press states
- `assets.json` manifest scaffold
- Embed-host size reporting via `postMessage` in `index.html`

## Installed but not wired

- `@agent8/gameserver` — no networking / session code
- `lucide-react` — no imports
- `tailwindcss` — directives loaded via `index.css`, no utility usage in markup
- `assets.json.sprites` — empty map, no textures loaded
