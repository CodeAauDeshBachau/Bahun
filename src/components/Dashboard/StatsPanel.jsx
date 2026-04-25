function formatDistance(value) {
  if (!Number.isFinite(value)) {
    return 'Waiting...'
  }
  return value.toFixed(2)
}

function formatRoute(route) {
  if (!Array.isArray(route) || route.length === 0) {
    return 'Waiting...'
  }

  return route.join(' -> ')
}

export function StatsPanel({ stats, serverStatus, goBestRoute = [], goBestDistance }) {
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
          <span className="metric-title">Server</span>
          <strong className={serverStatus.isConnected ? 'status-online' : 'status-offline'}>
            {connectionLabel}
          </strong>
        </div>
        <div className="stats-wide-item">
          <span className="metric-title">Global Best Distance</span>
          <strong>{formatDistance(goBestDistance)}</strong>
        </div>
        <div className="stats-wide-item">
          <span className="metric-title">Global Best Path</span>
          <strong className="route-text">{formatRoute(goBestRoute)}</strong>
        </div>
      </div>
    </section>
  )
}
