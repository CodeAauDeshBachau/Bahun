export function ControlPanel({ nodes, isRunning, onStart, onStop, onReset, params, onParamChange }) {
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
      </div>

      <div className="slider-group">
        <div className="selector-grid">
          <label>
            Start City
            <select
              value={params.startNodeId}
              onChange={(event) => onParamChange('startNodeId', event.target.value)}
            >
              {nodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.id} - {node.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Destination City
            <select
              value={params.destinationNodeId}
              onChange={(event) => onParamChange('destinationNodeId', event.target.value)}
            >
              {nodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.id} - {node.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label>
          Alpha (pheromone influence): {params.alpha.toFixed(2)}
          <input
            type="range"
            min="0.2"
            max="3"
            step="0.1"
            value={params.alpha}
            onChange={(event) => onParamChange('alpha', Number(event.target.value))}
          />
        </label>

        <label>
          Beta (distance influence): {params.beta.toFixed(2)}
          <input
            type="range"
            min="1"
            max="8"
            step="0.1"
            value={params.beta}
            onChange={(event) => onParamChange('beta', Number(event.target.value))}
          />
        </label>
      </div>
    </section>
  )
}
