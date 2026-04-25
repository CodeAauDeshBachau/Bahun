import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
} from 'd3-force'
import {
  ALPHA,
  ANT_COUNT,
  BETA,
  EVAPORATION_RATE,
  INITIAL_PHEROMONE,
  Q,
  STIGMERGIC_BOOST,
} from '../lib/constants.jsx'
import { MAP_SIZE } from '../data/villages.jsx'
import { edgeKey } from '../lib/graph.jsx'

function createDefaultParams() {
  return {
    alpha: ALPHA,
    beta: BETA,
    evaporationRate: EVAPORATION_RATE,
    antCount: ANT_COUNT,
    q: Q,
    stigmergicBoost: STIGMERGIC_BOOST,
    initialPheromone: INITIAL_PHEROMONE,
    startNodeId: null,
    destinationNodeId: null,
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
  if (!Number.isFinite(distance)) {
    return { blocked: false, distance: null }
  }

  if (distance === 0) {
    return { blocked: true, distance: null }
  }

  if (distance < 0) {
    return { blocked: false, distance: null }
  }

  return { blocked: false, distance }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function createSeededRandom(seed) {
  let state = (Math.abs(Math.floor(seed * 1009)) % 2147483647) + 1
  return () => {
    state = (state * 48271) % 2147483647
    return state / 2147483647
  }
}

function createLayoutLinks(distanceMatrix = {}, ids = []) {
  const idSet = new Set(ids.map((id) => String(id)))
  const seen = new Set()
  const links = []

  for (const [from, neighbors] of Object.entries(distanceMatrix)) {
    if (!idSet.has(String(from)) || !neighbors || typeof neighbors !== 'object') {
      continue
    }

    for (const [to, rawDistance] of Object.entries(neighbors)) {
      if (!idSet.has(String(to))) {
        continue
      }

      const key = edgeKey(from, to)
      if (seen.has(key)) {
        continue
      }

      const parsed = parseMatrixValue(rawDistance)
      if (parsed.blocked) {
        continue
      }

      seen.add(key)
      links.push({
        source: Number(from),
        target: Number(to),
      })
    }
  }

  return links
}

function createForceLayout(nodes, links, width, height) {
  if (!nodes.length) {
    return []
  }

  const padding = 44
  const simulationNodes = nodes.map((node) => ({ ...node }))
  const linkForce = forceLink(links).id((node) => node.id).distance(110).strength(0.12)
  const seededRandom = createSeededRandom(nodes.length * 17 + links.length * 31 + width + height)
  const simulation = forceSimulation(simulationNodes)
    .randomSource(seededRandom)
    .force('charge', forceManyBody().strength(-220))
    .force('link', linkForce)
    .force('center', forceCenter(width / 2, height / 2))
    .force('collision', forceCollide().radius(26).strength(0.95))
    .stop()

  const ticks = Math.max(140, Math.min(260, nodes.length * 4))
  for (let index = 0; index < ticks; index += 1) {
    simulation.tick()
  }

  return simulationNodes.map((node) => ({
    id: node.id,
    name: node.name,
    kind: node.kind,
    x: Math.round(clamp(Number(node.x), padding, width - padding)),
    y: Math.round(clamp(Number(node.y), padding, height - padding)),
  }))
}

function buildNodesFromGraphData(distanceMatrix, serverNodes) {
  const width = MAP_SIZE.width
  const height = MAP_SIZE.height

  if (Array.isArray(serverNodes) && serverNodes.length) {
    const normalized = serverNodes.map((node, index) => ({
      id: Number(node.id ?? index),
      name: node.name ?? `Node ${node.id ?? index}`,
      x: Number.isFinite(Number(node.x)) ? Number(node.x) : width / 2,
      y: Number.isFinite(Number(node.y)) ? Number(node.y) : height / 2,
      kind: node.kind ?? (Number(node.id ?? index) === 0 ? 'hospital' : 'village'),
    }))

    const links = createLayoutLinks(distanceMatrix, normalized.map((node) => node.id))
    return createForceLayout(normalized, links, width, height)
  }

  const ids = Object.keys(distanceMatrix ?? {}).map((id) => Number(id)).filter(Number.isFinite)
  if (!ids.length) {
    return []
  }

  const sortedIds = ids.sort((a, b) => a - b)
  const baseNodes = sortedIds.map((id) => ({
    id,
    name: `Node ${id}`,
    kind: id === 0 ? 'hospital' : 'village',
  }))
  const links = createLayoutLinks(distanceMatrix, sortedIds)
  return createForceLayout(baseNodes, links, width, height)
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

      if (!blocked && (!Number.isFinite(distance) || distance <= 0)) {
        continue
      }

      const weight = Number.isFinite(Number(edgeWeights[id]))
        ? Number(edgeWeights[id])
        : (blocked ? 0 : distance)

      edges.push({
        id,
        from,
        to,
        blocked,
        pheromone: initialPheromone,
        distance: blocked ? 1 : distance,
        weight,
      })
    }
  }

  return edges
}

export function useSwarm() {
  const workerRef = useRef(null)
  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])
  const [baseEdges, setBaseEdges] = useState([])
  const [bestRoute, setBestRoute] = useState([])
  const [goBestRoute, setGoBestRoute] = useState([])
  const [goBestDistance, setGoBestDistance] = useState(Number.POSITIVE_INFINITY)
  const [antRoutes, setAntRoutes] = useState([])
  const [stats, setStats] = useState({
    iteration: 0,
    routesExplored: 0,
    bestDistance: Number.POSITIVE_INFINITY,
  })
  const [params, setParams] = useState(createDefaultParams)
  const [isRunning, setIsRunning] = useState(false)

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
      }
    }

    worker.postMessage({ type: 'CONFIG', payload: { params } })

    return () => {
      worker.terminate()
      workerRef.current = null
    }
  }, [])

  useEffect(() => {
    workerRef.current?.postMessage({ type: 'CONFIG', payload: { params } })
  }, [params])

  const start = useCallback(() => {
    if (!nodes.length || !edges.length) {
      return
    }

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
      blocked: Boolean(edge.blocked),
      pheromone: params.initialPheromone,
    }))
    setEdges(resetEdges)
    setBestRoute([])
    setGoBestRoute([])
    setGoBestDistance(Number.POSITIVE_INFINITY)
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

  const clearGraph = useCallback(() => {
    workerRef.current?.postMessage({ type: 'STOP' })
    setNodes([])
    setBaseEdges([])
    setEdges([])
    setBestRoute([])
    setGoBestRoute([])
    setGoBestDistance(Number.POSITIVE_INFINITY)
    setAntRoutes([])
    setStats((current) => ({
      ...current,
      iteration: 0,
      routesExplored: 0,
      bestDistance: Number.POSITIVE_INFINITY,
    }))
    setIsRunning(false)
  }, [])

  const loadDistanceMatrix = useCallback((
    distanceMatrix,
    serverParams = null,
    edgeWeights = {},
    serverNodes = null,
  ) => {
    if (!distanceMatrix || typeof distanceMatrix !== 'object') {
      clearGraph()
      return
    }

    const nextNodes = buildNodesFromGraphData(distanceMatrix, serverNodes)
    if (!nextNodes.length) {
      clearGraph()
      return
    }

    const mergedParams = {
      ...params,
      ...(serverParams && typeof serverParams === 'object' ? serverParams : {}),
    }

    const nextEdges = buildEdgesFromDistanceMatrix(
      distanceMatrix,
      mergedParams.initialPheromone,
      nextNodes,
      edgeWeights,
    )
    if (!nextEdges.length) {
      return
    }

    setNodes(nextNodes)
    setParams(mergedParams)

    setBaseEdges(nextEdges)
    setEdges(nextEdges)
    setBestRoute([])
    setGoBestRoute([])
    setGoBestDistance(Number.POSITIVE_INFINITY)
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
  }, [clearGraph, params])

  const applyGoBestRoute = useCallback((payload) => {
    if (!payload?.path?.length) {
      return
    }

    setGoBestRoute(payload.path)
    setGoBestDistance(Number.isFinite(payload.distance) ? payload.distance : Number.POSITIVE_INFINITY)
  }, [])

  return useMemo(() => ({
    nodes,
    edges,
    bestRoute,
    goBestRoute,
    goBestDistance,
    antRoutes,
    stats,
    params,
    mapSize: MAP_SIZE,
    isRunning,
    start,
    stop,
    reset,
    setParameter,
    clearGraph,
    loadDistanceMatrix,
    applyGoBestRoute,
  }), [
    antRoutes,
    bestRoute,
    edges,
    applyGoBestRoute,
    isRunning,
    loadDistanceMatrix,
    nodes,
    goBestDistance,
    goBestRoute,
    params,
    reset,
    setParameter,
    clearGraph,
    start,
    stats,
    stop,
  ])
}
