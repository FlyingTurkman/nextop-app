import { contextBridge, ipcRenderer, IpcRendererEvent, MenuItemConstructorOptions } from "electron"

// IPC channels the renderer may access (allowlist). Any channel not in these lists is blocked.
// To add your own channels, use the "app:" prefix (e.g. ipcRenderer.invoke("app:my-channel")).
// Framework channels do not use this prefix, so user channels never collide and stay extensible.
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
  "secure-store:clear",
  "dialog:showOpenDialog",
  "dialog:showSaveDialog",
  "tray:create",
  "global-shortcut:register",
  "store:get",
  "store:set",
  "store:remove",
  "store:has",
  "store:clear",
  "theme:get",
  "theme:setSource"
]

const SEND_CHANNELS = [
  "set-menu",
  "open-external",
  "show-notification",
  "write-clipboard",
  "open-internal-window",
  "tray:destroy",
  "tray:setToolTip",
  "tray:setMenu",
  "global-shortcut:unregister"
]

// Channels that can be listened to (main → renderer).
const RECEIVE_CHANNELS: string[] = [
  "tray:click",
  "global-shortcut:triggered",
  "theme:updated"
]

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
        console.error(`NextOP: "${channel}" is not an allowed send channel.`)
        return
      }
      ipcRenderer.send(channel, ...data)
    },
    on: (channel: string, func: (...args: any[]) => void) => {
      if (!isAllowed(channel, RECEIVE_CHANNELS)) {
        console.error(`NextOP: "${channel}" is not an allowed listen (on) channel.`)
        return () => {}
      }
      const listener = (_event: IpcRendererEvent, ...args: any[]) => func(...args)
      ipcRenderer.on(channel, listener)
      // Return an unsubscribe function for cleanup (prevents listener leaks).
      return () => ipcRenderer.removeListener(channel, listener)
    },
    invoke: (channel: string, ...args: any[]) => {
      if (!isAllowed(channel, INVOKE_CHANNELS)) {
        return Promise.reject(new Error(`NextOP: "${channel}" is not an allowed invoke channel.`))
      }
      return ipcRenderer.invoke(channel, ...args)
    }
  }
})

contextBridge.exposeInMainWorld('nextop', {
  openExternal: (url: string) => ipcRenderer.send('open-external', url)
})
