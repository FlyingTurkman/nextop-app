import { useCallback } from "react"


/**
 * Token/secret gibi hassas değerleri OS anahtar deposunda (safeStorage) şifreli saklar.
 * - Düz metin yazmaz; değerler Electron'un safeStorage'ı ile şifrelenir.
 * - "Merkezi DB master credential'ı gömme" sorununu çözmez (o evrensel olarak çözülemez);
 *   çözdüğü şey per-user token / yerel secret'ı diskte (at-rest) korumaktır.
 * - window.desktop yoksa (web) zarifçe no-op döner.
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
