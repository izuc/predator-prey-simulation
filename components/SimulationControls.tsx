import type React from "react"
import type { SimulationSettings } from "../utils/simulation"

interface SimulationControlsProps {
  settings: SimulationSettings
  updateSettings: (newSettings: Partial<SimulationSettings>) => void
}

export const SimulationControls: React.FC<SimulationControlsProps> = ({ settings, updateSettings }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] sm:text-sm">
      <div className="space-y-2">
        <div>
          <label className="block text-gray-700 mb-1">Initial Population</label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-gray-500 mb-1">Prey:</label>
              <input
                type="number"
                value={settings.initialPrey}
                onChange={(e) => updateSettings({ initialPrey: Number(e.target.value) })}
                className="w-full p-1 border rounded bg-white hover:bg-gray-50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-gray-500 mb-1">Predators:</label>
              <input
                type="number"
                value={settings.initialPredators}
                onChange={(e) => updateSettings({ initialPredators: Number(e.target.value) })}
                className="w-full p-1 border rounded bg-white hover:bg-gray-50 transition-colors"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-gray-700 mb-1">Reproduction Rates</label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-gray-500 mb-1">Prey:</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={settings.preyReproductionRate}
                onChange={(e) => updateSettings({ preyReproductionRate: Number(e.target.value) })}
                className="w-full p-1 border rounded bg-white hover:bg-gray-50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-gray-500 mb-1">Predators:</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={settings.predatorReproductionRate}
                onChange={(e) => updateSettings({ predatorReproductionRate: Number(e.target.value) })}
                className="w-full p-1 border rounded bg-white hover:bg-gray-50 transition-colors"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div>
          <label className="block text-gray-700 mb-1">Energy Settings</label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-gray-500 mb-1">Prey Gain:</label>
              <input
                type="number"
                value={settings.preyEnergyGain}
                onChange={(e) => updateSettings({ preyEnergyGain: Number(e.target.value) })}
                className="w-full p-1 border rounded bg-white hover:bg-gray-50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-gray-500 mb-1">Predator Gain:</label>
              <input
                type="number"
                value={settings.predatorEnergyGain}
                onChange={(e) => updateSettings({ predatorEnergyGain: Number(e.target.value) })}
                className="w-full p-1 border rounded bg-white hover:bg-gray-50 transition-colors"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-gray-700 mb-1">Environment</label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-gray-500 mb-1">Grid Size:</label>
              <input
                type="number"
                min="20"
                max="100"
                value={settings.gridSize}
                onChange={(e) => updateSettings({ gridSize: Number(e.target.value) })}
                className="w-full p-1 border rounded bg-white hover:bg-gray-50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-gray-500 mb-1">Grass Regrowth:</label>
              <input
                type="number"
                value={settings.grassRegenerationTime}
                onChange={(e) => updateSettings({ grassRegenerationTime: Number(e.target.value) })}
                className="w-full p-1 border rounded bg-white hover:bg-gray-50 transition-colors"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

