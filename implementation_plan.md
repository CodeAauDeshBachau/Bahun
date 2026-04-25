# Decentralized Swarm Intelligence Engine — Project Setup

Set up the Vite + React project with Tailwind CSS, Web Workers, BroadcastChannel API scaffolding, and HTML5 Canvas visualization — fully matching the hackathon blueprint.

## Proposed Changes

### 1. Initialize Vite + React Project

Scaffold a new Vite React project in `e:\codewave\Bahun` using `npx create-vite`. Install Tailwind CSS v4 (the blueprint specifies Tailwind for rapid styling).

---

### 2. Project Directory Structure

```
e:\codewave\Bahun\
├── public/
│   └── favicon.svg
├── src/
│   ├── assets/                   # Static assets (images, icons)
│   ├── components/               # React UI components
│   │   ├── Canvas/
│   │   │   └── MapCanvas.jsx     # HTML5 Canvas — node/pheromone/route rendering
│   │   ├── Controls/
│   │   │   ├── ControlPanel.jsx  # Start/Stop/Reset buttons + parameter sliders
│   │   │   └── ChaosButton.jsx   # "Click to Break" road segment interaction
│   │   └── Dashboard/
│   │       └── StatsPanel.jsx    # Live stats: best distance, iteration count, tab count
│   ├── hooks/
│   │   ├── useSwarm.js           # Core orchestration hook (manages worker + channel)
│   │   ├── useBroadcast.js       # BroadcastChannel send/receive abstraction
│   │   └── useCanvas.js          # Canvas drawing helpers
│   ├── workers/
│   │   └── worker.js             # Web Worker — ACO + 2-opt math engine
│   ├── lib/
│   │   ├── aco.js                # ACO algorithm (probability formulas, pheromone update)
│   │   ├── twoOpt.js             # 2-opt local search refinement
│   │   ├── graph.js              # Graph data structure (nodes, edges, distances)
│   │   └── constants.js          # Algorithm parameters (α, β, evaporation rate, ant count)
│   ├── data/
│   │   └── villages.js           # Default scenario: 1 hospital + 20 villages with coordinates
│   ├── App.jsx                   # Root component — assembles Canvas + Controls + Dashboard
│   ├── App.css                   # Component-scoped styles (if needed beyond Tailwind)
│   ├── index.css                 # Tailwind directives + global styles
│   └── main.jsx                  # React entry point
├── index.html                    # Vite HTML entry
├── vite.config.js                # Vite config (with worker plugin settings)
├── tailwind.config.js            # Tailwind configuration
├── package.json
└── README.md                     # Updated with project overview + getting started
```

---

### 3. Key Files & Their Contents

#### [NEW] `src/lib/constants.js`
Algorithm hyperparameters extracted from the blueprint:
- `ALPHA = 1` (pheromone weight)
- `BETA = 5` (heuristic weight)  
- `EVAPORATION_RATE = 0.1`
- `ANT_COUNT = 50`
- `PHEROMONE_DEPOSIT = 100`
- `STIGMERGIC_BOOST = 5` (multiplier for injected pheromones from P2P)

#### [NEW] `src/lib/graph.js`
Graph utility: distance matrix, pheromone matrix, edge blocking (`distance = Infinity`).

#### [NEW] `src/lib/aco.js`
Core ACO probability formula: `P = [τ^α] * [η^β] / Σ([τ^α] * [η^β])` where `η = 1/d`. Implements `constructRoute(ant)` and `updatePheromones(routes)`.

#### [NEW] `src/lib/twoOpt.js`
2-opt refinement: scan route for crossing edges and uncross them.

#### [NEW] `src/workers/worker.js`
Web Worker entry. Runs ACO iterations in background, posts best route back to main thread. Accepts messages: `START`, `STOP`, `BLOCK_EDGE`, `INJECT_PHEROMONES`.

#### [NEW] `src/data/villages.js`
Default disaster scenario data — 1 Central Hospital + 20 villages with `{id, name, x, y}` coordinates.

#### [NEW] `src/hooks/useSwarm.js`
Orchestration hook: spawns worker, manages algorithm state, coordinates with broadcast channel.

#### [NEW] `src/hooks/useBroadcast.js`
Wraps `BroadcastChannel` API for Ring Topology P2P: sends "best route" to other tabs, receives and triggers stigmergic pheromone injection.

#### [NEW] `src/hooks/useCanvas.js`
Canvas drawing utilities: draw villages, pheromone trails (blue glow), optimal route (yellow glow), blocked edges (red flash).

#### [NEW] `src/components/Canvas/MapCanvas.jsx`
Full-screen HTML5 Canvas with village nodes, pulsing pheromone lines, and click-to-break interaction.

#### [NEW] `src/components/Controls/ControlPanel.jsx`
Start/Stop/Reset buttons + sliders for α, β, evaporation rate.

#### [NEW] `src/components/Controls/ChaosButton.jsx`
UI for the "break a road" chaos mechanic (may also work via canvas click).

#### [NEW] `src/components/Dashboard/StatsPanel.jsx`
Live statistics display: best distance, iteration #, active tabs, routes explored.

#### [MODIFY] `README.md`
Replace with comprehensive project overview, architecture diagram, team roles, and getting-started instructions.

---

### 4. Tech Stack Confirmation (from blueprint)

| Technology | Purpose |
|---|---|
| **Vite** | Build tool + dev server |
| **React** | UI framework |
| **Tailwind CSS** | Rapid styling |
| **HTML5 Canvas** | Hardware-accelerated map rendering |
| **Web Workers** | Multi-threaded ACO computation |
| **BroadcastChannel API** | Serverless P2P tab-to-tab communication |

---

## Open Questions

> [!IMPORTANT]
> **Tailwind CSS version**: The blueprint mentions Tailwind CSS. I'll use **Tailwind CSS v4** (latest). Let me know if you prefer v3.

> [!NOTE]
> **Village data**: I'll create a sample dataset with 1 hospital + 20 villages with random but realistic coordinates. You can replace this with real geographic data later.

## Verification Plan

### Automated Tests
- `npm run dev` starts successfully with no errors
- Web Worker loads and responds to `START` message
- BroadcastChannel sends/receives between two tabs
- Canvas renders village nodes

### Manual Verification
- Open the app in multiple browser tabs → verify P2P sync works
- Click "Start" → verify ACO iterations run and canvas updates
- Click a route segment → verify it turns red and route recalculates
