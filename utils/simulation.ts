export interface Entity {
  id: string;
  x: number;
  y: number;
  type: "grass" | "prey" | "predator";
  energy: number;
  age: number;
  lastReproduced?: number;
  foodEaten?: number;
  hunger: number; // Changed from optional to required with default 0
  isEating?: boolean;
  nutrition?: number; // How much food value this grass/prey has
}

export interface SimulationSettings {
  gridSize: number;
  cellSize: number;
  initialPrey: number;
  initialPredators: number;
  initialGrass: number;
  grassRegrowthRate: number;
  preyReproductionRate: number;
  predatorReproductionRate: number;
  preyEnergyGain: number;
  predatorEnergyGain: number;
  preyEnergyLoss: number;
  predatorEnergyLoss: number;
  preyMaxAge: number;
  predatorMaxAge: number;
  preyMaturityAge: number;
  predatorMaturityAge: number;
  carryingCapacityFactor: number;
  grassRegenerationTime: number;
}

export const initializeSimulation = (settings: SimulationSettings): Entity[] => {
  const entities: Entity[] = [];
  const positions = new Set<string>();

  // Adjusted settings for realism
  settings.initialGrass = 1200; // More initial grass
  settings.grassRegrowthRate = 0.03; // Faster grass growth
  settings.grassRegenerationTime = 15; // Faster regrowth
  settings.preyEnergyGain = 6; // More energy from grass
  settings.predatorEnergyGain = 20; // More energy from prey
  settings.preyEnergyLoss = 0.15; // Slower energy loss
  settings.predatorEnergyLoss = 0.3; // Slower energy loss
  settings.preyReproductionRate = 0.1; // Faster prey reproduction
  settings.predatorReproductionRate = 0.06; // Faster predator reproduction
  settings.carryingCapacityFactor = 0.25; // Higher sustainable population

  const initialPreyEnergy = 20;
  const initialPredatorEnergy = 30;

  // Initialize grass
  for (let i = 0; i < settings.initialGrass; i++) {
    let x, y;
    do {
      x = Math.floor(Math.random() * settings.gridSize);
      y = Math.floor(Math.random() * settings.gridSize);
    } while (positions.has(`${x},${y}`));
    positions.add(`${x},${y}`);
    entities.push({
      id: Math.random().toString(36).substr(2, 9),
      x,
      y,
      type: "grass",
      energy: 1,
      age: 0,
      hunger: 0, // Added for consistency, though unused for grass
      nutrition: Math.floor(Math.random() * 3) + 1,
    });
  }

  // Initialize prey
  for (let i = 0; i < settings.initialPrey; i++) {
    let x, y;
    do {
      x = Math.floor(Math.random() * settings.gridSize);
      y = Math.floor(Math.random() * settings.gridSize);
    } while (positions.has(`${x},${y}`));
    positions.add(`${x},${y}`);
    entities.push({
      id: Math.random().toString(36).substr(2, 9),
      x,
      y,
      type: "prey",
      energy: initialPreyEnergy,
      age: 0,
      foodEaten: 0,
      lastReproduced: 0,
      hunger: 0,
      isEating: false,
      nutrition: 5,
    });
  }

  // Initialize predators
  for (let i = 0; i < settings.initialPredators; i++) {
    let x, y;
    do {
      x = Math.floor(Math.random() * settings.gridSize);
      y = Math.floor(Math.random() * settings.gridSize);
    } while (positions.has(`${x},${y}`));
    positions.add(`${x},${y}`);
    entities.push({
      id: Math.random().toString(36).substr(2, 9),
      x,
      y,
      type: "predator",
      energy: initialPredatorEnergy,
      age: 0,
      foodEaten: 0,
      lastReproduced: 0,
      hunger: 0,
      isEating: false,
    });
  }

  return entities;
};

const moveEntity = (
  entity: Entity,
  entities: Entity[],
  settings: SimulationSettings,
  preyCount: number,
  predatorCount: number,
  maxPrey: number,
  maxPredators: number
): Entity | Entity[] | null => {
  entity.age++;

  // Age-based death
  if (
    (entity.type === "prey" && entity.age > settings.preyMaxAge) ||
    (entity.type === "predator" && entity.age > settings.predatorMaxAge)
  ) {
    return null;
  }

  const sightRange = entity.type === "prey" ? 2 : 4; // Increased predator sight range
  const nearbyEntities = entities.filter(
    (e) =>
      Math.abs(e.x - entity.x) <= sightRange &&
      Math.abs(e.y - entity.y) <= sightRange &&
      e.id !== entity.id
  );

  if (entity.type === "prey") {
    entity.hunger = Math.min(entity.hunger + 0.1, 100);
    entity.isEating = false;

    const nearbyPredators = nearbyEntities.filter((e) => e.type === "predator");
    if (nearbyPredators.length > 0) {
      const closestPredator = nearbyPredators.reduce((closest, current) => {
        const currentDist = Math.abs(current.x - entity.x) + Math.abs(current.y - entity.y);
        const closestDist = Math.abs(closest.x - entity.x) + Math.abs(closest.y - entity.y);
        return currentDist < closestDist ? current : closest;
      });
      const dx = entity.x - closestPredator.x;
      const dy = entity.y - closestPredator.y;
      entity.x = (entity.x + Math.sign(dx) + settings.gridSize) % settings.gridSize;
      entity.y = (entity.y + Math.sign(dy) + settings.gridSize) % settings.gridSize;
      entity.energy -= settings.preyEnergyLoss * 1.5;
    } else {
      const nearbyGrass = nearbyEntities.filter((e) => e.type === "grass" && e.energy > 0);
      if (nearbyGrass.length > 0) {
        const closestGrass = nearbyGrass.reduce((closest, current) => {
          const currentDist = Math.abs(current.x - entity.x) + Math.abs(current.y - entity.y);
          const closestDist = Math.abs(closest.x - entity.x) + Math.abs(closest.y - entity.y);
          return currentDist < closestDist ? current : closest;
        });
        if (entity.x === closestGrass.x && entity.y === closestGrass.y) {
          entity.isEating = true;
          const nutritionValue = closestGrass.nutrition || 1;
          entity.energy += settings.preyEnergyGain * nutritionValue;
          entity.foodEaten = (entity.foodEaten || 0) + 1;
          entity.hunger = Math.max(0, entity.hunger - 30 * nutritionValue);
          closestGrass.energy = 0;
          closestGrass.age = 0;
          closestGrass.nutrition = 0;
        } else {
          const dx = closestGrass.x - entity.x;
          const dy = closestGrass.y - entity.y;
          entity.x = (entity.x + Math.sign(dx) + settings.gridSize) % settings.gridSize;
          entity.y = (entity.y + Math.sign(dy) + settings.gridSize) % settings.gridSize;
        }
      } else if (Math.random() < 0.3) {
        const direction = Math.floor(Math.random() * 4);
        switch (direction) {
          case 0: entity.x = (entity.x + 1) % settings.gridSize; break;
          case 1: entity.x = (entity.x - 1 + settings.gridSize) % settings.gridSize; break;
          case 2: entity.y = (entity.y + 1) % settings.gridSize; break;
          case 3: entity.y = (entity.y - 1 + settings.gridSize) % settings.gridSize; break;
        }
      }
      entity.energy -= settings.preyEnergyLoss;
    }
  } else if (entity.type === "predator") {
    entity.hunger = Math.min(entity.hunger + 0.05, 100);
    entity.isEating = false;

    const nearbyPrey = nearbyEntities.filter((e) => e.type === "prey");
    if (nearbyPrey.length > 0) {
      const closestPrey = nearbyPrey.reduce((closest, current) => {
        const currentDist = Math.abs(current.x - entity.x) + Math.abs(current.y - entity.y);
        const closestDist = Math.abs(closest.x - entity.x) + Math.abs(closest.y - entity.y);
        return currentDist < closestDist ? current : closest;
      });
      const dx = closestPrey.x - entity.x;
      const dy = closestPrey.y - entity.y;
      const moveSteps = entity.hunger > 50 ? 2 : 1; // Faster when hungry
      entity.x = (entity.x + Math.sign(dx) * moveSteps + settings.gridSize) % settings.gridSize;
      entity.y = (entity.y + Math.sign(dy) * moveSteps + settings.gridSize) % settings.gridSize;
      if (entity.x === closestPrey.x && entity.y === closestPrey.y) {
        entity.isEating = true;
        const nutritionValue = closestPrey.nutrition || 5;
        entity.energy += settings.predatorEnergyGain * nutritionValue;
        entity.foodEaten = (entity.foodEaten || 0) + 1;
        entity.hunger = Math.max(0, entity.hunger - 60);
        closestPrey.energy = -1; // Mark for removal
      }
    } else if (Math.random() < 0.3) {
      const direction = Math.floor(Math.random() * 4);
      switch (direction) {
        case 0: entity.x = (entity.x + 1) % settings.gridSize; break;
        case 1: entity.x = (entity.x - 1 + settings.gridSize) % settings.gridSize; break;
        case 2: entity.y = (entity.y + 1) % settings.gridSize; break;
        case 3: entity.y = (entity.y - 1 + settings.gridSize) % settings.gridSize; break;
      }
    }
    entity.energy -= settings.predatorEnergyLoss;
  }

  if (entity.energy <= 0 || (entity.type !== "grass" && entity.hunger >= 100)) {
    return null;
  }

  const reproductionDelay = entity.type === "prey" ? 10 : 15;
  if (
    entity.energy >= (entity.type === "prey" ? 15 : 20) &&
    entity.age >= (entity.type === "prey" ? settings.preyMaturityAge : settings.predatorMaturityAge) &&
    (!entity.lastReproduced || entity.age - entity.lastReproduced >= reproductionDelay) &&
    entity.hunger < 50
  ) {
    const populationFactor =
      entity.type === "prey"
        ? Math.min(1, 2.0 - preyCount / maxPrey)
        : Math.min(1, 3.0 - predatorCount / maxPredators);

    // Calculate final reproduction chance in a single expression
    const reproductionChance = 
      // Base rate with type multiplier
      (entity.type === "prey" ? settings.preyReproductionRate * 3.0 : settings.predatorReproductionRate * 6.0)
      // Population control factor
      * populationFactor
      // Food eaten factor
      * Math.min((entity.foodEaten || 0) / 1, 1)
      // Eating bonus for predators (1.0 for prey, 2.0 for eating predators, 1.0 for non-eating predators)
      * (entity.type === "predator" && entity.isEating ? 2.0 : 1.0);

    if (Math.random() < reproductionChance) {
      const childEnergy = entity.energy * 0.5;
      entity.energy *= 0.5;
      entity.lastReproduced = entity.age;
      return [
        entity,
        {
          ...entity,
          id: Math.random().toString(36).substr(2, 9),
          energy: childEnergy,
          age: 0,
          foodEaten: 0,
          lastReproduced: 0,
          hunger: 0,
          isEating: false,
        },
      ];
    }
  }

  return entity;
};

export const updateSimulation = (
  entities: Entity[],
  settings: SimulationSettings
): { newEntities: Entity[]; events: string[] } => {
  const newEntities: Entity[] = [];
  const events: string[] = [];

  const preyCount = entities.filter((e) => e.type === "prey").length;
  const predatorCount = entities.filter((e) => e.type === "predator").length;
  const grassCount = entities.filter((e) => e.type === "grass" && e.energy > 0).length;

  const maxPrey = Math.floor(settings.carryingCapacityFactor * grassCount);
  const maxPredators = Math.floor(settings.carryingCapacityFactor * preyCount);

  entities.forEach((entity) => {
    if (entity.type === "grass") {
      if (entity.energy === 0) {
        entity.age++;
        if (entity.age >= settings.grassRegenerationTime) {
          entity.energy = 1;
          entity.age = 0;
          entity.nutrition = Math.floor(Math.random() * 3) + 1;
          events.push(`Grass regrew at (${entity.x}, ${entity.y})`);
        }
      }
      newEntities.push(entity);
    }
  });

  const movingEntities = entities.filter((e) => e.type !== "grass").sort(() => Math.random() - 0.5);
  movingEntities.forEach((entity) => {
    if (entity.energy <= 0) return;
    const updatedEntity = moveEntity(entity, entities, settings, preyCount, predatorCount, maxPrey, maxPredators);
    if (updatedEntity) {
      if (Array.isArray(updatedEntity)) {
        newEntities.push(...updatedEntity);
        events.push(`New ${entity.type} born at (${entity.x}, ${entity.y})`);
      } else {
        newEntities.push(updatedEntity);
        if (updatedEntity.isEating) {
          events.push(`${updatedEntity.type} ate at (${updatedEntity.x}, ${updatedEntity.y})`);
        }
      }
    } else {
      events.push(`${entity.type} died at (${entity.x}, ${entity.y}) from ${entity.energy <= 0 ? "starvation" : "age"}`);
    }
  });

  if (Math.random() < settings.grassRegrowthRate) {
    const occupiedPositions = new Set(newEntities.map((e) => `${e.x},${e.y}`)); // Fixed typo: was `${e.x},${y}`
    let x: number, y: number; // Explicitly typed x and y
    do {
      x = Math.floor(Math.random() * settings.gridSize);
      y = Math.floor(Math.random() * settings.gridSize);
    } while (occupiedPositions.has(`${x},${y}`));
    newEntities.push({
      id: Math.random().toString(36).substr(2, 9),
      x,
      y,
      type: "grass",
      energy: 1,
      age: 0,
      hunger: 0, // Added for consistency
      nutrition: Math.floor(Math.random() * 3) + 1,
    });
    events.push(`New grass grew at (${x}, ${y})`);
  }

  return { newEntities, events };
};