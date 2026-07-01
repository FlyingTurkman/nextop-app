import { useCallback, useEffect, useRef, useState } from "react"

/**
 * Wraps the browser's native WebSocket API — no client dependency (no socket.io-client, no `ws`).
 * The renderer is a full Chromium context; contextIsolation/sandbox block Node.js APIs, not Web
 * APIs, so `WebSocket` is available as-is. Connects to any external ws:// / wss:// server.
 */

export type SocketStatus = 'idle' | 'connecting' | 'open' | 'closed' | 'error'

export type UseSocketOptions = {
    protocols?: string | string[]
    reconnect?: boolean
    reconnectInterval?: number
    maxReconnectAttempts?: number
    onOpen?: (event: Event) => void
    onClose?: (event: CloseEvent) => void
    onError?: (event: Event) => void
    onMessage?: (event: MessageEvent) => void
}

export function useSocket(url: string | null, options: UseSocketOptions = {}) {
    const {
        protocols,
        reconnect = true,
        reconnectInterval = 2000,
        maxReconnectAttempts = Infinity,
        onOpen,
        onClose,
        onError,
        onMessage,
    } = options

    const [status, setStatus] = useState<SocketStatus>('idle')
    const [lastMessage, setLastMessage] = useState<MessageEvent | null>(null)

    const socketRef = useRef<WebSocket | null>(null)
    const attemptsRef = useRef(0)
    const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const closedByUserRef = useRef(false)

    const callbacksRef = useRef({ onOpen, onClose, onError, onMessage })
    callbacksRef.current = { onOpen, onClose, onError, onMessage }

    const connect = useCallback(() => {
        if (!url) return

        closedByUserRef.current = false
        setStatus('connecting')

        const socket = new WebSocket(url, protocols)
        socketRef.current = socket

        socket.onopen = (event) => {
            attemptsRef.current = 0
            setStatus('open')
            callbacksRef.current.onOpen?.(event)
        }

        socket.onmessage = (event) => {
            setLastMessage(event)
            callbacksRef.current.onMessage?.(event)
        }

        socket.onerror = (event) => {
            setStatus('error')
            callbacksRef.current.onError?.(event)
        }

        socket.onclose = (event) => {
            setStatus('closed')
            callbacksRef.current.onClose?.(event)

            if (!closedByUserRef.current && reconnect && attemptsRef.current < maxReconnectAttempts) {
                attemptsRef.current += 1
                reconnectTimerRef.current = setTimeout(connect, reconnectInterval)
            }
        }
    }, [url, protocols, reconnect, reconnectInterval, maxReconnectAttempts])

    const disconnect = useCallback((code?: number, reason?: string) => {
        closedByUserRef.current = true
        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
        socketRef.current?.close(code, reason)
    }, [])

    const send = useCallback((data: string | Blob | BufferSource) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(data)
            return true
        }
        return false
    }, [])

    useEffect(() => {
        if (typeof window === 'undefined' || !url) return

        connect()

        return () => {
            closedByUserRef.current = true
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
            socketRef.current?.close()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [url])

    return { status, lastMessage, send, connect, disconnect }
}
