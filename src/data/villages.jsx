import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../lib/constants.jsx'
import { edgeKey, euclidean } from '../lib/graph.jsx'

export const HOSPITAL_ID = 'H'

export const VILLAGES = [
  { id: 'H', name: 'H', x: 90, y: 310, kind: 'hospital' },
  { id: 'N1', name: 'N1', x: 180, y: 120 },
  { id: 'N2', name: 'N2', x: 230, y: 245 },
  { id: 'N3', name: 'N3', x: 220, y: 430 },
  { id: 'N4', name: 'N4', x: 320, y: 90 },
  { id: 'N5', name: 'N5', x: 360, y: 220 },
  { id: 'N6', name: 'N6', x: 355, y: 390 },
  { id: 'N7', name: 'N7', x: 460, y: 140 },
  { id: 'N8', name: 'N8', x: 500, y: 300 },
  { id: 'N9', name: 'N9', x: 470, y: 500 },
  { id: 'N10', name: 'N10', x: 595, y: 120 },
  { id: 'N11', name: 'N11', x: 640, y: 250 },
  { id: 'N12', name: 'N12', x: 610, y: 430 },
  { id: 'N13', name: 'N13', x: 740, y: 110 },
  { id: 'N14', name: 'N14', x: 790, y: 240 },
  { id: 'N15', name: 'N15', x: 760, y: 430 },
  { id: 'N16', name: 'N16', x: 890, y: 150 },
  { id: 'N17', name: 'N17', x: 930, y: 300 },
  { id: 'N18', name: 'N18', x: 900, y: 470 },
  { id: 'N19', name: 'N19', x: 1020, y: 220 },
  { id: 'N20', name: 'N20', x: 1040, y: 410 },
]

const connections = [
  ['H', 'N1'],
  ['H', 'N2'],
  ['H', 'N3'],
  ['N1', 'N4'],
  ['N2', 'N5'],
  ['N3', 'N6'],
  ['N4', 'N5'],
  ['N5', 'N6'],
  ['N4', 'N7'],
  ['N5', 'N8'],
  ['N6', 'N9'],
  ['N7', 'N8'],
  ['N8', 'N9'],
  ['N7', 'N10'],
  ['N8', 'N11'],
  ['N9', 'N12'],
  ['N10', 'N11'],
  ['N11', 'N12'],
  ['N10', 'N13'],
  ['N11', 'N14'],
  ['N12', 'N15'],
  ['N13', 'N14'],
  ['N14', 'N15'],
  ['N13', 'N16'],
  ['N14', 'N17'],
  ['N15', 'N18'],
  ['N16', 'N17'],
  ['N17', 'N18'],
  ['N16', 'N19'],
  ['N17', 'N20'],
  ['N18', 'N20'],
  ['N19', 'N20'],
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
