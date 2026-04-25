import { constructRoute } from "../lib/aco.jsx";
import { euclidean } from "../lib/graph.jsx";

let timer = null;
let iteration = 0;
let routesExplored = 0;
let bestDistance = Number.POSITIVE_INFINITY;
let bestRoute = [];

const state = {
  nodes: [],
  edges: [],
  params: { alpha: 1, beta: 5, startNodeId: null, destinationNodeId: null },
};

function routeDistance(route, nodeMap) {
  let total = 0;
  for (let i = 0; i < route.length - 1; i += 1) {
    total += euclidean(nodeMap[route[i]], nodeMap[route[i + 1]]);
  }
  return total;
}

function loop() {
  if (!state.nodes.length) {
    return;
  }

  const nodeMap = Object.fromEntries(
    state.nodes.map((node) => [node.id, node]),
  );
  const route = constructRoute(state.nodes, state.edges, state.params);
  const distance = routeDistance(route, nodeMap);

  routesExplored += 1;
  iteration += 1;

  if (distance < bestDistance) {
    bestDistance = distance;
    bestRoute = route;
  }

  self.postMessage({
    type: "ITERATION_UPDATE",
    payload: {
      iteration,
      routesExplored,
      bestDistance,
      bestRoute,
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
      state.params = payload.params ?? state.params;
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
      state.edges = payload.edges ?? state.edges;
      self.postMessage({
        type: "ITERATION_UPDATE",
        payload: { iteration, routesExplored, bestDistance, bestRoute },
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
      break;
    case "CONFIG":
      state.params = payload.params;
      break;
    default:
      break;
  }
};
