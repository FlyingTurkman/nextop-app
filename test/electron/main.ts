import { app, BrowserWindow } from "electron"
import path from "path"
import { startNextServer } from "./startNext"
import { NextServerHandleType } from "./types"
import { registerNextOP, loadWindowState, trackWindowState } from 'nextop-app/main'


let mainWindow: BrowserWindow | null = null



let nextServer: NextServerHandleType | null = null


// Only one running Next.js server per app: without this, launching a second instance would
// boot a second in-process server and race for the same port.
const gotSingleInstanceLock = app.requestSingleInstanceLock()

if (!gotSingleInstanceLock) {
    app.quit()
} else {

    app.on("second-instance", () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore()
            mainWindow.focus()
        }
    })

    app.whenReady().then(async () => {

        // Restore the window size/position from the last run (falls back to the given defaults
        // on first launch or if no state was saved yet).
        const windowState = loadWindowState({ width: 1200, height: 800 })

        // Create the window hidden (show:false) and immediately: webContents/preload init runs in
        // parallel while the Next server prepares. It is shown once content is ready (ready-to-show)
        // → no white flash. backgroundColor paints the theme color instead of white on first paint.
        mainWindow = new BrowserWindow({
            width: windowState.width,
            height: windowState.height,
            x: windowState.x,
            y: windowState.y,
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

        // Applies the saved maximized state and starts persisting size/position/maximize changes.
        trackWindowState(mainWindow, windowState)

        mainWindow.once("ready-to-show", () => {
            mainWindow?.show()
        })

        // NextOP security configuration.
        // - fs.allowedRoots: useFs can only access inside these directories (path-traversal protected).
        // - shell.allowedCommands: useShell can only run the commands listed here.
        //   If the list is left empty, shell is fully disabled (secure default).
        registerNextOP(mainWindow, {
            fs: {
                // 'all' = unrestricted | 'allowed' = only allowedRoots | 'none' = disabled
                mode: "allowed",
                allowedRoots: [app.getPath("userData")]
            },
            shell: {
                // 'all' = any command | 'allowed' = only allowedCommands | 'none' = disabled
                mode: "none",
                allowedCommands: [], // used when mode is "allowed", e.g. ["git", "node"]
                requireConsent: true
            }
        })

        // Dev: Next dev server from the source directory (cwd). Production: dev:false server from the
        // packaged app directory (app.getAppPath) using the prebuilt .next output.
        // The port is chosen inside startNextServer: if 3000 is taken, the OS assigns a free port.
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
}

