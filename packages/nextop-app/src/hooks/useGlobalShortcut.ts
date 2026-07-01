import { useEffect, useRef, useState } from "react"

/**
 * Registers a system-wide keyboard shortcut (works even when the app isn't focused).
 * Pass `null` as `accelerator` to skip registering (e.g. while a setting loads).
 */
export function useGlobalShortcut(accelerator: string | null, callback: () => void) {
    const [isRegistered, setIsRegistered] = useState(false)
    const callbackRef = useRef(callback)
    callbackRef.current = callback

    useEffect(() => {
        const desktop = (window as any).desktop
        if (!desktop?.ipcRenderer || !accelerator) return

        let cancelled = false

        desktop.ipcRenderer.invoke('global-shortcut:register', accelerator).then((ok: boolean) => {
            if (!cancelled) setIsRegistered(ok)
        })

        const unsubscribe = desktop.ipcRenderer.on('global-shortcut:triggered', (fired: string) => {
            if (fired === accelerator) callbackRef.current()
        })

        return () => {
            cancelled = true
            unsubscribe()
            desktop.ipcRenderer.send('global-shortcut:unregister', accelerator)
            setIsRegistered(false)
        }
    }, [accelerator])

    return { isRegistered }
}
