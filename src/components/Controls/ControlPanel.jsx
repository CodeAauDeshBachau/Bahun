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
            Start Node
            <select
              value={params.startNodeId}
              onChange={(event) => onParamChange('startNodeId', event.target.value)}
            >
              {nodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.id}
                </option>
              ))}
            </select>
          </label>

          <label>
            Destination Node
            <select
              value={params.destinationNodeId}
              onChange={(event) => onParamChange('destinationNodeId', event.target.value)}
            >
              {nodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.id}
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

        <label>
          Evaporation Rate: {params.evaporationRate.toFixed(2)}
          <input
            type="range"
            min="0.01"
            max="0.9"
            step="0.01"
            value={params.evaporationRate}
            onChange={(event) => onParamChange('evaporationRate', Number(event.target.value))}
          />
        </label>

        {/* <label>
          Q (pheromone deposit): {params.q.toFixed(0)}
          <input
            type="range"
            min="10"
            max="300"
            step="5"
            value={params.q}
            onChange={(event) => onParamChange('q', Number(event.target.value))}
          />
        </label>

        <label>
          Stigmergic Boost: {params.stigmergicBoost.toFixed(1)}
          <input
            type="range"
            min="1"
            max="10"
            step="0.5"
            value={params.stigmergicBoost}
            onChange={(event) => onParamChange('stigmergicBoost', Number(event.target.value))}
          />
        </label>

        <label>
          Initial Pheromone: {params.initialPheromone.toFixed(2)}
          <input
            type="range"
            min="0.2"
            max="4"
            step="0.1"
            value={params.initialPheromone}
            onChange={(event) => onParamChange('initialPheromone', Number(event.target.value))}
          />
        </label> */}

        <p className="muted">Ants per pass (fixed): {params.antCount}</p>
      </div>
    </section>
  )
}
