import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { listRadiologists, createRequest } from '../api/client'

function RequestScanModal({ patient, onClose, onSent }) {
  const [radiologists, setRadiologists] = useState([])
  const [radiologistId, setRadiologistId] = useState('')
  const [comment, setComment] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    listRadiologists().then(setRadiologists).catch((e) => setError(e.message))
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await createRequest({
        patient_id: patient.id,
        radiologist_id: radiologistId || null,
        comment: comment || null,
      })
      onSent()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-[#17213a]/35 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-panel border border-border rounded-2xl w-full max-w-md shadow-[0_24px_70px_rgba(29,41,66,0.22)]">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div>
            <p className="text-xs font-medium text-accent uppercase tracking-wide">Patient workflow</p>
            <h2 className="text-base font-semibold mt-1">New scan request</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:bg-bg hover:text-text">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-flag-positive-bg text-flag-positive text-sm rounded px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-1">Patient</p>
            <p className="text-sm">{patient.name} — {patient.age ?? '—'}y, {patient.sex}</p>
            <p className="text-xs text-text-muted font-mono">{patient.id}</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">
              Radiologist
            </label>
            <select
              value={radiologistId}
              onChange={(e) => setRadiologistId(e.target.value)}
              className="w-full border border-border rounded-lg px-3.5 py-2.5 text-sm bg-bg focus:outline-none focus:border-sidebar-text-active"
            >
              <option value="">Any available radiologist</option>
              {radiologists.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">
              Comment (optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Clinical context, symptoms, urgency…"
              className="w-full border border-border rounded-lg px-3.5 py-2.5 text-sm bg-bg h-24 focus:outline-none focus:border-sidebar-text-active"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-accent text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:brightness-105 disabled:opacity-50 transition"
          >
            {submitting ? 'Sending…' : 'Send request'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default RequestScanModal