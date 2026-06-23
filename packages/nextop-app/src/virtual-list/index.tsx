'use client'

import { Children, HTMLAttributes, ReactNode, useEffect, useRef, useState } from "react"

type VirtualListProps = HTMLAttributes<HTMLDivElement> & {
    children?: ReactNode
}

/**
 * A simple virtual list that does not render off-screen children.
 * Tracks elements entering/leaving the viewport with IntersectionObserver; while not visible,
 * it leaves a small placeholder (minHeight) instead of the element.
 */
export default function VirtualList({ children, ...props }: VirtualListProps) {
    const [visibleElements, setVisibleElements] = useState<Set<number>>(new Set())
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            setVisibleElements((prev) => {
                const next = new Set(prev)
                entries.forEach((entry) => {
                    const index = Number((entry.target as HTMLElement).dataset.index)
                    if (entry.isIntersecting) {
                        next.add(index)
                    } else {
                        next.delete(index)
                    }
                })
                return next
            })
        }, {
            root: containerRef.current,
            rootMargin: "300px 0px"
        })

        const currentContainer = containerRef.current
        if (currentContainer) {
            const childNodes = currentContainer.querySelectorAll(':scope > [data-index]')
            childNodes.forEach((node) => observer.observe(node))
        }

        return () => observer.disconnect()
    }, [children])

    return (
        <div ref={containerRef} {...props}>
            {Children.map(children, (child, index) => {
                const isVisible = visibleElements.has(index)
                return (
                    <div
                        key={index}
                        data-index={index}
                        style={{ minHeight: isVisible ? 'auto' : '30px' }}
                    >
                        {isVisible ? child : null}
                    </div>
                )
            })}
        </div>
    )
}
