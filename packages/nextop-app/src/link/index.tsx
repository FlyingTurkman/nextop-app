import NextLink, { LinkProps as NextLinkProps } from 'next/link'
import { MouseEvent, ReactNode } from 'react'

type InternalWebPreferences = {
    accessibleTitle?: string
    additionalArguments?: string[]
    allowRunningInsecureContent?: boolean
    autoplayPolicy?: ('no-user-gesture-required' | 'user-gesture-required' | 'document-user-activation-required')
    backgroundThrottling?: boolean
    contextIsolation?: boolean
    defaultEncoding?: string
    //defaultFontFamily?: DefaultFontFamily;
    defaultFontSize?: number
    defaultMonospaceFontSize?: number
    devTools?: boolean
    disableBlinkFeatures?: string
    disableDialogs?: boolean
    disableHtmlFullscreenWindowResize?: boolean
    enableDeprecatedPaste?: boolean
    enablePreferredSizeMode?: boolean
    enableWebSQL?: boolean
    experimentalFeatures?: boolean
    imageAnimationPolicy?: ('animate' | 'animateOnce' | 'noAnimation')
    images?: boolean
    javascript?: boolean
    minimumFontSize?: number
    navigateOnDragDrop?: boolean
    nodeIntegration?: boolean
    nodeIntegrationInSubFrames?: boolean
    nodeIntegrationInWorker?: boolean
    //offscreen?: (Offscreen) | (boolean)
    partition?: string
    plugins?: boolean
    preload?: string
    safeDialogs?: boolean
    safeDialogsMessage?: string
    sandbox?: boolean
    scrollBounce?: boolean
    //session?: Session
    spellcheck?: boolean
    textAreasAreResizable?: boolean
    transparent?: boolean
    v8CacheOptions?: ('none' | 'code' | 'bypassHeatCheck' | 'bypassHeatCheckAndEagerCompile')
    webgl?: boolean
    webSecurity?: boolean
    webviewTag?: boolean
    zoomFactor?: number
}

export type InternalWindowOptions = {
    width?: number
    height?: number
    x?: number
    y?: number
    useContentSize?: boolean
    center?: boolean
    minWidth?: number
    minHeight?: number
    maxWidth?: number
    maxHeight?: number
    resizable?: boolean
    movable?: boolean
    minimizable?: boolean
    maximizable?: boolean
    closable?: boolean
    focusable?: boolean
    alwaysOnTop?: boolean
    fullscreen?: boolean
    fullscreenable?: boolean
    simpleFullscreen?: boolean
    skipTaskbar?: boolean
    title?: string
    icon?: string
    frame?: boolean
    autoHideMenuBar?: boolean
    backgroundColor?: string
    hasShadow?: boolean
    opacity?: number
    transparent?: boolean
    webPreferences?: InternalWebPreferences
}


export type LinkProps = NextLinkProps & {
    isExternal?: boolean
    children?: ReactNode
    className?: string
    target?: string
    internalOptions?: InternalWindowOptions
}





export default function Link({ isExternal = false, href, onClick, children, className, target, internalOptions, ...props }: LinkProps) {
    return (
        <NextLink
        {...props}
        href={href}
        className={className}
        onClick={((e: MouseEvent<HTMLAnchorElement>) => {

            const desktop = (window as any).desktop
            if (onClick) {
                onClick(e)
            }
            
            if (isExternal === true && typeof href === 'string') {
                (window as any).nextop?.openExternal(href)
                e.preventDefault()
            } else if (target == '_blank') {
                desktop.ipcRenderer.send('open-internal-window', href, internalOptions)
                e.preventDefault()
            }
            
        })}
        >
            {children}
        </NextLink>
    )
}