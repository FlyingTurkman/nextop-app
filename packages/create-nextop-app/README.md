<div align="center">

# create-nextop-app

**The fastest way to scaffold a [NextOP](https://nextopapp.vercel.app) desktop app.**
Next.js + Electron, secure by default.

### 🌐 [nextopapp.vercel.app](https://nextopapp.vercel.app)

[![npm](https://img.shields.io/npm/v/create-nextop-app)](https://www.npmjs.com/package/create-nextop-app)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

</div>

---

**NextOP** bundles **Next.js + Electron** to build desktop applications for the React ecosystem —
running a **live Next.js server inside the Electron main process**, so every Next.js feature works
(App Router, SSR, Server Components, Route Handlers, Server Actions, `next/image`).

## Usage

```bash
npx create-nextop-app my-app
# or get prompted for the name:
npx create-nextop-app
```

The CLI:

1. Copies the default template into `./my-app`.
2. Rewrites `package.json` `name` to the project directory name.
3. Runs `npm install`.

Then:

```bash
cd my-app
npm run dev      # compiles the Electron layer + launches the in-process Next dev server
npm run build    # next build + Electron compile + electron-builder package → release/
```

## Flags

| Flag | Description |
|------|-------------|
| `[project-directory]` | Target directory (prompted if omitted). |
| `--link` | Runs `npm link nextop-app` before install to use a locally linked build of the library. Best-effort — silently continues with the registry version if no global link exists. Intended for NextOP development. |

## What you get

A freshly scaffolded app: **Next.js 16, React 19, Tailwind CSS v4, Electron 39, TypeScript 5,
electron-builder 25** — with the `nextop-app` runtime library (React hooks + main-process IPC) and a
secure-by-default Electron entry layer (`contextIsolation`, `sandbox`, navigation guards, mode-based
filesystem/shell access).

## Documentation

Full reference and guides: **[nextopapp.vercel.app](https://nextopapp.vercel.app)** ·
runtime library [`nextop-app`](https://www.npmjs.com/package/nextop-app)

## License

[MIT](LICENSE) © FlyingTurkman
