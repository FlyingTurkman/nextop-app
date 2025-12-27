import { BrowserWindow, ipcMain } from "electron"

export function registerWindowHandlers(win: BrowserWindow) {
  ipcMain.handle("window:minimize", () => win.minimize())

  ipcMain.handle("window:maximize", () => {
    win.isMaximized() ? win.unmaximize() : win.maximize()
  })

  ipcMain.handle("window:close", () => win.close())
}