import { useState, useEffect } from 'react'
import { LogOut, Upload, FileUp, FileCheck, Inbox } from 'lucide-react'
import { Link } from 'react-router-dom'
import { listMyRequests, claimRequest, uploadCT, completeRequest } from '../api/client'
import { useAuth } from '../context/AuthContext'
import StatsOverview from '../components/StatsOverview'
import EmptyState from '../components/EmptyState'

function RadiologistDashboard() {
  const { user, logout } = useAuth()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)
  const [scanner, setScanner] = useState('SIEMENS')
  const [file, setFile] = useState(null)
  const [notes, setNotes] = useState('')
  const [pathway, setPathway] = useState('radiology')

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

  async function handleClaim(id) {
    setError(null)
    try {
      await claimRequest(id)
      const updated = await listMyRequests()
      setRequests(updated)
      setSelected(updated.find((r) => r.id === id))
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleUpload(e) {
    e.preventDefault()
    setError(null)
    try {
      await uploadCT(selected.id, file, scanner)
      setFile(null)
      const updated = await listMyRequests()
      setRequests(updated)
      setSelected(updated.find((r) => r.id === selected.id))
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleComplete(e) {
    e.preventDefault()
    setError(null)
    try {
      await completeRequest(selected.id, notes, pathway)
      setNotes('')
      const updated = await listMyRequests()
      setRequests(updated)
      setSelected(updated.find((r) => r.id === selected.id))
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">PANORAMA PDAC Detection</h1>
          <p className="text-sm text-text-muted">Radiologist console — {user?.name}</p>
        </div>
        <button onClick={logout} className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text">
          <LogOut size={16} /> Sign out
        </button>
      </header>

      <div className="p-6">
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

            <div className="grid grid-cols-[380px_1fr] gap-6">
              <div className="bg-panel border border-border rounded-lg">
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
                      className={`px-4 py-3 border-b border-border cursor-pointer hover:bg-bg ${selected?.id === r.id ? 'bg-bg' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-mono">{r.id}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-bg border border-border text-text-muted">
                          {r.status}
                        </span>
                      </div>
                      {r.prediction !== null && (
                        <p className="text-xs text-text-muted mt-1">Prediction: {(r.prediction * 100).toFixed(0)}%</p>
                      )}
                      {r.status === 'reviewed' && (
                        <Link
                          to={`/case/${r.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-text-muted hover:text-text underline mt-1 inline-block"
                        >
                          View report →
                        </Link>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="bg-panel border border-border rounded-lg p-6">
                {!selected && (
                  <p className="text-sm text-text-muted">Select a request from the list to act on it.</p>
                )}

                {selected && selected.status === 'pending' && !selected.radiologist_id && (
                  <div>
                    <p className="text-sm mb-4">
                      Claim <span className="font-mono">{selected.id}</span> to begin review.
                    </p>
                    <button
                      onClick={() => handleClaim(selected.id)}
                      className="bg-text text-bg text-sm font-medium px-4 py-2 rounded"
                    >
                      Claim request
                    </button>
                  </div>
                )}

                {selected && selected.status === 'pending' && selected.radiologist_id === user.id && (
                  <form onSubmit={handleUpload} className="space-y-3 max-w-sm">
                    <p className="text-sm font-medium mb-2">Upload CT scan for {selected.id}</p>
                    <input
                      required
                      placeholder="Scanner (e.g. SIEMENS)"
                      value={scanner}
                      onChange={(e) => setScanner(e.target.value)}
                      className="w-full border border-border rounded px-3 py-2 text-sm bg-bg"
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
                      className="block cursor-pointer border-2 border-dashed border-border rounded-lg px-6 py-8 text-center hover:border-text-muted transition-colors"
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
                      disabled={!file}
                      className="flex items-center justify-center gap-2 w-full bg-text text-bg text-sm font-medium px-4 py-2 rounded disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Upload size={14} /> Upload & run analysis
                    </button>
                  </form>
                )}

                {selected && selected.status === 'uploaded' && (
                  <form onSubmit={handleComplete} className="space-y-3 max-w-sm">
                    <p className="text-sm font-medium mb-2">
                      Complete review — prediction: {(selected.prediction * 100).toFixed(0)}%
                    </p>
                    <select
                      value={pathway}
                      onChange={(e) => setPathway(e.target.value)}
                      className="w-full border border-border rounded px-3 py-2 text-sm bg-bg"
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
                      className="w-full border border-border rounded px-3 py-2 text-sm bg-bg h-24"
                    />
                    <button type="submit" className="bg-text text-bg text-sm font-medium px-4 py-2 rounded">
                      Complete review
                    </button>
                  </form>
                )}

                {selected && selected.status === 'reviewed' && (
                  <p className="text-sm text-flag-negative">This request has already been reviewed.</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default RadiologistDashboard