interface StatCardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  color?: string
}

export default function StatCard({ label, value, icon, color = 'text-brand-700' }: StatCardProps) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`p-3 rounded-xl bg-brand-50 ${color}`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  )
}
