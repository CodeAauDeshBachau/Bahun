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
    viewScale = 1,
  }) => {
    if (!canvas) {
      return
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return
    }

    const safeScale = Number.isFinite(viewScale) && viewScale > 0 ? viewScale : 1
    const width = canvas.width
    const height = canvas.height
    const nodeMap = Object.fromEntries(nodes.map((node) => [node.id, node]))
    const weightLabels = []

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

    ctx.save()
    ctx.scale(safeScale, safeScale)

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

      if (Number.isFinite(Number(edge.weight)) && Number(edge.weight) > 0) {
        weightLabels.push({ edge, from, to })
      }
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

    const placedWeightBoxes = []
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    for (const { edge, from, to } of weightLabels) {
      const isHovered = hoveredEdgeId === edge.id
      const isBestRouteEdge = bestRouteEdges.has(edge.id)
      const mustShow = isHovered || isBestRouteEdge

      let edgeHash = 0
      for (let i = 0; i < edge.id.length; i += 1) {
        edgeHash += edge.id.charCodeAt(i)
      }

      // Thin labels in normal view to reduce clutter; full detail remains available in expanded view.
      if (!mustShow && safeScale <= 1 && edgeHash % 2 === 1) {
        continue
      }

      const dx = to.x - from.x
      const dy = to.y - from.y
      const length = Math.hypot(dx, dy) || 1
      const normalX = -dy / length
      const normalY = dx / length
      const midX = (from.x + to.x) / 2
      const midY = (from.y + to.y) / 2

      const text = Number(edge.weight).toFixed(2)
      const fontSize = safeScale > 1 ? 12 : 10
      ctx.font = `700 ${fontSize}px 'Times New Roman'`

      const metrics = ctx.measureText(text)
      const paddingX = safeScale > 1 ? 4 : 3
      const boxWidth = metrics.width + paddingX * 2
      const boxHeight = safeScale > 1 ? 16 : 14
      const baseOffset = safeScale > 1 ? 12 : 8
      const offsets = mustShow
        ? [0, baseOffset, -baseOffset]
        : [baseOffset, -baseOffset, baseOffset * 1.7, -baseOffset * 1.7]

      let placement = null

      for (const offset of offsets) {
        const centerX = midX + normalX * offset
        const centerY = midY + normalY * offset
        const rect = {
          x: centerX - boxWidth / 2,
          y: centerY - boxHeight / 2,
          w: boxWidth,
          h: boxHeight,
        }

        const overlaps = placedWeightBoxes.some((placed) => !(
          rect.x + rect.w + 2 < placed.x
          || placed.x + placed.w + 2 < rect.x
          || rect.y + rect.h + 2 < placed.y
          || placed.y + placed.h + 2 < rect.y
        ))

        if (!overlaps || mustShow) {
          placement = { ...rect, centerX, centerY }
          break
        }
      }

      if (!placement) {
        continue
      }

      placedWeightBoxes.push(placement)
      ctx.fillStyle = 'rgba(255, 248, 240, 0.95)'
      ctx.fillRect(placement.x, placement.y, placement.w, placement.h)

      ctx.strokeStyle = 'rgba(84, 120, 177, 0.26)'
      ctx.lineWidth = 1
      ctx.strokeRect(placement.x, placement.y, placement.w, placement.h)

      ctx.fillStyle = '#4b2e2b'
      ctx.fillText(text, placement.centerX, placement.centerY)
    }

    for (const node of nodes) {
      const isStartNode = node.id === startNodeId
      const isDestinationNode = node.id === destinationNodeId
      const baseRadius = node.kind === 'hospital' ? 11 : 9

      if (isStartNode || isDestinationNode) {
        ctx.beginPath()
        ctx.arc(node.x, node.y, baseRadius + 4.2, 0, Math.PI * 2)
        ctx.strokeStyle = isStartNode ? '#c73c2f' : '#8a4b17'
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

      ctx.textAlign = 'center'
      if (isStartNode) {
        ctx.fillStyle = '#e43b2f'
        ctx.font = "bold 18px 'Times New Roman'"
        ctx.fillText('+', node.x, node.y + 6)
      } else {
        ctx.fillStyle = '#fff8f0'
        ctx.font = "12px 'Times New Roman'"
        ctx.fillText(node.id, node.x, node.y + 4)
      }
    }

    ctx.restore()
  }, [])

  return { drawMap }
}
