import { WebSocketServer } from "ws";

const port = Number(process.env.PORT || 8080);
const host = process.env.HOST || "0.0.0.0";

const wss = new WebSocketServer({ host, port });
let nextClientId = 1;

// TSP Distance Matrix (10x10) - use '-' for blocked roads
const TSP_DISTANCE_MATRIX = [
  [0, 29, 20, 21, 16, 31, 100, 12, 4, 31],
  [29, 0, 15, 29, 28, 40, 72, 21, 29, 41],
  [20, 15, 0, 15, 14, 25, 81, 9, 23, 27],
  [21, 29, 15, 0, 4, 12, 92, 12, 25, 13],
  [16, 28, 14, 4, 0, "-", 94, 9, 20, 16],
  [31, 40, 25, 12, 16, 0, 95, 24, 36, 3],
  [100, 72, 81, 92, 94, 95, 0, 90, 101, 99],
  [12, 21, 9, 12, 9, 24, 90, 0, 15, 25],
  [4, 29, 23, 25, 20, 36, 101, 15, 0, 35],
  [31, 41, 27, 13, 16, 3, 99, 25, 35, 0],
];

// Node positions - 10 nodes distributed across canvas
const NODE_POSITIONS = {
  0: { x: 100, y: 100 },
  1: { x: 300, y: 150 },
  2: { x: 500, y: 200 },
  3: { x: 700, y: 150 },
  4: { x: 900, y: 100 },
  5: { x: 200, y: 400 },
  6: { x: 400, y: 450 },
  7: { x: 600, y: 400 },
  8: { x: 800, y: 450 },
  9: { x: 950, y: 400 },
};

// Create distance matrix payload. A '-' entry means the edge is blocked.
function createDistanceMatrix() {
  const matrix = {};

  for (let i = 0; i < 10; i++) {
    matrix[i] = {};
    for (let j = 0; j < 10; j++) {
      if (i !== j) {
        matrix[i][j] = TSP_DISTANCE_MATRIX[i][j];
      }
    }
  }

  return matrix;
}

const DISTANCE_MATRIX = createDistanceMatrix();

// Generate edge weights from numeric matrix values only.
// Blocked edges ('-') are omitted and handled by client-side matrix parsing.
function generateEdgeWeights() {
  const weights = {};

  for (let i = 0; i < 10; i++) {
    for (let j = i + 1; j < 10; j++) {
      const distance = Number(TSP_DISTANCE_MATRIX[i][j]);
      if (!Number.isFinite(distance) || distance <= 0) {
        continue;
      }
      const edgeId = `${i}-${j}`;
      weights[edgeId] = distance;
    }
  }

  return weights;
}

const EDGE_WEIGHTS = generateEdgeWeights();

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

function buildGraphStatePayload() {
  return {
    distanceMatrix: DISTANCE_MATRIX,
    edgeWeights: EDGE_WEIGHTS,
    params: ALGORITHM_PARAMS,
    loadedAt: Date.now(),
  };
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

wss.on("listening", () => {
  console.log(`[ws] listening on ws://${host}:${port}`);
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

  socket.send(
    JSON.stringify({
      type: "GRAPH_STATE",
      payload: buildGraphStatePayload(),
    }),
  );

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

    if (
      parsed.type === "REQUEST_DISTANCE_MATRIX" ||
      parsed.type === "REQUEST_GRAPH_STATE"
    ) {
      socket.send(
        JSON.stringify({
          type: "GRAPH_STATE",
          payload: buildGraphStatePayload(),
        }),
      );
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
