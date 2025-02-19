"use client"

import { useEffect, useState } from "react"
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts"

interface PopulationData {
  time: number
  prey: number
  predators: number
  grass: number
}

interface PopulationGraphProps {
  stats: {
    prey: number
    predators: number
    grassCoverage: number
  }
  isRunning: boolean
}

export const PopulationGraph: React.FC<PopulationGraphProps> = ({ stats, isRunning }) => {
  const [data, setData] = useState<PopulationData[]>([])
  const maxDataPoints = 50 // Keep last 50 data points

  useEffect(() => {
    if (isRunning) {
      setData(prevData => {
        const newData = [...prevData, {
          time: prevData.length,
          prey: stats.prey,
          predators: stats.predators,
          grass: stats.grassCoverage
        }]
        return newData.slice(-maxDataPoints)
      })
    }
  }, [stats, isRunning])

  return (
    <div className="w-full h-40 sm:h-60 bg-white rounded-lg p-2 sm:p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis dataKey="time" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="prey" stroke="#3b82f6" name="Prey" dot={false} />
          <Line type="monotone" dataKey="predators" stroke="#ef4444" name="Predators" dot={false} />
          <Line type="monotone" dataKey="grass" stroke="#22c55e" name="Grass %" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
} 