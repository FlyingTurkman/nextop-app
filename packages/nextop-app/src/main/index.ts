import { spawn } from "child_process"
import { app, ipcMain, BrowserWindow, Menu, IpcMainEvent, MenuItemConstructorOptions, shell, Notification, clipboard, BrowserWindowConstructorOptions, dialog, WebContents } from "electron"
import fs from 'fs/promises'
import path from "path"
import { fileURLToPath } from "url"


const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)


/** URL uygulamanın kendi origin'i mi? (Next sunucusu her zaman localhost/127.0.0.1.) */
function isInternalUrl(url: string): boolean {
    try {
        const { hostname } = new URL(url)
        return hostname === 'localhost' || hostname === '127.0.0.1'
    } catch {
        return false
    }
}

/**
 * Navigasyon guard'ları: XSS sonrası yönlendirme/popup saldırılarına karşı.
 * - Uygulama origin'i dışına gezinmeyi engeller; harici http(s) linkleri sistem tarayıcısında açar.
 * - window.open / target=_blank kaynaklı tüm popup'ları reddeder (dahili pencereler için
 *   open-internal-window IPC kanalı kullanılır).
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


/**
 * `useShell` erişim modu:
 * - 'all'     → her çalıştırılabilire izin verilir. (Yine de spawn + shell:false kullanıldığı için
 *               shell injection mümkün değildir; ama keyfi program çalıştırma riski vardır.)
 * - 'allowed' → yalnızca `allowedCommands` içindeki çalıştırılabilirler çalışır.
 * - 'none'    → shell tamamen kapalı.
 */
export type ShellAccessMode = 'all' | 'allowed' | 'none'

/**
 * `useShell` (shell-execute) güvenlik yapılandırması.
 */
export type ShellOptions = {
    /** Erişim modu. Varsayılan: 'none' (güvenli varsayılan). */
    mode?: ShellAccessMode
    /** mode === 'allowed' iken çalıştırılmasına izin verilen çalıştırılabilir adları (ör. ['git', 'node']). */
    allowedCommands?: string[]
    /** Her komut öncesi kullanıcı onay diyaloğu. Varsayılan: true (güvenlik önceliği). */
    requireConsent?: boolean
}

/**
 * `useFs` erişim modu:
 * - 'all'     → kısıtsız: her yere erişim (yalnızca güvenilir uygulamalarda kullanın).
 * - 'allowed' → yalnızca `allowedRoots` içindeki dizinlere erişim (path traversal korumalı).
 * - 'none'    → dosya sistemi erişimi tamamen kapalı.
 */
export type FsAccessMode = 'all' | 'allowed' | 'none'

/**
 * `useFs` (fs:readFile / fs:writeFile) güvenlik yapılandırması.
 */
export type FsOptions = {
    /** Erişim modu. Varsayılan: 'allowed'. */
    mode?: FsAccessMode
    /** mode === 'allowed' iken erişime izin verilen mutlak kök dizinler. */
    allowedRoots?: string[]
}

export type NextOPOptions = {
    shell?: ShellOptions
    fs?: FsOptions
}


/** target, root dizininin içinde mi? (path traversal'a karşı güvenli kontrol) */
function isInsideRoot(target: string, root: string): boolean {
    const rel = path.relative(root, target)
    return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))
}

/**
 * İstenen yolu izinli kökler içine güvenli biçimde çözümler.
 * - Göreli yollar ilk izinli köke göre çözümlenir.
 * - Mutlak yollar olduğu gibi çözümlenir.
 * İzinli köklerin hiçbirinin içinde değilse hata fırlatır.
 */
function resolveSafePath(filePath: string, roots: string[]): string {
    if (roots.length === 0) {
        throw new Error('NextOP: Dosya sistemi erişimi yapılandırılmadı (fs.allowedRoots boş).')
    }

    const base = roots[0]
    const resolved = path.isAbsolute(filePath)
        ? path.resolve(filePath)
        : path.resolve(base, filePath)

    if (!roots.some((root) => isInsideRoot(resolved, root))) {
        throw new Error(`NextOP: Erişim reddedildi — "${filePath}" izinli dizinlerin dışında.`)
    }

    return resolved
}

/** Erişim moduna göre istenen yolu çözümler; izin yoksa hata fırlatır. */
function resolveFsPath(filePath: string, mode: FsAccessMode, roots: string[]): string {
    if (mode === 'none') {
        throw new Error('NextOP: Dosya sistemi erişimi kapalı (fs.mode = "none").')
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

    // Ana pencere registerNextOP'tan önce oluşturulduğu için guard'ları doğrudan ona ekle;
    // sonradan açılan pencereler için web-contents-created event'ini dinle.
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

    // Pencere kontrolleri olayı gönderen pencerede çalışır (çok pencereli senaryolar için doğru).
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
            console.log('Operation system is not supporting notification system.')
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
            return { success: false, stdout: '', stderr: '', error: 'NextOP: Shell erişimi kapalı (shell.mode = "none").' }
        }

        if (typeof command !== 'string' || command.length === 0) {
            return { success: false, stdout: '', stderr: '', error: 'NextOP: Geçersiz komut.' }
        }

        // 'allowed' modunda whitelist kontrolü: yalnızca açıkça izin verilen çalıştırılabilirler çalışır.
        // 'all' modunda bu kontrol atlanır (yine de spawn + shell:false ile injection engellidir).
        if (shellMode === 'allowed' && !allowedCommands.includes(command)) {
            return {
                success: false,
                stdout: '',
                stderr: '',
                error: `NextOP: "${command}" izinli komutlar listesinde değil.`
            }
        }

        // Opsiyonel kullanıcı onayı.
        if (requireConsent) {
            const win = BrowserWindow.fromWebContents(_event.sender) ?? mainWindow ?? undefined
            const fullCommand = [command, ...args].join(' ')
            const { response } = await dialog.showMessageBox(win!, {
                type: 'question',
                buttons: ['İzin Ver', 'Reddet'],
                defaultId: 1,
                cancelId: 1,
                title: 'Komut çalıştırma onayı',
                message: 'Uygulama bir sistem komutu çalıştırmak istiyor:',
                detail: fullCommand
            })

            if (response !== 0) {
                return { success: false, stdout: '', stderr: '', error: 'NextOP: Kullanıcı komutu reddetti.' }
            }
        }

        // spawn + shell:false → argümanlar shell tarafından yorumlanmaz (injection engellenir).
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
                    error: code === 0 ? null : `NextOP: Komut ${code} koduyla sonlandı.`
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
