import { useCallback } from "react";












export function useClipboard() {

    const readText = useCallback(async ({ type = 'clipboard' }: { type?: 'selection' | 'clipboard' }) => {
        
        const desktop = (window as any).desktop

        if (desktop?.ipcRenderer) {
            return await desktop.ipcRenderer.invoke('read-clipboard', type)
        }

        return ''
    }, [])

    const writeText = useCallback(({ text, type = 'clipboard' }: { text: string, type?: 'selection' | 'clipboard' }) => {
        const desktop = (window as any).desktop

        if (desktop?.ipcRenderer) {
            desktop.ipcRenderer.send('write-clipboard', { text, type })
        }
    }, [])

    return { readText, writeText }
}