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
      const canvas = canvasRef.current;
      const container = canvas.parentElement;
      if (!container) return;

      // Get the container's dimensions
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      
      // Update canvas size to match container
      canvas.width = containerWidth;
      canvas.height = containerHeight;

      // Calculate cell size to fit the grid within the canvas
      // Add padding to ensure emojis don't get cut off
      const padding = 40; // pixels of padding
      const availableWidth = containerWidth - (padding * 2);
      const availableHeight = containerHeight - (padding * 2);
      
      // Use the more constraining dimension to determine cell size
      const cellSize = Math.min(
        availableWidth / settings.gridSize,
        availableHeight / settings.gridSize
      );
      
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

    // Center the grid in the canvas with padding
    const offsetX = (canvas.width - gridPixelWidth) / 2;
    const offsetY = (canvas.height - gridPixelHeight) / 2;

    // Draw background
    ctx.fillStyle = "#f3f4f6"; // gray-100
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid background
    ctx.fillStyle = "#ffffff"; // white
    ctx.fillRect(offsetX, offsetY, gridPixelWidth, gridPixelHeight);

    // Draw entities with adjusted positioning
    entities.forEach((entity) => {
      const x = offsetX + entity.x * settings.cellSize;
      const y = offsetY + entity.y * settings.cellSize;
      
      ctx.font = `${settings.cellSize}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (entity.type === "grass") {
        ctx.fillStyle = entity.energy > 0 ? "#22c55e" : "#92400e";
        ctx.fillText("🌿", x + settings.cellSize/2, y + settings.cellSize/2);
      } else if (entity.type === "prey") {
        ctx.fillStyle = "#000000";
        ctx.fillText("🐰", x + settings.cellSize/2, y + settings.cellSize/2);
      } else {
        ctx.fillStyle = "#000000";
        ctx.fillText("🦊", x + settings.cellSize/2, y + settings.cellSize/2);
      }
    });

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
    <div className="flex flex-col w-full max-w-4xl mx-auto gap-3 sm:gap-6 p-3 sm:p-6 min-h-screen bg-gradient-to-b from-blue-50 to-green-50">
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-4xl font-bold">
          <span className="text-red-600">🦊</span>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-red-600 via-purple-600 to-blue-600">
            {" "}Predator-Prey Simulation{" "}
          </span>
          <span className="text-blue-600">🐰</span>
        </h1>
        <p className="text-sm sm:text-base text-gray-600">Watch the ecosystem evolve as foxes hunt rabbits and rabbits graze on grass</p>
      </div>
      
      {/* Main simulation area */}
      <div className="relative w-full h-[60vh] sm:h-[70vh] bg-gradient-to-br from-white to-gray-50 rounded-xl overflow-hidden shadow-lg border border-gray-100">
        <canvas 
          ref={canvasRef} 
          className="absolute inset-0 w-full h-full"
          style={{ 
            imageRendering: 'pixelated',
            width: '100%',
            height: '100%',
            display: 'block',
            touchAction: 'none'
          }}
        />
        {entities.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm sm:text-base">
            <div className="bg-white/90 backdrop-blur-sm p-4 rounded-lg shadow-sm">
              No entities to display. Try resetting the simulation.
            </div>
          </div>
        )}
        
        {/* Legend - Hidden on mobile */}
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm p-3 rounded-xl shadow-md text-[10px] sm:text-xs space-y-2 hidden md:block">
          <div className="flex items-center gap-3">
            <span className="text-lg sm:text-xl">🐰</span>
            <span className="font-medium">Prey</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-lg sm:text-xl">🦊</span>
            <span className="font-medium">Predator</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-lg sm:text-xl">🌿</span>
            <span className="font-medium">Grass (Active)</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-lg sm:text-xl opacity-50">🌿</span>
            <span className="font-medium">Grass (Consumed)</span>
          </div>
        </div>
      </div>

      {/* Stats Grid - Now Collapsible on Mobile */}
      <div className="relative">
        <button 
          onClick={() => setShowStats(!showStats)}
          className="md:hidden w-full px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-xl shadow-sm mb-2 flex items-center justify-between border border-gray-100"
        >
          {showStats ? "Hide Stats" : "Show Stats"}
          <span className="text-xs">
            🐰 {stats.prey} | 🦊 {stats.predators} | 🌿 {stats.grassCoverage}%
          </span>
        </button>
        <div className={`${showStats ? 'block' : 'hidden'} md:block`}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 p-3 sm:p-4 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-xl">
              <div className="text-base sm:text-xl font-bold text-blue-600 flex items-center justify-center gap-2">
                <span>🐰</span>{stats.prey}
              </div>
              <div className="text-[10px] sm:text-sm text-blue-600/70 font-medium text-center">Prey</div>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100 p-3 rounded-xl">
              <div className="text-base sm:text-xl font-bold text-red-600 flex items-center justify-center gap-2">
                <span>🦊</span>{stats.predators}
              </div>
              <div className="text-[10px] sm:text-sm text-red-600/70 font-medium text-center">Predators</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-3 rounded-xl">
              <div className="text-base sm:text-xl font-bold text-green-600 flex items-center justify-center gap-2">
                <span>🌿</span>{stats.grassCoverage}%
              </div>
              <div className="text-[10px] sm:text-sm text-green-600/70 font-medium text-center">Grass</div>
            </div>
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-3 rounded-xl">
              <div className="text-base sm:text-xl font-bold text-gray-600 flex items-center justify-center gap-2">
                <span>💀</span>{stats.predatorKills}
              </div>
              <div className="text-[10px] sm:text-sm text-gray-600/70 font-medium text-center">Kills</div>
            </div>
          </div>
        </div>
      </div>

      {/* Population Graph */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
        <PopulationGraph stats={stats} isRunning={isRunning} />
      </div>

      {/* Controls Section */}
      <div className="space-y-3 sm:space-y-4">
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
          <Controls
            isRunning={isRunning}
            setIsRunning={setIsRunning}
            onReset={handleReset}
            speed={speed}
            setSpeed={setSpeed}
          />
        </div>

        {/* Settings Panel - Collapsible on Mobile */}
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="md:hidden w-full text-left mb-2 text-sm font-semibold text-gray-700 flex items-center justify-between"
          >
            <span>⚙️ Simulation Settings</span>
            <span className="text-xs text-gray-500">{showSettings ? "Hide" : "Show"}</span>
          </button>
          <div className={`${showSettings ? 'block' : 'hidden'} md:block`}>
            <SimulationControls settings={settings} updateSettings={updateSettings} />
          </div>
        </div>

        {/* Logs Panel - Collapsible on Mobile */}
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
          <button 
            onClick={() => setShowLogs(!showLogs)}
            className="md:hidden w-full text-left mb-2 text-sm font-semibold text-gray-700 flex items-center justify-between"
          >
            <span>📝 Event Log</span>
            <span className="text-xs text-gray-500">{showLogs ? "Hide" : "Show"}</span>
          </button>
          <div className={`${showLogs ? 'block' : 'hidden'} md:block`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700 md:block hidden">📝 Event Log</h3>
              <span className="text-[10px] text-gray-500">{debugInfo}</span>
            </div>
            <div className="h-20 sm:h-32 overflow-y-auto border border-gray-100 rounded-xl p-3 text-[10px] sm:text-xs space-y-1 bg-gray-50">
              {logs.map((log, index) => (
                <p key={index} className="text-gray-600">{log}</p>
              ))}
            </div>
            <button 
              onClick={exportLogs} 
              className="mt-2 w-full px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all text-[10px] sm:text-sm font-medium shadow-sm"
            >
              📥 Export Logs
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-gray-500 mt-4">
        Created by <a href="https://lance.name" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 font-medium transition-colors">Lance</a>
      </div>
    </div>
  )
}

export default PredatorPreySimulation;