import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const DEFAULT_SOCKET_URL = 'ws://localhost:8000'
const MIN_NODE_COUNT = 2
const MAX_NODE_COUNT = 100

function clampNodeCount(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) {
    return 10
  }

  return Math.min(MAX_NODE_COUNT, Math.max(MIN_NODE_COUNT, Math.floor(numeric)))
}

function resolveSocketUrl() {
  const configuredUrl = import.meta.env.VITE_WEBSOCKET_URL
  if (configuredUrl) {
    return configuredUrl
  }

  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const hostname = window.location.hostname || 'localhost'
    const port = import.meta.env.VITE_WEBSOCKET_PORT || '8000'
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

function matrixArrayToDistanceMatrix(matrix) {
  if (!Array.isArray(matrix)) {
    return null
  }

  const distanceMatrix = {}
  for (let i = 0; i < matrix.length; i += 1) {
    if (!Array.isArray(matrix[i])) {
      continue
    }

    distanceMatrix[i] = {}
    for (let j = 0; j < matrix[i].length; j += 1) {
      if (i === j) {
        continue
      }
      distanceMatrix[i][j] = matrix[i][j]
    }
  }

  return distanceMatrix
}

export function useServerConnection({ onDistanceMatrix, onConnected, onGoBestRoute } = {}) {
  const socketUrl = resolveSocketUrl()
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
        onConnected?.()
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
            parsed.payload?.nodes,
            parsed.payload?.matrix,
          )
          return
        }

        if (parsed.type === 'GRAPH_DISTANCE_MATRIX') {
          onDistanceMatrix?.(parsed.payload?.distanceMatrix, null, null, null, null)
          return
        }

        if (parsed.type === 'start' && Array.isArray(parsed.matrix)) {
          onDistanceMatrix?.(matrixArrayToDistanceMatrix(parsed.matrix), null, null, null, parsed.matrix)
          return
        }

        if ((parsed.type === 'global_best' || parsed.type === 'local_best') && Array.isArray(parsed.path)) {
          onGoBestRoute?.({
            path: parsed.path,
            distance: Number(parsed.distance),
          })
        }
      })
    } catch {
      setStatus('disconnected')
    }
  }, [onConnected, onDistanceMatrix, onGoBestRoute, socketUrl])

  const generateWeights = useCallback((nodeCount) => {
    const socket = socketRef.current
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return false
    }

    const safeNodeCount = clampNodeCount(nodeCount)

    socket.send(
      JSON.stringify({
        type: 'GENERATE_WEIGHTS',
        payload: { nodeCount: safeNodeCount },
      }),
    )

    return true
  }, [])

  const resetGraph = useCallback(() => {
    const socket = socketRef.current
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return false
    }

    socket.send(JSON.stringify({ type: 'RESET_GRAPH' }))
    return true
  }, [])

  const relayWeights = useCallback(() => {
    const socket = socketRef.current
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return false
    }

    socket.send(JSON.stringify({ type: 'RELAY_WEIGHTS' }))
    return true
  }, [])

  useEffect(() => {
    return () => {
      socketRef.current?.close()
      socketRef.current = null
    }
  }, [])

  return useMemo(
    () => ({
      socketUrl,
      isConnected: status === 'connected',
      isConnecting: status === 'connecting',
      status,
      connect,
      generateWeights,
      resetGraph,
      relayWeights,
    }),
    [connect, generateWeights, relayWeights, resetGraph, socketUrl, status],
  )
}
