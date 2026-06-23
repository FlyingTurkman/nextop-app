import { contextBridge, ipcRenderer, IpcRendererEvent, MenuItemConstructorOptions } from "electron"

// Renderer'ın erişebileceği IPC kanalları (allowlist). Bu listelerde olmayan hiçbir kanal geçmez.
// Kendi kanallarını eklemek için "app:" önekini kullan (ör. ipcRenderer.invoke("app:my-channel")).
// Framework kanalları bu önekte değildir; böylece kullanıcı kanalları çakışmaz ve genişletme açıktır.
const INVOKE_CHANNELS = [
  "window:minimize",
  "window:maximize",
  "window:close",
  "window:isMaximized",
  "fs:readFile",
  "fs:writeFile",
  "shell-execute",
  "read-clipboard",
  "secure-store:isAvailable",
  "secure-store:set",
  "secure-store:get",
  "secure-store:remove",
  "secure-store:has",
  "secure-store:clear"
]

const SEND_CHANNELS = [
  "set-menu",
  "open-external",
  "show-notification",
  "write-clipboard",
  "open-internal-window"
]

// Main → renderer dinlenebilecek kanallar. Framework şu an hiçbirini kullanmıyor;
// kullanıcılar "app:" önekiyle kendi kanallarını dinleyebilir.
const RECEIVE_CHANNELS: string[] = []

const USER_CHANNEL_PREFIX = "app:"

function isAllowed(channel: string, allowlist: string[]): boolean {
  return allowlist.includes(channel) || channel.startsWith(USER_CHANNEL_PREFIX)
}

contextBridge.exposeInMainWorld("desktop", {
  window: {
    minimize: () => ipcRenderer.invoke("window:minimize"),
    maximize: () => ipcRenderer.invoke("window:maximize"),
    close: () => ipcRenderer.invoke("window:close"),
    isMaximized: () => ipcRenderer.invoke("window:isMaximized")
  },
  fs: {
    readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),
    writeFile: (filePath: string, content: string) => ipcRenderer.invoke('fs:writeFile', filePath, content)
  },
  menu: {
    setMenu: (template: MenuItemConstructorOptions[]) => ipcRenderer.send('set-menu', template)
  },
  ipcRenderer: {
    send: (channel: string, ...data: any[]) => {
      if (!isAllowed(channel, SEND_CHANNELS)) {
        console.error(`NextOP: "${channel}" izinli bir send kanalı değil.`)
        return
      }
      ipcRenderer.send(channel, ...data)
    },
    on: (channel: string, func: (...args: any[]) => void) => {
      if (!isAllowed(channel, RECEIVE_CHANNELS)) {
        console.error(`NextOP: "${channel}" izinli bir dinleme (on) kanalı değil.`)
        return () => {}
      }
      const listener = (_event: IpcRendererEvent, ...args: any[]) => func(...args)
      ipcRenderer.on(channel, listener)
      // Temizlik için abonelikten çıkma fonksiyonu döndür (listener sızıntısını önler).
      return () => ipcRenderer.removeListener(channel, listener)
    },
    invoke: (channel: string, ...args: any[]) => {
      if (!isAllowed(channel, INVOKE_CHANNELS)) {
        return Promise.reject(new Error(`NextOP: "${channel}" izinli bir invoke kanalı değil.`))
      }
      return ipcRenderer.invoke(channel, ...args)
    }
  }
})

contextBridge.exposeInMainWorld('nextop', {
  openExternal: (url: string) => ipcRenderer.send('open-external', url)
})
