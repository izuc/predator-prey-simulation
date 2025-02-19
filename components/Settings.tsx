import type React from "react"
import type { SimulationSettings } from "../types"

interface SettingsProps {
  settings: SimulationSettings
  updateSetting: (key: keyof SimulationSettings, value: number) => void
}

export const Settings: React.FC<SettingsProps> = ({ settings, updateSetting }) => {
  return (
    <div className="bg-white p-2 rounded-md shadow-sm">
      <h2 className="text-sm font-semibold text-gray-800 mb-2">Settings</h2>
      <div className="grid grid-cols-2 gap-2 text-xs">
        {[
          { key: "gridSize", label: "Grid Size", min: 20, max: 60, step: 5 },
          { key: "initialGrass", label: "Initial Grass", min: 50, max: 150, step: 10 },
          { key: "initialPrey", label: "Initial Prey", min: 5, max: 30, step: 5 },
          { key: "initialPredators", label: "Initial Predators", min: 2, max: 10, step: 1 },
          { key: "tickRate", label: "Tick Rate (ms)", min: 100, max: 500, step: 50 },
          { key: "grassRegrowChance", label: "Grass Regrow Chance", min: 0, max: 0.1, step: 0.01 },
          { key: "preyBreedThreshold", label: "Prey Breed Threshold", min: 5, max: 15, step: 1 },
          { key: "predatorBreedThreshold", label: "Predator Breed Threshold", min: 10, max: 20, step: 1 },
          { key: "preySightRange", label: "Prey Sight Range", min: 3, max: 10, step: 1 },
          { key: "predatorSightRange", label: "Predator Sight Range", min: 5, max: 15, step: 1 },
        ].map(({ key, label, min, max, step }) => (
          <div key={key} className="flex flex-col">
            <label className="text-gray-600 mb-1">{label}</label>
            <input
              type="number"
              min={min}
              max={max}
              step={step}
              value={settings[key as keyof SimulationSettings]}
              onChange={(e) => updateSetting(key as keyof SimulationSettings, Number(e.target.value))}
              className="w-full p-1 border rounded-sm text-xs"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

