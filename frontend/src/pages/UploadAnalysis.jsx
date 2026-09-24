import { useEffect, useRef, useState } from 'react'
import { Activity, FileCheck, FileUp, Upload } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { listMyRequests, uploadCT } from '../api/client'
import { useAuth } from '../context/AuthContext'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'

function UploadAnalysis() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [searchParams] = useSearchParams()
  const requestedId = searchParams.get('requestId')
  const [file, setFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  async function loadRequests() {
    try {
      const items = await listMyRequests()
      const assignedRequests = items.filter((request) => request.status === 'pending' && request.radiologist_id === user?.id)
      setRequests(assignedRequests)
      if (!selectedId) {
        const requestedRequest = assignedRequests.find((request) => request.id === requestedId)
        setSelectedId(requestedRequest?.id || assignedRequests[0]?.id || '')
      }
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => { loadRequests() }, [])

  function handleNavigate(key) {
    if (key === 'dashboard') navigate('/radiologist')
    if (key === 'requests') navigate('/requests')
    if (key === 'reports') navigate('/reports')
  }

  async function handleAnalyze(event) {
    event.preventDefault()
    if (!file || !selectedId) return
    setSubmitting(true)
    setError(null)
    try {
      await uploadCT(selectedId, file)
      setFile(null)
      navigate(`/requests/${selectedId}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const selectedRequest = requests.find((request) => request.id === selectedId)
  const availableRequests = requests

  return (
    <div className="flex h-screen overflow-hidden bg-bg text-text">
      <Sidebar role="radiologist" activeKey="upload" onNavigate={handleNavigate} />
      <main className="h-screen min-h-0 min-w-0 flex-1 overflow-y-auto">
        <Topbar title="Upload Analysis" user={user} />
        <div className="p-8">
          {error && <p className="mb-4 rounded-lg bg-flag-positive-bg px-3 py-2 text-sm text-flag-positive">{error}</p>}
          {availableRequests.length > 0 && <section className="mb-4 flex items-center justify-between gap-5 rounded-[14px] border border-border bg-panel p-5 shadow-[0_10px_28px_rgba(26,52,73,0.06)]"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-lg bg-accent-soft text-accent"><FileCheck size={19} /></div><div><p className="text-[10px] uppercase tracking-wide font-bold text-text-muted">Case assignment</p><p className="text-sm font-semibold">Select the patient record for this scan</p><p className="text-xs text-text-muted mt-1">The original image is sent to the analysis service.</p></div></div><select value={selectedId} onChange={(event) => { setSelectedId(event.target.value); setFile(null) }} className="w-full max-w-xs rounded-lg border border-border bg-bg px-3 py-2.5 text-sm outline-none focus:border-accent"><option value="">Select a request</option>{availableRequests.map((request) => <option key={request.id} value={request.id}>{request.id}</option>)}</select></section>}
          <div className="max-w-2xl">
            <form onSubmit={handleAnalyze} className="rounded-[14px] border border-border bg-panel p-5 shadow-[0_10px_28px_rgba(26,52,73,0.06)]"><div className="flex items-start justify-between"><div><h3 className="text-base font-semibold">Upload CT image</h3><p className="mt-1 text-sm text-text-muted">{selectedRequest?.id || 'Choose a request above'}</p></div><Upload size={19} className="text-text-muted" /></div><input ref={inputRef} type="file" accept=".nii,.nii.gz,.dcm" onChange={(event) => setFile(event.target.files?.[0] || null)} className="hidden" /><button type="button" onClick={() => inputRef.current?.click()} className="mt-4 flex min-h-48 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-bg px-6 text-center hover:border-accent hover:bg-accent-soft/30 transition">{file ? <><FileCheck size={28} className="mb-3 text-flag-negative" /><p className="text-sm font-semibold truncate max-w-full">{file.name}</p><p className="mt-1 text-xs text-text-muted">Click to change file</p></> : <><FileUp size={28} className="mb-3 text-accent" /><p className="text-sm font-semibold">Drop scan here or browse</p><p className="mt-1 text-xs text-text-muted">Original image only · NII, NII.GZ, DCM</p></>}</button><button type="submit" disabled={!file || !selectedId || submitting} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"><Activity size={16} /> {submitting ? 'Analyzing...' : 'Analyze scan'}</button></form>
          </div>
        </div>
      </main>
    </div>
  )
}

export default UploadAnalysis