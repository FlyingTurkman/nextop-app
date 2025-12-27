import { useCallback } from "react"





export function useFs() {


  const readFile = useCallback(async (filePath: string) => {
    if (typeof window == 'undefined' || !window.desktop?.fs) {
      return null
    }

    return await window.desktop.fs.readFile(filePath)
  }, [])
  const writeFile = useCallback(async (filePath: string, content: string) => {
    if (typeof window == 'undefined' || !window.desktop?.fs) {
      return null
    }

    return await window.desktop.fs.writeFile(filePath, content)
  }, [])

  return {
    readFile,
    writeFile
  }
}
