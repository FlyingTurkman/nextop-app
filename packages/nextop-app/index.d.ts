import type { MenuItemConstructorOptions } from 'electron'



declare global {
  interface Window {
    desktop: {
      fs?: {
        readFile: (filePath: string) => Promise<string>
        writeFile: (filePath: string, content: string) => Promise<boolean>
      },
      window?: {
        minimize(): void
        maximize(): void
        close(): void
        unmaximize(): void
        isMaximized(): Promise<boolean>
      },
      menu?: {
        menu: NextopAppMenuItem[]
        setMenu: (newMenu: NextopAppMenuItem[]) => void
      }
    }
  }
}