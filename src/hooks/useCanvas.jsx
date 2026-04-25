import { useCallback } from 'react'
import { edgeKey } from '../lib/graph.jsx'

export function useCanvas() {
  const drawMap = useCallback((canvas, { nodes, edges, bestRoute, hoveredEdgeId }) => {
    if (!canvas) {
      return
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return
    }

    const width = canvas.width
    const height = canvas.height
    const nodeMap = Object.fromEntries(nodes.map((node) => [node.id, node]))

    const routeEdges = new Set()
    if (bestRoute && bestRoute.length > 1) {
      for (let i = 0; i < bestRoute.length - 1; i += 1) {
        routeEdges.add(edgeKey(bestRoute[i], bestRoute[i + 1]))
      }
    }

    ctx.clearRect(0, 0, width, height)

    const gradient = ctx.createLinearGradient(0, 0, width, height)
    gradient.addColorStop(0, 'rgba(255,248,240,0.95)')
    gradient.addColorStop(1, 'rgba(240,214,188,0.65)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)

    for (const edge of edges) {
      const from = nodeMap[edge.from]
      const to = nodeMap[edge.to]

      ctx.beginPath()
      ctx.moveTo(from.x, from.y)
      ctx.lineTo(to.x, to.y)

      if (edge.blocked) {
        ctx.strokeStyle = '#b23a3a'
        ctx.setLineDash([7, 6])
        ctx.lineWidth = 2.5
      } else if (routeEdges.has(edge.id)) {
        ctx.strokeStyle = '#f4c85f'
        ctx.setLineDash([])
        ctx.lineWidth = 4.5
      } else {
        const alpha = Math.min(0.75, 0.25 + (edge.pheromone ?? 1) * 0.1)
        ctx.strokeStyle = `rgba(84, 120, 177, ${alpha})`
        ctx.setLineDash([])
        ctx.lineWidth = 2
      }

      if (hoveredEdgeId === edge.id) {
        ctx.lineWidth += 1.8
      }

      ctx.stroke()
      ctx.setLineDash([])
    }

    for (const node of nodes) {
      ctx.beginPath()
      ctx.arc(node.x, node.y, node.kind === 'hospital' ? 9 : 7, 0, Math.PI * 2)
      ctx.fillStyle = node.kind === 'hospital' ? '#4b2e2b' : '#8c5a3c'
      ctx.fill()
      ctx.strokeStyle = '#fff8f0'
      ctx.lineWidth = 2
      ctx.stroke()

      ctx.fillStyle = '#fff8f0'
      ctx.font = "11px 'Times New Roman'"
      ctx.textAlign = 'center'
      ctx.fillText(node.id, node.x, node.y + 4)
    }
  }, [])

  return { drawMap }
}
