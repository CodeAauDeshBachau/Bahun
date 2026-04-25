import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const DEFAULT_SOCKET_URL = 'ws://localhost:8080'

function createTabId() {
  return `tab-${Math.random().toString(36).slice(2, 10)}`
}

function resolveSocketUrl() {
  const configuredUrl = import.meta.env.VITE_WEBSOCKET_URL
  if (configuredUrl) {
    return configuredUrl
  }

  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const hostname = window.location.hostname || 'localhost'
    const port = import.meta.env.VITE_WEBSOCKET_PORT || '8080'
    return `${protocol}://${hostname}:${port}`
  }

  return DEFAULT_SOCKET_URL
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

export function useServerConnection({ onDistanceMatrix } = {}) {
  const socketUrl = resolveSocketUrl()
  const tabIdRef = useRef(createTabId())
  const socketRef = useRef(null)
  const [status, setStatus] = useState('disconnected')

  const connect = useCallback(() => {
    const current = socketRef.current
    if (
      current &&
      (current.readyState === WebSocket.OPEN || current.readyState === WebSocket.CONNECTING)
    ) {
      return
    }

    try {
      const socket = new WebSocket(socketUrl)
      socketRef.current = socket
      setStatus('connecting')

      socket.addEventListener('open', () => {
        setStatus('connected')
        socket.send(
          JSON.stringify({
            type: 'CLIENT_REGISTER',
            payload: { tabId: tabIdRef.current },
          }),
        )
        socket.send(JSON.stringify({ type: 'REQUEST_GRAPH_STATE' }))
      })

      socket.addEventListener('close', () => {
        if (socketRef.current === socket) {
          socketRef.current = null
        }
        setStatus('disconnected')
      })

      socket.addEventListener('error', () => {
        setStatus('disconnected')
      })

      socket.addEventListener('message', (event) => {
        const parsed = safeJsonParse(event.data)
        if (!parsed || typeof parsed !== 'object') {
          return
        }

        if (parsed.type === 'GRAPH_STATE') {
          onDistanceMatrix?.(
            parsed.payload?.distanceMatrix,
            parsed.payload?.params,
            parsed.payload?.edgeWeights,
          )
          return
        }

        if (parsed.type === 'GRAPH_DISTANCE_MATRIX') {
          onDistanceMatrix?.(parsed.payload?.distanceMatrix, null, null)
        }
      })
    } catch {
      setStatus('disconnected')
    }
  }, [onDistanceMatrix, socketUrl])

  useEffect(() => {
    return () => {
      socketRef.current?.close()
      socketRef.current = null
    }
  }, [])

  return useMemo(
    () => ({
      socketUrl,
      tabId: tabIdRef.current,
      isConnected: status === 'connected',
      isConnecting: status === 'connecting',
      status,
      connect,
    }),
    [connect, socketUrl, status],
  )
}
