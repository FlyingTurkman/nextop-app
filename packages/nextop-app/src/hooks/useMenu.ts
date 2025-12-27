
import { useState, useCallback } from 'react'
import { NextopAppMenuItem } from '../../index';

export function useMenu() {


  const [menu, _setInternalMenu] = useState(() => {
    if (typeof window !== 'undefined' && window.desktop?.menu) {
      return (window.desktop.menu as any).menu || []
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
  }, [menu]);

  return [menu, setMenu] as [NextopAppMenuItem[], (newMenu: NextopAppMenuItem[]) => void]
}