import { useCallback } from "react";



export type ShellResult = {
    success: boolean
    stdout: string
    stderr: string
    error: string | null
}









export function useShell() {
    const execute = useCallback( async ( command: string): Promise<ShellResult> => {
        const desktop = (window as any).desktop

        if (desktop?.ipcRenderer) {
            return await desktop.ipcRenderer.invoke('shell-execute', command)
        }

        return {
            success: false,
            stdout: '',
            stderr: '',
            error: 'NextOP: Desktop API not found.'
        }
    }, [])

    return { execute }
}