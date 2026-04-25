import { constructRoute } from "../lib/aco.jsx";
import { edgeKey, euclidean } from "../lib/graph.jsx";

let timer = null;
let iteration = 0;
let routesExplored = 0;
let bestDistance = Number.POSITIVE_INFINITY;
let bestRoute = [];

const state = {
  nodes: [],
  edges: [],
  params: {
    alpha: 1,
    beta: 5,
    evaporationRate: 0.1,
    antCount: 3,
    q: 100,
    stigmergicBoost: 5,
    initialPheromone: 1,
    startNodeId: null,
    destinationNodeId: null,
  },
};

function buildEdgeDistanceMap(edges) {
  const byId = new Map();

  for (const edge of edges) {
    byId.set(edge.id, Number(edge.distance));
  }

  return byId;
}

function routeDistance(route, nodeMap, edgeDistanceMap) {
  let total = 0;
  for (let i = 0; i < route.length - 1; i += 1) {
    const id = edgeKey(route[i], route[i + 1]);
    const edgeDistance = edgeDistanceMap.get(id);

    if (Number.isFinite(edgeDistance) && edgeDistance > 0) {
      total += edgeDistance;
      continue;
    }

    total += euclidean(nodeMap[route[i]], nodeMap[route[i + 1]]);
  }
  return total;
}

function routeEdgeIds(route) {
  const ids = [];
  for (let i = 0; i < route.length - 1; i += 1) {
    ids.push(edgeKey(route[i], route[i + 1]));
  }
  return ids;
}

function clampPheromone(value) {
  return Math.max(0.01, value);
}

function applyPheromoneUpdate(antRoutes) {
  const evaporationRate = Number.isFinite(state.params.evaporationRate)
    ? Math.min(0.95, Math.max(0.01, state.params.evaporationRate))
    : 0.1;
  const q = Number.isFinite(state.params.q) ? Math.max(1, state.params.q) : 100;

  const edgeMap = new Map(state.edges.map((edge) => [edge.id, { ...edge }]));

  for (const edge of edgeMap.values()) {
    edge.pheromone = clampPheromone(
      (edge.pheromone ?? 1) * (1 - evaporationRate),
    );
  }

  for (const ant of antRoutes) {
    if (
      !Number.isFinite(ant.distance) ||
      ant.distance <= 0 ||
      ant.route.length < 2
    ) {
      continue;
    }

    const deposit = q / ant.distance;
    for (const id of routeEdgeIds(ant.route)) {
      const edge = edgeMap.get(id);
      if (!edge || edge.blocked) {
        continue;
      }
      edge.pheromone = clampPheromone((edge.pheromone ?? 1) + deposit);
    }
  }

  state.edges = state.edges.map((edge) => edgeMap.get(edge.id) ?? edge);
}

function injectRemoteBestRoute(payload) {
  if (!Array.isArray(payload.bestRoute) || payload.bestRoute.length < 2) {
    return;
  }

  const boost = Number.isFinite(state.params.stigmergicBoost)
    ? Math.max(1, state.params.stigmergicBoost)
    : 5;

  const edgeIds = routeEdgeIds(payload.bestRoute);
  state.edges = state.edges.map((edge) => {
    if (!edgeIds.includes(edge.id) || edge.blocked) {
      return edge;
    }
    return {
      ...edge,
      pheromone: clampPheromone((edge.pheromone ?? 1) + boost),
    };
  });
}

function loop() {
  if (!state.nodes.length) {
    return;
  }

  const nodeMap = Object.fromEntries(
    state.nodes.map((node) => [node.id, node]),
  );
  const edgeDistanceMap = buildEdgeDistanceMap(state.edges);
  const antsThisPass = Number.isFinite(state.params.antCount)
    ? Math.max(1, Math.floor(state.params.antCount))
    : 3;

  const antRoutes = [];
  for (let antIndex = 0; antIndex < antsThisPass; antIndex += 1) {
    const route = constructRoute(state.nodes, state.edges, state.params);
    const distance = routeDistance(route, nodeMap, edgeDistanceMap);

    routesExplored += 1;
    antRoutes.push({ antId: antIndex + 1, route, distance });

    if (distance < bestDistance) {
      bestDistance = distance;
      bestRoute = route;
    }
  }

  applyPheromoneUpdate(antRoutes);
  iteration += 1;

  self.postMessage({
    type: "ITERATION_UPDATE",
    payload: {
      iteration,
      routesExplored,
      bestDistance,
      bestRoute,
      antRoutes,
      edges: state.edges,
    },
  });
}

function start() {
  if (timer) {
    return;
  }
  timer = setInterval(loop, 120);
}

function stop() {
  if (!timer) {
    return;
  }
  clearInterval(timer);
  timer = null;
}

self.onmessage = (event) => {
  const { type, payload } = event.data;

  switch (type) {
    case "START":
      state.nodes = payload.nodes ?? state.nodes;
      state.edges = payload.edges ?? state.edges;
      state.params = { ...state.params, ...(payload.params ?? {}) };
      start();
      break;
    case "STOP":
      stop();
      break;
    case "RESET":
      stop();
      iteration = 0;
      routesExplored = 0;
      bestDistance = Number.POSITIVE_INFINITY;
      bestRoute = [];
      state.params = { ...state.params, ...(payload.params ?? {}) };
      state.edges = payload.edges ?? state.edges;
      self.postMessage({
        type: "ITERATION_UPDATE",
        payload: {
          iteration,
          routesExplored,
          bestDistance,
          bestRoute,
          antRoutes: [],
          edges: state.edges,
        },
      });
      break;
    case "BLOCK_EDGE":
      state.edges = state.edges.map((edge) =>
        edge.id === payload.edgeId
          ? { ...edge, blocked: payload.blocked }
          : edge,
      );
      break;
    case "INJECT_PHEROMONES":
      if (payload.bestDistance < bestDistance) {
        bestDistance = payload.bestDistance;
        bestRoute = payload.bestRoute;
      }
      injectRemoteBestRoute(payload);
      break;
    case "CONFIG":
      state.params = { ...state.params, ...(payload.params ?? {}) };
      break;
    default:
      break;
  }
};
