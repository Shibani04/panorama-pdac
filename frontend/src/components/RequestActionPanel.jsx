import { useState } from 'react'
import { Upload, FileUp, FileCheck } from 'lucide-react'
import { claimRequest, uploadCT, completeRequest } from '../api/client'
import { useAuth } from '../context/AuthContext'

function RequestActionPanel({ request, onUpdate }) {
  const { user } = useAuth()
  const [scanner, setScanner] = useState('SIEMENS')
  const [file, setFile] = useState(null)
  const [notes, setNotes] = useState('')
  const [pathway, setPathway] = useState('radiology')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleClaim() {
    setError(null)
    setSubmitting(true)
    try {
      await claimRequest(request.id)
      await onUpdate()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleUpload(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await uploadCT(request.id, file, scanner)
      setFile(null)
      await onUpdate()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleComplete(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await completeRequest(request.id, notes, pathway)
      setNotes('')
      await onUpdate()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (user?.role !== 'radiologist') return null

  return (
    <div className="bg-panel border border-border rounded-xl p-6">
      {error && (
        <div className="mb-4 bg-flag-positive-bg text-flag-positive text-sm rounded px-3 py-2">
          {error}
        </div>
      )}

      {request.status === 'pending' && !request.radiologist_id && (
        <div>
          <p className="text-sm mb-4">
            Claim <span className="font-mono">{request.id}</span> to begin review.
          </p>
          <button
            onClick={handleClaim}
            disabled={submitting}
            className="bg-accent text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:brightness-105 disabled:opacity-50 transition"
          >
            {submitting ? 'Claiming…' : 'Claim request'}
          </button>
        </div>
      )}

      {request.status === 'pending' && request.radiologist_id && request.radiologist_id !== user.id && (
        <p className="text-sm text-text-muted">
          This request is already assigned to another radiologist.
        </p>
      )}

      {request.status === 'pending' && request.radiologist_id === user.id && (
        <form onSubmit={handleUpload} className="space-y-3 max-w-sm">
          <p className="text-sm font-medium mb-2">Upload CT scan for {request.id}</p>
          <input
            required
            placeholder="Scanner (e.g. SIEMENS)"
            value={scanner}
            onChange={(e) => setScanner(e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-bg focus:outline-none focus:border-sidebar-text-active"
          />
          <input
            id="ct-file-input"
            required
            type="file"
            accept=".nii,.nii.gz,.dcm"
            onChange={(e) => setFile(e.target.files[0])}
            className="hidden"
          />
          <label
            htmlFor="ct-file-input"
            className="block cursor-pointer border-2 border-dashed border-border rounded-xl px-6 py-8 text-center hover:border-sidebar-text-active hover:bg-sidebar-active/30 transition-colors"
          >
            {!file ? (
              <>
                <FileUp className="mx-auto mb-2 text-text-muted" size={24} strokeWidth={1.5} />
                <p className="text-sm font-medium">Click to choose a CT file</p>
                <p className="text-xs text-text-muted mt-1">.nii, .nii.gz, or .dcm</p>
              </>
            ) : (
              <>
                <FileCheck className="mx-auto mb-2 text-flag-negative" size={24} strokeWidth={1.5} />
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-text-muted mt-1">
                  {(file.size / (1024 * 1024)).toFixed(1)} MB — click to change
                </p>
              </>
            )}
          </label>
          <button
            type="submit"
            disabled={!file || submitting}
            className="flex items-center justify-center gap-2 w-full bg-accent text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:brightness-105 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <Upload size={14} /> {submitting ? 'Uploading…' : 'Upload & run analysis'}
          </button>
        </form>
      )}

      {request.status === 'uploaded' && (
        <form onSubmit={handleComplete} className="space-y-3 max-w-sm">
          <p className="text-sm font-medium mb-2">
            Complete review — prediction: {(request.prediction * 100).toFixed(0)}%
          </p>
          <select
            value={pathway}
            onChange={(e) => setPathway(e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-bg focus:outline-none focus:border-sidebar-text-active"
          >
            <option value="radiology">Routine follow-up (radiology)</option>
            <option value="tissue-confirmed">Refer for biopsy (tissue-confirmed)</option>
            <option value="external">External / other</option>
          </select>
          <textarea
            required
            placeholder="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-bg h-24 focus:outline-none focus:border-sidebar-text-active"
          />
          <button type="submit" disabled={submitting} className="bg-accent text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:brightness-105 disabled:opacity-50 transition">
            {submitting ? 'Submitting…' : 'Complete review'}
          </button>
        </form>
      )}
    </div>
  )
}

export default RequestActionPanel