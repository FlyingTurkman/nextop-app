import { app, BrowserWindow } from "electron"
import path from "path"
import { startNextServer } from "./startNext"
import { registerWindowHandlers } from "./window"
import { NextServerHandleType } from "./types"
import { registerNextOP } from 'nextop-app/main'


let mainWindow: BrowserWindow | null = null



let nextServer: NextServerHandleType | null = null


app.whenReady().then(async () => {
    
    nextServer = await startNextServer(
        process.cwd(),
        !app.isPackaged,
        3000
    )

    registerNextOP()

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

