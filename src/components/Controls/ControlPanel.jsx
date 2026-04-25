import { useState } from 'react'

const MIN_NODE_COUNT = 2
const MAX_NODE_COUNT = 100

function clampNodeCount(value) {
  const next = Number(value)
  if (!Number.isFinite(next)) {
    return MIN_NODE_COUNT
  }

  return Math.min(MAX_NODE_COUNT, Math.max(MIN_NODE_COUNT, Math.floor(next)))
}

export function ControlPanel({
  isRunning,
  onStart,
  onStop,
  onReset,
  serverStatus,
  onConnectServer,
  onGenerateAndRelayWeights,
}) {
  const [nodeCount, setNodeCount] = useState(10)

  const isConnected = serverStatus.isConnected

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

      <div className="matrix-generator">
        <label htmlFor="node-count-input" className="node-count-label">
          Node/City Count (2-100)
        </label>
        <div className="matrix-generator-row">
          <input
            id="node-count-input"
            type="number"
            min={MIN_NODE_COUNT}
            max={MAX_NODE_COUNT}
            value={nodeCount}
            onChange={(event) => setNodeCount(clampNodeCount(event.target.value))}
            onBlur={() => setNodeCount((current) => clampNodeCount(current))}
          />
          <button
            type="button"
              onClick={() => onGenerateAndRelayWeights?.(clampNodeCount(nodeCount))}
            disabled={!isConnected}
          >
              Generate and Relay Weights
          </button>
        </div>
      </div>

      <p className="muted">
        Server generates a symmetric TSP matrix with random weights (1-500). Exactly one road is
        blocked with weight 0.
      </p>
    </section>
  )
}
