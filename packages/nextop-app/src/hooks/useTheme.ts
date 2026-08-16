import { useCallback, useEffect, useState } from "react"

export type ThemeSource = "system" | "light" | "dark"

type ThemeState = {
    shouldUseDarkColors: boolean
    themeSource: ThemeSource
}

/** Dark/light mode only, synced with Electron's nativeTheme (OS theme changes included live). */
export function useTheme() {
    const [isDark, setIsDark] = useState(false)
    const [themeSource, setThemeSourceState] = useState<ThemeSource>("system")
    const [isAvailable, setIsAvailable] = useState(false)

    useEffect(() => {
        const desktop = (window as any).desktop
        if (!desktop?.ipcRenderer) return

        setIsAvailable(true)

        desktop.ipcRenderer.invoke('theme:get').then((state: ThemeState) => {
            setIsDark(state.shouldUseDarkColors)
            setThemeSourceState(state.themeSource)
        })

        const unsubscribe = desktop.ipcRenderer.on('theme:updated', (state: ThemeState) => {
            setIsDark(state.shouldUseDarkColors)
            setThemeSourceState(state.themeSource)
        })

        return () => unsubscribe?.()
    }, [])

    const setThemeSource = useCallback((source: ThemeSource) => {
        const desktop = (window as any).desktop
        if (!desktop?.ipcRenderer) return
        desktop.ipcRenderer.invoke('theme:setSource', source).then((shouldUseDarkColors: boolean) => {
            setIsDark(shouldUseDarkColors)
            setThemeSourceState(source)
        })
    }, [])

    return { isDark, themeSource, setThemeSource, isAvailable }
}
