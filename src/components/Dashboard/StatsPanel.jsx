function formatDistance(value) {
  if (!Number.isFinite(value)) {
    return 'Waiting...'
  }
  return value.toFixed(2)
}

export function StatsPanel({ stats, serverStatus }) {
  const connectionLabel = serverStatus.isConnected ? 'Connected' : 'Disconnected'

  return (
    <section className="panel stats-panel">
      <p className="panel-label">Live Stats</p>
      <div className="stats-grid">
        <div>
          <span className="metric-title">Best Distance</span>
          <strong>{formatDistance(stats.bestDistance)}</strong>
        </div>
        <div>
          <span className="metric-title">Iteration</span>
          <strong>{stats.iteration}</strong>
        </div>
        <div>
          <span className="metric-title">Routes Explored</span>
          <strong>{stats.routesExplored}</strong>
        </div>
        <div>
          <span className="metric-title">Active Tabs</span>
          <strong>{stats.activeTabs}</strong>
        </div>
        <div>
          <span className="metric-title">Server</span>
          <strong className={serverStatus.isConnected ? 'status-online' : 'status-offline'}>
            {connectionLabel}
          </strong>
        </div>
      </div>
    </section>
  )
}
