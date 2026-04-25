import { MapCanvas } from './components/Canvas/MapCanvas.jsx'
import { ControlPanel } from './components/Controls/ControlPanel.jsx'
import { StatsPanel } from './components/Dashboard/StatsPanel.jsx'
import { useSwarm } from './hooks/useSwarm.jsx'
import { useServerConnection } from './hooks/useServerConnection.jsx'
import './styles/app.css'

function App() {
  const {
    nodes,
    edges,
    bestRoute,
    antRoutes,
    stats,
    params,
    mapSize,
    isRunning,
    start,
    stop,
    reset,
    loadDistanceMatrix,
  } = useSwarm()
  const serverConnection = useServerConnection({ onDistanceMatrix: loadDistanceMatrix })

  return (
    <main className="app-shell">
      <header className="hero-header">
        <p className="eyebrow">Swarm Route Lab</p>
        <h1>Rescue Route Optimization Console</h1>
        <p>
          Tune the swarm, watch route quality improve live, and monitor server-driven road state
          directly from the TSP matrix.
        </p>
        <p className={`server-badge ${serverConnection.isConnected ? 'online' : 'offline'}`}>
          Server {serverConnection.isConnected ? 'connected' : 'disconnected'}
        </p>
      </header>

      <section className="dashboard-grid">
        <ControlPanel
          isRunning={isRunning}
          onStart={start}
          onStop={stop}
          onReset={reset}
          serverStatus={serverConnection}
          onConnectServer={serverConnection.connect}
        />
        <StatsPanel stats={stats} serverStatus={serverConnection} />
      </section>

      <MapCanvas
        nodes={nodes}
        edges={edges}
        bestRoute={bestRoute}
        antRoutes={antRoutes}
        startNodeId={params.startNodeId}
        destinationNodeId={params.destinationNodeId}
        mapSize={mapSize}
      />
    </main>
  )
}

export default App
