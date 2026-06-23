# NextOP — Documentation

> The fullstack React framework for the desktop. Real Next.js on the inside, a native Electron shell on the outside.

This document is the single source of truth for the NextOP API. It is written to be
self-contained — everything needed to build a documentation website (concepts, install flow,
CLI, every hook/component, the security model, and the IPC surface) lives here.

- **Repository:** https://github.com/FlyingTurkman/nextop-app
- **Packages:** `create-nextop-app` (scaffolder), `nextop-app` (runtime library + `nextop` CLI)
- **Status:** early / experimental — `1.0.0` line, API may still change.
- **Platform focus:** Windows (PowerShell). macOS/Linux work but are less validated.

---

## 1. What is NextOP?

**NextOP** bundles **Next.js + Electron** to build desktop applications for the React ecosystem.
The goal is to combine the Next.js developer experience (App Router, SSR, Server Components, API
routes, `next/image`) with Electron's native capabilities (filesystem, shell, notifications,
clipboard, secure storage, native menus, multi-window).

### The key idea: a live Next.js server, not a static export

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

### Same runtime model for dev and production

`main.ts` runs the Next server in-process for both modes:
- **dev** → `next({ dir: process.cwd(), dev: true })`
- **production** → `next({ dir: app.getAppPath(), dev: false })` against the prebuilt `.next` output.

The server binds to **`127.0.0.1` only** (never the LAN), and `loadURL` uses `127.0.0.1` to match
(avoiding IPv4/IPv6 mismatch). Port preference is `3000`, falling back to an OS-assigned free port
on `EADDRINUSE` (race-free — the server binds the port itself and reports the actual one).

---

## 2. Architecture

```
┌─────────────────────────── Electron Main Process ───────────────────────────┐
│                                                                              │
│  app.whenReady()                                                             │
│    ├─ new BrowserWindow({ contextIsolation, sandbox, nodeIntegration:false })│
│    ├─ registerNextOP(mainWindow, options)   ← from "nextop-app/main"         │
│    │     ├─ ipcMain handlers: fs, shell, clipboard, notification, menu,      │
│    │     │   window controls, secure-store, internal windows                 │
│    │     └─ navigation guards (will-navigate / setWindowOpenHandler)         │
│    └─ startNextServer(dir, dev) → live Next.js on 127.0.0.1:<port>           │
│                                                                              │
└───────────────▲──────────────────────────────────────────────▲─────────────┘
                │ contextBridge (preload.ts)                     │ http
                │ window.desktop / window.nextop                 │
┌───────────────┴────────────────────────────────────────────────┴────────────┐
│                       Renderer (your Next.js app)                            │
│   React hooks: useFs, useWindow, useMenu, useShell, useNotification,         │
│                useClipboard, useSecureStore                                   │
│   Components:  <Link> (nextop-app/link), <VirtualList> (nextop-app/...)      │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Renderer ↔ main bridge

- `preload.ts` exposes two globals via `contextBridge`:
  - `window.desktop` — namespaced helpers (`window`, `fs`, `menu`) + a guarded generic
    `ipcRenderer` (`send` / `on` / `invoke`).
  - `window.nextop` — `{ openExternal(url) }`.
- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` — the correct Electron
  security baseline.
- Hooks **degrade gracefully to `null` / no-op when `window.desktop` is absent** (e.g. rendered on
  the web / during SSR). Keep this pattern when extending.

---

## 3. Monorepo / package layout

npm workspaces monorepo. Two published packages plus a live test app.

| Path | Package | Role |
|------|---------|------|
| `packages/create-nextop-app` | `create-nextop-app` | CLI that scaffolds a project via `npx create-nextop-app` |
| `packages/nextop-app` | `nextop-app` | Runtime library (hooks + main-process IPC) and the `nextop` CLI |
| `test/` | — | Live example copy of the scaffolded template (uses a linked `nextop-app`) |

`packages/create-nextop-app/templates/default/` is the template the CLI copies. The scaffolded app
contains an `app/` (Next.js App Router), an `electron/` entry layer (`main.ts`, `preload.ts`,
`startNext.ts`, `types.d.ts`), `next.config.mjs` at the project root, Tailwind v4, and TypeScript.

**Stack of a freshly scaffolded app:** Next.js 16, React 19, Tailwind CSS v4, Electron 39,
TypeScript 5, electron-builder 25.

---

## 4. Getting started

### Scaffold a project

```bash
npx create-nextop-app my-app
# or with an explicit name prompt:
npx create-nextop-app
```

The CLI:
1. Copies the default template into `./my-app`.
2. Rewrites `package.json` `name` to the project directory name.
3. Runs `npm install`.

**Flags**

| Flag | Description |
|------|-------------|
| `[project-directory]` | Target directory (prompted if omitted). |
| `--link` | Runs `npm link nextop-app` **before** install to use a locally linked build of the library. Best-effort — silently continues with the registry version if no global link exists. Intended for NextOP development. |

### Run it

```bash
cd my-app
npm run dev      # nextop dev  → compiles Electron + launches the in-process Next dev server
npm run build    # nextop build → next build + Electron compile + electron-builder package
```

---

## 5. CLI (`nextop`)

Provided by the `nextop-app` package (`bin/cli.js`), exposed as the `nextop` binary.

### `nextop dev`
1. On Windows, kills any stray `electron.exe` (`taskkill /F /IM electron.exe /T`).
2. Compiles the Electron layer: `tsc -p tsconfig.json`.
3. Copies `electron/assets/**` → `dist/electron/assets`.
4. Launches `electron .` with `NODE_ENV=development`, `NEXTOP_RUNTIME=true`.

The Next server runs in dev mode (`dev: true`, `dir: cwd`) — HMR and fast refresh work.

### `nextop build`
1. Compiles the Electron layer (`tsc`) + copies assets.
2. `next build` (production `.next` output).
3. `electron-builder` → distributable package in `release/`.

**Packaging notes**
- `asar: false` — Next.js cannot read its files from inside an asar archive.
- `electron` lives in `devDependencies` (electron-builder requirement); production `node_modules`
  (including `next`) ship automatically.
- `next.config.mjs` sets `images.unoptimized: true` — the read-only package can't write the image
  optimization cache.
- On Windows, electron-builder's winCodeSign extraction needs symlink privilege → enable
  **Developer Mode** or run the terminal as **Administrator**.

---

## 6. Main-process setup — `registerNextOP`

Import from the `nextop-app/main` subpath and call it inside `app.whenReady()`, **after** the
`BrowserWindow` is created.

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

### Signature

```ts
function registerNextOP(mainWindow: BrowserWindow | null, options?: NextOPOptions): void
```

It registers every `ipcMain` handler the hooks rely on, and attaches navigation guards to the main
window and to every future `web-contents-created`.

### `NextOPOptions`

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

See [§10 Security model](#10-security-model) for the full semantics.

---

## 7. Hooks API

All hooks are imported from the package root: `import { useFs, useWindow, ... } from 'nextop-app'`.
Every hook is safe to call during SSR / on the web — it no-ops or returns `null` when
`window.desktop` is unavailable.

### `useFs()`

Sandboxed file read/write, scoped by the `fs` config in `registerNextOP`.

```ts
const { readFile, writeFile } = useFs()
```

| Member | Type | Notes |
|--------|------|-------|
| `readFile` | `(filePath: string) => Promise<string \| null>` | UTF-8. Returns `null` if desktop API absent. |
| `writeFile` | `(filePath: string, content: string) => Promise<boolean \| null>` | UTF-8. Resolves `true` on success. |

```tsx
const { readFile, writeFile } = useFs()

await writeFile('notes.txt', 'hello from NextOP')
const contents = await readFile('notes.txt')
```

Path resolution & traversal protection are governed by `fs.mode` / `fs.allowedRoots`
(see [§10](#10-security-model)). Relative paths resolve against the first `allowedRoot`.

---

### `useWindow()`

Window controls for the BrowserWindow that hosts the current renderer.

```ts
const { minimize, maximize, close, isMaximized, isAvailable } = useWindow()
```

| Member | Type | Notes |
|--------|------|-------|
| `minimize` | `() => void` | Minimizes the window. |
| `maximize` | `() => void` | Toggles maximize/unmaximize. |
| `close` | `() => void` | Closes the window. |
| `isMaximized` | `boolean` | Current maximized state (initialized on mount). |
| `isAvailable` | `boolean` | `true` when running inside the desktop shell. Use it to hide custom title-bar controls on the web. |

```tsx
const { minimize, maximize, close, isAvailable } = useWindow()

return isAvailable && (
  <div className="titlebar-controls">
    <button onClick={minimize}>—</button>
    <button onClick={maximize}>▢</button>
    <button onClick={close}>✕</button>
  </div>
)
```

---

### `useNotification()`

Native OS notifications.

```ts
const { showNotification } = useNotification()
```

| Member | Type |
|--------|------|
| `showNotification` | `(options: { title: string; body: string }) => void` |

```tsx
const { showNotification } = useNotification()
showNotification({ title: 'Done', body: 'Your export is ready.' })
```

Clicking the notification focuses/restores the main window. No-ops with a console warning if the
desktop API is missing or the OS doesn't support notifications.

---

### `useClipboard()`

Read/write the system clipboard.

```ts
const { readText, writeText } = useClipboard()
```

| Member | Type | Notes |
|--------|------|-------|
| `readText` | `({ type? }: { type?: 'selection' \| 'clipboard' }) => Promise<string>` | `type` defaults to `'clipboard'`. Returns `''` if unavailable. |
| `writeText` | `({ text, type? }: { text: string; type?: 'selection' \| 'clipboard' }) => void` | `type` defaults to `'clipboard'`. |

```tsx
const { readText, writeText } = useClipboard()

writeText({ text: 'copied!' })
const current = await readText({})
```

> `'selection'` is an X11 (Linux) concept; on Windows/macOS use `'clipboard'`.

---

### `useShell()`

Run an OS executable with an explicit argument array. Disabled by default (`shell.mode: 'none'`).

```ts
const { execute } = useShell()
```

| Member | Type |
|--------|------|
| `execute` | `(command: string, args?: string[]) => Promise<ShellResult>` |

```ts
type ShellResult = {
  success: boolean
  stdout: string
  stderr: string
  error: string | null
}
```

```tsx
const { execute } = useShell()
const result = await execute('git', ['--version'])
if (result.success) console.log(result.stdout)
```

**Security:** uses `spawn(command, args, { shell: false })` — arguments are never interpreted by a
shell, so shell injection is impossible. Whether a command runs at all depends on `shell.mode`,
`shell.allowedCommands`, and `shell.requireConsent` (see [§10](#10-security-model)). With
`requireConsent: true` (default), each call shows a native confirmation dialog.

---

### `useSecureStore()`

Encrypted key/value storage for secrets (tokens, etc.), backed by Electron `safeStorage` (OS
keychain). Values are encrypted at rest in `userData/nextop-secure-store.json`; plaintext is never
written.

```ts
const { isAvailable, setItem, getItem, removeItem, hasItem, clear } = useSecureStore()
```

| Member | Type | Notes |
|--------|------|-------|
| `isAvailable` | `() => Promise<boolean>` | Whether OS encryption is available (e.g. false if a Linux keyring is missing). |
| `setItem` | `(key: string, value: string) => Promise<boolean>` | Rejects if encryption is unavailable (won't store plaintext). |
| `getItem` | `(key: string) => Promise<string \| null>` | `null` if the key is absent. |
| `removeItem` | `(key: string) => Promise<boolean>` | |
| `hasItem` | `(key: string) => Promise<boolean>` | |
| `clear` | `() => Promise<boolean>` | Wipes the whole store. |

```tsx
const store = useSecureStore()

if (await store.isAvailable()) {
  await store.setItem('apiToken', 'secret-value')
  const token = await store.getItem('apiToken')
}
```

> This protects per-user/local secrets at rest. It does **not** make it safe to embed shared/central
> DB master credentials in app code — see [§10](#10-security-model).

---

### `useMenu()`

Set the native application menu. State-hook style (`[menu, setMenu]`).

```ts
const [menu, setMenu] = useMenu()
```

- `menu: NextopAppMenuItem[]` — current menu template.
- `setMenu: (next: NextopAppMenuItem[] | (prev => NextopAppMenuItem[])) => void` — set/update it.

```ts
type NextopAppMenuItem = {
  label?: string
  type?: 'normal' | 'separator' | 'submenu' | 'checkbox' | 'radio'
  click?: () => void
  role?: 'undo' | 'redo' | 'cut' | 'copy' | 'paste' | 'pasteandmatchstyle' | 'selectall'
       | 'delete' | 'minimize' | 'close' | 'quit' | 'reload' | 'forcereload' | 'toggledevtools'
       | 'resetzoom' | 'zoomin' | 'zoomout' | 'togglefullscreen' | 'window' | 'help' | 'about'
       | 'services' | 'hide' | 'hideothers' | 'unhide' | 'showhelp' | 'front'
  accelerator?: string
  submenu?: NextopAppMenuItem[]
  enabled?: boolean
  visible?: boolean
  checked?: boolean
  id?: string
  toolTip?: string
  registerAccelerator?: boolean
  sublabel?: string
  icon?: string
}
```

```tsx
const [, setMenu] = useMenu()

setMenu([
  {
    label: 'File',
    submenu: [
      { label: 'New',  accelerator: 'CmdOrCtrl+N', click: () => {} },
      { type: 'separator' },
      { role: 'quit' },
    ],
  },
])
```

---

## 8. Components

### `<Link>` — `nextop-app/link`

A drop-in wrapper around `next/link` that adds desktop-aware navigation.

```tsx
import Link from 'nextop-app/link'
```

**Props** = all `next/link` props **plus**:

| Prop | Type | Behavior |
|------|------|----------|
| `isExternal` | `boolean` (default `false`) | Opens `href` in the system browser via `window.nextop.openExternal`. |
| `target` | `string` | When `"_blank"`, opens `href` in a new **internal** Electron window via the `open-internal-window` IPC channel. |
| `internalOptions` | `InternalWindowOptions` | BrowserWindow options for the internal window (size, position, `webPreferences`, etc.). |
| `children`, `className`, … | — | Forwarded to `next/link`. |

```tsx
// External — opens in the user's default browser
<Link isExternal href="https://github.com/FlyingTurkman/nextop-app">GitHub</Link>

// Internal new window, sized
<Link href="/settings" target="_blank" internalOptions={{ width: 480, height: 640 }}>
  Settings
</Link>

// Normal in-app navigation (plain next/link behavior)
<Link href="/dashboard">Dashboard</Link>
```

`InternalWindowOptions` mirrors Electron's `BrowserWindowConstructorOptions` (width, height, x, y,
resizable, frame, transparent, backgroundColor, alwaysOnTop, `webPreferences`, …). Internal windows
are created with the secure baseline (`contextIsolation: true`, `nodeIntegration: false`,
`sandbox: true`) and the NextOP preload.

---

### `<VirtualList>` — `nextop-app/virtual-list`

A lightweight virtualization wrapper that only renders children currently near the viewport (via
`IntersectionObserver`, `rootMargin: 300px`). Off-screen children are replaced by a small
placeholder.

```tsx
import VirtualList from 'nextop-app/virtual-list'
```

**Props** = all `HTMLDivElement` attributes + `children`.

```tsx
<VirtualList className="h-screen overflow-auto">
  {items.map((item) => (
    <Row key={item.id} {...item} />
  ))}
</VirtualList>
```

> Best for long, simple lists. It tracks direct children via `data-index`; it does not measure or
> windowing-by-row-height, so use it where a 300px overscan placeholder is acceptable.

---

## 9. Package subpath exports

| Import | Provides |
|--------|----------|
| `nextop-app` | All renderer hooks (`useFs`, `useWindow`, `useMenu`, `useNotification`, `useShell`, `useClipboard`, `useSecureStore`) and their types. |
| `nextop-app/main` | `registerNextOP`, `NextOPOptions`, `FsOptions`, `ShellOptions`, `FsAccessMode`, `ShellAccessMode`. Main-process only. |
| `nextop-app/link` | `<Link>` component + `LinkProps`, `InternalWindowOptions`. |
| `nextop-app/virtual-list` | `<VirtualList>` component. |

`peerDependencies`: `next ^16.1.0`, `react >=18`, `react-dom >=18`.

---

## 10. Security model

Both the filesystem and shell layers are **mode-based** with **security-first defaults**.

### Filesystem — `useFs` (`fs:readFile` / `fs:writeFile`)

| `fs.mode` | Behavior |
|-----------|----------|
| `'all'` | Unrestricted — any path (`path.resolve(filePath)`). Use only in trusted apps. |
| `'allowed'` **(default)** | Every path is confined to `allowedRoots`. `isInsideRoot()` + `path.relative` block traversal (`..`). Relative paths resolve against the first root. Throws if outside all roots. |
| `'none'` | All filesystem access rejected. |

### Shell — `useShell` (`shell-execute`)

| `shell.mode` | Behavior |
|--------------|----------|
| `'all'` | Any executable. Still `spawn(cmd, args, { shell:false })` → no shell injection. |
| `'allowed'` | Only executables listed in `allowedCommands`. |
| `'none'` **(default)** | Shell fully disabled. |

- `requireConsent` (default **true**): every command shows a native Electron confirmation dialog
  before running. Payload is `{ command, args }`.

### Template defaults (secure out of the box)

```ts
registerNextOP(mainWindow, {
  fs:    { mode: 'allowed', allowedRoots: [app.getPath('userData')] },
  shell: { mode: 'none', allowedCommands: [], requireConsent: true },
})
```

### Navigation guards & sandbox

- `sandbox: true` on the main window (template) and on internally opened windows (library).
- `attachNavigationGuards`: `will-navigate` to a non-`localhost`/`127.0.0.1` origin is blocked
  (external http(s) opened in the system browser); `setWindowOpenHandler` denies all popups
  (intentional internal windows go through the `open-internal-window` IPC channel). Guards attach to
  the existing `mainWindow.webContents` and to every future `web-contents-created`.
- **CSP is intentionally not auto-applied** — a strict CSP breaks Next.js (HMR `eval`, inline
  styles). Treat it as per-app, opt-in.

### Because the Next.js backend runs on the user's machine

A built NextOP app runs a **live Next.js server** — API routes, Route Handlers, Server Components,
Server Actions, and middleware all execute server-side, in the Electron main process, on the end
user's machine. Therefore:

- The server binds to **`127.0.0.1` only** (not the LAN). Do not change this.
- **Never embed central/shared DB credentials** in app code or `.env` — the package ships readable
  (`asar: false`), so every client would hold the key. Use a remote API with per-user tokens; an
  embedded local DB (SQLite) for local data is fine.
- The localhost API has **no auth by default** and is reachable by other local processes — add your
  own auth to sensitive Route Handlers.

### IPC channel allowlist (preload)

`preload.ts` does not forward arbitrary channels. The generic `desktop.ipcRenderer` bridge validates
every `invoke`/`send`/`on` against an allowlist. User-defined channels are allowed under the
**`app:`** prefix convention. `on` returns an unsubscribe function (prevents listener leaks).

---

## 11. IPC channel reference

Framework channels handled by `registerNextOP`. (You normally use the hooks, not these directly.)
User channels should use the `app:` prefix.

| Channel | Kind | Used by | Payload → Result |
|---------|------|---------|------------------|
| `fs:readFile` | invoke | `useFs.readFile` | `(filePath)` → `string` |
| `fs:writeFile` | invoke | `useFs.writeFile` | `(filePath, content)` → `true` |
| `window:minimize` | invoke | `useWindow.minimize` | — |
| `window:maximize` | invoke | `useWindow.maximize` | toggles maximize |
| `window:close` | invoke | `useWindow.close` | — |
| `window:isMaximized` | invoke | `useWindow.isMaximized` | → `boolean` |
| `set-menu` | send | `useMenu.setMenu` | `(template)` |
| `open-external` | send | `Link` / `window.nextop.openExternal` | `(url)` |
| `show-notification` | send | `useNotification` | `({ title, body })` |
| `shell-execute` | invoke | `useShell.execute` | `({ command, args })` → `ShellResult` |
| `read-clipboard` | invoke | `useClipboard.readText` | `(type?)` → `string` |
| `write-clipboard` | send | `useClipboard.writeText` | `({ text, type })` |
| `secure-store:isAvailable` | invoke | `useSecureStore.isAvailable` | → `boolean` |
| `secure-store:set` | invoke | `useSecureStore.setItem` | `(key, value)` → `true` |
| `secure-store:get` | invoke | `useSecureStore.getItem` | `(key)` → `string \| null` |
| `secure-store:remove` | invoke | `useSecureStore.removeItem` | `(key)` → `true` |
| `secure-store:has` | invoke | `useSecureStore.hasItem` | `(key)` → `boolean` |
| `secure-store:clear` | invoke | `useSecureStore.clear` | → `true` |
| `open-internal-window` | send | `Link target="_blank"` | `(url, options?)` |

---

## 12. `window.desktop` typing

Provided globally by the package (`index.d.ts`):

```ts
interface Window {
  desktop: {
    fs?: {
      readFile: (filePath: string) => Promise<string>
      writeFile: (filePath: string, content: string) => Promise<boolean>
    }
    window?: {
      minimize(): void
      maximize(): void
      close(): void
      unmaximize(): void
      isMaximized(): Promise<boolean>
    }
    menu?: {
      menu: NextopAppMenuItem[]
      setMenu: (newMenu: NextopAppMenuItem[]) => void
    }
  }
  // also exposed by preload:
  // nextop: { openExternal: (url: string) => void }
}
```

---

## 13. FAQ / gotchas

- **Why is the bundle/runtime heavy?** Because a real Next.js server runs in-process — that's the
  feature, not a leak. You trade size for full Next.js fidelity.
- **Can I use API routes / Server Actions?** Yes — they run on the in-process server bound to
  `127.0.0.1`. Add your own auth to anything sensitive.
- **Does `next/image` work?** Yes, with `images.unoptimized: true` (set in the template) because the
  packaged app is read-only.
- **My custom title-bar buttons show on the web build.** Gate them behind `useWindow().isAvailable`.
- **`useShell` does nothing.** It's `mode: 'none'` by default. Set `shell.mode` to `'allowed'` (+
  `allowedCommands`) or `'all'` in `registerNextOP`.
- **`useSecureStore.setItem` throws.** OS encryption isn't available (e.g. no Linux keyring). Check
  `isAvailable()` first.
- **Windows packaging fails on symlink/winCodeSign.** Enable Developer Mode or run the terminal as
  Administrator.
```
