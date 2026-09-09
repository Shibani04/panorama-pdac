import { FileText, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useState } from 'react'

const STATUS_LABELS = { pending: 'Pending', uploaded: 'Uploaded', reviewed: 'Reviewed' }

function PatientHistoryModal({ patient, requests, onClose }) {
  const [dateFilter, setDateFilter] = useState('')
  const history = requests.filter((request) => request.patient_id === patient.id)
  const filteredHistory = dateFilter
    ? history.filter((request) => request.created_at?.slice(0, 10) === dateFilter)
    : history

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17213a]/35 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-panel shadow-[0_24px_70px_rgba(29,41,66,0.22)]">
        <div className="flex items-center justify-between border-b border-border px-6 py-5"><div><p className="text-xs font-medium uppercase tracking-wide text-accent">Patient history</p><h2 className="mt-1 text-base font-semibold">{patient.name}</h2></div><button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-text-muted hover:bg-bg hover:text-text"><X size={18} /></button></div>
        <div className="max-h-[60vh] overflow-y-auto p-6">
          <div className="mb-4 flex items-center gap-0 rounded-lg border border-border bg-bg px-3 py-2.5"><input aria-label="Filter history by date" type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} className="min-w-0 flex-1 bg-transparent pr-0 text-right text-sm text-text outline-none" />{dateFilter && <button type="button" onClick={() => setDateFilter('')} className="ml-1 text-xs font-semibold text-accent hover:underline">Clear</button>}</div>
          {history.length === 0 ? <p className="rounded-lg bg-bg p-4 text-sm text-text-muted">No scan requests for this patient yet.</p> : filteredHistory.length === 0 ? <p className="rounded-lg bg-bg p-4 text-sm text-text-muted">No requests found for the selected date.</p> : <div className="divide-y divide-border rounded-xl border border-border">{filteredHistory.map((request) => <Link key={request.id} to={`/requests/${request.id}`} onClick={onClose} className="flex items-center justify-between gap-4 px-4 py-4 transition hover:bg-bg"><div className="flex min-w-0 items-center gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent"><FileText size={17} /></div><div className="min-w-0"><p className="truncate text-sm font-semibold">{request.id}</p><p className="mt-1 text-xs text-text-muted">{request.created_at ? new Date(request.created_at).toLocaleDateString() : 'Date unavailable'}</p></div></div><span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${request.status === 'reviewed' ? 'border-flag-negative/30 bg-flag-negative-bg text-flag-negative' : 'border-border bg-bg text-text-muted'}`}>{request.status === 'reviewed' ? 'Report available' : STATUS_LABELS[request.status] || request.status}</span></Link>)}</div>}
        </div>
      </div>
    </div>
  )
}

export default PatientHistoryModal
