import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

const STATUS_COLORS = {
  pending: '#C9A227',
  uploaded: '#4A7FBF',
  reviewed: '#2F6F5E',
}

function StatCard({ label, value }) {
  return (
    <div className="bg-panel border border-border rounded-lg px-4 py-3">
      <p className="text-xs font-mono text-text-muted uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
    </div>
  )
}

function StatsOverview({ requests, extraStat }) {
  const pending = requests.filter((r) => r.status === 'pending').length
  const uploaded = requests.filter((r) => r.status === 'uploaded').length
  const reviewed = requests.filter((r) => r.status === 'reviewed').length

  const reviewedWithPrediction = requests.filter((r) => r.status === 'reviewed' && r.prediction !== null)
  const pdacPositive = reviewedWithPrediction.filter((r) => r.prediction >= 0.5).length
  const positiveRate = reviewedWithPrediction.length
    ? Math.round((pdacPositive / reviewedWithPrediction.length) * 100)
    : null

  const chartData = [
    { name: 'Pending', value: pending, color: STATUS_COLORS.pending },
    { name: 'Uploaded', value: uploaded, color: STATUS_COLORS.uploaded },
    { name: 'Reviewed', value: reviewed, color: STATUS_COLORS.reviewed },
  ].filter((d) => d.value > 0)

  return (
    <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-4 mb-6">
      {extraStat}
      <StatCard label="Pending" value={pending} />
      <StatCard label="In progress" value={uploaded} />
      <StatCard label="Reviewed" value={reviewed} />
      <StatCard label="PDAC-positive rate" value={positiveRate !== null ? `${positiveRate}%` : '—'} />

      {chartData.length > 0 && (
        <div className="bg-panel border border-border rounded-lg px-3 py-2 flex items-center justify-center">
          <ResponsiveContainer width={90} height={70}>
            <PieChart>
              <Pie data={chartData} dataKey="value" innerRadius={18} outerRadius={32} paddingAngle={2}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

export default StatsOverview