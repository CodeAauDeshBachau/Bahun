import { useCallback } from 'react'
import { edgeKey } from '../lib/graph.jsx'
import { ANT_ROUTE_COLORS, BEST_ROUTE_COLOR } from '../lib/constants.jsx'

export function useCanvas() {
  const drawMap = useCallback((canvas, {
    nodes,
    edges,
    bestRoute,
    antRoutes,
    hoveredEdgeId,
    startNodeId,
    destinationNodeId,
  }) => {
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

    const bestRouteEdges = new Set()
    if (bestRoute && bestRoute.length > 1) {
      for (let i = 0; i < bestRoute.length - 1; i += 1) {
        bestRouteEdges.add(edgeKey(bestRoute[i], bestRoute[i + 1]))
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

    if (Array.isArray(antRoutes)) {
      antRoutes.forEach((ant, index) => {
        if (!Array.isArray(ant.route) || ant.route.length < 2) {
          return
        }

        ctx.beginPath()
        for (let i = 0; i < ant.route.length; i += 1) {
          const node = nodeMap[ant.route[i]]
          if (!node) {
            continue
          }
          if (i === 0) {
            ctx.moveTo(node.x, node.y)
          } else {
            ctx.lineTo(node.x, node.y)
          }
        }
        ctx.strokeStyle = ANT_ROUTE_COLORS[index % ANT_ROUTE_COLORS.length]
        ctx.lineWidth = 2.8
        ctx.setLineDash([4, 4])
        ctx.stroke()
        ctx.setLineDash([])
      })
    }

    if (bestRouteEdges.size > 0) {
      for (const edge of edges) {
        if (!bestRouteEdges.has(edge.id) || edge.blocked) {
          continue
        }

        const from = nodeMap[edge.from]
        const to = nodeMap[edge.to]
        ctx.beginPath()
        ctx.moveTo(from.x, from.y)
        ctx.lineTo(to.x, to.y)
        ctx.strokeStyle = BEST_ROUTE_COLOR
        ctx.lineWidth = 5.2
        ctx.setLineDash([])
        ctx.stroke()
      }
    }

    for (const node of nodes) {
      const isStartNode = node.id === startNodeId
      const isDestinationNode = node.id === destinationNodeId
      const baseRadius = node.kind === 'hospital' ? 11 : 9

      if (isStartNode || isDestinationNode) {
        ctx.beginPath()
        ctx.arc(node.x, node.y, baseRadius + 4.2, 0, Math.PI * 2)
        ctx.strokeStyle = isStartNode ? '#1d7f5f' : '#8a4b17'
        ctx.lineWidth = 3
        ctx.stroke()
      }

      ctx.beginPath()
      ctx.arc(node.x, node.y, baseRadius, 0, Math.PI * 2)
      ctx.fillStyle = node.kind === 'hospital' ? '#4b2e2b' : '#8c5a3c'
      ctx.fill()
      ctx.strokeStyle = '#fff8f0'
      ctx.lineWidth = 2
      ctx.stroke()

      ctx.fillStyle = '#fff8f0'
      ctx.font = "12px 'Times New Roman'"
      ctx.textAlign = 'center'
      ctx.fillText(node.id, node.x, node.y + 4)
    }
  }, [])

  return { drawMap }
}
