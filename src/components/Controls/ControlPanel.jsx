export function ControlPanel({ isRunning, onStart, onStop, onReset, serverStatus, onConnectServer }) {
  return (
    <section className="panel control-panel">
      <p className="panel-label">Control Panel</p>

      <div className="control-actions">
        <button type="button" onClick={onStart} disabled={isRunning}>
          Start
        </button>
        <button type="button" onClick={onStop} disabled={!isRunning}>
          Stop
        </button>
        <button type="button" className="secondary" onClick={onReset}>
          Reset
        </button>
        <button
          type="button"
          onClick={onConnectServer}
          disabled={serverStatus.isConnected || serverStatus.isConnecting}
        >
          {serverStatus.isConnected
            ? 'Server Connected'
            : serverStatus.isConnecting
              ? 'Connecting...'
              : 'Connect to Server'}
        </button>
      </div>

      <p className="muted">Pheromone matrix and heuristic weights are managed by the server.</p>
    </section>
  )
}
