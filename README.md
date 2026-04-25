# Infinity - Multi-Device Swarm Route Lab

Infinity is a Vite + React frontend for swarm-based route optimization.

- Tabs on the same device synchronize with BroadcastChannel.
- Tabs across different devices synchronize through a websocket server.
- Server-side storage owns pheromone matrix and heuristic weights.

## Project Structure

```text
.
|-- .gitignore
|-- eslint.config.js
|-- implementation_plan.md
|-- index.html
|-- package-lock.json
|-- package.json
|-- README.md
|-- server/
|   |-- .env.example
|   |-- README.md
|   |-- package.json
|   `-- src/
|       `-- index.js
|-- src/
|   |-- App.jsx
|   |-- index.css
|   |-- main.jsx
|   |-- assets/
|   |   |-- hero.png
|   |   |-- react.svg
|   |   `-- vite.svg
|   |-- components/
|   |   |-- Canvas/
|   |   |   `-- MapCanvas.jsx
|   |   |-- Controls/
|   |   |   `-- ControlPanel.jsx
|   |   `-- Dashboard/
|   |       `-- StatsPanel.jsx
|   |-- data/
|   |   `-- villages.jsx
|   |-- hooks/
|   |   |-- useBroadcast.jsx
|   |   |-- useCanvas.jsx
|   |   |-- useServerConnection.jsx
|   |   `-- useSwarm.jsx
|   |-- lib/
|   |   |-- aco.jsx
|   |   |-- constants.jsx
|   |   |-- graph.jsx
|   |   `-- twoOpt.jsx
|   |-- styles/
|   |   `-- app.css
|   `-- workers/
|       `-- worker.js
|-- swarm_demo.html
`-- vite.config.js
```

## Run Frontend

```bash
npm install
npm run dev
```

## Run WebSocket Server

```bash
cd server
npm install
npm run dev
```

Default websocket endpoint: ws://localhost:8080
