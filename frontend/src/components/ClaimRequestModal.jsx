import { X } from 'lucide-react'

function ClaimRequestModal({ requestId, onCancel, onConfirm, submitting = false, error = null }) {
  if (!requestId) return null

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="claim-request-title"
        className="w-full max-w-md rounded-xl border border-border bg-panel p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="claim-request-title" className="text-lg font-semibold">Claim Scan Request</h2>
            <p className="mt-2 text-sm text-text-muted">Are you sure you want to claim this request?</p>
            <p className="mt-3 text-xs font-mono text-text-muted">{requestId}</p>
          </div>
          <button type="button" onClick={onCancel} aria-label="Close" className="text-text-muted hover:text-text">
            <X size={18} />
          </button>
        </div>
        {error && <p className="mt-4 rounded-lg bg-flag-positive-bg px-3 py-2 text-sm text-flag-positive">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onCancel} disabled={submitting} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-muted hover:bg-bg disabled:opacity-50">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} disabled={submitting} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:brightness-105 disabled:opacity-50">
            {submitting ? 'Claiming...' : 'Claim Request'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ClaimRequestModal
