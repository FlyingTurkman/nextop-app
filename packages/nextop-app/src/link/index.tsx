import NextLink, { LinkProps as NextLinkProps } from 'next/link'
import { MouseEvent, ReactNode } from 'react'






export type LinkProps = NextLinkProps & {
    isExternal?: boolean
    children?: ReactNode
    className?: string
}





export default function Link({ isExternal = false, href, onClick, children, className, ...props }: LinkProps) {
    return (
        <NextLink
        {...props}
        href={href}
        className={className}
        onClick={((e: MouseEvent<HTMLAnchorElement>) => {

            if (onClick) {
                onClick(e)
            }
            
            if (isExternal === true && typeof href === 'string') {
                (window as any).nextop?.openExternal(href)
                e.preventDefault()
            }

            
        })}
        >
            {children}
        </NextLink>
    )
}