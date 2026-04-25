import { useEffect, useMemo, useRef, useState } from 'react'
import { useCanvas } from '../../hooks/useCanvas.jsx'

function pointToSegmentDistance(point, start, end) {
  const dx = end.x - start.x
  const dy = end.y - start.y

  if (dx === 0 && dy === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y)
  }

  const t =
    ((point.x - start.x) * dx + (point.y - start.y) * dy) /
    (dx * dx + dy * dy)

  const clamped = Math.max(0, Math.min(1, t))
  const projection = {
    x: start.x + clamped * dx,
    y: start.y + clamped * dy,
  }

  return Math.hypot(point.x - projection.x, point.y - projection.y)
}

export function MapCanvas({
  nodes,
  edges,
  bestRoute,
  antRoutes = [],
  startNodeId,
  destinationNodeId,
  mapSize,
}) {
  const canvasRef = useRef(null)
  const expandedCanvasRef = useRef(null)
  const [hoveredEdgeId, setHoveredEdgeId] = useState(null)
  const [hoveredExpandedEdgeId, setHoveredExpandedEdgeId] = useState(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const { drawMap } = useCanvas()
  const expandedScale = 1.25

  const nodeMap = useMemo(() => Object.fromEntries(nodes.map((node) => [node.id, node])), [nodes])

  useEffect(() => {
    drawMap(canvasRef.current, {
      nodes,
      edges,
      bestRoute,
      antRoutes,
      hoveredEdgeId,
      startNodeId,
      destinationNodeId,
      viewScale: 1,
    })
  }, [antRoutes, bestRoute, destinationNodeId, drawMap, edges, hoveredEdgeId, nodes, startNodeId])

  useEffect(() => {
    if (!isExpanded) {
      return
    }

    drawMap(expandedCanvasRef.current, {
      nodes,
      edges,
      bestRoute,
      antRoutes,
      hoveredEdgeId: hoveredExpandedEdgeId,
      startNodeId,
      destinationNodeId,
      viewScale: expandedScale,
    })
  }, [
    antRoutes,
    bestRoute,
    destinationNodeId,
    drawMap,
    edges,
    hoveredExpandedEdgeId,
    isExpanded,
    nodes,
    startNodeId,
  ])

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

  function detectEdge(clientX, clientY, canvas, viewScale = 1) {
    if (!canvas) {
      return null
    }

    const safeScale = Number.isFinite(viewScale) && viewScale > 0 ? viewScale : 1
    const rect = canvas.getBoundingClientRect()
    const x = (((clientX - rect.left) / rect.width) * canvas.width) / safeScale
    const y = (((clientY - rect.top) / rect.height) * canvas.height) / safeScale

    let closest = null
    let bestDistance = 14

    for (const edge of edges) {
      const from = nodeMap[edge.from]
      const to = nodeMap[edge.to]
      const distance = pointToSegmentDistance({ x, y }, from, to)
      if (distance < bestDistance) {
        bestDistance = distance
        closest = edge.id
      }
    }

    return closest
  }

  return (
    <section className="panel canvas-panel">
      <p className="panel-label">Map Canvas</p>
      <canvas
        ref={canvasRef}
        className="map-canvas"
        width={mapSize.width}
        height={mapSize.height}
        onMouseMove={(event) => setHoveredEdgeId(detectEdge(event.clientX, event.clientY, canvasRef.current))}
        onMouseLeave={() => setHoveredEdgeId(null)}
        onClick={() => setIsExpanded(true)}
      />
      <p className="muted"> Click graph to expand.</p>
      {antRoutes.length > 0 && (
        <p className="muted">Ant routes this pass: {antRoutes.map((ant) => ant.antId).join(', ')}</p>
      )}
      {bestRoute.length > 1 && (
        <p className="route-preview">Current best route: {bestRoute.join(' -> ')}</p>
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
              <button type="button" className="secondary" onClick={() => setIsExpanded(false)}>Close</button>
            </div>
            <canvas
              ref={expandedCanvasRef}
              className="map-canvas map-canvas-expanded"
              width={Math.round(mapSize.width * expandedScale)}
              height={Math.round(mapSize.height * expandedScale)}
              onMouseMove={(event) => setHoveredExpandedEdgeId(
                detectEdge(event.clientX, event.clientY, expandedCanvasRef.current, expandedScale),
              )}
              onMouseLeave={() => setHoveredExpandedEdgeId(null)}
            />
          </div>
        </div>
      )}
    </section>
  )
}
