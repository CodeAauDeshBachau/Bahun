import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../lib/constants.jsx'
import { edgeKey, euclidean } from '../lib/graph.jsx'

export const HOSPITAL_ID = 'H'

export const VILLAGES = [
  { id: 'H', name: 'Central Hospital', x: 90, y: 310, kind: 'hospital' },
  { id: 'V1', name: 'Village 1', x: 180, y: 120 },
  { id: 'V2', name: 'Village 2', x: 230, y: 245 },
  { id: 'V3', name: 'Village 3', x: 220, y: 430 },
  { id: 'V4', name: 'Village 4', x: 320, y: 90 },
  { id: 'V5', name: 'Village 5', x: 360, y: 220 },
  { id: 'V6', name: 'Village 6', x: 355, y: 390 },
  { id: 'V7', name: 'Village 7', x: 460, y: 140 },
  { id: 'V8', name: 'Village 8', x: 500, y: 300 },
  { id: 'V9', name: 'Village 9', x: 470, y: 500 },
  { id: 'V10', name: 'Village 10', x: 595, y: 120 },
  { id: 'V11', name: 'Village 11', x: 640, y: 250 },
  { id: 'V12', name: 'Village 12', x: 610, y: 430 },
  { id: 'V13', name: 'Village 13', x: 740, y: 110 },
  { id: 'V14', name: 'Village 14', x: 790, y: 240 },
  { id: 'V15', name: 'Village 15', x: 760, y: 430 },
  { id: 'V16', name: 'Village 16', x: 890, y: 150 },
  { id: 'V17', name: 'Village 17', x: 930, y: 300 },
  { id: 'V18', name: 'Village 18', x: 900, y: 470 },
  { id: 'V19', name: 'Village 19', x: 1020, y: 220 },
  { id: 'V20', name: 'Village 20', x: 1040, y: 410 },
]

const connections = [
  ['H', 'V1'],
  ['H', 'V2'],
  ['H', 'V3'],
  ['V1', 'V4'],
  ['V2', 'V5'],
  ['V3', 'V6'],
  ['V4', 'V5'],
  ['V5', 'V6'],
  ['V4', 'V7'],
  ['V5', 'V8'],
  ['V6', 'V9'],
  ['V7', 'V8'],
  ['V8', 'V9'],
  ['V7', 'V10'],
  ['V8', 'V11'],
  ['V9', 'V12'],
  ['V10', 'V11'],
  ['V11', 'V12'],
  ['V10', 'V13'],
  ['V11', 'V14'],
  ['V12', 'V15'],
  ['V13', 'V14'],
  ['V14', 'V15'],
  ['V13', 'V16'],
  ['V14', 'V17'],
  ['V15', 'V18'],
  ['V16', 'V17'],
  ['V17', 'V18'],
  ['V16', 'V19'],
  ['V17', 'V20'],
  ['V18', 'V20'],
  ['V19', 'V20'],
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
