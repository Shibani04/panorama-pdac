function StatCard({ label, value }) {
  return (
    <div className="bg-panel border border-border rounded-xl px-4 py-4 shadow-[0_6px_20px_rgba(49,87,183,0.04)]">
      <p className="text-xs font-mono text-text-muted uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
    </div>
  )
}

function StatsOverview({ requests, extraStat }) {
  const pending = requests.filter((r) => r.status === 'pending').length
  const reviewed = requests.filter((r) => r.status === 'reviewed').length

  const reviewedWithPrediction = requests.filter((r) => r.status === 'reviewed' && r.prediction !== null)
  const pdacPositive = reviewedWithPrediction.filter((r) => r.prediction >= 0.5).length
  const positiveRate = reviewedWithPrediction.length
    ? Math.round((pdacPositive / reviewedWithPrediction.length) * 100)
    : null

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
      {extraStat}
      <StatCard label="Pending" value={pending} />
      <StatCard label="Reviewed" value={reviewed} />
      <StatCard label="PDAC-positive rate" value={positiveRate !== null ? `${positiveRate}%` : '—'} />

    </div>
  )
}

export default StatsOverview