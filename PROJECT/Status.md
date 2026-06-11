# Status — 2d-phaser-basic

## Implemented

- React 18 shell (`main.tsx` → `App.tsx` → `GameComponent`) mounting a full-viewport Phaser canvas
- `Phaser.Game` lifecycle with `StrictMode`-safe single-instance guard and `destroy(true)` cleanup
- `createGame` config: Arcade Physics (`gravity.y: 2000`), `Phaser.Scale.RESIZE`, `autoCenter: CENTER_BOTH`
- Global sprite/tween scaling patch in `Game.ts` (`setDisplaySize` / `setScale` / `TweenManager.add` override)
- `SceneTransition.goToScene()` — 3-stage scene switching through `LoadingScene`, supports `passData`
- `LoadingScene`: animated progress bar with ease-out curve, minimum 2-second display, **server balance fetch during loading**
- `TitleScene`: Perion-themed title screen with "게임시작" button → TownSelectScene
- `TownSelectScene`: 5 town buttons (Lith Harbor, Henesys, Ellinia, Perion, Kerning City)
- 5 town scenes with top bar (back button + balance display with coin tier icons)
- `BaseScene`: shared top bar, balance display, `setTopBarNumber()`, fade-in transitions
- Embed-host size reporting via `postMessage` in `index.html`

## Server (GameServer SDK)

- `server/src/server.ts`: `getBalance()` (auto-init 300M for new users), `updateBalance(balance, reason)`
- `server/test/server.test.ts`: 6 passing tests (new user init, persistence, update, negative rejection, user isolation)
- `src/game/utils/ServerBridge.ts`: `fetchBalance()`, `updateBalanceOnServer()` — Phaser→Server bridge with connection wait + fallback
- `App.tsx`: `GameServerProvider` + `useGameServer()` auto-connection

## Installed but not wired

- `tailwindcss` — directives loaded via `index.css`, no utility usage in markup
- `assets.json.sprites` — empty map, no textures loaded
