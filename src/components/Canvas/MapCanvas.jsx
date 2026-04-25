import { useEffect, useMemo, useRef, useState } from 'react'
import { select, zoom, zoomIdentity } from 'd3'
import { edgeKey } from '../../lib/graph.jsx'
import { ANT_ROUTE_COLORS } from '../../lib/constants.jsx'

function getDensityProfile(nodeCount) {
  if (nodeCount <= 25) {
    return {
      visibleEdgesPerNode: Number.POSITIVE_INFINITY,
      nodeLabelStep: 1,
      maxAntRoutesToDraw: Number.POSITIVE_INFINITY,
      showRouteEdgeLabels: true,
      baseEdgeAlpha: 0.75,
      edgeLineWidth: 2,
    }
  }

  if (nodeCount <= 45) {
    return {
      visibleEdgesPerNode: 4,
      nodeLabelStep: 2,
      maxAntRoutesToDraw: 4,
      showRouteEdgeLabels: true,
      baseEdgeAlpha: 0.42,
      edgeLineWidth: 1.6,
    }
  }

  if (nodeCount <= 70) {
    return {
      visibleEdgesPerNode: 2,
      nodeLabelStep: 4,
      maxAntRoutesToDraw: 1,
      showRouteEdgeLabels: false,
      baseEdgeAlpha: 0.3,
      edgeLineWidth: 1.3,
    }
  }

  return {
    visibleEdgesPerNode: 1,
    nodeLabelStep: 999,
    maxAntRoutesToDraw: 0,
    showRouteEdgeLabels: false,
    baseEdgeAlpha: 0.2,
    edgeLineWidth: 1.1,
  }
}

function buildVisibleEdgeSet(edges, nodeMap, profile, specialEdgeIds) {
  if (profile.visibleEdgesPerNode === Number.POSITIVE_INFINITY) {
    return new Set(edges.map((edge) => edge.id))
  }

  const visibleEdgeIds = new Set(specialEdgeIds)
  const edgesByNode = new Map(Object.keys(nodeMap).map((id) => [Number(id), []]))

  for (const edge of edges) {
    if (edge.blocked) {
      visibleEdgeIds.add(edge.id)
    }

    edgesByNode.get(Number(edge.from))?.push(edge)
    edgesByNode.get(Number(edge.to))?.push(edge)
  }

  for (const list of edgesByNode.values()) {
    list
      .slice()
      .sort((left, right) => Number(left.distance) - Number(right.distance))
      .slice(0, profile.visibleEdgesPerNode)
      .forEach((edge) => visibleEdgeIds.add(edge.id))
  }

  return visibleEdgeIds
}

function edgePath(from, to) {
  return `M ${from.x} ${from.y} L ${to.x} ${to.y}`
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

export function MapCanvas({
  nodes,
  edges,
  bestRoute,
  goBestRoute = [],
  antRoutes = [],
  startNodeId,
  destinationNodeId,
  mapSize,
}) {
  const svgRef = useRef(null)
  const expandedSvgRef = useRef(null)
  const [hoveredEdgeId, setHoveredEdgeId] = useState(null)
  const [hoveredExpandedEdgeId, setHoveredExpandedEdgeId] = useState(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [mainTransform, setMainTransform] = useState(zoomIdentity)
  const [expandedTransform, setExpandedTransform] = useState(zoomIdentity)
  const [positionOverrides, setPositionOverrides] = useState({})
  const [draggingNode, setDraggingNode] = useState(null)
  const dragMovedRef = useRef(false)
  const suppressExpandClickRef = useRef(false)

  useEffect(() => {
    setPositionOverrides({})
  }, [nodes])

  const displayNodes = useMemo(() => nodes.map((node) => {
    const override = positionOverrides[node.id]
    if (!override) {
      return node
    }

    return {
      ...node,
      x: override.x,
      y: override.y,
    }
  }), [nodes, positionOverrides])

  const nodeMap = useMemo(
    () => Object.fromEntries(displayNodes.map((node) => [node.id, node])),
    [displayNodes],
  )
  const density = useMemo(() => getDensityProfile(nodes.length), [nodes.length])
  const isDenseGraph = nodes.length > 45

  const bestRouteEdges = useMemo(() => {
    const ids = new Set()
    for (let index = 0; index < bestRoute.length - 1; index += 1) {
      ids.add(edgeKey(bestRoute[index], bestRoute[index + 1]))
    }
    return ids
  }, [bestRoute])

  const goBestRouteEdges = useMemo(() => {
    const ids = new Set()
    for (let index = 0; index < goBestRoute.length - 1; index += 1) {
      ids.add(edgeKey(goBestRoute[index], goBestRoute[index + 1]))
    }
    return ids
  }, [goBestRoute])

  const effectiveDestinationNodeId = useMemo(
    () => (goBestRoute.length > 0 ? goBestRoute[goBestRoute.length - 1] : null),
    [goBestRoute],
  )

  const routeNodeIds = useMemo(() => new Set([
    ...bestRoute,
    ...goBestRoute,
    startNodeId,
    effectiveDestinationNodeId,
  ].filter((value) => value !== null && value !== undefined)), [bestRoute, effectiveDestinationNodeId, goBestRoute, startNodeId])

  const visibleEdges = useMemo(() => {
    const specialEdgeIds = new Set([
      ...bestRouteEdges,
      ...goBestRouteEdges,
      hoveredEdgeId,
      hoveredExpandedEdgeId,
    ].filter(Boolean))
    const visibleIds = buildVisibleEdgeSet(edges, nodeMap, density, specialEdgeIds)
    return edges.filter((edge) => visibleIds.has(edge.id))
  }, [bestRouteEdges, density, edges, goBestRouteEdges, hoveredEdgeId, hoveredExpandedEdgeId, nodeMap])

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) {
      return undefined
    }

    const zoomBehavior = zoom()
      .scaleExtent([0.7, 2.4])
      .on('zoom', (event) => setMainTransform(event.transform))

    const selection = select(svg)
    selection.call(zoomBehavior)
    selection.on('dblclick.zoom', null)

    return () => {
      selection.on('.zoom', null)
    }
  }, [])

  useEffect(() => {
    if (!isExpanded || !expandedSvgRef.current) {
      return undefined
    }

    const zoomBehavior = zoom()
      .scaleExtent([0.6, 3.2])
      .on('zoom', (event) => setExpandedTransform(event.transform))

    const selection = select(expandedSvgRef.current)
    selection.call(zoomBehavior)
    selection.on('dblclick.zoom', null)

    return () => {
      selection.on('.zoom', null)
    }
  }, [isExpanded])

  useEffect(() => {
    if (!isExpanded) {
      return undefined
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsExpanded(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isExpanded])

  useEffect(() => {
    if (!draggingNode) {
      return undefined
    }

    const resolveSource = () => (draggingNode.source === 'expanded' ? {
      svg: expandedSvgRef.current,
      transform: expandedTransform,
    } : {
      svg: svgRef.current,
      transform: mainTransform,
    })

    const onPointerMove = (event) => {
      const source = resolveSource()
      if (!source.svg) {
        return
      }

      const rect = source.svg.getBoundingClientRect()
      if (!rect.width || !rect.height) {
        return
      }

      const viewX = ((event.clientX - rect.left) / rect.width) * mapSize.width
      const viewY = ((event.clientY - rect.top) / rect.height) * mapSize.height
      const graphX = (viewX - source.transform.x) / source.transform.k
      const graphY = (viewY - source.transform.y) / source.transform.k

      setPositionOverrides((current) => ({
        ...current,
        [draggingNode.nodeId]: {
          x: Math.round(clamp(graphX, 18, mapSize.width - 18)),
          y: Math.round(clamp(graphY, 18, mapSize.height - 18)),
        },
      }))
      dragMovedRef.current = true
    }

    const onPointerUp = () => {
      if (dragMovedRef.current) {
        suppressExpandClickRef.current = true
      }
      setDraggingNode(null)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [draggingNode, expandedTransform, mainTransform, mapSize.height, mapSize.width])

  const renderGraph = ({
    hoveredEdge,
    setHoveredEdge,
    transform,
    gradientId,
    onNodePointerDown,
  }) => (
    <>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,248,240,0.95)" />
          <stop offset="100%" stopColor="rgba(240,214,188,0.65)" />
        </linearGradient>
      </defs>
      <rect x={0} y={0} width={mapSize.width} height={mapSize.height} fill={`url(#${gradientId})`} />
      <g transform={transform.toString()}>
        {visibleEdges.map((edge) => {
          const from = nodeMap[edge.from]
          const to = nodeMap[edge.to]
          if (!from || !to) {
            return null
          }

          const isHovered = hoveredEdge === edge.id
          const alpha = Math.min(density.baseEdgeAlpha, 0.08 + (edge.pheromone ?? 1) * 0.05)
          const edgeColor = edge.blocked
            ? '#b23a3a'
            : `rgba(84, 120, 177, ${alpha})`

          return (
            <path
              key={`${gradientId}-${edge.id}`}
              d={edgePath(from, to)}
              fill="none"
              stroke={edgeColor}
              strokeWidth={(edge.blocked ? 2.5 : density.edgeLineWidth) + (isHovered ? 1.8 : 0)}
              strokeDasharray={edge.blocked ? '7 6' : undefined}
              onMouseEnter={() => setHoveredEdge(edge.id)}
              onMouseLeave={() => setHoveredEdge(null)}
            >
              <title>{`Edge ${edge.from} -> ${edge.to} | weight ${edge.weight ?? 'N/A'}`}</title>
            </path>
          )
        })}

        {antRoutes.slice(0, density.maxAntRoutesToDraw).map((ant, index) => {
          if (!Array.isArray(ant.route) || ant.route.length < 2) {
            return null
          }
          const pathPoints = ant.route
            .map((nodeId) => nodeMap[nodeId])
            .filter(Boolean)
            .map((node) => `${node.x},${node.y}`)
            .join(' ')
          if (!pathPoints) {
            return null
          }

          return (
            <polyline
              key={`${gradientId}-ant-${ant.antId ?? index}`}
              points={pathPoints}
              fill="none"
              strokeWidth={nodes.length > 45 ? 2.1 : 2.8}
              strokeDasharray="4 4"
              stroke={ANT_ROUTE_COLORS[index % ANT_ROUTE_COLORS.length]}
              opacity={0.75}
            />
          )
        })}

        {visibleEdges.map((edge) => {
          if (!bestRouteEdges.has(edge.id) || edge.blocked) {
            return null
          }
          const from = nodeMap[edge.from]
          const to = nodeMap[edge.to]
          if (!from || !to) {
            return null
          }
          return (
            <path
              key={`${gradientId}-best-${edge.id}`}
              d={edgePath(from, to)}
              fill="none"
              stroke="#c73c2f"
              strokeWidth={5.2}
            />
          )
        })}

        {visibleEdges.map((edge) => {
          if (!goBestRouteEdges.has(edge.id) || edge.blocked) {
            return null
          }
          const from = nodeMap[edge.from]
          const to = nodeMap[edge.to]
          if (!from || !to) {
            return null
          }
          return (
            <path
              key={`${gradientId}-go-${edge.id}`}
              d={edgePath(from, to)}
              fill="none"
              stroke="rgba(47, 107, 67, 0.96)"
              strokeWidth={4.4}
              strokeDasharray="10 6"
            />
          )
        })}

        {visibleEdges.map((edge) => {
          const showLabel = hoveredEdge === edge.id
            || (density.showRouteEdgeLabels && (bestRouteEdges.has(edge.id) || goBestRouteEdges.has(edge.id)))
          if (!showLabel || !Number.isFinite(Number(edge.weight))) {
            return null
          }
          const from = nodeMap[edge.from]
          const to = nodeMap[edge.to]
          if (!from || !to) {
            return null
          }
          const midX = (from.x + to.x) / 2
          const midY = (from.y + to.y) / 2
          return (
            <g key={`${gradientId}-label-${edge.id}`}>
              <rect x={midX - 14} y={midY - 8} width={28} height={16} fill="rgba(255,248,240,0.95)" stroke="rgba(84,120,177,0.26)" />
              <text x={midX} y={midY + 3} textAnchor="middle" fontSize={9} fill="#4b2e2b">{Number(edge.weight).toFixed(0)}</text>
            </g>
          )
        })}

        {displayNodes.map((node) => {
          const isStartNode = node.id === startNodeId
          const isDestinationNode = node.id === effectiveDestinationNodeId
          const baseRadius = nodes.length > 45 ? (node.kind === 'hospital' ? 8 : 6.5) : node.kind === 'hospital' ? 11 : 9
          const showNodeLabel = density.nodeLabelStep === 1
            || routeNodeIds.has(node.id)
            || (density.nodeLabelStep !== 999 && node.id % density.nodeLabelStep === 0)
            || visibleEdges.some((edge) => edge.id === hoveredEdge && (edge.from === node.id || edge.to === node.id))

          return (
            <g
              key={`${gradientId}-node-${node.id}`}
              className="node-draggable"
              onPointerDown={(event) => onNodePointerDown(event, node.id)}
            >
              {(isStartNode || isDestinationNode) && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={baseRadius + 4.2}
                  fill="none"
                  stroke={isStartNode ? '#c73c2f' : '#8a4b17'}
                  strokeWidth={3}
                />
              )}
              <circle
                cx={node.x}
                cy={node.y}
                r={baseRadius}
                fill={node.kind === 'hospital' ? '#4b2e2b' : '#8c5a3c'}
                stroke="#fff8f0"
                strokeWidth={2}
              />
              {isStartNode ? (
                <text x={node.x} y={node.y + 6} textAnchor="middle" fill="#e43b2f" fontSize={nodes.length > 45 ? 14 : 18} fontWeight={700}>+</text>
              ) : showNodeLabel ? (
                <text x={node.x} y={node.y + 4} textAnchor="middle" fill="#fff8f0" fontSize={nodes.length > 45 ? 10 : 12}>{node.id}</text>
              ) : null}
            </g>
          )
        })}
      </g>
    </>
  )

  return (
    <section className="panel canvas-panel">
      <p className="panel-label">Map Canvas</p>
      <svg
        ref={svgRef}
        className="map-canvas map-svg"
        viewBox={`0 0 ${mapSize.width} ${mapSize.height}`}
        onClick={() => {
          if (suppressExpandClickRef.current) {
            suppressExpandClickRef.current = false
            return
          }

          setIsExpanded(true)
        }}
      >
        {renderGraph({
          hoveredEdge: hoveredEdgeId,
          setHoveredEdge: setHoveredEdgeId,
          transform: mainTransform,
          gradientId: 'map-bg',
          onNodePointerDown: (event, nodeId) => {
            event.preventDefault()
            event.stopPropagation()
            dragMovedRef.current = false
            setDraggingNode({ nodeId, source: 'main' })
          },
        })}
      </svg>
      <p className="muted">
        {isDenseGraph
          ? 'Dense overview mode with D3 zoom/pan. Click graph to expand.'
          : 'D3 graph with zoom/pan. Click graph to expand.'}
      </p>
      {antRoutes.length > 0 && (
        <p className="muted">Ant routes this pass: {antRoutes.map((ant) => ant.antId).join(', ')}</p>
      )}
      {isExpanded && (
        <div
          className="canvas-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Expanded graph view"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setIsExpanded(false)
            }
          }}
        >
          <div className="canvas-modal">
            <div className="canvas-modal-header">
              <p className="panel-label">Expanded Network View</p>
              <button type="button" className="secondary" onClick={() => setExpandedTransform(zoomIdentity)}>Reset Zoom</button>
              <button type="button" className="secondary" onClick={() => setIsExpanded(false)}>Close</button>
            </div>
            <svg
              ref={expandedSvgRef}
              className="map-canvas map-canvas-expanded map-svg"
              viewBox={`0 0 ${mapSize.width} ${mapSize.height}`}
            >
              {renderGraph({
                hoveredEdge: hoveredExpandedEdgeId,
                setHoveredEdge: setHoveredExpandedEdgeId,
                transform: expandedTransform,
                gradientId: 'map-bg-expanded',
                onNodePointerDown: (event, nodeId) => {
                  event.preventDefault()
                  event.stopPropagation()
                  dragMovedRef.current = false
                  setDraggingNode({ nodeId, source: 'expanded' })
                },
              })}
            </svg>
          </div>
        </div>
      )}
    </section>
  )
}
