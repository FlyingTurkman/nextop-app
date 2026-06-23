import { useCallback } from "react"


/**
 * Stores sensitive values like tokens/secrets encrypted in the OS keychain (safeStorage).
 * - Never writes plaintext; values are encrypted with Electron's safeStorage.
 * - Does not solve "embedding a central DB master credential" (that is unsolvable in general);
 *   what it solves is protecting per-user tokens / local secrets at rest on disk.
 * - Gracefully no-ops when window.desktop is absent (web).
 */
export function useSecureStore() {

    const isAvailable = useCallback(async (): Promise<boolean> => {
        const desktop = (window as any).desktop
        if (desktop?.ipcRenderer) {
            return await desktop.ipcRenderer.invoke('secure-store:isAvailable')
        }
        return false
    }, [])

    const setItem = useCallback(async (key: string, value: string): Promise<boolean> => {
        const desktop = (window as any).desktop
        if (desktop?.ipcRenderer) {
            return await desktop.ipcRenderer.invoke('secure-store:set', key, value)
        }
        return false
    }, [])

    const getItem = useCallback(async (key: string): Promise<string | null> => {
        const desktop = (window as any).desktop
        if (desktop?.ipcRenderer) {
            return await desktop.ipcRenderer.invoke('secure-store:get', key)
        }
        return null
    }, [])

    const removeItem = useCallback(async (key: string): Promise<boolean> => {
        const desktop = (window as any).desktop
        if (desktop?.ipcRenderer) {
            return await desktop.ipcRenderer.invoke('secure-store:remove', key)
        }
        return false
    }, [])

    const hasItem = useCallback(async (key: string): Promise<boolean> => {
        const desktop = (window as any).desktop
        if (desktop?.ipcRenderer) {
            return await desktop.ipcRenderer.invoke('secure-store:has', key)
        }
        return false
    }, [])

    const clear = useCallback(async (): Promise<boolean> => {
        const desktop = (window as any).desktop
        if (desktop?.ipcRenderer) {
            return await desktop.ipcRenderer.invoke('secure-store:clear')
        }
        return false
    }, [])

    return { isAvailable, setItem, getItem, removeItem, hasItem, clear }
}
