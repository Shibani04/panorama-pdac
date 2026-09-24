import { useState, useEffect, useRef } from 'react'
import { Inbox } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { claimRequest, listMyRequests } from '../api/client'
import { useAuth } from '../context/AuthContext'
import Sidebar from '../components/Sidebar'
import StatsOverview from '../components/StatsOverview'
import EmptyState from '../components/EmptyState'
import Topbar from '../components/Topbar'
import ClaimRequestModal from '../components/ClaimRequestModal'

function RadiologistDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [claimingId, setClaimingId] = useState(null)
  const [claimSubmitting, setClaimSubmitting] = useState(false)
  const [activeKey, setActiveKey] = useState('dashboard')
  const mainRef = useRef(null)
  const requestsRef = useRef(null)

  async function refresh() {
    try {
      const r = await listMyRequests()
      setRequests(r)
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

      <div ref={mainRef} className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar title="Radiologist dashboard" user={user} />

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-8">
          {error && (
            <div className="mb-4 bg-flag-positive-bg text-flag-positive text-sm rounded px-3 py-2">
              {error}
            </div>
          )}

          {loading ? (
            <p className="text-sm text-text-muted">Loading…</p>
          ) : (
            <>
              <div className="shrink-0">
                <StatsOverview requests={requests} />
              </div>

              <div ref={requestsRef} className="min-h-0 flex-1 overflow-y-auto scroll-mt-24">
                <div className="bg-panel border border-border rounded-xl shadow-[0_6px_20px_rgba(49,87,183,0.04)]">
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
                        onClick={async () => {
                          if (!r.radiologist_id) {
                            setClaimingId(r.id)
                            return
                          }
                          if (r.radiologist_id === user.id) {
                            navigate(r.status === 'reviewed' ? `/reports/${r.id}` : r.status === 'uploaded' ? `/requests/${r.id}` : `/upload-analysis?requestId=${r.id}`)
                          }
                        }}
                        className="px-4 py-4 border-b border-border cursor-pointer hover:bg-bg"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-mono">{r.id}</span>
                          <div className="flex items-center gap-2"><span className={`text-xs px-2.5 py-1 rounded-full border ${r.status === 'reviewed' ? 'border-flag-negative/30 bg-flag-negative-bg text-flag-negative' : 'bg-bg border-border text-text-muted'}`}>{r.status === 'reviewed' ? 'Reviewed' : r.status === 'pending' ? 'Pending' : 'Uploaded'}</span>{r.status === 'reviewed' && <Link to={`/reports/${r.id}`} onClick={(e) => e.stopPropagation()} className="rounded-md border border-[#CBE9DF] bg-[#EAF8F2] px-2.5 py-1 text-xs font-semibold text-flag-negative hover:brightness-95">View report</Link>}</div>
                        </div>
                        <ClaimRequestModal
                          requestId={claimingId}
                          submitting={claimSubmitting}
                          onCancel={() => setClaimingId(null)}
                          onConfirm={async () => {
                            setClaimSubmitting(true)
                            try {
                              await claimRequest(claimingId)
                              navigate(`/upload-analysis?requestId=${claimingId}`)
                            } catch (e) {
                              setError(e.message)
                            } finally {
                              setClaimSubmitting(false)
                              setClaimingId(null)
                            }
                          }}
                        />
                      </div>
                    ))
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