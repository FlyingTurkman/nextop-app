# Feature Ideas

Ideas for features found in comparable frameworks (Tauri, Nextron, general Electron ecosystem)
that NextOP currently lacks. Existing hooks (`useFs`, `useShell`, `useWindow`, `useMenu`,
`useNotification`, `useClipboard`, `useSecureStore`, `useDialog`, `useTray`, `useGlobalShortcut`,
`useStore`, `useSocket`) already cover a lot of ground, so this list focuses on real gaps.

Ranked by priority (impact vs. effort, most important first).

## 1. Single-instance lock — DONE

`app.requestSingleInstanceLock()`. Currently missing: launching the app twice spins up two
Next.js servers and risks a port collision. This is a real bug, not just a missing nicety, and
it's cheap to fix — top priority.

Implemented in `packages/create-nextop-app/templates/default/electron/main.ts` and
`test/electron/main.ts`: lock is requested at startup; if not obtained the app quits immediately,
otherwise a `second-instance` handler restores/focuses the existing window.

## 2. Auto-update

Integrate `electron-updater`. Near-mandatory in Electron apps; `nextop build` already uses
`electron-builder`, so wiring an updater on top is relatively cheap and high value for any app
that ships to real users.

## 3. Window state persistence — DONE

Remember window size/position across restarts. `useWindow` exists but bounds aren't persisted;
every launch resets to the default size. Low effort, expected baseline behavior.

Implemented as `loadWindowState`/`trackWindowState` exports in
`packages/nextop-app/src/main/index.ts` (JSON file in `userData`, debounced save on
resize/move/close, restores maximized state too), wired into both template `main.ts` files.

## 4. Splash screen pattern

A ready-made splash-screen template for the gap while the in-process Next.js server boots. This
directly addresses the "heaviest runtime profile" tradeoff called out in CLAUDE.md instead of
just showing a blank window. Low effort, meaningfully improves perceived quality.

## 5. Deep linking / custom protocol

`app.setAsDefaultProtocolClient` + `open-url`/`will-navigate` handling. Important for desktop
OAuth callback flows (e.g. next-auth desktop login). Medium effort, unlocks a whole category of
auth use cases that are currently hard to build.

## 6. `useTheme` hook — DONE

Sync with Electron's `nativeTheme` and bridge `prefers-color-scheme` to the renderer for native
dark/light mode. Low-medium effort, common UX expectation.

Kept deliberately simple (dark/light only, no separate accent-color/full color-scheme hook — user
call). Implemented as `packages/nextop-app/src/hooks/useTheme.ts` (`isDark`, `themeSource`,
`setThemeSource`), backed by `theme:get` / `theme:setSource` IPC handlers and a `theme:updated`
push event in `packages/nextop-app/src/main/index.ts`, wired into both template `preload.ts`
allowlists.

## 7. Auto-launch / login item

`setLoginItemSettings` wrapper for "start on system boot". Medium value, low effort.

## 8. CI/CD release template

A `.github/workflows` example that runs `electron-builder` across Windows/macOS/Linux and
publishes releases. CLAUDE.md notes the packaging step isn't verified in CI; a template workflow
closes that gap for consumers too. Medium effort, improves reliability and trust in the framework.

## 9. E2E test setup

Playwright + Electron example tests under `test/`. Quality infrastructure rather than a
user-facing feature, but makes the framework itself easier to trust and maintain.

## 10. Plugin system

`registerNextOP` is currently monolithic; add an extension point for third-party hooks/handlers,
similar to Tauri's plugin architecture. Larger architectural effort, pays off as the ecosystem
grows.

## 11. IPC type-safety codegen

The preload channel allowlist is kept in sync by hand; a generated, end-to-end typed layer
between renderer and main (tRPC-like) would meaningfully improve DX. Largest effort of the list,
lowest urgency.
