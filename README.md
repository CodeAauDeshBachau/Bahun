# Decentralized Swarm Intelligence Engine (Frontend)

This frontend now follows the updated hackathon blueprint with a component layout centered around:

1. HTML5 Canvas map visualization
2. Swarm control panel
3. Live stats dashboard
4. Web Worker and BroadcastChannel scaffolding

The existing visual theme (palette + typography) is preserved.

## Implemented Frontend Architecture

The app is structured to match the requested direction while keeping implementation lightweight and hackathon-friendly.

### Components

1. src/components/Canvas/MapCanvas.jsx
2. src/components/Controls/ControlPanel.jsx
3. src/components/Controls/ChaosButton.jsx
4. src/components/Dashboard/StatsPanel.jsx

### Hooks

1. src/hooks/useSwarm.jsx: orchestrates worker lifecycle, controls, and app state.
2. src/hooks/useBroadcast.jsx: BroadcastChannel tab sync (best route + blocked edges + active tabs).
3. src/hooks/useCanvas.jsx: canvas drawing pipeline for nodes, pheromone-like trails, blocked roads, and best route.

### Data, Logic, Worker Scaffolding

1. src/data/villages.jsx: 1 hospital + 20 villages + initial edge graph.
2. src/lib/constants.jsx: algorithm/control constants.
3. src/lib/graph.jsx: graph utilities (distance, matrix, edge keys).
4. src/lib/aco.jsx: lightweight route-construction logic with pheromone/heuristic weighting.
5. src/lib/twoOpt.jsx: 2-opt refinement utility.
6. src/workers/worker.js: background iteration loop with START/STOP/RESET/BLOCK_EDGE/INJECT_PHEROMONES/CONFIG messages.

## Current Frontend Features

1. Start, Stop, Reset controls.
2. Alpha/Beta/Evaporation sliders.
3. Chaos button to break a random road.
4. Click-to-break interaction directly on Canvas road segments.
5. Live stats panel for best distance, iteration count, routes explored, active tabs.
6. Cross-tab BroadcastChannel updates for best route and blocked roads.

## Notes on Scope

1. This is a frontend-first scaffold aligned to the blueprint.
2. Worker + ACO are implemented as lightweight practical scaffolding suitable for hackathon iteration.
3. Tailwind was not introduced in this pass to preserve and reuse your existing custom theme/styling system.

## Theme

Typography:

1. Times New Roman

Palette:

1. #FFF8F0
2. #C08552
3. #8C5A3C
4. #4B2E2B

## Run

1. npm install
2. npm run dev

## Verification Checklist

1. Open one tab and click Start: iteration and routes explored should update.
2. Open two tabs: active tab count should rise and best-route updates should propagate.
3. Click a road in the canvas: segment should toggle blocked state and broadcast to other tabs.
