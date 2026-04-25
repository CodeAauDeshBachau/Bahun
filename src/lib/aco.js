// Core Ant Colony Optimization logic
// src/lib/aco.js

import { ALPHA, BETA, EVAPORATION_RATE, Q } from './constants.js';

/**
 * Constructs a route for a single ant.
 * @param {string[]|number[]} nodes - Array of node identifiers.
 * @param {Object} graph - Graph object with getDistance and getPheromone methods.
 * @param {number|string} startNode - The starting node identifier.
 * @returns {Array} The constructed route (array of nodes, closing the loop).
 */
export function constructRoute(nodes, graph, startNode) {
    const route = [startNode];
    const unvisited = new Set(nodes);
    unvisited.delete(startNode);

    let currentNode = startNode;

    while (unvisited.size > 0) {
        let nextNode = selectNextNode(currentNode, unvisited, graph);
        route.push(nextNode);
        unvisited.delete(nextNode);
        currentNode = nextNode;
    }

    // Return to the start to complete the loop
    route.push(startNode);
    return route;
}

/**
 * Probabilistically selects the next node based on pheromones and distance heuristic.
 */
function selectNextNode(currentNode, unvisited, graph) {
    let probabilities = [];
    let sum = 0;

    for (const node of unvisited) {
        const distance = graph.getDistance(currentNode, node);

        // Dynamic Adaptation (Chaos Mechanic):
        // If distance is Infinity (blocked path), heuristic becomes 0,
        // which makes the probability exactly 0%.
        let heuristic = 0;
        if (distance !== Infinity && distance !== 0) {
            heuristic = 1 / distance;
        }

        const pheromone = graph.getPheromone(currentNode, node);

        // P = [τ^α] * [η^β]
        const numerator = Math.pow(pheromone, ALPHA) * Math.pow(heuristic, BETA);
        probabilities.push({ node, numerator });
        sum += numerator;
    }

    // Handle edge case where all paths might be blocked
    if (sum === 0) {
        const nodesArr = Array.from(unvisited);
        return nodesArr[Math.floor(Math.random() * nodesArr.length)];
    }

    // Roulette wheel selection
    let randomValue = Math.random() * sum;
    for (const p of probabilities) {
        randomValue -= p.numerator;
        if (randomValue <= 0) {
            return p.node;
        }
    }

    // Fallback (should rarely hit due to floating point precision)
    return probabilities[probabilities.length - 1].node;
}

/**
 * Calculates the total distance of a given route.
 */
export function calculateRouteDistance(route, graph) {
    let distance = 0;
    for (let i = 0; i < route.length - 1; i++) {
        distance += graph.getDistance(route[i], route[i + 1]);
    }
    return distance;
}

/**
 * Global pheromone update based on all routes explored in the current iteration.
 * @param {Object} graph - Graph object to update.
 * @param {Array} ants - Array of objects { route, distance }.
 */
export function updatePheromones(graph, ants) {
    const nodes = graph.getNodes();

    // 1. Evaporation
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) { // assuming undirected graph
            const u = nodes[i];
            const v = nodes[j];
            const currentPheromone = graph.getPheromone(u, v);

            // Apply evaporation, ensuring we don't drop below a tiny minimum (prevents 0 pheromone lock-in)
            const newPheromone = Math.max(0.0001, currentPheromone * (1 - EVAPORATION_RATE));
            graph.setPheromone(u, v, newPheromone);
            graph.setPheromone(v, u, newPheromone);
        }
    }

    // 2. Deposit
    for (const ant of ants) {
        // Skip depositing if route is invalid (contains blocked edges resulting in Infinity)
        if (ant.distance === Infinity) continue;

        const depositAmount = Q / ant.distance;

        for (let i = 0; i < ant.route.length - 1; i++) {
            const u = ant.route[i];
            const v = ant.route[i + 1];

            const currentPheromone = graph.getPheromone(u, v);
            graph.setPheromone(u, v, currentPheromone + depositAmount);
            graph.setPheromone(v, u, currentPheromone + depositAmount);
        }
    }
}
