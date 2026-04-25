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
import { edgeKey } from '../lib/graph.jsx'
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

function parseMatrixValue(rawValue) {
  if (rawValue === '-') {
    return { blocked: true, distance: null }
  }

  const distance = Number(rawValue)
  if (!Number.isFinite(distance) || distance <= 0) {
    return { blocked: false, distance: null }
  }

  return { blocked: false, distance }
}

function buildEdgesFromDistanceMatrix(distanceMatrix, initialPheromone, nodes, edgeWeights = {}) {
  if (!distanceMatrix || typeof distanceMatrix !== 'object') {
    return []
  }

  const nodeIds = new Set(nodes.map((node) => String(node.id)))
  const seenEdgeIds = new Set()
  const edges = []

  for (const [from, neighbors] of Object.entries(distanceMatrix)) {
    if (!nodeIds.has(String(from)) || !neighbors || typeof neighbors !== 'object') {
      continue
    }

    for (const [to, rawDistance] of Object.entries(neighbors)) {
      if (!nodeIds.has(String(to))) {
        continue
      }

      const id = edgeKey(from, to)
      if (seenEdgeIds.has(id)) {
        continue
      }

      seenEdgeIds.add(id)
      const reverseRawDistance = distanceMatrix?.[to]?.[from]
      const current = parseMatrixValue(rawDistance)
      const reverse = parseMatrixValue(reverseRawDistance)

      const blocked = current.blocked || reverse.blocked

      const distanceCandidates = [
        current.distance,
        reverse.distance,
        Number(edgeWeights[id]),
        Number(edgeWeights[edgeKey(to, from)]),
      ]
      const distance = distanceCandidates.find(
        (value) => Number.isFinite(value) && value > 0,
      )

      if (!Number.isFinite(distance) || distance <= 0) {
        continue
      }

      const weight = Number.isFinite(Number(edgeWeights[id]))
        ? Number(edgeWeights[id])
        : distance

      edges.push({
        id,
        from,
        to,
        blocked,
        pheromone: initialPheromone,
        distance,
        weight,
      })
    }
  }

  return edges
}

export function useSwarm() {
  const workerRef = useRef(null)
  const [nodes] = useState(VILLAGES)
  const [edges, setEdges] = useState(() => cloneEdges(INITIAL_EDGES))
  const [baseEdges, setBaseEdges] = useState(() => cloneEdges(INITIAL_EDGES))
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

  const { activeTabs, publishBestRoute } = useBroadcast({
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
    const resetEdges = cloneEdges(baseEdges).map((edge) => ({
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
  }, [baseEdges, params])

  const setParameter = useCallback((key, value) => {
    setParams((current) => ({ ...current, [key]: value }))
  }, [])

  const loadDistanceMatrix = useCallback((distanceMatrix, serverParams = null, edgeWeights = {}) => {
    const mergedParams = {
      ...params,
      ...(serverParams && typeof serverParams === 'object' ? serverParams : {}),
    }

    const nextEdges = buildEdgesFromDistanceMatrix(
      distanceMatrix,
      mergedParams.initialPheromone,
      nodes,
      edgeWeights,
    )
    if (!nextEdges.length) {
      return
    }

    setParams(mergedParams)

    setBaseEdges(nextEdges)
    setEdges(nextEdges)
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
      payload: {
        edges: nextEdges,
        params: mergedParams,
      },
    })
    setIsRunning(false)
  }, [nodes, params])

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
    loadDistanceMatrix,
  }), [
    antRoutes,
    bestRoute,
    edges,
    isRunning,
    loadDistanceMatrix,
    nodes,
    params,
    reset,
    setParameter,
    start,
    stats,
    stop,
  ])
}
