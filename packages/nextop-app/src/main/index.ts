import { ipcMain, BrowserWindow, Menu, IpcMainEvent, MenuItemConstructorOptions } from "electron"
import fs from 'fs/promises'




export function registerNextOP() {
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
}

