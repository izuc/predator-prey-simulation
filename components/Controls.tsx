import type React from "react"

interface ControlsProps {
  isRunning: boolean
  setIsRunning: (isRunning: boolean) => void
  onReset: () => void
  speed: "very-slow" | "slow" | "normal" | "fast" | "very-fast"
  setSpeed: (speed: "very-slow" | "slow" | "normal" | "fast" | "very-fast") => void
}

export const Controls: React.FC<ControlsProps> = ({ isRunning, setIsRunning, onReset, speed, setSpeed }) => {
  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <div className="flex gap-2 flex-1">
        <button
          onClick={() => setIsRunning(!isRunning)}
          className={`px-3 py-1.5 text-white rounded text-[10px] sm:text-sm flex-grow transition-all ${
            isRunning 
              ? "bg-yellow-500 hover:bg-yellow-600 active:bg-yellow-700" 
              : "bg-green-500 hover:bg-green-600 active:bg-green-700"
          }`}
        >
          {isRunning ? "Pause" : "Start"}
        </button>
        <button 
          onClick={onReset} 
          className="px-3 py-1.5 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white rounded text-[10px] sm:text-sm flex-grow transition-all"
        >
          Reset
        </button>
      </div>
      <select
        value={speed}
        onChange={(e) => setSpeed(e.target.value as typeof speed)}
        className="px-2 py-1.5 border rounded text-[10px] sm:text-sm flex-grow sm:flex-grow-0 sm:w-40 bg-white hover:bg-gray-50 transition-colors"
      >
        <option value="very-slow">Very Slow (1s)</option>
        <option value="slow">Slow (0.75s)</option>
        <option value="normal">Normal (0.5s)</option>
        <option value="fast">Fast (0.25s)</option>
        <option value="very-fast">Very Fast (0.1s)</option>
      </select>
    </div>
  )
}

