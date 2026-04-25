// Graph data structure (nodes, edges, distances, pheromone matrix)
// src/lib/graph.js

import { INITIAL_PHEROMONE } from './constants.js';

let distMatrix = [];
let tauMatrix = [];  // pheromone
let nodeCount = 0;

// Call once at startup with your villages array
export function initGraph(nodes) {
    nodeCount = nodes.length;

    // Build distance matrix — static, never changes
    distMatrix = Array.from({ length: nodeCount }, (_, i) =>
        Array.from({ length: nodeCount }, (_, j) => {
            if (i === j) return 0;
            const dx = nodes[i].x - nodes[j].x;
            const dy = nodes[i].y - nodes[j].y;
            return Math.sqrt(dx * dx + dy * dy);
        })
    );

    // Build pheromone matrix — uniform at start
    tauMatrix = Array.from({ length: nodeCount }, () =>
        new Array(nodeCount).fill(INITIAL_PHEROMONE)
    );
}

// Your friend's ant calls this to get pheromone on an edge
export function getTau(i, j) {
    return tauMatrix[i][j];
}

// Your friend's ant calls this to get distance between two nodes
export function getDist(i, j) {
    return distMatrix[i][j];
}

// Called by aco.js during pheromone update
export function setTau(i, j, value) {
    tauMatrix[i][j] = value;
    tauMatrix[j][i] = value;  // undirected
}

// Called when user clicks to block a road segment
export function blockEdge(i, j) {
    distMatrix[i][j] = Infinity;
    distMatrix[j][i] = Infinity;
}

// Undo a block (optional but useful)
export function unblockEdge(i, j, originalDist) {
    distMatrix[i][j] = originalDist;
    distMatrix[j][i] = originalDist;
}

export function getNodeCount() {
    return nodeCount;
}

// Expose full tau matrix for aco.js to iterate over
export function getTauMatrix() {
    return tauMatrix;
}