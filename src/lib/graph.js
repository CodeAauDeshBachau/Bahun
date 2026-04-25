// Graph data structure (nodes, edges, distances, pheromone matrix)
// src/lib/graph.js

import { INITIAL_PHEROMONE } from './constants.js';

let distMatrix = [];
let tauMatrix = [];  // pheromone
let nodeCount = 0;

/**
 * Initializes the distance and pheromone matrices.
 * @param {Array} nodes - Array of objects with {x, y} coordinates.
 */
export function initGraph(nodes) {
    nodeCount = nodes.length;

    // Build distance matrix (static)
    distMatrix = Array.from({ length: nodeCount }, (_, i) =>
        Array.from({ length: nodeCount }, (_, j) => {
            if (i === j) return 0;
            const dx = nodes[i].x - nodes[j].x;
            const dy = nodes[i].y - nodes[j].y;
            return Math.sqrt(dx * dx + dy * dy);
        })
    );

    // Build pheromone matrix (dynamic)
    tauMatrix = Array.from({ length: nodeCount }, () =>
        new Array(nodeCount).fill(INITIAL_PHEROMONE)
    );
}

/**
 * Returns an array of node indices [0, 1, 2...].
 * Needed by aco.js for iteration.
 */
export function getNodes() {
    return Array.from({ length: nodeCount }, (_, i) => i);
}

/**
 * Matches aco.js: graph.getPheromone(u, v)
 */
export function getPheromone(i, j) {
    return tauMatrix[i][j];
}

/**
 * Matches aco.js: graph.getDistance(u, v)
 */
export function getDistance(i, j) {
    return distMatrix[i][j];
}

/**
 * Matches aco.js: graph.setPheromone(u, v, value)
 */
export function setPheromone(i, j, value) {
    tauMatrix[i][j] = value;
    tauMatrix[j][i] = value; // Maintain symmetry for undirected graph
}

/**
 * Sets distance to Infinity so ants calculate a 0% probability for this path.
 */
export function blockEdge(i, j) {
    distMatrix[i][j] = Infinity;
    distMatrix[j][i] = Infinity;
}

/**
 * Restores a blocked road.
 */
export function unblockEdge(i, j, originalDist) {
    distMatrix[i][j] = originalDist;
    distMatrix[j][i] = originalDist;
}

export function getNodeCount() {
    return nodeCount;
}