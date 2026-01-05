import { useCallback } from "react"








export type NextopNotificationOptions = {
    title: string
    body: string
}





export function useNotification() {
    const showNotification = useCallback((options: NextopNotificationOptions) => {
        const desktop = (window as any).desktop

        if (typeof window !== 'undefined' && desktop?.ipcRenderer) {
            desktop.ipcRenderer.send('show-notification', options)
        } else {
            console.warn('NextOP: Desktop API not found.')
        }
    }, [])

    return { showNotification }
}