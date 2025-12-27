import { MenuItemConstructorOptions } from "./src/hooks/useMenu"
import type { MenuItemConstructorOptions } from 'electron'

export type NextopAppMenuItem = MenuItemConstructorOptions


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