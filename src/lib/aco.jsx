function weightedPick(candidates) {
	const total = candidates.reduce((sum, item) => sum + item.weight, 0)
	if (total <= 0) {
		return candidates[Math.floor(Math.random() * candidates.length)]
	}

	let threshold = Math.random() * total
	for (const item of candidates) {
		threshold -= item.weight
		if (threshold <= 0) {
			return item
		}
	}

	return candidates[candidates.length - 1]
}

function getNeighbors(nodeId, edges) {
	return edges
		.filter((edge) => !edge.blocked && (edge.from === nodeId || edge.to === nodeId))
		.map((edge) => ({
			id: edge.from === nodeId ? edge.to : edge.from,
			pheromone: edge.pheromone ?? 1,
			distance: Math.max(0.0001, edge.distance ?? 1),
		}))
}

export function constructRoute(nodes, edges, params) {
	if (!nodes.length) {
		return []
	}

	const nodeIds = new Set(nodes.map((node) => node.id))
	const start = params.startNodeId && nodeIds.has(params.startNodeId)
		? params.startNodeId
		: nodes[0].id
	const destination = params.destinationNodeId && nodeIds.has(params.destinationNodeId)
		? params.destinationNodeId
		: nodes[nodes.length - 1].id

	if (start === destination) {
		return [start]
	}

	const alpha = Number.isFinite(params.alpha) ? params.alpha : 1
	const beta = Number.isFinite(params.beta) ? params.beta : 5

	const route = [start]
	const visited = new Set([start])
	const maxSteps = Math.max(nodes.length * 2, 10)

	while (route[route.length - 1] !== destination && route.length < maxSteps) {
		const current = route[route.length - 1]
		const allNeighbors = getNeighbors(current, edges)
		if (!allNeighbors.length) {
			break
		}

		const preferred = allNeighbors.filter((candidate) => !visited.has(candidate.id))
		const neighbors = preferred.length ? preferred : allNeighbors

		const weighted = neighbors.map((candidate) => ({
			...candidate,
			weight: Math.pow(candidate.pheromone, alpha) * Math.pow(1 / candidate.distance, beta),
		}))

		const next = weightedPick(weighted)
		route.push(next.id)
		visited.add(next.id)
	}

	return route
}
