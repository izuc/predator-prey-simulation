"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Controls } from "./Controls"
import { PopulationGraph } from "./PopulationGraph"
import { initializeSimulation, updateSimulation, type Entity, type SimulationSettings } from "../utils/simulation"
import { SimulationControls } from "./SimulationControls"
import { loadSimulationState, saveSimulationState } from "../utils/db"

const PredatorPreySimulation = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [entities, setEntities] = useState<Entity[]>([])
  const [stats, setStats] = useState({ prey: 0, predators: 0, grassCoverage: 0, predatorKills: 0 })
  const [logs, setLogs] = useState<string[]>([])
  const [speed, setSpeed] = useState<"very-slow" | "slow" | "normal" | "fast" | "very-fast">("normal")
  const [debugInfo, setDebugInfo] = useState<string>("")
  const MAX_LOG_SIZE = 100 // Maximum number of log entries to keep
  const [showStats, setShowStats] = useState(true)
  const [showSettings, setShowSettings] = useState(true)
  const [showLogs, setShowLogs] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasLoadedInitialState, setHasLoadedInitialState] = useState(false)

  const [settings, setSettings] = useState<SimulationSettings>({
    gridSize: 50,
    cellSize: 6,
    initialPrey: 50,
    initialPredators: 10,
    initialGrass: 500,
    grassRegrowthRate: 0.05,
    preyReproductionRate: 0.1,
    predatorReproductionRate: 0.05,
    preyEnergyGain: 5,
    predatorEnergyGain: 15,
    preyEnergyLoss: 0.1,
    predatorEnergyLoss: 0.3,
    preyMaxAge: 100,
    predatorMaxAge: 150,
    preyMaturityAge: 10,
    predatorMaturityAge: 20,
    carryingCapacityFactor: 0.1,
    grassRegenerationTime: 20,
  })

  // Save current state
  const saveCurrentState = useCallback(async (currentEntities: Entity[], forceUpdate = false) => {
    if (!currentEntities.length && !forceUpdate) return;
    
    try {
      const currentStats = {
        prey: currentEntities.filter((e) => e.type === "prey").length,
        predators: currentEntities.filter((e) => e.type === "predator").length,
        grassCoverage: Math.round((currentEntities.filter((e) => e.type === "grass" && e.energy > 0).length / (settings.gridSize * settings.gridSize)) * 100),
        predatorKills: stats.predatorKills
      };

      await saveSimulationState({
        entities: currentEntities,
        settings,
        stats: currentStats,
        timestamp: Date.now()
      });
      console.debug('State saved with', currentEntities.length, 'entities');
    } catch (error) {
      console.error("Error saving state:", error);
      setError("Failed to save simulation state");
    }
  }, [settings, stats.predatorKills]);

  // Load saved state on component mount
  useEffect(() => {
    const loadSavedState = async () => {
      if (typeof window === 'undefined') return;
      
      try {
        setIsLoading(true);
        const savedState = await loadSimulationState();
        console.debug('Loaded state:', savedState ? 'found' : 'not found');
        
        if (savedState && savedState.entities.length > 0) {
          setEntities(savedState.entities);
          setSettings(savedState.settings);
          setStats(savedState.stats);
          setLogs(prev => [...prev, "Loaded previous simulation state"]);
          console.debug('Restored', savedState.entities.length, 'entities');
        } else {
          console.debug('No saved state found, initializing new simulation');
          const initialEntities = initializeSimulation(settings);
          setEntities(initialEntities);
          await saveCurrentState(initialEntities, true);
          setLogs(prev => [...prev, "Started new simulation"]);
        }
        setHasLoadedInitialState(true);
      } catch (error) {
        console.error("Error loading saved state:", error);
        setError("Failed to load simulation state");
        const initialEntities = initializeSimulation(settings);
        setEntities(initialEntities);
        await saveCurrentState(initialEntities, true);
        setLogs(prev => [...prev, "Error loading saved state, started new simulation"]);
        setHasLoadedInitialState(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadSavedState();
  }, []); // Empty dependency array to run only once on mount

  // Update dimensions when window resizes
  useEffect(() => {
    const updateDimensions = () => {
      if (!canvasRef.current) return;

      const isMobile = window.innerWidth < 640;
      const containerWidth = isMobile ? window.innerWidth - 16 : Math.min(window.innerWidth - 32, 800);
      const containerHeight = isMobile ? window.innerHeight * 0.4 : Math.min(window.innerHeight * 0.6, 600);
      
      const targetAspectRatio = 4/3;
      let width, height;
      
      if (containerWidth / containerHeight > targetAspectRatio) {
        height = containerHeight;
        width = height * targetAspectRatio;
      } else {
        width = containerWidth;
        height = width / targetAspectRatio;
      }

      canvasRef.current.width = width;
      canvasRef.current.height = height;

      const cellSize = width / settings.gridSize;
      setSettings(prev => ({ ...prev, cellSize }));
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, [settings.gridSize]);

  // Handle settings changes - only reinitialize if we haven't loaded initial state or if core settings change
  useEffect(() => {
    if (!hasLoadedInitialState) return;
    
    // Only reinitialize if core simulation parameters change
    const shouldReinitialize = [
      settings.gridSize,
      settings.initialPrey,
      settings.initialPredators,
      settings.initialGrass
    ].some((value, index) => {
      const oldSettings = JSON.parse(localStorage.getItem('lastSettings') || '{}');
      return oldSettings[`param${index}`] !== value;
    });

    if (shouldReinitialize) {
      const newEntities = initializeSimulation(settings);
      setEntities(newEntities);
      updateStats(newEntities);
      saveCurrentState(newEntities, true);
      
      // Save current settings to compare next time
      localStorage.setItem('lastSettings', JSON.stringify({
        param0: settings.gridSize,
        param1: settings.initialPrey,
        param2: settings.initialPredators,
        param3: settings.initialGrass
      }));
    }
  }, [hasLoadedInitialState, settings.gridSize, settings.initialPrey, settings.initialPredators, settings.initialGrass]);

  // Update simulation
  useEffect(() => {
    if (!isRunning) return;
    
    let lastSaveTime = Date.now();
    const SAVE_INTERVAL = 1000; // Save at most once per second
    
    const interval = setInterval(() => {
      setEntities(prevEntities => {
        const { newEntities, events } = updateSimulation(prevEntities, settings);
        
        // Update stats and logs
        updateStats(newEntities);
        setLogs(prevLogs => [...prevLogs, ...events].slice(-MAX_LOG_SIZE));
        
        // Save state periodically
        const now = Date.now();
        if (now - lastSaveTime >= SAVE_INTERVAL) {
          saveCurrentState(newEntities);
          lastSaveTime = now;
        }
        
        return newEntities;
      });
    }, speed === "very-slow" ? 1000 :
       speed === "slow" ? 750 :
       speed === "normal" ? 500 :
       speed === "fast" ? 250 :
       100
    );

    return () => {
      clearInterval(interval);
      // Save state when stopping simulation
      setEntities(prevEntities => {
        saveCurrentState(prevEntities, true);
        return prevEntities;
      });
    };
  }, [isRunning, settings, speed, saveCurrentState]);

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Calculate the actual drawing dimensions
    const gridPixelWidth = settings.gridSize * settings.cellSize;
    const gridPixelHeight = settings.gridSize * settings.cellSize;

    // Center the grid in the canvas
    const offsetX = (canvas.width - gridPixelWidth) / 2;
    const offsetY = (canvas.height - gridPixelHeight) / 2;

    // Draw background
    ctx.fillStyle = "#f3f4f6"; // gray-100
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid background
    ctx.fillStyle = "#ffffff"; // white
    ctx.fillRect(offsetX, offsetY, gridPixelWidth, gridPixelHeight);

    // Draw entities
    entities.forEach((entity) => {
      if (entity.type === "grass") {
        ctx.fillStyle = entity.energy > 0 ? "#22c55e" : "#92400e" // green-500 and brown-500
      } else {
        ctx.fillStyle = entity.type === "prey" ? "#3b82f6" : "#ef4444" // blue-500 and red-500
      }
      const x = offsetX + entity.x * settings.cellSize;
      const y = offsetY + entity.y * settings.cellSize;
      ctx.fillRect(x, y, settings.cellSize, settings.cellSize)
    })

    // Draw grid lines
    ctx.lineWidth = 1
    ctx.strokeStyle = "rgba(0, 0, 0, 0.2)"

    // Vertical lines
    for (let i = 0; i <= settings.gridSize; i++) {
      const x = offsetX + i * settings.cellSize;
      ctx.beginPath()
      ctx.moveTo(x, offsetY)
      ctx.lineTo(x, offsetY + gridPixelHeight)
      ctx.stroke()
    }

    // Horizontal lines
    for (let i = 0; i <= settings.gridSize; i++) {
      const y = offsetY + i * settings.cellSize;
      ctx.beginPath()
      ctx.moveTo(offsetX, y)
      ctx.lineTo(offsetX + gridPixelWidth, y)
      ctx.stroke()
    }

    // Draw border
    ctx.lineWidth = 2
    ctx.strokeStyle = "rgba(0, 0, 0, 0.3)"
    ctx.strokeRect(offsetX, offsetY, gridPixelWidth, gridPixelHeight)

    // Update debug info
    setDebugInfo(
      `Canvas: ${canvas.width.toFixed(0)}x${canvas.height.toFixed(0)}, Grid: ${gridPixelWidth.toFixed(0)}x${gridPixelHeight.toFixed(0)}, Cell: ${settings.cellSize.toFixed(1)}px`
    )
  }, [entities, settings.cellSize, settings.gridSize])

  const updateStats = useCallback((newEntities: Entity[]) => {
    const prey = newEntities.filter((e) => e.type === "prey").length;
    const predators = newEntities.filter((e) => e.type === "predator").length;
    const grass = newEntities.filter((e) => e.type === "grass" && e.energy > 0).length;
    setStats((prevStats) => ({
      prey,
      predators,
      grassCoverage: Math.round((grass / (settings.gridSize * settings.gridSize)) * 100),
      predatorKills: prevStats.predatorKills + (prevStats.prey - prey > 0 ? prevStats.prey - prey : 0),
    }));
  }, [settings.gridSize]);

  const handleReset = useCallback(async () => {
    setIsRunning(false);
    const newEntities = initializeSimulation(settings);
    setEntities(newEntities);
    setStats({ prey: 0, predators: 0, grassCoverage: 0, predatorKills: 0 });
    updateStats(newEntities);
    setLogs([]);
    await saveCurrentState(newEntities, true);
  }, [settings, saveCurrentState, updateStats]);

  const exportLogs = () => {
    const blob = new Blob([logs.join("\n")], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "simulation_logs.txt"
    a.click()
    URL.revokeObjectURL(url)
  }

  const updateSettings = (newSettings: Partial<SimulationSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }))
  }

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto gap-2 sm:gap-4 p-2 sm:p-4">
      <h1 className="text-lg sm:text-2xl font-bold text-center">Predator-Prey Simulation</h1>
      
      {/* Main simulation area */}
      <div className="relative w-full aspect-[4/3] bg-gray-100 rounded-lg overflow-hidden shadow-md">
        <canvas 
          ref={canvasRef} 
          className="absolute inset-0 w-full h-full"
          style={{ imageRendering: 'pixelated' }}
        />
        {entities.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm sm:text-base">
            No entities to display. Try resetting the simulation.
          </div>
        )}
        
        {/* Legend - Collapsible on mobile */}
        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm p-2 rounded-lg shadow-sm text-[10px] sm:text-xs space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-blue-500"></div>
            <span>Prey</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-red-500"></div>
            <span>Predator</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500"></div>
            <span>Grass (Active)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-brown-500"></div>
            <span>Grass (Consumed)</span>
          </div>
        </div>
      </div>

      {/* Stats Grid - Now Collapsible on Mobile */}
      <div className="relative">
        <button 
          onClick={() => setShowStats(!showStats)}
          className="md:hidden w-full px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg mb-2 flex items-center justify-between"
        >
          {showStats ? "Hide Stats" : "Show Stats"}
          <span className="text-xs">
            Prey: {stats.prey} | Pred: {stats.predators} | Grass: {stats.grassCoverage}%
          </span>
        </button>
        <div className={`${showStats ? 'block' : 'hidden'} md:block`}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 p-2 sm:p-4 bg-gray-50 rounded-lg shadow-sm text-center">
            <div className="bg-white p-2 rounded-md">
              <div className="text-base sm:text-lg font-semibold text-blue-600">{stats.prey}</div>
              <div className="text-[10px] sm:text-sm text-gray-600">Prey</div>
            </div>
            <div className="bg-white p-2 rounded-md">
              <div className="text-base sm:text-lg font-semibold text-red-600">{stats.predators}</div>
              <div className="text-[10px] sm:text-sm text-gray-600">Predators</div>
            </div>
            <div className="bg-white p-2 rounded-md">
              <div className="text-base sm:text-lg font-semibold text-green-600">{stats.grassCoverage}%</div>
              <div className="text-[10px] sm:text-sm text-gray-600">Grass</div>
            </div>
            <div className="bg-white p-2 rounded-md">
              <div className="text-base sm:text-lg font-semibold text-gray-600">{stats.predatorKills}</div>
              <div className="text-[10px] sm:text-sm text-gray-600">Kills</div>
            </div>
          </div>
        </div>
      </div>

      {/* Population Graph */}
      <PopulationGraph stats={stats} isRunning={isRunning} />

      {/* Controls Section */}
      <div className="space-y-2 sm:space-y-4">
        <Controls
          isRunning={isRunning}
          setIsRunning={setIsRunning}
          onReset={handleReset}
          speed={speed}
          setSpeed={setSpeed}
        />

        {/* Settings Panel - Collapsible on Mobile */}
        <div className="bg-white rounded-lg p-2 sm:p-4 shadow-sm">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="md:hidden w-full text-left mb-2 text-sm font-semibold text-gray-700 flex items-center justify-between"
          >
            <span>Simulation Settings</span>
            <span className="text-xs text-gray-500">{showSettings ? "Hide" : "Show"}</span>
          </button>
          <div className={`${showSettings ? 'block' : 'hidden'} md:block`}>
            <SimulationControls settings={settings} updateSettings={updateSettings} />
          </div>
        </div>

        {/* Logs Panel - Collapsible on Mobile */}
        <div className="bg-white rounded-lg p-2 sm:p-4 shadow-sm">
          <button 
            onClick={() => setShowLogs(!showLogs)}
            className="md:hidden w-full text-left mb-2 text-sm font-semibold text-gray-700 flex items-center justify-between"
          >
            <span>Event Log</span>
            <span className="text-xs text-gray-500">{showLogs ? "Hide" : "Show"}</span>
          </button>
          <div className={`${showLogs ? 'block' : 'hidden'} md:block`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700">Event Log</h3>
              <span className="text-[10px] text-gray-500">{debugInfo}</span>
            </div>
            <div className="h-20 sm:h-32 overflow-y-auto border border-gray-200 rounded-lg p-2 text-[10px] sm:text-xs space-y-1">
              {logs.map((log, index) => (
                <p key={index} className="text-gray-600">{log}</p>
              ))}
            </div>
            <button 
              onClick={exportLogs} 
              className="mt-2 w-full px-2 py-1 sm:px-4 sm:py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-[10px] sm:text-sm"
            >
              Export Logs
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PredatorPreySimulation;