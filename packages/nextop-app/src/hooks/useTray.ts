import { useCallback, useEffect, useRef } from "react"
import type { NextopAppMenuItem } from "./useMenu.js"

export type UseTrayOptions = {
    tooltip?: string
    menu?: NextopAppMenuItem[]
    /** Overrides the default `assets/favicon.ico` tray icon. */
    icon?: string
}

/** System tray icon + context menu. Electron only supports one tray icon per app. */
export function useTray(options: UseTrayOptions = {}) {
    const createdRef = useRef(false)

    useEffect(() => {
        const desktop = (window as any).desktop
        if (!desktop?.ipcRenderer || createdRef.current) return
        createdRef.current = true

        desktop.ipcRenderer.invoke('tray:create', {
            tooltip: options.tooltip,
            menuTemplate: options.menu,
            icon: options.icon,
        })

        return () => {
            desktop.ipcRenderer.send('tray:destroy')
            createdRef.current = false
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const setToolTip = useCallback((tooltip: string) => {
        (window as any).desktop?.ipcRenderer?.send('tray:setToolTip', tooltip)
    }, [])

    const setMenu = useCallback((menu: NextopAppMenuItem[]) => {
        (window as any).desktop?.ipcRenderer?.send('tray:setMenu', menu)
    }, [])

    const onClick = useCallback((callback: () => void) => {
        const desktop = (window as any).desktop
        if (!desktop?.ipcRenderer) return () => {}
        return desktop.ipcRenderer.on('tray:click', callback)
    }, [])

    return { setToolTip, setMenu, onClick }
}
