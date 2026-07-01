import { useCallback } from "react"

/**
 * Unencrypted, JSON-persisted key/value storage (electron-store-like) for settings/preferences.
 * For secrets, use useSecureStore instead — this never encrypts.
 */
export function useStore<T = unknown>() {
    const getItem = useCallback(async (key: string): Promise<T | null> => {
        const desktop = (window as any).desktop
        if (desktop?.ipcRenderer) {
            return await desktop.ipcRenderer.invoke('store:get', key)
        }
        return null
    }, [])

    const setItem = useCallback(async (key: string, value: T): Promise<boolean> => {
        const desktop = (window as any).desktop
        if (desktop?.ipcRenderer) {
            return await desktop.ipcRenderer.invoke('store:set', key, value)
        }
        return false
    }, [])

    const removeItem = useCallback(async (key: string): Promise<boolean> => {
        const desktop = (window as any).desktop
        if (desktop?.ipcRenderer) {
            return await desktop.ipcRenderer.invoke('store:remove', key)
        }
        return false
    }, [])

    const hasItem = useCallback(async (key: string): Promise<boolean> => {
        const desktop = (window as any).desktop
        if (desktop?.ipcRenderer) {
            return await desktop.ipcRenderer.invoke('store:has', key)
        }
        return false
    }, [])

    const clear = useCallback(async (): Promise<boolean> => {
        const desktop = (window as any).desktop
        if (desktop?.ipcRenderer) {
            return await desktop.ipcRenderer.invoke('store:clear')
        }
        return false
    }, [])

    return { getItem, setItem, removeItem, hasItem, clear }
}
