// Algorithm hyperparameters
// src/lib/constants.js

export const ALPHA = 1;          // pheromone influence
export const BETA = 5;           // distance influence (higher = greedier)
export const EVAPORATION_RATE = 0.1;
export const ANT_COUNT = 3;      // 3 ants per tab as per your design
export const Q = 100;            // pheromone deposit constant
export const STIGMERGIC_BOOST = 5; // multiplier when injecting peer's route
export const INITIAL_PHEROMONE = 1.0;
export const CANVAS_WIDTH = 1120;
export const CANVAS_HEIGHT = 620;