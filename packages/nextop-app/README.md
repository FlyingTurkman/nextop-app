<div align="center">

# NextOP

**The fullstack React framework for the desktop.**
Real Next.js on the inside, a native Electron shell on the outside.

### 🌐 [nextopapp.vercel.app](https://nextopapp.vercel.app)

[![npm](https://img.shields.io/npm/v/nextop-app?label=nextop-app)](https://www.npmjs.com/package/nextop-app)
[![npm](https://img.shields.io/npm/v/create-nextop-app?label=create-nextop-app)](https://www.npmjs.com/package/create-nextop-app)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

</div>

---

**NextOP** bundles **Next.js + Electron** to build desktop applications for the React ecosystem.
It combines the Next.js developer experience (App Router, SSR, Server Components, API routes,
`next/image`) with Electron's native capabilities (filesystem, shell, notifications, clipboard,
secure storage, native menus, multi-window).

> **Status:** early / experimental. API may still change. Platform focus: Windows (PowerShell);
> macOS/Linux work but are less validated.

## Quick start

```bash
npx create-nextop-app my-app
cd my-app
npm run dev      # compiles the Electron layer + launches the in-process Next dev server
npm run build    # next build + Electron compile + electron-builder package → release/
```

## The key idea: a live Next.js server, not a static export

NextOP does **not** statically export Next.js. Instead it runs a **live Next.js HTTP server inside
the Electron main process**:

```
Electron app.whenReady()
  → startNextServer(): next({ dir, dev }) + http.createServer → 127.0.0.1:<port>
  → BrowserWindow.loadURL("http://127.0.0.1:<port>")
```

**Consequence:** every Next.js feature works — App Router, SSR, Server Components, Route Handlers,
Server Actions, middleware, `next/image`. This is the differentiator versus static-export-based
desktop wrappers.

**Cost:** Chromium + Node + a live Next server is the heaviest runtime profile among comparable
frameworks. This weight is inherent to the design, not a bug.

The same runtime model is used for **dev** (`next({ dir: cwd, dev: true })`) and **production**
(`next({ dir: app.getAppPath(), dev: false })` against the prebuilt `.next` output). The server binds
to **`127.0.0.1` only** (never the LAN); the port prefers `3000` and falls back to an OS-assigned free
port on `EADDRINUSE`.

## Architecture

```
┌─────────────────────────── Electron Main Process ───────────────────────────┐
│  app.whenReady()                                                             │
│    ├─ new BrowserWindow({ contextIsolation, sandbox, nodeIntegration:false })│
│    ├─ registerNextOP(mainWindow, options)   ← from "nextop-app/main"         │
│    │     ├─ ipcMain handlers: fs, shell, clipboard, notification, menu,      │
│    │     │   window controls, secure-store, internal windows                 │
│    │     └─ navigation guards (will-navigate / setWindowOpenHandler)         │
│    └─ startNextServer(dir, dev) → live Next.js on 127.0.0.1:<port>           │
└───────────────▲──────────────────────────────────────────────▲─────────────┘
                │ contextBridge (preload.ts)                     │ http
                │ window.desktop / window.nextop                 │
┌───────────────┴────────────────────────────────────────────────┴────────────┐
│                       Renderer (your Next.js app)                            │
│   Hooks: useFs, useWindow, useMenu, useShell, useNotification,              │
│          useClipboard, useSecureStore                                        │
│   Components: <Link> (nextop-app/link), <VirtualList> (nextop-app/...)       │
└──────────────────────────────────────────────────────────────────────────────┘
```

- `preload.ts` exposes `window.desktop` (namespaced helpers + a guarded generic `ipcRenderer`) and
  `window.nextop` (`{ openExternal(url) }`) via `contextBridge`.
- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` — the correct Electron
  security baseline.
- Hooks **degrade gracefully to `null` / no-op when `window.desktop` is absent** (e.g. rendered on
  the web / during SSR).

## Packages

| Package | Role |
|---------|------|
| [`create-nextop-app`](https://www.npmjs.com/package/create-nextop-app) | CLI that scaffolds a project via `npx create-nextop-app` |
| [`nextop-app`](https://www.npmjs.com/package/nextop-app) | Runtime library (React hooks + main-process IPC) and the `nextop` CLI |

**Stack of a freshly scaffolded app:** Next.js 16, React 19, Tailwind CSS v4, Electron 39,
TypeScript 5, electron-builder 25.

## Main-process setup — `registerNextOP`

Import from `nextop-app/main` and call it inside `app.whenReady()`, **after** the `BrowserWindow` is
created.

```ts
// electron/main.ts
import { app, BrowserWindow } from "electron"
import path from "path"
import { startNextServer } from "./startNext"
import { registerNextOP } from "nextop-app/main"

let mainWindow: BrowserWindow | null = null

app.whenReady().then(async () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    backgroundColor: "#0a0a0a",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  mainWindow.once("ready-to-show", () => mainWindow?.show())

  registerNextOP(mainWindow, {
    fs:    { mode: "allowed", allowedRoots: [app.getPath("userData")] },
    shell: { mode: "none", allowedCommands: [], requireConsent: true },
  })

  const dev = !app.isPackaged
  const nextServer = await startNextServer(dev ? process.cwd() : app.getAppPath(), dev)
  await mainWindow.loadURL(`http://127.0.0.1:${nextServer.port}`)
})
```

## Hooks

All hooks import from the package root — `import { useFs, useWindow, ... } from 'nextop-app'` — and
are safe during SSR / on the web (they no-op or return `null` when `window.desktop` is unavailable).

| Hook | Purpose |
|------|---------|
| `useFs()` | Sandboxed `readFile` / `writeFile`, scoped by the `fs` config. |
| `useWindow()` | `minimize` / `maximize` / `close` / `isMaximized` / `isAvailable`. |
| `useNotification()` | Native OS notifications (`showNotification({ title, body })`). |
| `useClipboard()` | `readText` / `writeText` for the system clipboard. |
| `useShell()` | Run an OS executable with an explicit args array. Disabled by default. |
| `useSecureStore()` | Encrypted key/value secret storage backed by Electron `safeStorage`. |
| `useMenu()` | Set the native application menu (`[menu, setMenu]`). |

```tsx
'use client'
import { useFs, useWindow } from 'nextop-app'

export default function Page() {
  const { writeFile } = useFs()
  const { minimize, maximize, close } = useWindow()

  return (
    <main>
      <button onClick={() => writeFile('nextop.txt', 'Created by NextOP')}>Create file</button>
      <button onClick={minimize}>Minimize</button>
      <button onClick={maximize}>Maximize</button>
      <button onClick={close}>Close</button>
    </main>
  )
}
```

## Components

- **`<Link>`** (`nextop-app/link`) — a `next/link` wrapper with `isExternal` (opens in the system
  browser) and `target="_blank"` (opens a secure internal Electron window via `internalOptions`).
- **`<VirtualList>`** (`nextop-app/virtual-list`) — lightweight virtualization that only renders
  children near the viewport (`IntersectionObserver`, 300px overscan).

## Security model

Both the filesystem and shell layers are **mode-based** with **security-first defaults**.

| Layer | Modes | Default |
|-------|-------|---------|
| **Filesystem** (`useFs`) | `'all'` (any path) · `'allowed'` (confined to `allowedRoots`, traversal blocked) · `'none'` | `'allowed'` |
| **Shell** (`useShell`) | `'all'` · `'allowed'` (allowlist) · `'none'`. Always `spawn(cmd, args, { shell:false })` → no shell injection. `requireConsent` shows a native confirmation dialog. | `'none'`, `requireConsent: true` |

- **Navigation guards:** `will-navigate` to a non-`localhost`/`127.0.0.1` origin is blocked (external
  links open in the system browser); `setWindowOpenHandler` denies all popups. `sandbox: true` on the
  main window and internal windows.
- **The Next.js backend runs on the user's machine.** It binds to `127.0.0.1` only. **Never embed
  central/shared DB credentials** in app code or `.env` (the package ships readable, `asar: false`) —
  use a remote API with per-user tokens. The localhost API has no auth by default; add your own to
  sensitive Route Handlers.
- **CSP is intentionally not auto-applied** — a strict CSP breaks Next.js (HMR `eval`, inline styles).
  Treat it as per-app, opt-in.
- **IPC channel allowlist:** `preload.ts` validates every `invoke`/`send`/`on` against an allowlist;
  user-defined channels are allowed under the **`app:`** prefix convention.

## Documentation

The full API reference — every hook/component, the complete security model, the IPC channel reference,
CLI internals, and FAQ — lives in **[DOCS.md](DOCS.md)** and on the website:

### 👉 [nextopapp.vercel.app](https://nextopapp.vercel.app)

## License

[MIT](LICENSE) © FlyingTurkman
