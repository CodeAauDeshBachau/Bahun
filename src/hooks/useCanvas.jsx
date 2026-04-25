import { useCallback } from 'react'
import { edgeKey } from '../lib/graph.jsx'
import { ANT_ROUTE_COLORS, BEST_ROUTE_COLOR } from '../lib/constants.jsx'

function getDensityProfile(nodeCount) {
  if (nodeCount <= 25) {
    return {
      visibleEdgesPerNode: Number.POSITIVE_INFINITY,
      nodeLabelStep: 1,
      showAllEdgeLabels: true,
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
      showAllEdgeLabels: false,
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
      showAllEdgeLabels: false,
      maxAntRoutesToDraw: 1,
      showRouteEdgeLabels: false,
      baseEdgeAlpha: 0.3,
      edgeLineWidth: 1.3,
    }
  }

  return {
    visibleEdgesPerNode: 1,
    nodeLabelStep: 999,
    showAllEdgeLabels: false,
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

    const fromList = edgesByNode.get(Number(edge.from))
    const toList = edgesByNode.get(Number(edge.to))
    fromList?.push(edge)
    toList?.push(edge)
  }

  for (const list of edgesByNode.values()) {
    list
      .slice()
      .sort((left, right) => {
        const leftDistance = Number(left.distance)
        const rightDistance = Number(right.distance)
        return leftDistance - rightDistance
      })
      .slice(0, profile.visibleEdgesPerNode)
      .forEach((edge) => visibleEdgeIds.add(edge.id))
  }

  return visibleEdgeIds
}

export function useCanvas() {
  const drawMap = useCallback((canvas, {
    nodes,
    edges,
    bestRoute,
    goBestRoute,
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
    const density = getDensityProfile(nodes.length)
    const weightLabels = []

    const bestRouteEdges = new Set()
    if (bestRoute && bestRoute.length > 1) {
      for (let i = 0; i < bestRoute.length - 1; i += 1) {
        bestRouteEdges.add(edgeKey(bestRoute[i], bestRoute[i + 1]))
      }
    }

    const goBestRouteEdges = new Set()
    if (goBestRoute && goBestRoute.length > 1) {
      for (let i = 0; i < goBestRoute.length - 1; i += 1) {
        goBestRouteEdges.add(edgeKey(goBestRoute[i], goBestRoute[i + 1]))
      }
    }

    const specialEdgeIds = new Set([
      ...bestRouteEdges,
      ...goBestRouteEdges,
      hoveredEdgeId,
    ].filter(Boolean))

    const visibleEdgeIds = buildVisibleEdgeSet(edges, nodeMap, density, specialEdgeIds)
    const routeNodeIds = new Set([
      ...bestRoute,
      ...goBestRoute,
      startNodeId,
      destinationNodeId,
    ].filter((value) => value !== null && value !== undefined))

    let hoveredEdge = null
    if (hoveredEdgeId) {
      hoveredEdge = edges.find((edge) => edge.id === hoveredEdgeId) ?? null
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
      if (!visibleEdgeIds.has(edge.id)) {
        continue
      }

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
        const alpha = Math.min(density.baseEdgeAlpha, 0.08 + (edge.pheromone ?? 1) * 0.05)
        ctx.strokeStyle = `rgba(84, 120, 177, ${alpha})`
        ctx.setLineDash([])
        ctx.lineWidth = density.edgeLineWidth
      }

      if (hoveredEdgeId === edge.id) {
        ctx.lineWidth += 1.8
      }

      ctx.stroke()
      ctx.setLineDash([])

      if (density.showAllEdgeLabels && Number.isFinite(Number(edge.weight)) && Number(edge.weight) > 0) {
        weightLabels.push({ edge, from, to })
      } else if (
        density.showRouteEdgeLabels
        && (hoveredEdgeId === edge.id || bestRouteEdges.has(edge.id) || goBestRouteEdges.has(edge.id))
        && Number.isFinite(Number(edge.weight))
        && Number(edge.weight) > 0
      ) {
        weightLabels.push({ edge, from, to })
      }
    }

    if (Array.isArray(antRoutes)) {
      antRoutes.slice(0, density.maxAntRoutesToDraw).forEach((ant, index) => {
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
        ctx.lineWidth = nodes.length > 45 ? 2.1 : 2.8
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

    if (goBestRouteEdges.size > 0) {
      for (const edge of edges) {
        if (!goBestRouteEdges.has(edge.id) || edge.blocked) {
          continue
        }

        const from = nodeMap[edge.from]
        const to = nodeMap[edge.to]
        ctx.beginPath()
        ctx.moveTo(from.x, from.y)
        ctx.lineTo(to.x, to.y)
        ctx.strokeStyle = 'rgba(47, 107, 67, 0.96)'
        ctx.lineWidth = 4.4
        ctx.setLineDash([10, 6])
        ctx.stroke()
        ctx.setLineDash([])
      }
    }

    const placedWeightBoxes = []
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    for (const { edge, from, to } of weightLabels) {
      const isHovered = hoveredEdgeId === edge.id
      const isBestRouteEdge = bestRouteEdges.has(edge.id)
      const isGoBestRouteEdge = goBestRouteEdges.has(edge.id)
      const mustShow = isHovered || isBestRouteEdge || isGoBestRouteEdge

      // Thin labels in normal view to reduce clutter; full detail remains available in expanded view.
      if (!mustShow && !density.showAllEdgeLabels) {
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
      const fontSize = nodes.length > 45 ? 9 : safeScale > 1 ? 12 : 10
      ctx.font = `700 ${fontSize}px 'Times New Roman'`

      const metrics = ctx.measureText(text)
      const paddingX = safeScale > 1 ? 4 : 3
      const boxWidth = metrics.width + paddingX * 2
      const boxHeight = safeScale > 1 ? 16 : 14
      const baseOffset = nodes.length > 45 ? 6 : safeScale > 1 ? 12 : 8
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
      const baseRadius = nodes.length > 45 ? (node.kind === 'hospital' ? 8 : 6.5) : node.kind === 'hospital' ? 11 : 9

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
      const showNodeLabel = density.nodeLabelStep === 1
        || routeNodeIds.has(node.id)
        || (density.nodeLabelStep !== 999 && node.id % density.nodeLabelStep === 0)
        || (hoveredEdge && (hoveredEdge.from === node.id || hoveredEdge.to === node.id))

      if (isStartNode) {
        ctx.fillStyle = '#e43b2f'
        ctx.font = nodes.length > 45 ? "bold 14px 'Times New Roman'" : "bold 18px 'Times New Roman'"
        ctx.fillText('+', node.x, node.y + 6)
      } else if (showNodeLabel) {
        ctx.fillStyle = '#fff8f0'
        ctx.font = nodes.length > 45 ? "10px 'Times New Roman'" : "12px 'Times New Roman'"
        ctx.fillText(node.id, node.x, node.y + 4)
      } else {
        // Suppress labels in dense mode to keep the graph readable.
      }
    }

    ctx.restore()
  }, [])

  return { drawMap }
}
