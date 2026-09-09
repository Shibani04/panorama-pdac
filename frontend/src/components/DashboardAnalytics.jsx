import { Activity, BarChart3 } from 'lucide-react'

function MetricBar({ label, ai, reviewed, max }) {
  return (
    <div className="flex-1 flex flex-col justify-end items-center gap-2 min-w-0">
      <div className="h-40 w-full flex items-end justify-center gap-2 border-b border-border bg-gradient-to-b from-bg/60 to-transparent">
        <div className="relative w-7 rounded-t-md bg-[#3475EC] transition-all" style={{ height: `${Math.max((ai / max) * 100, 4)}%` }}>
          <span className="absolute -top-5 w-full text-center text-[10px] font-semibold text-text-muted">{ai}</span>
        </div>
        <div className="relative w-7 rounded-t-md bg-accent transition-all" style={{ height: `${Math.max((reviewed / max) * 100, 4)}%` }}>
          <span className="absolute -top-5 w-full text-center text-[10px] font-semibold text-text-muted">{reviewed}</span>
        </div>
      </div>
      <span className="text-xs text-text-muted">{label}</span>
    </div>
  )
}

function DashboardAnalytics({ requests }) {
  const analyzed = requests.filter((request) => request.prediction !== null)
  const reviewed = requests.filter((request) => request.status === 'reviewed' && request.prediction !== null)
  const aiPositive = analyzed.filter((request) => request.prediction >= 0.5).length
  const aiNegative = analyzed.length - aiPositive
  const reviewedPositive = reviewed.filter((request) => request.prediction >= 0.5).length
  const reviewedNegative = reviewed.length - reviewedPositive
  const max = Math.max(aiPositive, aiNegative, reviewedPositive, reviewedNegative, 1)
  const completion = requests.length ? Math.round((reviewed.length / requests.length) * 100) : 0

  return (
    <section className="grid grid-cols-1 xl:grid-cols-[1.55fr_.85fr] gap-5 my-8" aria-label="Dashboard analytics">
      <article className="min-h-[350px] p-6 border border-border rounded-[14px] bg-gradient-to-br from-white to-[#FBFDFE] shadow-[0_14px_32px_rgba(26,52,73,0.07)]">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-[10px] bg-[#EAF1FF] text-[#2F6FF0] grid place-items-center"><BarChart3 size={20} /></div>
          <div><h3 className="font-display text-lg font-bold text-text">AI vs radiologist</h3><p className="text-xs text-text-muted mt-1">Preliminary predictions compared with reviewed cases</p></div>
        </div>
        <div className="flex items-end gap-8 h-48 mt-8 px-6">
          <MetricBar label="PDAC likely" ai={aiPositive} reviewed={reviewedPositive} max={max} />
          <MetricBar label="Lower likelihood" ai={aiNegative} reviewed={reviewedNegative} max={max} />
        </div>
        <div className="flex justify-center gap-6 mt-5 text-xs text-text-muted"><span className="inline-flex items-center gap-2"><i className="w-2.5 h-2.5 rounded-sm bg-[#3475EC]" />AI prediction</span><span className="inline-flex items-center gap-2"><i className="w-2.5 h-2.5 rounded-sm bg-accent" />Reviewed</span></div>
      </article>
      <article className="min-h-[350px] p-6 border border-border rounded-[14px] bg-gradient-to-br from-white to-[#FBFDFE] shadow-[0_14px_32px_rgba(26,52,73,0.07)] flex flex-col">
        <div className="flex items-start gap-3.5"><div className="w-10 h-10 rounded-[10px] bg-accent-soft text-accent grid place-items-center"><Activity size={20} /></div><div><h3 className="font-display text-lg font-bold text-text">Review completion</h3><p className="text-xs text-text-muted mt-1">Progress through the radiology workflow</p></div></div>
        <div className="flex-1 grid place-items-center py-6"><div className="w-40 h-40 rounded-full grid place-items-center" style={{ background: `conic-gradient(#13A27B ${completion * 3.6}deg, #E7EDF2 0)` }}><div className="w-28 h-28 rounded-full bg-white grid place-items-center content-center shadow-[inset_0_0_0_1px_#EDF2F5]"><strong className="font-display text-3xl text-text">{completion}%</strong><span className="text-xs text-text-muted">completed</span></div></div></div>
        <div className="flex justify-center gap-5 text-xs text-text-muted"><span className="inline-flex items-center gap-2"><i className="w-2.5 h-2.5 rounded-full bg-[#1B9F78]" />Reviewed {reviewed.length}</span><span className="inline-flex items-center gap-2"><i className="w-2.5 h-2.5 rounded-full bg-[#DFE6EF]" />Remaining {Math.max(requests.length - reviewed.length, 0)}</span></div>
      </article>
    </section>
  )
}

export default DashboardAnalytics
