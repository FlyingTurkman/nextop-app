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
- `packages/nextop-app/src/hooks/*` — renderer hooks: `useFs`, `useWindow`, `useMenu`, `useShell`, `useNotification`, `useClipboard`.
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
npm run dev            # nextop dev  → compiles + launches Electron
npm run build          # nextop build → NOT YET IMPLEMENTED (missing in cli.js)
```

Note: `bin/cli.js` only implements the `dev` command. **There is no production build / packaging yet.**

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
- OPEN: window IPC handlers are double-registered — in both `registerWindowHandlers` (template) and `registerNextOP` (library).

## Conventions

- Platform is Windows; shell is PowerShell. The CLI calls `taskkill /F /IM electron.exe` on Windows.
- TypeScript ESM (`"type": "module"`); the library compiles to `dist/`, and `dist` is what ships.
- Library source lives in `src/` — **do not edit `dist/` by hand**; edit `src/` and run `npm run build`.
- `dist/virtual-list` and `dist/components/Link` exist compiled but their `src/` counterparts may be
  missing; verify the source before changing them.
- Hooks degrade gracefully to `null`/no-op when `window.desktop` is absent (web compatibility) — keep this pattern.
```
