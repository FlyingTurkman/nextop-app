import { useCallback } from "react"

export type NextopDialogFilter = { name: string; extensions: string[] }

export type NextopOpenDialogProperty =
    | 'openFile' | 'openDirectory' | 'multiSelections' | 'showHiddenFiles'
    | 'createDirectory' | 'promptToCreate' | 'noResolveAliases'
    | 'treatPackageAsDirectory' | 'dontAddToRecent'

export type NextopOpenDialogOptions = {
    title?: string
    defaultPath?: string
    filters?: NextopDialogFilter[]
    properties?: NextopOpenDialogProperty[]
}

export type NextopSaveDialogOptions = {
    title?: string
    defaultPath?: string
    filters?: NextopDialogFilter[]
}

/** Native open/save dialogs. Picked paths still go through useFs's own security mode when read/written. */
export function useDialog() {
    const showOpenDialog = useCallback(async (options?: NextopOpenDialogOptions): Promise<string[] | null> => {
        const desktop = (window as any).desktop
        if (desktop?.ipcRenderer) {
            return await desktop.ipcRenderer.invoke('dialog:showOpenDialog', options)
        }
        return null
    }, [])

    const showSaveDialog = useCallback(async (options?: NextopSaveDialogOptions): Promise<string | null> => {
        const desktop = (window as any).desktop
        if (desktop?.ipcRenderer) {
            return await desktop.ipcRenderer.invoke('dialog:showSaveDialog', options)
        }
        return null
    }, [])

    return { showOpenDialog, showSaveDialog }
}
