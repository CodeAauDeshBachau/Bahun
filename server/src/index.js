import { WebSocket, WebSocketServer } from "ws";
import { TEST_MATRIX } from "./testMatrix.js";

const port = Number(process.env.PORT || 8000);
const host = process.env.HOST || "0.0.0.0";
const GO_SERVER_URL =
  process.env.GO_SERVER_URL || "wss://wearisome-halle-marbly.ngrok-free.dev/ws";
const SECOND_GO_SERVER_URL =
  process.env.GO_SERVER_URL_2 || "wss://2a28-101-251-6-50.ngrok-free.app/ws";
const THIRD_GO_SERVER_URL =
  process.env.GO_SERVER_URL_3 || "wss://be79-101-251-6-50.ngrok-free.app/ws";
const MAX_NODE_COUNT = 100;
const MIN_NODE_COUNT = 2;
const MAX_WEIGHT = 500;

const wss = new WebSocketServer({ host, port });
let nextClientId = 1;
const bridgeTargets = new Map();
let globalBest = {
  distance: Number.POSITIVE_INFINITY,
  path: [],
};

function clampNodeCount(rawValue) {
  const count = Number(rawValue);
  if (!Number.isFinite(count)) {
    return 10;
  }
  return Math.min(MAX_NODE_COUNT, Math.max(MIN_NODE_COUNT, Math.floor(count)));
}

function randomWeight() {
  return Math.floor(Math.random() * MAX_WEIGHT) + 1;
}

function createRandomMatrix(nodeCount) {
  const matrix = Array.from({ length: nodeCount }, (_, i) =>
    Array.from({ length: nodeCount }, (_, j) => (i === j ? 0 : null)),
  );

  for (let i = 0; i < nodeCount; i += 1) {
    for (let j = i + 1; j < nodeCount; j += 1) {
      const weight = randomWeight();
      matrix[i][j] = weight;
      matrix[j][i] = weight;
    }
  }

  const blockedFrom = Math.floor(Math.random() * nodeCount);
  let blockedTo = Math.floor(Math.random() * nodeCount);
  while (blockedTo === blockedFrom) {
    blockedTo = Math.floor(Math.random() * nodeCount);
  }

  matrix[blockedFrom][blockedTo] = 0;
  matrix[blockedTo][blockedFrom] = 0;

  return matrix;
}

function createDistanceMatrix(matrix2D) {
  const matrix = {};
  const nodeCount = matrix2D.length;

  for (let i = 0; i < nodeCount; i += 1) {
    matrix[i] = {};
    for (let j = 0; j < nodeCount; j += 1) {
      if (i !== j) {
        matrix[i][j] = matrix2D[i][j];
      }
    }
  }

  return matrix;
}

function generateEdgeWeights(matrix2D) {
  const weights = {};
  const nodeCount = matrix2D.length;

  for (let i = 0; i < nodeCount; i += 1) {
    for (let j = i + 1; j < nodeCount; j += 1) {
      const distance = Number(matrix2D[i][j]);
      if (!Number.isFinite(distance) || distance <= 0) {
        continue;
      }
      const edgeId = `${i}-${j}`;
      weights[edgeId] = distance;
    }
  }

  return weights;
}

function generateNodePositions(nodeCount) {
  const width = 1000;
  const height = 560;
  const cx = width / 2;
  const cy = height / 2;
  const maxRadius = Math.min(width, height) * 0.42;

  return Array.from({ length: nodeCount }, (_, id) => {
    const angle = id * 2.399963229728653; // golden angle
    const radius = Math.sqrt((id + 1) / nodeCount) * maxRadius;
    return {
      id,
      name: `Node ${id}`,
      kind: id === 0 ? "hospital" : "village",
      x: Math.round(cx + Math.cos(angle) * radius),
      y: Math.round(cy + Math.sin(angle) * radius),
    };
  });
}

const ALGORITHM_PARAMS = {
  alpha: 1,
  beta: 5,
  evaporationRate: 0.1,
  antCount: 3,
  q: 100,
  stigmergicBoost: 5,
  initialPheromone: 1,
  startNodeId: 0,
  destinationNodeId: 9,
};

function createGraphState(nodeCount) {
  const matrix = createRandomMatrix(nodeCount);
  return {
    nodeCount,
    matrix,
    distanceMatrix: createDistanceMatrix(matrix),
    edgeWeights: generateEdgeWeights(matrix),
    nodes: generateNodePositions(nodeCount),
    params: {
      ...ALGORITHM_PARAMS,
      startNodeId: 0,
      destinationNodeId: nodeCount - 1,
    },
    loadedAt: Date.now(),
  };
}

function createGraphStateFromMatrix(matrix2D) {
  const safeMatrix = matrix2D.map((row) => row.slice());
  const nodeCount = safeMatrix.length;
  return {
    nodeCount,
    matrix: safeMatrix,
    distanceMatrix: createDistanceMatrix(safeMatrix),
    edgeWeights: generateEdgeWeights(safeMatrix),
    nodes: generateNodePositions(nodeCount),
    params: {
      ...ALGORITHM_PARAMS,
      startNodeId: 0,
      destinationNodeId: null,
    },
    loadedAt: Date.now(),
  };
}

let graphState = null;

function buildGraphStatePayload() {
  if (!graphState) {
    return null;
  }

  return {
    ...graphState,
    loadedAt: Date.now(),
  };
}

function buildStartMatrixMessage() {
  if (!graphState) {
    return null;
  }

  return {
    type: "start",
    matrix: graphState.matrix,
  };
}

function normalizeBestPath(message) {
  if (Array.isArray(message?.path)) {
    return message.path.map((node) => Number(node)).filter(Number.isFinite);
  }

  return [];
}

function maybeBroadcastGlobalBest(message) {
  const distance = Number(message?.distance);
  const path = normalizeBestPath(message);

  if (!Number.isFinite(distance) || distance < 0 || !path.length) {
    return;
  }

  if (distance >= globalBest.distance) {
    return;
  }

  globalBest = {
    distance,
    path,
  };

  const globalBestMessage = {
    type: "global_best",
    path,
    distance,
  };

  console.log("[bridge] global_best updated:", globalBestMessage);
  broadcastToAll(globalBestMessage);
  broadcastToRemoteTargets(globalBestMessage);
}

function connectBridgeTarget(url) {
  const existing = bridgeTargets.get(url);
  if (
    existing &&
    (existing.socket?.readyState === WebSocket.OPEN ||
      existing.socket?.readyState === WebSocket.CONNECTING)
  ) {
    return;
  }

  const target = existing ?? { socket: null, queue: [], reconnectTimer: null };

  try {
    target.socket = new WebSocket(url);

    target.socket.onopen = () => {
      console.log(`[bridge] connected to remote server at ${url}`);
      while (target.queue.length) {
        const message = target.queue.shift();
        target.socket?.send(message);
      }
    };

    target.socket.onclose = () => {
      console.log(`[bridge] remote server connection closed: ${url}`);
      target.socket = null;
      if (!target.reconnectTimer) {
        target.reconnectTimer = setTimeout(() => {
          target.reconnectTimer = null;
          connectBridgeTarget(url);
        }, 3000);
      }
    };

    target.socket.onerror = (error) => {
      console.error(
        `[bridge] remote server error (${url}):`,
        error?.message || "unknown error",
      );
    };

    target.socket.onmessage = (event) => {
      const message = safeJsonParse(event.data);
      if (!message || typeof message !== "object") {
        console.log(`[bridge] remote server message (${url}):`, event.data);
        return;
      }

      if (message.type === "local_best") {
        console.log(`[bridge] remote server local_best (${url}):`, message);
        maybeBroadcastGlobalBest(message);
        return;
      }

      console.log(`[bridge] remote server message (${url}):`, message);
    };
  } catch (error) {
    console.error(
      `[bridge] failed to connect to remote server (${url}):`,
      error.message,
    );
    target.socket = null;
    if (!target.reconnectTimer) {
      target.reconnectTimer = setTimeout(() => {
        target.reconnectTimer = null;
        connectBridgeTarget(url);
      }, 3000);
    }
  }

  bridgeTargets.set(url, target);
}

function broadcastToRemoteTargets(message) {
  if (!message) {
    return;
  }

  const payload = JSON.stringify(message);
  for (const url of [GO_SERVER_URL, SECOND_GO_SERVER_URL, THIRD_GO_SERVER_URL]) {
    const target = bridgeTargets.get(url) ?? {
      socket: null,
      queue: [],
      reconnectTimer: null,
    };
    if (target.socket && target.socket.readyState === WebSocket.OPEN) {
      target.socket.send(payload);
    } else {
      target.queue.push(payload);
      bridgeTargets.set(url, target);
      connectBridgeTarget(url);
    }
  }
}

function relayCurrentWeightsToGoServer() {
  const startMessage = buildStartMatrixMessage();
  if (!startMessage) {
    return false;
  }

  broadcastToRemoteTargets(startMessage);
  return true;
}

function safeJsonParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function broadcastExceptSender(sender, message) {
  const payload = JSON.stringify(message);

  for (const client of wss.clients) {
    if (client === sender || client.readyState !== client.OPEN) {
      continue;
    }
    client.send(payload);
  }
}

function broadcastToAll(message) {
  const payload = JSON.stringify(message);

  for (const client of wss.clients) {
    if (client.readyState !== client.OPEN) {
      continue;
    }
    client.send(payload);
  }
}

wss.on("listening", () => {
  console.log(`[ws] listening on ws://${host}:${port}`);
  connectBridgeTarget(GO_SERVER_URL);
  connectBridgeTarget(SECOND_GO_SERVER_URL);
  connectBridgeTarget(THIRD_GO_SERVER_URL);
});

wss.on("connection", (socket, req) => {
  const clientId = `client-${nextClientId++}`;
  const clientAddress = req.socket.remoteAddress || "unknown";

  socket.send(
    JSON.stringify({
      type: "SERVER_WELCOME",
      payload: {
        clientId,
        connectedAt: Date.now(),
      },
    }),
  );
  globalBest = {
    distance: Number.POSITIVE_INFINITY,
    path: [],
  };

  console.log(`[ws] ${clientId} connected from ${clientAddress}`);

  socket.on("message", (raw) => {
    const parsed = safeJsonParse(raw.toString());
    if (!parsed || typeof parsed !== "object") {
      socket.send(
        JSON.stringify({
          type: "SERVER_ERROR",
          payload: { message: "Invalid JSON message" },
        }),
      );
      return;
    }
    globalBest = {
      distance: Number.POSITIVE_INFINITY,
      path: [],
    };

    if (
      parsed.type === "REQUEST_DISTANCE_MATRIX" ||
      parsed.type === "REQUEST_GRAPH_STATE"
    ) {
      const payload = buildGraphStatePayload();
      if (!payload) {
        socket.send(
          JSON.stringify({
            type: "GRAPH_STATE",
            payload: null,
          }),
        );
        return;
      }

      socket.send(
        JSON.stringify({
          type: "GRAPH_STATE",
          payload,
        }),
      );

      const startMessage = buildStartMatrixMessage();
      if (startMessage) {
        socket.send(JSON.stringify(startMessage));
      }
      return;
    }

    if (parsed.type === "GENERATE_WEIGHTS") {
      // const requestedNodeCount = parsed.payload?.nodeCount;
      // const nodeCount = clampNodeCount(requestedNodeCount);
      // Keep this for main flow:
      // graphState = createGraphState(nodeCount);
      // Test-only flow: load fixed hardcoded matrix.
      graphState = createGraphStateFromMatrix(TEST_MATRIX);

      broadcastToAll({
        type: "GRAPH_STATE",
        payload: buildGraphStatePayload(),
      });
      const startMessage = buildStartMatrixMessage();
      if (startMessage) {
        broadcastToAll(startMessage);
      }
      return;
    }

    if (parsed.type === "RELAY_WEIGHTS") {
      const relayed = relayCurrentWeightsToGoServer();
      socket.send(
        JSON.stringify({
          type: relayed ? "RELAY_WEIGHTS_OK" : "SERVER_ERROR",
          payload: relayed
            ? { message: "Weights relayed to Go server" }
            : { message: "No generated weights available to relay" },
        }),
      );
      return;
    }

    if (parsed.type === "RESET_GRAPH") {
      graphState = null;
      broadcastToAll({
        type: "GRAPH_STATE",
        payload: null,
      });
      return;
    }

    // Relay all valid app events to other connected clients/devices.
    broadcastExceptSender(socket, {
      ...parsed,
      meta: {
        fromClientId: clientId,
        relayedAt: Date.now(),
      },
    });
  });

  socket.on("close", () => {
    console.log(`[ws] ${clientId} disconnected`);
  });

  socket.on("error", (error) => {
    console.error(`[ws] ${clientId} error:`, error.message);
  });
});

wss.on("error", (error) => {
  console.error("[ws] server error:", error);
});
