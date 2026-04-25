import { MapCanvas } from './components/Canvas/MapCanvas.jsx'
import { ControlPanel } from './components/Controls/ControlPanel.jsx'
import { StatsPanel } from './components/Dashboard/StatsPanel.jsx'
import { useSwarm } from './hooks/useSwarm.jsx'
import { useServerConnection } from './hooks/useServerConnection.jsx'
import { Toaster, toast } from 'react-hot-toast'
import './styles/app.css'

function App() {
  const {
    nodes,
    edges,
    bestRoute,
    goBestRoute,
    goBestDistance,
    antRoutes,
    stats,
    params,
    mapSize,
    isRunning,
    start,
    stop,
    reset,
    clearGraph,
    loadDistanceMatrix,
    applyGoBestRoute,
  } = useSwarm()
  const serverConnection = useServerConnection({
    onDistanceMatrix: loadDistanceMatrix,
    onConnected: clearGraph,
    onGoBestRoute: applyGoBestRoute,
  })

  const handleReset = () => {
    serverConnection.resetGraph?.()
    clearGraph()
  }

  const handleGenerateAndRelayWeights = (nodeCount) => {
    const generated = serverConnection.generateWeights?.(nodeCount)
    if (!generated) {
      toast.error('Connect to the server before generating weights')
      return
    }

    const relayed = serverConnection.relayWeights?.()
    if (!relayed) {
      toast.success(`Generated weights for ${nodeCount} nodes`)
      toast.error('Could not relay weights to the Go server')
      return
    }

    toast.success(`Generated and relayed weights for ${nodeCount} nodes`)
  }

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
          onReset={handleReset}
          serverStatus={serverConnection}
          onConnectServer={serverConnection.connect}
          onGenerateAndRelayWeights={handleGenerateAndRelayWeights}
        />
        <StatsPanel
          stats={stats}
          serverStatus={serverConnection}
          goBestRoute={goBestRoute}
          goBestDistance={goBestDistance}
        />
      </section>

      <MapCanvas
        nodes={nodes}
        edges={edges}
        bestRoute={bestRoute}
        goBestRoute={goBestRoute}
        antRoutes={antRoutes}
        startNodeId={params.startNodeId}
        destinationNodeId={params.destinationNodeId}
        mapSize={mapSize}
      />

      <Toaster
        position="top-center"
        toastOptions={{
          duration: 2600,
          style: {
            background: '#fff8f0',
            color: '#4b2e2b',
            border: '1px solid rgba(99, 78, 65, 0.25)',
            boxShadow: '0 10px 24px rgba(45, 34, 26, 0.18)',
            fontFamily: "'Times New Roman', Times, serif",
          },
          success: {
            iconTheme: {
              primary: '#2f6b43',
              secondary: '#fff8f0',
            },
          },
          error: {
            iconTheme: {
              primary: '#b23a3a',
              secondary: '#fff8f0',
            },
          },
        }}
      />
    </main>
  )
}

export default App
