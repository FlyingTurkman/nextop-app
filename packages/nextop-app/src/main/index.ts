import { exec } from "child_process"
import { ipcMain, BrowserWindow, Menu, IpcMainEvent, MenuItemConstructorOptions, shell, Notification, clipboard, BrowserWindowConstructorOptions } from "electron"
import fs from 'fs/promises'
import path from "path"
import { fileURLToPath } from "url"


const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export function registerNextOP(mainWindow: BrowserWindow | null) {
    ipcMain.handle("fs:readFile", async (_event, filePath: string) => {
        return await fs.readFile(filePath, "utf-8")
    })

    ipcMain.handle("fs:writeFile", async (_event, filePath: string, content: string) => {
        await fs.writeFile(filePath, content, "utf-8")
        return true
    })

    ipcMain.on('set-menu', (_event: IpcMainEvent, template: MenuItemConstructorOptions[]) => {
        const menu = Menu.buildFromTemplate(template)
        Menu.setApplicationMenu(menu)
    })

    ipcMain.handle("window:isMaximized", (_event) => {
        const win = BrowserWindow.fromWebContents(_event.sender)

        return win ? win.isMaximizable() : false
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

    ipcMain.handle('shell-execute', async (_event, command: string) => {
        return new Promise((resolve) => {
            exec(command, (error, stdout, stderr) => {
                resolve({
                    success: !error,
                    stdout: stdout.trim(),
                    stderr: stderr.trim(),
                    error: error? error.message : null
                })
            })
        })
    })

    ipcMain.on('write-clipboard', (_event, { text, type = 'clipboard' }: { text: string, type?: 'clipboard' | 'selection' }) => {
        clipboard.writeText(text, type)
    })

    ipcMain.handle('read-clipboard', (_event, selection?: 'selection' | 'clipboard') => {

        console.log('handle')
        return clipboard.readText(selection ?? 'clipboard')
    })

    ipcMain.on('open-internal-window', (_event, url: string, options?: BrowserWindowConstructorOptions) => {

        console.log('opt', options)
        
        const { webPreferences = {}, ...rest } = options ?? {}

        

        const newWindow = new BrowserWindow({
            width: rest.width ?? 800,
            height: rest.height ?? 600,
            autoHideMenuBar: rest.autoHideMenuBar ?? true,
            icon: rest.icon ?? path.join(__dirname, "favicon.ico"),
            ...rest, 
            webPreferences: {
                preload: path.join(__dirname, '../preload/index.mjs'), 
                contextIsolation: true,
                nodeIntegration: false,
                ...webPreferences 
            }
        })

        newWindow.loadURL(url)
    })
}

