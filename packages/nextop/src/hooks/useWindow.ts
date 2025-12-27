import { useCallback, useEffect, useState } from "react"

export function useWindow() {
    const [isMaximized, setIsMaximized] = useState<boolean>(false)
    const [isAvailable, setIsAvailable] = useState<boolean>(false)

    useEffect(() => {
        if (typeof window !== 'undefined' && window.desktop?.window) {
            setIsAvailable(true)
            window.desktop.window.isMaximized?.().then(setIsMaximized)
        }
    }, [])

    const minimize = useCallback(() => {
        window.desktop?.window?.minimize?.()
    }, [])

    const maximize = useCallback(() => {
        window.desktop?.window?.maximize?.()
        setIsMaximized((prev) => !prev) 
    }, [])

    const close = useCallback(() => {
        window.desktop?.window?.close?.()
    }, [])

    return {
        minimize,
        maximize,
        close,
        isMaximized,
        isAvailable
    }
}