import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Inbox } from 'lucide-react'
import { listMyRequests } from '../api/client'
import { useAuth } from '../context/AuthContext'
import Sidebar from '../components/Sidebar'
import EmptyState from '../components/EmptyState'
import Topbar from '../components/Topbar'

const STATUS_LABELS = { pending: 'Pending', uploaded: 'Uploaded', reviewed: 'Reviewed' }

function ScanRequests() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [statusFilter, setStatusFilter] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const mainRef = useRef(null)

  async function refresh() {
    try {
      const items = await listMyRequests()
      setRequests(items)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  const visibleRequests = statusFilter
    ? requests.filter((request) => request.status === statusFilter)
    : requests

  function handleNavigate(key) {
    if (key === 'dashboard') navigate(user?.role === 'doctor' ? '/doctor' : '/radiologist')
    if (key === 'upload') navigate('/upload-analysis')
    if (key === 'upload') navigate('/upload-analysis')
    if (key === 'patients') navigate('/doctor?section=patients')
    if (key === 'requests') mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    if (key === 'reports') navigate('/reports')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-bg text-text">
      <Sidebar role={user?.role} activeKey="requests" onNavigate={handleNavigate} />
      <main ref={mainRef} className="h-screen min-h-0 min-w-0 flex-1 overflow-y-auto">
        <Topbar title="Scan Requests" user={user} />

        <div className="p-8">
          {error && <p className="mb-4 rounded bg-flag-positive-bg px-3 py-2 text-sm text-flag-positive">{error}</p>}
          {loading ? <p className="text-sm text-text-muted">Loading requests...</p> : (
            <div>
              <section className="overflow-hidden rounded-xl border border-border bg-panel shadow-[0_6px_20px_rgba(49,87,183,0.04)]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
                  <span className="text-xs font-mono uppercase tracking-wide text-text-muted">{visibleRequests.length} requests{statusFilter ? ` · ${STATUS_LABELS[statusFilter]}` : ''}</span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setStatusFilter(null)} className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition ${statusFilter === null ? 'border-accent bg-accent text-white' : 'border-border bg-transparent text-text-muted hover:bg-accent-soft hover:text-accent'}`}>
                      All
                    </button>
                    {['pending', 'reviewed'].map((status) => (
                      <button key={status} type="button" onClick={() => setStatusFilter(statusFilter === status ? null : status)} className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition ${statusFilter === status ? 'border-accent bg-accent text-white' : 'border-border bg-transparent text-text-muted hover:bg-accent-soft hover:text-accent'}`}>
                        {STATUS_LABELS[status]}
                      </button>
                    ))}
                  </div>
                </div>
                {visibleRequests.length === 0 ? (
                  <EmptyState icon={Inbox} title="No requests" subtitle={statusFilter ? `No ${STATUS_LABELS[statusFilter].toLowerCase()} requests found` : 'Submitted scan requests will appear here'} />
                ) : visibleRequests.map((request) => (
                  <button key={request.id} onClick={() => navigate(`/requests/${request.id}`)} className="block w-full border-b border-border px-5 py-4 text-left last:border-0 hover:bg-bg transition">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-mono text-sm">{request.id}</span>
                      <span className={`rounded-full border px-2.5 py-1 text-xs ${request.status === 'reviewed' ? 'border-flag-negative/30 bg-flag-negative-bg text-flag-negative' : 'border-border bg-bg text-text-muted'}`}>{STATUS_LABELS[request.status] || request.status}</span>
                    </div>
                  </button>
                ))}
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default ScanRequests