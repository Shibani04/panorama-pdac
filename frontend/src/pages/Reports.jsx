import { useEffect, useState } from 'react'
import { CheckCircle2, FileText, Search } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { getRequestDetail, listMyRequests } from '../api/client'
import { useAuth } from '../context/AuthContext'
import Sidebar from '../components/Sidebar'
import EmptyState from '../components/EmptyState'
import Topbar from '../components/Topbar'

function formatDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
}

function Reports() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [reports, setReports] = useState([])
  const [query, setQuery] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function loadReports() {
      try {
        const requests = await listMyRequests()
        const reviewed = requests.filter((request) => request.status === 'reviewed')
        const details = await Promise.all(reviewed.map((request) => getRequestDetail(request.id)))
        setReports(details)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadReports()
  }, [])

  function handleNavigate(key) {
    if (key === 'dashboard') navigate(user?.role === 'doctor' ? '/doctor' : '/radiologist')
    if (key === 'upload') navigate('/upload-analysis')
    if (key === 'upload') navigate('/upload-analysis')
    if (key === 'patients') navigate('/doctor?section=patients')
    if (key === 'requests') navigate('/requests')
  }

  const visibleReports = reports.filter((report) => {
    const searchable = `${report.id} ${report.patient?.name || ''}`.toLowerCase()
    return searchable.includes(query.toLowerCase()) && (!dateFilter || report.completed_at?.slice(0, 10) === dateFilter)
  })

  return (
    <div className="flex h-screen overflow-hidden bg-bg text-text">
      <Sidebar role={user?.role} activeKey="reports" onNavigate={handleNavigate} />
      <main className="h-screen min-h-0 min-w-0 flex-1 overflow-y-auto">
        <Topbar title="Reports" user={user} />

        <div className="p-8">
          <div className="mb-7 flex items-end justify-between gap-4">
            <div><p className="text-[11px] uppercase tracking-[1.35px] text-text-muted font-bold">Documentation</p><p className="text-sm text-text-muted mt-2">Completed radiology reports for reviewed scan requests.</p></div>
            <span className="rounded-full bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent">{reports.length} completed</span>
          </div>

          {error && <p className="mb-4 rounded-lg bg-flag-positive-bg px-3 py-2 text-sm text-flag-positive">{error}</p>}
          <section className="overflow-hidden rounded-[14px] border border-border bg-panel shadow-[0_10px_28px_rgba(26,52,73,0.06)]">
            <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
              <div className="flex items-center gap-2 text-sm font-semibold"><FileText size={17} className="text-accent" /> Reviewed reports</div>
              <div className="flex items-center gap-2"><label className="flex items-center gap-2 rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-muted"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search reports" className="w-36 bg-transparent outline-none placeholder:text-text-muted" /></label><label className="flex items-center gap-0 rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-muted"><input aria-label="Filter reports by date" type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} className="w-32 bg-transparent pr-0 text-right text-sm text-text outline-none" />{dateFilter && <button type="button" onClick={() => setDateFilter('')} className="ml-1 text-xs font-semibold text-accent hover:underline">Clear</button>}</label></div>
            </div>
            {loading ? <p className="p-8 text-center text-sm text-text-muted">Loading reports...</p> : visibleReports.length === 0 ? <EmptyState icon={FileText} title="No reports found" subtitle={query ? 'Try a different search.' : 'Completed reports will appear here after review.'} /> : (
              <div className="divide-y divide-border">
                {visibleReports.map((report) => (
                  <Link key={report.id} to={`/reports/${report.id}`} className="flex items-center justify-between gap-5 px-5 py-4 transition hover:bg-bg">
                    <div className="flex min-w-0 items-center gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-flag-negative-bg text-flag-negative"><CheckCircle2 size={18} /></div><div className="min-w-0"><p className="truncate text-sm font-semibold">{report.patient?.name || 'Patient record'}</p><p className="mt-1 text-xs text-text-muted"><span className="font-mono">{report.id}</span> · {report.patient?.age ?? '—'}y, {report.patient?.sex || '—'}</p></div></div>
                    <div className="hidden items-center gap-8 text-right sm:flex"><div><p className="text-[10px] uppercase tracking-wide text-text-muted">Completed</p><p className="mt-1 text-xs font-medium">{formatDate(report.completed_at)}</p></div><div><p className="text-[10px] uppercase tracking-wide text-text-muted">AI result</p><p className={`mt-1 text-xs font-semibold ${report.prediction >= 0.5 ? 'text-flag-positive' : 'text-flag-negative'}`}>{report.prediction !== null ? `${(report.prediction * 100).toFixed(1)}%` : '—'}</p></div>{user?.role === 'doctor' && <div><p className="text-[10px] uppercase tracking-wide text-text-muted">Prescription</p><p className="mt-1 text-xs font-semibold text-accent">{report.prescription ? 'Attached' : 'Not added'}</p></div>}<span className="text-xs font-semibold text-accent">View report →</span></div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}

export default Reports