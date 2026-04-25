import { MapCanvas } from './components/Canvas/MapCanvas.jsx'
import { ControlPanel } from './components/Controls/ControlPanel.jsx'
import { StatsPanel } from './components/Dashboard/StatsPanel.jsx'
import { useSwarm } from './hooks/useSwarm.jsx'
import './styles/app.css'

function App() {
  const {
    nodes,
    edges,
    bestRoute,
    stats,
    params,
    mapSize,
    isRunning,
    start,
    stop,
    reset,
    setParameter,
  } = useSwarm()

  return (
    <main className="app-shell">
      <header className="hero-header">
        <p className="eyebrow">Swarm Route Lab</p>
        <h1>Rescue Route Optimization Console</h1>
        <p>
          Tune the swarm, watch route quality improve live, and click any road on the map to test
          alternate rescue paths.
        </p>
      </header>

      <section className="dashboard-grid">
        <ControlPanel
          nodes={nodes}
          isRunning={isRunning}
          onStart={start}
          onStop={stop}
          onReset={reset}
          params={params}
          onParamChange={setParameter}
        />
        <StatsPanel stats={stats} />
      </section>

      <MapCanvas
        nodes={nodes}
        edges={edges}
        bestRoute={bestRoute}
        mapSize={mapSize}
      />
    </main>
  )
}

export default App
