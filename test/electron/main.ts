import { app, BrowserWindow } from "electron"
import path from "path"
import { startNextServer } from "./startNext"
import { NextServerHandleType } from "./types"
import { registerNextOP } from 'nextop-app/main'


let mainWindow: BrowserWindow | null = null



let nextServer: NextServerHandleType | null = null


app.whenReady().then(async () => {

    // Pencereyi gizli (show:false) ve hemen oluştur: webContents/preload init'i, Next sunucusu
    // hazırlanırken paralel çalışır. İçerik hazır olunca (ready-to-show) gösterilir → beyaz ekran
    // (flash) olmaz. backgroundColor ilk boyamada beyaz yerine tema rengini verir.
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        show: false,
        backgroundColor: "#0a0a0a",
        icon: path.join(__dirname, "assets", "favicon.ico"),
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true
        }
    })

    mainWindow.setIcon(path.join(__dirname, "assets", "favicon.ico"))

    mainWindow.once("ready-to-show", () => {
        mainWindow?.show()
    })

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

    // Dev: kaynak dizininden (cwd) Next dev sunucusu. Production: paketlenmiş app dizininden
    // (app.getAppPath) derlenmiş .next ile dev:false sunucu.
    // Port, startNextServer içinde seçilir: 3000 doluysa OS boş bir port atar.
    const dev = !app.isPackaged
    nextServer = await startNextServer(
        dev ? process.cwd() : app.getAppPath(),
        dev
    )

    await mainWindow.loadURL(`http://127.0.0.1:${nextServer.port}`)


})



app.on("before-quit", async () => {

    if (nextServer) {
        await nextServer.close()
    }
})

