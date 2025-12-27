import { MenuItemConstructorOptions } from "./src/hooks/useMenu"

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
      }
    }
  }
}