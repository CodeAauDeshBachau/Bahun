import { useEffect, useRef } from 'react'
import { useCanvas } from '../../hooks/useCanvas.jsx'

export function MapCanvas({ nodes, edges, bestRoute, mapSize }) {
  const canvasRef = useRef(null)
  const { drawMap } = useCanvas()

  useEffect(() => {
    drawMap(canvasRef.current, { nodes, edges, bestRoute })
  }, [bestRoute, drawMap, edges, nodes])

  return (
    <section className="panel canvas-panel">
      <p className="panel-label">Map Canvas</p>
      <canvas
        ref={canvasRef}
        className="map-canvas"
        width={mapSize.width}
        height={mapSize.height}
      />
      {bestRoute.length > 1 && (
        <p className="route-preview">Current best route: {bestRoute.join(' -> ')}</p>
      )}
    </section>
  )
}
