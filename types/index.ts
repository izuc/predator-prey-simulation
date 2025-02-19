export interface Entity {
  id: string
  x: number
  y: number
  type: "grass" | "prey" | "predator"
  energy: number
  foodCount: number
}

export interface SimulationSettings {
  gridSize: number
  cellSize: number
  initialPrey: number
  initialPredators: number
  initialGrass: number
  tickRate: number
  grassRegrowChance: number
  preyBreedThreshold: number
  predatorBreedThreshold: number
  preySightRange: number
  predatorSightRange: number
}

