import { app, BrowserWindow, ipcMain, IpcMainEvent, Menu, MenuItemConstructorOptions, Notification, pushNotifications } from "electron"
import path from "path"
import { startNextServer } from "./startNext"
import { registerWindowHandlers } from "./window"
import fs from 'fs/promises'
import { NextServerHandleType } from "./types"



let mainWindow: BrowserWindow | null = null



let nextServer: NextServerHandleType | null = null


app.whenReady().then(async () => {
    
    nextServer = await startNextServer(
        process.cwd(),
        !app.isPackaged,
        5005
    )

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        icon: path.join(__dirname, "favicon.ico"),
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false
        }
    })

    mainWindow.setIcon(path.join(__dirname, 'assets', 'favicon.ico'))

    registerWindowHandlers(mainWindow)

    await mainWindow.loadURL(`http://localhost:${nextServer.port}`)

    
})



app.on("before-quit", async () => {

    if (nextServer) {
        await nextServer.close()
    }
})

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
} )