import { Entity, SimulationSettings } from "./simulation"

interface SimulationState {
  entities: Entity[];
  settings: SimulationSettings;
  stats: {
    prey: number;
    predators: number;
    grassCoverage: number;
    predatorKills: number;
  };
  timestamp: number;
}

const DB_NAME = 'predator-prey-sim';
const STORE_NAME = 'simulation-state';
const DB_VERSION = 1;
const SINGLE_KEY = 'current-state';

let dbInstance: IDBDatabase | null = null;

const getDB = async (): Promise<IDBDatabase> => {
  if (dbInstance) {
    return dbInstance;
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Error opening database:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onblocked = () => {
      console.error('Database blocked. Please close other tabs with this site open');
      reject(new Error('Database blocked'));
    };
  });
};

const closeDB = () => {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
};

const isValidState = (state: any): state is SimulationState => {
  return (
    state &&
    Array.isArray(state.entities) &&
    typeof state.timestamp === 'number' &&
    state.settings &&
    state.stats &&
    typeof state.stats.prey === 'number' &&
    typeof state.stats.predators === 'number' &&
    typeof state.stats.grassCoverage === 'number' &&
    typeof state.stats.predatorKills === 'number'
  );
};

export const saveSimulationState = async (state: SimulationState): Promise<void> => {
  if (!state || !isValidState(state)) {
    console.error('Invalid state object:', state);
    throw new Error('Invalid simulation state');
  }

  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const stateToSave = {
        ...state,
        timestamp: Date.now()
      };

      const request = store.put(stateToSave, SINGLE_KEY);

      request.onsuccess = () => {
        console.debug('State saved successfully');
        resolve();
      };

      request.onerror = () => {
        console.error('Error saving state:', request.error);
        reject(request.error);
      };

      transaction.oncomplete = () => {
        console.debug('Transaction completed');
      };

      transaction.onerror = () => {
        console.error('Transaction error:', transaction.error);
        reject(transaction.error);
      };
    });
  } catch (error) {
    console.error('Error in saveSimulationState:', error);
    throw error;
  } finally {
    closeDB();
  }
};

export const loadSimulationState = async (): Promise<SimulationState | null> => {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(SINGLE_KEY);

      request.onsuccess = () => {
        const state = request.result;
        if (state && isValidState(state)) {
          console.debug('State loaded successfully');
          resolve(state);
        } else {
          console.debug('No valid state found');
          resolve(null);
        }
      };

      request.onerror = () => {
        console.error('Error loading state:', request.error);
        reject(request.error);
      };

      transaction.oncomplete = () => {
        console.debug('Load transaction completed');
      };

      transaction.onerror = () => {
        console.error('Load transaction error:', transaction.error);
        reject(transaction.error);
      };
    });
  } catch (error) {
    console.error('Error in loadSimulationState:', error);
    return null;
  } finally {
    closeDB();
  }
}; 