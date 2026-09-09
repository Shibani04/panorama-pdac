import { useState, useEffect, useRef } from 'react'
import { Inbox, MousePointerClick } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { listMyRequests } from '../api/client'
import { useAuth } from '../context/AuthContext'
import Sidebar from '../components/Sidebar'
import StatsOverview from '../components/StatsOverview'
import EmptyState from '../components/EmptyState'
import RequestActionPanel from '../components/RequestActionPanel'
import DashboardAnalytics from '../components/DashboardAnalytics'
import Topbar from '../components/Topbar'

function RadiologistDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)
  const [activeKey, setActiveKey] = useState('dashboard')
  const mainRef = useRef(null)
  const requestsRef = useRef(null)

  async function refresh() {
    try {
      const r = await listMyRequests()
      setRequests(r)
      if (selected) {
        const updatedSelected = r.find((req) => req.id === selected.id)
        if (updatedSelected) setSelected(updatedSelected)
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  function handleNavigate(key) {
    setActiveKey(key)
    if (key === 'upload') navigate('/upload-analysis')
    if (key === 'requests') navigate('/requests')
    if (key === 'reports') navigate('/reports')
    if (key === 'dashboard') mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="h-screen overflow-hidden bg-bg text-text flex">
      <Sidebar role="radiologist" activeKey={activeKey} onNavigate={handleNavigate} />

      <div ref={mainRef} className="flex-1 min-w-0 h-screen overflow-y-auto">
        <Topbar title="Radiologist dashboard" user={user} />

        <div className="p-8">
          {error && (
            <div className="mb-4 bg-flag-positive-bg text-flag-positive text-sm rounded px-3 py-2">
              {error}
            </div>
          )}

          {loading ? (
            <p className="text-sm text-text-muted">Loading…</p>
          ) : (
            <>
              <StatsOverview requests={requests} />
              <DashboardAnalytics requests={requests} />

              <div ref={requestsRef} className="grid grid-cols-[minmax(0,45fr)_minmax(0,55fr)] gap-6 scroll-mt-24">
                <div className="bg-panel border border-border rounded-xl shadow-[0_6px_20px_rgba(49,87,183,0.04)] overflow-hidden">
                  <div className="px-4 py-3 border-b border-border">
                    <span className="text-xs font-mono text-text-muted uppercase tracking-wide">
                      {requests.length} requests
                    </span>
                  </div>

                  {requests.length === 0 ? (
                    <EmptyState icon={Inbox} title="No requests" subtitle="Nothing pending or assigned right now" />
                  ) : (
                    requests.map((r) => (
                      <div
                        key={r.id}
                        onClick={() => setSelected(r)}
                        className={`px-4 py-4 border-b border-border cursor-pointer hover:bg-bg ${selected?.id === r.id ? 'bg-sidebar-active/60' : ''}`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-mono">{r.id}</span>
                          <div className="flex items-center gap-2"><span className={`text-xs px-2.5 py-1 rounded-full border ${r.status === 'reviewed' ? 'border-flag-negative/30 bg-flag-negative-bg text-flag-negative' : 'bg-bg border-border text-text-muted'}`}>{r.status === 'reviewed' ? 'Reviewed' : r.status === 'pending' ? 'Pending' : 'Uploaded'}</span>{r.status === 'reviewed' && <Link to={`/reports/${r.id}`} onClick={(e) => e.stopPropagation()} className="rounded-md border border-[#CBE9DF] bg-[#EAF8F2] px-2.5 py-1 text-xs font-semibold text-flag-negative hover:brightness-95">View report</Link>}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="min-h-[330px] bg-panel border border-border rounded-xl shadow-[0_6px_20px_rgba(49,87,183,0.04)] p-6">
                  {!selected && (
                    <div className="h-full min-h-[280px] flex flex-col items-center justify-center text-center"><div className="w-12 h-12 rounded-xl bg-accent-soft text-accent grid place-items-center"><MousePointerClick size={22} /></div><h3 className="font-display text-lg font-bold mt-4">Select a request</h3><p className="max-w-xs text-sm text-text-muted mt-2">Choose a request from the queue to claim, upload a scan, or complete its review.</p></div>
                  )}
                  {selected && selected.status !== 'reviewed' && (
                    <div className="max-w-xl"><RequestActionPanel request={selected} onUpdate={refresh} /></div>
                  )}
                  {selected && selected.status === 'reviewed' && (
                    <div className="h-full min-h-[280px] flex flex-col items-center justify-center text-center"><div className="w-12 h-12 rounded-xl bg-flag-negative-bg text-flag-negative grid place-items-center"><Inbox size={22} /></div><h3 className="font-display text-lg font-bold mt-4">Review completed</h3><p className="text-sm text-flag-negative mt-2">This request has already been reviewed.</p></div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default RadiologistDashboard