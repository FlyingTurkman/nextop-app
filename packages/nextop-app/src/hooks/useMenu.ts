
import { useState, useCallback } from 'react'


export type NextopAppMenuItem = {
  label?: string
  type?: 'normal' | 'separator' | 'submenu' | 'checkbox' | 'radio'
  click?: () => void
  role?: 
    | 'undo' | 'redo' | 'cut' | 'copy' | 'paste' | 'pasteandmatchstyle' | 'selectall' | 'delete' 
    | 'minimize' | 'close' | 'quit' | 'reload' | 'forcereload' | 'toggledevtools' 
    | 'resetzoom' | 'zoomin' | 'zoomout' | 'togglefullscreen' | 'window' | 'help' 
    | 'about' | 'services' | 'hide' | 'hideothers' | 'unhide' | 'showhelp' | 'front'
  accelerator?: string
  submenu?: NextopAppMenuItem[]
  enabled?: boolean
  visible?: boolean
  checked?: boolean
  id?: string
  toolTip?: string
  registerAccelerator?: boolean
  sublabel?: string
  icon?: string
}

export function useMenu(): [NextopAppMenuItem[], (newMenu: NextopAppMenuItem[] | ((prev: NextopAppMenuItem[]) => NextopAppMenuItem[])) => void] {

  const [menu, _setInternalMenu] = useState<NextopAppMenuItem[]>(() => {
    if (typeof window !== 'undefined' && (window as any).desktop?.menu) {
      return (window as any).desktop.menu.menu || []
    }
    return []
  })

  const setMenu = useCallback((newMenu: NextopAppMenuItem[] | ((prev: NextopAppMenuItem[]) => NextopAppMenuItem[])) => {
    if (typeof window !== 'undefined' && window.desktop.menu) {
      const resolvedMenu = typeof newMenu === 'function' ? newMenu(menu) : newMenu

      if (window.desktop.menu && window.desktop.menu.setMenu) {
        window.desktop?.menu?.setMenu(resolvedMenu)
        _setInternalMenu(resolvedMenu)
      }
    }
  }, [menu])

  return [
    menu, 
    setMenu
  ] as [
    NextopAppMenuItem[], 
    (value: NextopAppMenuItem[] | ((prev: NextopAppMenuItem[]) => NextopAppMenuItem[])) => void
  ]

}