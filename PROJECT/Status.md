# Status — 2d-phaser-basic

## Implemented

- React 18 shell (`main.tsx` → `App.tsx` → `GameComponent`) mounting a full-viewport Phaser canvas
- `Phaser.Game` lifecycle with `StrictMode`-safe single-instance guard and `destroy(true)` cleanup
- `createGame` config: Arcade Physics (`gravity.y: 2000`), `Phaser.Scale.RESIZE`, `autoCenter: CENTER_BOTH`, scenes `[SceneA, SceneB]`
- Global sprite/tween scaling patch in `Game.ts` (`setDisplaySize` / `setScale` / `TweenManager.add` override, keyed to `baseDisplayWidth`/`baseDisplayHeight`)
- `SceneTransition.goToScene()` — lightweight 3-stage scene switching (disable input → scene.start → enable input + fade-in)
- `SceneA`: dark blue background, title/subtitle text, "Go to Scene B" button with hover/press states
- `SceneB`: dark green background, title/subtitle text, "Go to Scene A" button with hover/press states
- `assets.json` manifest scaffold
- Embed-host size reporting via `postMessage` in `index.html`

## Installed but not wired

- `@agent8/gameserver` — no networking / session code
- `lucide-react` — no imports
- `tailwindcss` — directives loaded via `index.css`, no utility usage in markup
- `assets.json.sprites` — empty map, no textures loaded
