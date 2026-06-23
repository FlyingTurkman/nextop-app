import { spawn } from "child_process"
import { app, ipcMain, BrowserWindow, Menu, IpcMainEvent, MenuItemConstructorOptions, shell, Notification, clipboard, BrowserWindowConstructorOptions, dialog, WebContents, safeStorage } from "electron"
import fs from 'fs/promises'
import path from "path"
import { fileURLToPath } from "url"


const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)


/** Is the URL the app's own origin? (The Next server is always localhost/127.0.0.1.) */
function isInternalUrl(url: string): boolean {
    try {
        const { hostname } = new URL(url)
        return hostname === 'localhost' || hostname === '127.0.0.1'
    } catch {
        return false
    }
}

/**
 * Navigation guards: protect against post-XSS redirect/popup attacks.
 * - Blocks navigation outside the app origin; external http(s) links open in the system browser.
 * - Denies all popups from window.open / target=_blank (internal windows use the
 *   open-internal-window IPC channel instead).
 */
function attachNavigationGuards(contents: WebContents) {
    contents.on('will-navigate', (event, url) => {
        if (!isInternalUrl(url)) {
            event.preventDefault()
            if (/^https?:/.test(url)) {
                shell.openExternal(url)
            }
        }
    })

    contents.setWindowOpenHandler(({ url }) => {
        if (!isInternalUrl(url) && /^https?:/.test(url)) {
            shell.openExternal(url)
        }
        return { action: 'deny' }
    })
}


/** Secure store: keeps encrypted entries in a single JSON file ({ [key]: base64(encryptedBlob) }). */
async function readSecureStore(storeFile: string): Promise<Record<string, string>> {
    try {
        return JSON.parse(await fs.readFile(storeFile, "utf-8"))
    } catch {
        return {}
    }
}

async function writeSecureStore(storeFile: string, data: Record<string, string>): Promise<void> {
    await fs.writeFile(storeFile, JSON.stringify(data), "utf-8")
}


/**
 * `useShell` access mode:
 * - 'all'     → any executable is allowed. (Still uses spawn + shell:false, so shell injection is
 *               impossible; but there is a risk of running arbitrary programs.)
 * - 'allowed' → only the executables in `allowedCommands` may run.
 * - 'none'    → shell is fully disabled.
 */
export type ShellAccessMode = 'all' | 'allowed' | 'none'

/**
 * `useShell` (shell-execute) security configuration.
 */
export type ShellOptions = {
    /** Access mode. Default: 'none' (secure default). */
    mode?: ShellAccessMode
    /** Executable names allowed to run when mode === 'allowed' (e.g. ['git', 'node']). */
    allowedCommands?: string[]
    /** Show a user confirmation dialog before each command. Default: true (security priority). */
    requireConsent?: boolean
}

/**
 * `useFs` access mode:
 * - 'all'     → unrestricted: access anywhere (use only in trusted apps).
 * - 'allowed' → access only within `allowedRoots` (path-traversal protected).
 * - 'none'    → file-system access is fully disabled.
 */
export type FsAccessMode = 'all' | 'allowed' | 'none'

/**
 * `useFs` (fs:readFile / fs:writeFile) security configuration.
 */
export type FsOptions = {
    /** Access mode. Default: 'allowed'. */
    mode?: FsAccessMode
    /** Absolute root directories access is allowed within when mode === 'allowed'. */
    allowedRoots?: string[]
}

export type NextOPOptions = {
    shell?: ShellOptions
    fs?: FsOptions
}


/** Is `target` inside the `root` directory? (path-traversal-safe check) */
function isInsideRoot(target: string, root: string): boolean {
    const rel = path.relative(root, target)
    return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))
}

/**
 * Safely resolves the requested path within the allowed roots.
 * - Relative paths are resolved against the first allowed root.
 * - Absolute paths are resolved as-is.
 * Throws if the path is not inside any of the allowed roots.
 */
function resolveSafePath(filePath: string, roots: string[]): string {
    if (roots.length === 0) {
        throw new Error('NextOP: File-system access is not configured (fs.allowedRoots is empty).')
    }

    const base = roots[0]
    const resolved = path.isAbsolute(filePath)
        ? path.resolve(filePath)
        : path.resolve(base, filePath)

    if (!roots.some((root) => isInsideRoot(resolved, root))) {
        throw new Error(`NextOP: Access denied — "${filePath}" is outside the allowed directories.`)
    }

    return resolved
}

/** Resolves the requested path according to the access mode; throws if not permitted. */
function resolveFsPath(filePath: string, mode: FsAccessMode, roots: string[]): string {
    if (mode === 'none') {
        throw new Error('NextOP: File-system access is disabled (fs.mode = "none").')
    }
    if (mode === 'all') {
        return path.resolve(filePath)
    }
    return resolveSafePath(filePath, roots)
}


export function registerNextOP(mainWindow: BrowserWindow | null, options: NextOPOptions = {}) {

    const fsMode: FsAccessMode = options.fs?.mode ?? 'allowed'
    const allowedRoots = (options.fs?.allowedRoots ?? []).map((root) => path.resolve(root))
    const shellMode: ShellAccessMode = options.shell?.mode ?? 'none'
    const allowedCommands = options.shell?.allowedCommands ?? []
    const requireConsent = options.shell?.requireConsent ?? true

    // The main window is created before registerNextOP, so attach guards to it directly;
    // for windows opened later, listen to the web-contents-created event.
    if (mainWindow) {
        attachNavigationGuards(mainWindow.webContents)
    }
    app.on('web-contents-created', (_event, contents) => {
        attachNavigationGuards(contents)
    })

    ipcMain.handle("fs:readFile", async (_event, filePath: string) => {
        const safePath = resolveFsPath(filePath, fsMode, allowedRoots)
        return await fs.readFile(safePath, "utf-8")
    })

    ipcMain.handle("fs:writeFile", async (_event, filePath: string, content: string) => {
        const safePath = resolveFsPath(filePath, fsMode, allowedRoots)
        await fs.writeFile(safePath, content, "utf-8")
        return true
    })

    ipcMain.on('set-menu', (_event: IpcMainEvent, template: MenuItemConstructorOptions[]) => {
        const menu = Menu.buildFromTemplate(template)
        Menu.setApplicationMenu(menu)
    })

    // Window controls run on the window that sent the event (correct for multi-window scenarios).
    ipcMain.handle("window:minimize", (_event) => {
        BrowserWindow.fromWebContents(_event.sender)?.minimize()
    })

    ipcMain.handle("window:maximize", (_event) => {
        const win = BrowserWindow.fromWebContents(_event.sender)
        if (win) {
            win.isMaximized() ? win.unmaximize() : win.maximize()
        }
    })

    ipcMain.handle("window:close", (_event) => {
        BrowserWindow.fromWebContents(_event.sender)?.close()
    })

    ipcMain.handle("window:isMaximized", (_event) => {
        const win = BrowserWindow.fromWebContents(_event.sender)

        return win ? win.isMaximized() : false
    })

    ipcMain.on('open-external', (_event, url) => {
        if (url) {
            shell.openExternal(url)
        }
    })

    ipcMain.on('show-notification', (_event, options: { title: string, body: string }) => {

        if (!Notification.isSupported()) {
            console.log('Operating system does not support the notification system.')
            return
        }
        const notification = new Notification({
            title: options.title,
            body: options.body
        })

        notification.show()

        notification.on('failed', (event, error) => {
            console.error('Notification failed:', error)
        })

        notification.on('click', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore()
            mainWindow.show()
            mainWindow.focus()
        }
        })
    })

    ipcMain.handle('shell-execute', async (_event, payload: { command: string, args?: string[] }) => {
        const command = payload?.command
        const args = Array.isArray(payload?.args) ? payload.args : []

        if (shellMode === 'none') {
            return { success: false, stdout: '', stderr: '', error: 'NextOP: Shell access is disabled (shell.mode = "none").' }
        }

        if (typeof command !== 'string' || command.length === 0) {
            return { success: false, stdout: '', stderr: '', error: 'NextOP: Invalid command.' }
        }

        // Whitelist check in 'allowed' mode: only explicitly allowed executables may run.
        // In 'all' mode this check is skipped (injection is still prevented via spawn + shell:false).
        if (shellMode === 'allowed' && !allowedCommands.includes(command)) {
            return {
                success: false,
                stdout: '',
                stderr: '',
                error: `NextOP: "${command}" is not in the list of allowed commands.`
            }
        }

        // Optional user consent.
        if (requireConsent) {
            const win = BrowserWindow.fromWebContents(_event.sender) ?? mainWindow ?? undefined
            const fullCommand = [command, ...args].join(' ')
            const { response } = await dialog.showMessageBox(win!, {
                type: 'question',
                buttons: ['Allow', 'Deny'],
                defaultId: 1,
                cancelId: 1,
                title: 'Command execution consent',
                message: 'The app wants to run a system command:',
                detail: fullCommand
            })

            if (response !== 0) {
                return { success: false, stdout: '', stderr: '', error: 'NextOP: The user denied the command.' }
            }
        }

        // spawn + shell:false → arguments are not interpreted by a shell (injection is prevented).
        return new Promise((resolve) => {
            const child = spawn(command, args, { shell: false })
            let stdout = ''
            let stderr = ''

            child.stdout.on('data', (data) => { stdout += data.toString() })
            child.stderr.on('data', (data) => { stderr += data.toString() })

            child.on('error', (error) => {
                resolve({ success: false, stdout: stdout.trim(), stderr: stderr.trim(), error: error.message })
            })

            child.on('close', (code) => {
                resolve({
                    success: code === 0,
                    stdout: stdout.trim(),
                    stderr: stderr.trim(),
                    error: code === 0 ? null : `NextOP: Command exited with code ${code}.`
                })
            })
        })
    })

    ipcMain.on('write-clipboard', (_event, { text, type = 'clipboard' }: { text: string, type?: 'clipboard' | 'selection' }) => {
        clipboard.writeText(text, type)
    })

    ipcMain.handle('read-clipboard', (_event, selection?: 'selection' | 'clipboard') => {
        return clipboard.readText(selection ?? 'clipboard')
    })

    // Secure store (useSecureStore): stores sensitive values encrypted in the OS keychain via safeStorage.
    const secureStoreFile = path.join(app.getPath("userData"), "nextop-secure-store.json")

    ipcMain.handle('secure-store:isAvailable', () => safeStorage.isEncryptionAvailable())

    ipcMain.handle('secure-store:set', async (_event, key: string, value: string) => {
        // If encryption is unavailable (e.g. no keyring on Linux), do not write plaintext; reject explicitly.
        if (!safeStorage.isEncryptionAvailable()) {
            throw new Error('NextOP: safeStorage is unavailable on this platform; the secret was not written.')
        }
        const store = await readSecureStore(secureStoreFile)
        store[key] = safeStorage.encryptString(value).toString('base64')
        await writeSecureStore(secureStoreFile, store)
        return true
    })

    ipcMain.handle('secure-store:get', async (_event, key: string) => {
        const store = await readSecureStore(secureStoreFile)
        const blob = store[key]
        if (!blob) {
            return null
        }
        return safeStorage.decryptString(Buffer.from(blob, 'base64'))
    })

    ipcMain.handle('secure-store:remove', async (_event, key: string) => {
        const store = await readSecureStore(secureStoreFile)
        delete store[key]
        await writeSecureStore(secureStoreFile, store)
        return true
    })

    ipcMain.handle('secure-store:has', async (_event, key: string) => {
        const store = await readSecureStore(secureStoreFile)
        return Object.prototype.hasOwnProperty.call(store, key)
    })

    ipcMain.handle('secure-store:clear', async () => {
        await writeSecureStore(secureStoreFile, {})
        return true
    })

    ipcMain.on('open-internal-window', (_event, url: string, options?: BrowserWindowConstructorOptions) => {

        const { webPreferences = {}, ...rest } = options ?? {}

        const newWindow = new BrowserWindow({
            width: rest.width ?? 800,
            height: rest.height ?? 600,
            autoHideMenuBar: rest.autoHideMenuBar ?? true,
            icon: rest.icon ?? path.join(__dirname, "assets", "favicon.ico"),
            ...rest,
            webPreferences: {
                preload: path.join(__dirname, '../preload/index.mjs'),
                contextIsolation: true,
                nodeIntegration: false,
                sandbox: true,
                ...webPreferences
            }
        })

        newWindow.loadURL(url)
    })
}
