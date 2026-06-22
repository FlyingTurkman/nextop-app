import { app, BrowserWindow } from "electron"
import path from "path"
import { startNextServer } from "./startNext"
import { registerWindowHandlers } from "./window"
import { NextServerHandleType } from "./types"
import { registerNextOP } from 'nextop-app/main'


let mainWindow: BrowserWindow | null = null



let nextServer: NextServerHandleType | null = null


app.whenReady().then(async () => {
    
    // Port, startNextServer içinde seçilir: 3000 doluysa OS boş bir port atar.
    // Gerçek port nextServer.port ile döner ve loadURL'de kullanılır.
    nextServer = await startNextServer(
        process.cwd(),
        !app.isPackaged
    )

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        icon: path.join(__dirname, "assets", "favicon.ico"),
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false
        }
    })

    mainWindow.setIcon(path.join(__dirname, "assets", "favicon.ico"))

    // NextOP güvenlik yapılandırması.
    // - fs.allowedRoots: useFs yalnızca bu dizinlerin içine erişebilir (path traversal korumalı).
    // - shell.allowedCommands: useShell yalnızca burada listelenen komutları çalıştırabilir.
    //   Liste boş bırakılırsa shell tamamen devre dışıdır (güvenli varsayılan).
    registerNextOP(mainWindow, {
        fs: {
            // 'all' = kısıtsız | 'allowed' = yalnızca allowedRoots | 'none' = kapalı
            mode: "allowed",
            allowedRoots: [app.getPath("userData")]
        },
        shell: {
            // 'all' = her komut | 'allowed' = yalnızca allowedCommands | 'none' = kapalı
            mode: "none",
            allowedCommands: [], // mode "allowed" iken kullanılır, ör. ["git", "node"]
            requireConsent: true
        }
    })

    registerWindowHandlers(mainWindow)

    await mainWindow.loadURL(`http://localhost:${nextServer.port}`)

    
})



app.on("before-quit", async () => {

    if (nextServer) {
        await nextServer.close()
    }
})

