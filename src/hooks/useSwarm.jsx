import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ALPHA,
  ANT_COUNT,
  BETA,
  EVAPORATION_RATE,
  INITIAL_PHEROMONE,
  Q,
  STIGMERGIC_BOOST,
} from '../lib/constants.jsx'
import { INITIAL_EDGES, MAP_SIZE, VILLAGES } from '../data/villages.jsx'
import { useBroadcast } from './useBroadcast.jsx'

function createDefaultParams() {
  return {
    alpha: ALPHA,
    beta: BETA,
    evaporationRate: EVAPORATION_RATE,
    antCount: ANT_COUNT,
    q: Q,
    stigmergicBoost: STIGMERGIC_BOOST,
    initialPheromone: INITIAL_PHEROMONE,
    startNodeId: VILLAGES[0]?.id ?? null,
    destinationNodeId: VILLAGES[VILLAGES.length - 1]?.id ?? null,
  }
}

function cloneEdges(edges) {
  return edges.map((edge) => ({ ...edge }))
}

export function useSwarm() {
  const workerRef = useRef(null)
  const [nodes] = useState(VILLAGES)
  const [edges, setEdges] = useState(() => cloneEdges(INITIAL_EDGES))
  const [bestRoute, setBestRoute] = useState([])
  const [antRoutes, setAntRoutes] = useState([])
  const [stats, setStats] = useState({
    iteration: 0,
    routesExplored: 0,
    bestDistance: Number.POSITIVE_INFINITY,
    activeTabs: 1,
  })
  const [params, setParams] = useState(createDefaultParams)
  const [isRunning, setIsRunning] = useState(false)

  const syncRemoteBestRoute = useCallback((payload) => {
    if (!payload?.bestRoute?.length) {
      return
    }

    setBestRoute((current) => {
      if (!current.length) {
        return payload.bestRoute
      }
      if (Number.isFinite(payload.bestDistance)) {
        return payload.bestRoute
      }
      return current
    })

    setStats((current) => {
      const incoming = Number.isFinite(payload.bestDistance)
        ? payload.bestDistance
        : current.bestDistance
      return {
        ...current,
        bestDistance: Math.min(current.bestDistance, incoming),
      }
    })

    workerRef.current?.postMessage({ type: 'INJECT_PHEROMONES', payload })
  }, [])

  const syncRemoteBlockedEdge = useCallback((payload) => {
    if (!payload?.edgeId) {
      return
    }

    setEdges((current) =>
      current.map((edge) =>
        edge.id === payload.edgeId ? { ...edge, blocked: Boolean(payload.blocked) } : edge,
      ),
    )
    workerRef.current?.postMessage({ type: 'BLOCK_EDGE', payload })
  }, [])

  const { activeTabs, publishBestRoute, publishBlockedEdge } = useBroadcast({
    onBestRoute: syncRemoteBestRoute,
    onBlockedEdge: syncRemoteBlockedEdge,
  })

  useEffect(() => {
    setStats((current) => ({ ...current, activeTabs }))
  }, [activeTabs])

  useEffect(() => {
    const worker = new Worker(new URL('../workers/worker.js', import.meta.url), { type: 'module' })
    workerRef.current = worker

    worker.onmessage = (event) => {
      const { type, payload } = event.data ?? {}
      if (type !== 'ITERATION_UPDATE' || !payload) {
        return
      }

      setStats((current) => ({
        ...current,
        iteration: payload.iteration ?? current.iteration,
        routesExplored: payload.routesExplored ?? current.routesExplored,
        bestDistance: Number.isFinite(payload.bestDistance)
          ? payload.bestDistance
          : current.bestDistance,
      }))

      if (Array.isArray(payload.edges)) {
        setEdges(payload.edges)
      }

      if (Array.isArray(payload.antRoutes)) {
        setAntRoutes(payload.antRoutes)
      }

      if (Array.isArray(payload.bestRoute) && payload.bestRoute.length) {
        setBestRoute(payload.bestRoute)
        publishBestRoute({ bestDistance: payload.bestDistance, bestRoute: payload.bestRoute })
      }
    }

    worker.postMessage({ type: 'CONFIG', payload: { params } })

    return () => {
      worker.terminate()
      workerRef.current = null
    }
  }, [publishBestRoute])

  useEffect(() => {
    workerRef.current?.postMessage({ type: 'CONFIG', payload: { params } })
  }, [params])

  const start = useCallback(() => {
    workerRef.current?.postMessage({
      type: 'START',
      payload: { nodes, edges, params },
    })
    setIsRunning(true)
  }, [edges, nodes, params])

  const stop = useCallback(() => {
    workerRef.current?.postMessage({ type: 'STOP' })
    setIsRunning(false)
  }, [])

  const reset = useCallback(() => {
    const resetEdges = cloneEdges(INITIAL_EDGES).map((edge) => ({
      ...edge,
      blocked: false,
      pheromone: params.initialPheromone,
    }))
    setEdges(resetEdges)
    setBestRoute([])
    setAntRoutes([])
    setStats((current) => ({
      ...current,
      iteration: 0,
      routesExplored: 0,
      bestDistance: Number.POSITIVE_INFINITY,
    }))
    workerRef.current?.postMessage({
      type: 'RESET',
      payload: { edges: resetEdges, params },
    })
    setIsRunning(false)
  }, [params])

  const setParameter = useCallback((key, value) => {
    setParams((current) => ({ ...current, [key]: value }))
  }, [])

  const toggleEdge = useCallback((edgeId) => {
    setEdges((current) => {
      const next = current.map((edge) =>
        edge.id === edgeId ? { ...edge, blocked: !edge.blocked } : edge,
      )
      const changed = next.find((edge) => edge.id === edgeId)
      if (changed) {
        const payload = { edgeId, blocked: changed.blocked }
        workerRef.current?.postMessage({ type: 'BLOCK_EDGE', payload })
        publishBlockedEdge(payload)
      }
      return next
    })
  }, [publishBlockedEdge])

  return useMemo(() => ({
    nodes,
    edges,
    bestRoute,
    antRoutes,
    stats,
    params,
    mapSize: MAP_SIZE,
    isRunning,
    start,
    stop,
    reset,
    setParameter,
    toggleEdge,
  }), [antRoutes, bestRoute, edges, isRunning, nodes, params, reset, setParameter, start, stats, stop, toggleEdge])
}
