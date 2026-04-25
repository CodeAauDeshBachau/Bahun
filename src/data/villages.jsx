import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../lib/constants.jsx'
import { edgeKey, euclidean } from '../lib/graph.jsx'

export const HOSPITAL_ID = 0

export const VILLAGES = [
  { id: 0, name: 'Node 0', x: 100, y: 100 },
  { id: 1, name: 'Node 1', x: 300, y: 150 },
  { id: 2, name: 'Node 2', x: 500, y: 200 },
  { id: 3, name: 'Node 3', x: 700, y: 150 },
  { id: 4, name: 'Node 4', x: 900, y: 100 },
  { id: 5, name: 'Node 5', x: 200, y: 400 },
  { id: 6, name: 'Node 6', x: 400, y: 450 },
  { id: 7, name: 'Node 7', x: 600, y: 400 },
  { id: 8, name: 'Node 8', x: 800, y: 450 },
  { id: 9, name: 'Node 9', x: 950, y: 400 },
]

// Complete TSP network - every node connected to every other node
const connections = [
  [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [0, 8], [0, 9],
  [1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [1, 7], [1, 8], [1, 9],
  [2, 3], [2, 4], [2, 5], [2, 6], [2, 7], [2, 8], [2, 9],
  [3, 4], [3, 5], [3, 6], [3, 7], [3, 8], [3, 9],
  [4, 5], [4, 6], [4, 7], [4, 8], [4, 9],
  [5, 6], [5, 7], [5, 8], [5, 9],
  [6, 7], [6, 8], [6, 9],
  [7, 8], [7, 9],
  [8, 9],
]

const nodeMap = Object.fromEntries(VILLAGES.map((node) => [node.id, node]))

export function createInitialEdges() {
  return connections.map(([from, to]) => ({
    id: edgeKey(from, to),
    from,
    to,
    blocked: false,
    pheromone: 1,
    distance: euclidean(nodeMap[from], nodeMap[to]),
  }))
}

export const INITIAL_EDGES = createInitialEdges()
export const MAP_SIZE = { width: CANVAS_WIDTH, height: CANVAS_HEIGHT }
