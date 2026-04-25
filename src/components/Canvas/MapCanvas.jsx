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

export function MapCanvas({ nodes, edges, bestRoute, mapSize, onToggleEdge }) {
  const canvasRef = useRef(null)
  const [hoveredEdgeId, setHoveredEdgeId] = useState(null)
  const { drawMap } = useCanvas()

  const nodeMap = useMemo(() => Object.fromEntries(nodes.map((node) => [node.id, node])), [nodes])

  useEffect(() => {
    drawMap(canvasRef.current, { nodes, edges, bestRoute, hoveredEdgeId })
  }, [bestRoute, drawMap, edges, hoveredEdgeId, nodes])

  function detectEdge(clientX, clientY) {
    const canvas = canvasRef.current
    if (!canvas) {
      return null
    }

    const rect = canvas.getBoundingClientRect()
    const x = ((clientX - rect.left) / rect.width) * canvas.width
    const y = ((clientY - rect.top) / rect.height) * canvas.height

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
        onMouseMove={(event) => setHoveredEdgeId(detectEdge(event.clientX, event.clientY))}
        onMouseLeave={() => setHoveredEdgeId(null)}
        onClick={(event) => {
          const edgeId = detectEdge(event.clientX, event.clientY)
          if (edgeId && typeof onToggleEdge === 'function') {
            onToggleEdge(edgeId)
          }
        }}
      />
      <p className="muted">Click any road segment to block/unblock it.</p>
      {bestRoute.length > 1 && (
        <p className="route-preview">Current best route: {bestRoute.join(' -> ')}</p>
      )}
    </section>
  )
}
