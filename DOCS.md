# DOCS

Changelog-style documentation of features implemented from `feature.md`. Each entry lists the
public API surface and the files touched.

## Single-instance lock

Prevents launching a second instance of the app — without this, a second launch would boot a
second in-process Next.js server and race for the same port.

**Behavior:** `app.requestSingleInstanceLock()` is requested at startup. If the lock can't be
obtained (another instance already holds it), the new process calls `app.quit()` immediately —
no window or Next server is created. If the lock is held, a `second-instance` handler restores
(un-minimizes) and focuses the existing window when the user tries to launch again.

**Files:**
- `packages/create-nextop-app/templates/default/electron/main.ts`
- `test/electron/main.ts`

No new API in `nextop-app` — this is plain Electron (`app.requestSingleInstanceLock`,
`app.on('second-instance', ...)`) applied directly in the template's `main.ts`.

## Window state persistence

Remembers window size, position, and maximized state across restarts.

**API** (`nextop-app/main`):
```ts
type WindowState = {
  width: number
  height: number
  x?: number
  y?: number
  isMaximized?: boolean
}

function loadWindowState(
  defaults: { width: number, height: number },
  fileName?: string // default: "nextop-window-state.json"
): WindowState

function trackWindowState(
  window: BrowserWindow,
  state: WindowState,
  fileName?: string // default: "nextop-window-state.json"
): void
```

**Usage:**
```ts
const windowState = loadWindowState({ width: 1200, height: 800 })

mainWindow = new BrowserWindow({
    width: windowState.width,
    height: windowState.height,
    x: windowState.x,
    y: windowState.y,
    // ...other options
})

trackWindowState(mainWindow, windowState)
```

**Behavior:** `loadWindowState` synchronously reads a JSON file from `app.getPath('userData')`
(safe to call before window creation — must run before it, since bounds feed the
`BrowserWindow` constructor) and falls back to the given defaults if nothing was saved yet or the
file is corrupt. `trackWindowState` re-applies a saved maximized state via `window.maximize()`,
then listens for `resize`/`move` (debounced 300ms) and `close` to persist the current bounds and
maximized state back to the same file. Writes are best-effort — failures (e.g. read-only
`userData`) are silently ignored.

**Files:**
- `packages/nextop-app/src/main/index.ts` — `WindowState` type, `loadWindowState`,
  `trackWindowState`
- `packages/create-nextop-app/templates/default/electron/main.ts`
- `test/electron/main.ts`

## `useTheme` hook

Dark/light mode only, synced with Electron's `nativeTheme`. Deliberately scoped to just dark/light
— no separate accent-color / full color-scheme hook.

**API** (`nextop-app`):
```ts
type ThemeSource = "system" | "light" | "dark"

function useTheme(): {
  isDark: boolean
  themeSource: ThemeSource
  setThemeSource: (source: ThemeSource) => void
  isAvailable: boolean
}
```

**Behavior:** On mount, the hook fetches the current theme via `theme:get` and subscribes to a
`theme:updated` push event so `isDark`/`themeSource` update live when the OS theme changes (or
when `setThemeSource` is called from any window). `setThemeSource` sets
`nativeTheme.themeSource` in the main process, which drives `nativeTheme.shouldUseDarkColors`.

**IPC surface:**
- `theme:get` (invoke) → `{ shouldUseDarkColors, themeSource }`
- `theme:setSource` (invoke, arg: `ThemeSource`) → `shouldUseDarkColors`
- `theme:updated` (main → renderer push, fires on `nativeTheme`'s `'updated'` event, broadcast to
  every open window)

**Files:**
- `packages/nextop-app/src/hooks/useTheme.ts` — the hook
- `packages/nextop-app/src/main/index.ts` — `theme:get`/`theme:setSource` handlers +
  `nativeTheme.on('updated', ...)` broadcast
- `packages/nextop-app/src/index.ts` — export
- `packages/create-nextop-app/templates/default/electron/preload.ts` — allowlist
  (`theme:get`, `theme:setSource` invoke; `theme:updated` receive)
- `test/electron/preload.ts` — same allowlist additions
