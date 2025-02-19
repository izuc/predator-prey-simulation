import type React from "react"

interface StatsProps {
  stats: { grass: number; prey: number; predators: number }
}

export const Stats: React.FC<StatsProps> = ({ stats }) => {
  return (
    <div className="flex justify-between bg-white p-2 rounded-md shadow-sm">
      <StatItem label="Grass" value={stats.grass} color="text-green-600" />
      <StatItem label="Prey" value={stats.prey} color="text-blue-600" />
      <StatItem label="Predators" value={stats.predators} color="text-red-600" />
    </div>
  )
}

const StatItem: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div className="text-center">
    <span className="block text-xs text-gray-600">{label}</span>
    <span className={`text-sm font-semibold ${color}`}>{value}</span>
  </div>
)

