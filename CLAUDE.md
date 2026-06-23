# CLAUDE.md

This file orients Claude Code (or any AI agent) working in this repository. It also serves as the
source material for the project's documentation.

## What is NextOP?

**NextOP** is a framework that bundles **Next.js + Electron** to build desktop applications for the
React ecosystem. Goal: combine the Next.js development experience with Electron's native
capabilities to make desktop app development easy.

Versions are early/experimental (`0.0.x`).

## Monorepo Layout

npm workspaces monorepo. Two published packages plus a test/example app:

| Path | Package | Role |
|------|---------|------|
| `packages/create-nextop-app` | `create-nextop-app` (0.0.8) | CLI that scaffolds a project via `npx create-nextop-app` |
| `packages/nextop-app` | `nextop-app` (0.0.4) | Runtime library: React hooks + Electron main-process IPC registration |
| `test/` | — | Live test/example copy of the scaffolded template (uses a linked `nextop-app`) |

`packages/create-nextop-app/templates/default/` is the project template the CLI copies. Edit there
to change the experience for newly created apps.

## Core Architecture (IMPORTANT)

NextOP does **NOT** statically export Next.js. Instead it runs a **live Next.js HTTP server** inside
the Electron main process:

```
Electron app.whenReady()
  → startNextServer(): create next({ dir, dev }) instance + http.createServer → localhost:3000
  → BrowserWindow.loadURL("http://localhost:3000")
```

Result: all Next.js features work — App Router, SSR, Server Components, API Routes, next/image
(this is the differentiator vs. Nextron). Cost: Chromium + Node + a live Next server → the heaviest
runtime profile among comparable frameworks. This weight is inherent to the design, not a bug.

Renderer ↔ main communication:
- `preload.ts` exposes `window.desktop` and `window.nextop` via `contextBridge`.
- `contextIsolation: true`, `nodeIntegration: false` (correct Electron security baseline).
- `nextop-app/main` → `registerNextOP()` registers `ipcMain` handlers in the main process.

### Key Files
- `packages/nextop-app/src/main/index.ts` — main-process IPC handlers (fs, shell, clipboard, notification, menu, window) and the security configuration (`NextOPOptions`).
- `packages/nextop-app/src/hooks/*` — renderer hooks: `useFs`, `useWindow`, `useMenu`, `useShell`, `useNotification`, `useClipboard`, `useSecureStore` (safeStorage-encrypted secret storage).
- `packages/nextop-app/src/link/index.tsx` — `<Link>` component that opens external / internal windows.
- `packages/nextop-app/index.d.ts` — global `window.desktop` typing.
- `packages/nextop-app/bin/cli.js` — the `nextop dev` command (tsc compile → copy assets → launch Electron).
- `templates/default/electron/{main,preload,startNext,window}.ts` — the template's Electron entry layer.

## Commands

```bash
# Root
npm run build          # build all workspaces
npm run build-dev      # build create-nextop-app + nextop-app, npm link, link into test/

# nextop-app package
npm run build          # tsc -p tsconfig.build.json → dist/

# create-nextop-app package
npm run build          # tsc → dist/

# Inside a scaffolded app (test/ or a new project)
npm run dev            # nextop dev  → compiles Electron + launches Next dev server in-process
npm run build          # nextop build → next build + Electron compile + electron-builder package
```

### Production build (`nextop build`)
`bin/cli.js build`: compile Electron (`tsc`) → copy assets → `next build` → `electron-builder`
(output in `release/`). Runtime model: `main.ts` runs the Next server **in-process** for both modes —
dev (`dev=true`, `dir=cwd`) and production (`dev=false`, `dir=app.getAppPath()`). Packaging uses
`asar: false` (Next cannot read its files from inside an asar archive); `electron` lives in
`devDependencies` (electron-builder requirement); production `node_modules` (incl. `next`) ship
automatically. `next.config.mjs` lives at the **project root** (not `app/`) and sets
`images.unoptimized` (read-only package can't write the optimization cache).
NOTE: the packaging step downloads platform binaries and is not verified in CI — validate `nextop
build` in a real scaffolded app. Validated so far: `next build` + Electron compile + electron
download + native rebuild succeed. On Windows, electron-builder's winCodeSign extraction needs
symlink privilege → enable **Developer Mode** or run the terminal as **Administrator** (not a code
bug).

### Local development linking
Both packages are dev-linked via `npm link` (global). To scaffold a test app that uses the **local**
`nextop-app` (not the registry version), run `create-nextop-app <name> --link` — the `--link` flag
runs `npm link nextop-app` after install (best-effort; silently skips if not globally linked, so it's
safe for published end users). The repo's `test/` app is created this way.

## Security Model

`registerNextOP(mainWindow, options)` takes a security configuration (`NextOPOptions`). Both the
file-system and shell layers are **mode-based**, with security-first defaults.

```ts
type NextOPOptions = {
  fs?: {
    mode?: 'all' | 'allowed' | 'none'   // default: 'allowed'
    allowedRoots?: string[]             // used when mode === 'allowed'
  }
  shell?: {
    mode?: 'all' | 'allowed' | 'none'   // default: 'none'
    allowedCommands?: string[]          // used when mode === 'allowed'
    requireConsent?: boolean            // default: true
  }
}
```

### File system — `useFs` (`fs:readFile` / `fs:writeFile`)
- **`'all'`** → unrestricted; any path allowed (`path.resolve(filePath)`). Use only in trusted apps.
- **`'allowed'`** (default) → every path is confined to `allowedRoots`. `isInsideRoot()` + `path.relative`
  block path traversal (`..`). Relative paths resolve against the first root.
- **`'none'`** → all file-system access is rejected.
- Routing logic lives in `resolveFsPath(filePath, mode, roots)`; both handlers call it.

### Shell — `useShell` (`shell-execute`)
- **`'all'`** → any executable allowed. Still uses `spawn(cmd, args, { shell:false })`, so shell
  injection is impossible — `'all'` runs an explicit executable + args array, not an arbitrary shell
  string. (Original RCE used `exec(string)`; removed.)
- **`'allowed'`** → only executables listed in `allowedCommands`.
- **`'none'`** (default) → shell is fully disabled.
- `requireConsent` defaults to **true** (security priority): every command shows an Electron
  confirmation dialog before running unless explicitly disabled.
- Hook signature: `execute(command, args[])`; IPC payload is `{ command, args }`.

### Template defaults (secure out of the box)
`templates/default/electron/main.ts`:
- `fs: { mode: 'allowed', allowedRoots: [app.getPath('userData')] }`
- `shell: { mode: 'none', allowedCommands: [], requireConsent: true }`

### Navigation guards & sandbox
- `webPreferences.sandbox: true` on both the main window (template) and internally opened windows (library).
- `registerNextOP` attaches navigation guards (`attachNavigationGuards`): `will-navigate` to a
  non-`localhost`/`127.0.0.1` origin is blocked (external http(s) opened in the system browser);
  `setWindowOpenHandler` denies all popups (intentional internal windows go through the
  `open-internal-window` IPC channel). Guards attach to the existing `mainWindow.webContents` and to
  every future `web-contents-created`.
- CSP is intentionally **not** auto-applied — a strict CSP breaks Next.js (HMR `eval`, inline styles).
  Treat it as per-app, opt-in configuration.

### Next.js backend runs on the user's machine
A built NextOP app runs a **live Next.js server** (API routes, route handlers, Server Components,
Server Actions, middleware all execute server-side, in the Electron main process on the end user's
machine). Security implications for app authors:
- The server binds to **`127.0.0.1` only** (`startNext.ts`) — not the LAN. `loadURL` uses `127.0.0.1`
  to match (avoids IPv6/IPv4 mismatch). Do not change this to bind all interfaces.
- **Never embed central/shared DB credentials** in app code or `.env` — the package ships readable
  (`asar: false`), so every client would hold the key. Talk to a remote API with per-user tokens
  instead; an embedded local DB (SQLite) for local data is fine.
- The localhost API has **no auth by default** and is reachable by other local processes — add your
  own auth to sensitive route handlers.

### IPC channel allowlist
`preload.ts` no longer forwards arbitrary channels. The generic `desktop.ipcRenderer` bridge
validates every `invoke`/`send`/`on` against an allowlist of known NextOP channels; anything else is
rejected. User-defined channels are allowed under the `app:` prefix convention. `on` returns an
unsubscribe function. Keep new framework channels added to the corresponding allowlist array in
`preload.ts`.

Note on the port: `startNextServer` now prefers 3000 and falls back to an OS-assigned free port on
`EADDRINUSE` (race-free — the server binds the port itself and returns the actual one via
`nextServer.port`). The old hardcoded-3000 collision risk is resolved.

## Known Code-Quality Bugs

- ✅ FIXED: `window:isMaximized` now returns `isMaximized()` (was `isMaximizable()`).
- ✅ FIXED: template `main.ts` now calls `registerNextOP` after window creation (was passing a null `mainWindow`).
- ✅ FIXED: `preload.ts` `isMaximized` (was the typo `isMiximized`, so `useWindow.isMaximized` never fired).
- ✅ FIXED: `useClipboard` now sends the `type` string to `read-clipboard` (was sending a `{ type }` object the handler couldn't read).
- ✅ FIXED: all window IPC handlers (`minimize`/`maximize`/`close`/`isMaximized`) now live only in `registerNextOP` (library), operating on `BrowserWindow.fromWebContents`. The template's `window.ts` / `registerWindowHandlers` were removed.

## Conventions

- Platform is Windows; shell is PowerShell. The CLI calls `taskkill /F /IM electron.exe` on Windows.
- TypeScript ESM (`"type": "module"`); the library compiles to `dist/`, and `dist` is what ships.
- Library source lives in `src/` — **do not edit `dist/` by hand**; edit `src/` and run `npm run build`.
- `npm run build` wipes `dist/` first (clean build) so stale artifacts don't accumulate. Every `dist/`
  file must have a `src/` counterpart; subpath exports in `package.json` (`.`, `./main`, `./link`,
  `./virtual-list`) must point at real compiled output.
- Hooks degrade gracefully to `null`/no-op when `window.desktop` is absent (web compatibility) — keep this pattern.
```
