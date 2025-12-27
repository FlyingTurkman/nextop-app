import { contextBridge, ipcRenderer, MenuItemConstructorOptions } from "electron"

contextBridge.exposeInMainWorld("desktop", {
  window: {
    minimize: () => ipcRenderer.invoke("window:minimize"),
    maximize: () => ipcRenderer.invoke("window:maximize"),
    close: () => ipcRenderer.invoke("window:close"),
    isMiximized: () => ipcRenderer.invoke("window:isMaximized")
  },
  fs: {
    readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),
    writeFile: (filePath: string, content: string) => ipcRenderer.invoke('fs:writeFile', filePath, content)
  },
  menu: {
    setMenu: (template: MenuItemConstructorOptions[]) => ipcRenderer.send('set-menu', template)
  }
})