import { useState, useEffect, useRef } from 'react'
import { Plus, Users, FileX, Search, Pencil } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { listMyPatients, addPatient, listMyRequests } from '../api/client'
import { useAuth } from '../context/AuthContext'
import Sidebar from '../components/Sidebar'
import StatsOverview from '../components/StatsOverview'
import EmptyState from '../components/EmptyState'
import RequestScanModal from '../components/RequestScanModal'
import DashboardAnalytics from '../components/DashboardAnalytics'
import PatientEditModal from '../components/PatientEditModal'
import PatientHistoryModal from '../components/PatientHistoryModal'
import Topbar from '../components/Topbar'

const STATUS_LABELS = { pending: 'Pending', reviewed: 'Reviewed' }

function DoctorDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [patients, setPatients] = useState([])
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddPatient, setShowAddPatient] = useState(false)
  const [newPatient, setNewPatient] = useState({ name: '', age: '', sex: 'M', contact_no: '' })
  const [error, setError] = useState(null)
  const [scanModalPatient, setScanModalPatient] = useState(null)
  const [editingPatient, setEditingPatient] = useState(null)
  const [historyPatient, setHistoryPatient] = useState(null)
  const [patientSearch, setPatientSearch] = useState('')
  const [activeKey, setActiveKey] = useState(() => searchParams.get('section') || 'dashboard')
  const [statusFilter, setStatusFilter] = useState(null)

  const patientsRef = useRef(null)
  const requestsRef = useRef(null)

  async function refresh() {
    try {
      const [p, r] = await Promise.all([listMyPatients(), listMyRequests()])
      setPatients(p)
      setRequests(r)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  useEffect(() => {
    if (!loading && activeKey === 'patients') scrollTo(patientsRef)
  }, [loading, activeKey])

  function scrollTo(ref) {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function handleNavigate(key) {
    setActiveKey(key)

    if (key === 'requests') {
      navigate('/requests')
    } else if (key === 'reports') {
      navigate('/reports')
    } else if (key === 'patients') {
      setActiveKey('patients')
      scrollTo(patientsRef)
    } else if (key === 'add-patient') {
      setShowAddPatient(true)
      scrollTo(patientsRef)
    } else if (key === 'create-request' || key === 'requests') {
      setStatusFilter(null)
      scrollTo(key === 'create-request' ? patientsRef : requestsRef)
    } else if (['pending', 'reviewed'].includes(key)) {
      setStatusFilter(key)
      scrollTo(requestsRef)
    } else if (key === 'dashboard') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  async function handleAddPatient(e) {
    e.preventDefault()
    setError(null)
    try {
      await addPatient({ ...newPatient, age: newPatient.age ? Number(newPatient.age) : null })
      setNewPatient({ name: '', age: '', sex: 'M', contact_no: '' })
      setShowAddPatient(false)
      refresh()
    } catch (err) {
      setError(err.message)
    }
  }

  function handleRequestSent() {
    setScanModalPatient(null)
    refresh()
  }

  const visibleRequests = statusFilter ? requests.filter((r) => r.status === statusFilter) : requests
  const visiblePatients = patients.filter((patient) => `${patient.name} ${patient.id} ${patient.contact_no || ''}`.toLowerCase().includes(patientSearch.toLowerCase()))

  return (
    <div className="h-screen overflow-hidden bg-bg text-text flex">
      <Sidebar role="doctor" activeKey={activeKey} onNavigate={handleNavigate} />

      <div className="h-screen min-h-0 min-w-0 flex-1 overflow-y-auto">
        <Topbar title={activeKey === 'patients' ? 'Patients' : 'Doctor dashboard'} user={user} />

        <div className="p-8 space-y-6">
          {error && (
            <div className="bg-flag-positive-bg text-flag-positive text-sm rounded px-3 py-2">
              {error}
            </div>
          )}

          {loading ? (
            <p className="text-sm text-text-muted">Loading...</p>
          ) : (
            <>
              {activeKey === 'dashboard' && (
                <>
                  <div className="flex items-center gap-3.5 p-4 border border-[#D6EBE7] rounded-xl bg-[#F1F8F5]">
                    <div className="w-9 h-9 rounded-full bg-[#DCEFE6] text-accent grid place-items-center"><FileX size={17} /></div>
                    <div className="flex-1"><p className="text-sm font-semibold">{requests.filter((r) => r.status === 'pending').length} cases require your attention</p><p className="text-xs text-text-muted mt-0.5">Start with the oldest pending review in your queue.</p></div>
                  </div>

                  <StatsOverview
                    requests={requests}
                    extraStat={
                      <div className="bg-panel border border-border rounded-xl px-4 py-4 shadow-[0_6px_20px_rgba(49,87,183,0.04)]">
                        <p className="text-xs font-mono text-text-muted uppercase tracking-wide">Patients</p>
                        <p className="text-2xl font-semibold mt-1">{patients.length}</p>
                      </div>
                    }
                  />
                  <DashboardAnalytics requests={requests} />
                </>
              )}

              <div className={`grid gap-6 ${activeKey === 'dashboard' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {(activeKey === 'dashboard' || activeKey === 'patients' || activeKey === 'add-patient') && (
                <div ref={patientsRef} className="bg-panel border border-border rounded-xl shadow-[0_6px_20px_rgba(49,87,183,0.04)] scroll-mt-6 overflow-hidden">
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3 flex-wrap">
                    <span className="text-xs font-mono text-text-muted uppercase tracking-wide">
                      {patients.length} patients
                    </span>
                    <div className="flex items-center gap-2"><label className="flex items-center gap-2 rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-muted"><Search size={15} /><input value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)} placeholder="Search patients" className="w-36 bg-transparent outline-none placeholder:text-text-muted" /></label><button onClick={() => setShowAddPatient(!showAddPatient)} className="flex items-center gap-1 text-sm font-semibold bg-accent text-white px-3 py-2 rounded-lg hover:brightness-105 transition"><Plus size={14} /> Add patient</button></div>
                  </div>

                  {showAddPatient && (
                    <form onSubmit={handleAddPatient} className="p-4 border-b border-border space-y-2">
                      <input required placeholder="Name" value={newPatient.name}
                        onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                        className="w-full border border-border rounded px-3 py-1.5 text-sm bg-bg" />
                      <div className="flex gap-2">
                        <input type="number" placeholder="Age" value={newPatient.age}
                          onChange={(e) => setNewPatient({ ...newPatient, age: e.target.value })}
                          className="w-1/2 border border-border rounded px-3 py-1.5 text-sm bg-bg" />
                        <select value={newPatient.sex}
                          onChange={(e) => setNewPatient({ ...newPatient, sex: e.target.value })}
                          className="w-1/2 border border-border rounded px-3 py-1.5 text-sm bg-bg">
                          <option value="M">M</option>
                          <option value="F">F</option>
                        </select>
                      </div>
                      <input placeholder="Contact no." value={newPatient.contact_no}
                        onChange={(e) => setNewPatient({ ...newPatient, contact_no: e.target.value })}
                        className="w-full border border-border rounded px-3 py-1.5 text-sm bg-bg" />
                      <button type="submit" className="w-full bg-text text-bg text-sm font-medium py-1.5 rounded">
                        Save patient
                      </button>
                    </form>
                  )}

                  {patients.length === 0 ? (
                    <EmptyState icon={Users} title="No patients yet" subtitle="Add a patient to request a scan" />
                  ) : visiblePatients.length === 0 ? (
                    <EmptyState icon={Search} title="No patients found" subtitle="Try a different name, ID, or contact search" />
                  ) : (
                    visiblePatients.map((p) => (
                      <div key={p.id} className="border-b border-border last:border-0 hover:bg-bg/70 transition">
                        <div className="px-4 py-4 flex items-center justify-between gap-4"><div><p className="text-sm font-medium">{p.name}</p><p className="text-xs text-text-muted">{p.age ? `${p.age}y` : ''} {p.sex} {p.contact_no ? `· ${p.contact_no}` : ''}</p></div><div className="flex items-center gap-2"><button type="button" onClick={() => setEditingPatient(p)} aria-label={`Edit ${p.name}`} title="Edit patient details" className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-transparent text-accent hover:bg-accent-soft transition"><Pencil size={15} /></button><button type="button" onClick={() => setHistoryPatient(p)} className="inline-flex items-center rounded-md border border-[#CBE9DF] bg-[#EAF8F2] px-3 py-1.5 text-xs font-semibold text-flag-negative hover:brightness-95 transition">History</button><button type="button" onClick={() => setScanModalPatient(p)} className="inline-flex items-center rounded-md border border-[#CBE9DF] bg-[#EAF8F2] px-3 py-1.5 text-xs font-semibold text-flag-negative hover:brightness-95 transition">Request scan</button></div></div>
                      </div>
                    ))
                  )}
                </div>
                )}

                {(activeKey === 'dashboard' || activeKey === 'requests' || activeKey === 'status' || ['pending', 'reviewed'].includes(activeKey)) && (
                <div ref={requestsRef} className="bg-panel border border-border rounded-xl shadow-[0_6px_20px_rgba(49,87,183,0.04)] scroll-mt-6 overflow-hidden">
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-mono text-text-muted uppercase tracking-wide">
                      {visibleRequests.length} requests{statusFilter ? ` · ${STATUS_LABELS[statusFilter]}` : ''}
                    </span>
                    <div className="flex gap-1">
                      {['pending', 'reviewed'].map((s) => (
                        <button
                          key={s}
                          onClick={() => setStatusFilter(statusFilter === s ? null : s)}
                            className={`text-xs px-3 py-1.5 rounded-md border font-semibold transition-colors ${
                            statusFilter === s
                              ? 'bg-accent text-white border-accent'
                              : 'bg-transparent border-border text-text-muted hover:bg-accent-soft hover:text-accent'
                          }`}
                        >
                          {STATUS_LABELS[s]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {visibleRequests.length === 0 ? (
                    <EmptyState icon={FileX} title="No requests" subtitle="Request a scan for a patient to see it here" />
                  ) : (
                    visibleRequests.map((r) => (
                      <Link key={r.id} to={`/requests/${r.id}`} className="block px-4 py-4 border-b border-border last:border-0 hover:bg-bg transition">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-mono">{r.id}</span>
                          <span className={`text-xs px-2.5 py-1 rounded-full border ${r.status === 'reviewed' ? 'border-flag-negative/30 bg-flag-negative-bg text-flag-negative' : 'bg-bg border-border text-text-muted'}`}>
                            {STATUS_LABELS[r.status] || r.status}
                          </span>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
                )}
              </div>

            </>
          )}
        </div>
      </div>

      {scanModalPatient && (
        <RequestScanModal
          patient={scanModalPatient}
          onClose={() => setScanModalPatient(null)}
          onSent={handleRequestSent}
        />
      )}
      {editingPatient && <PatientEditModal patient={editingPatient} onClose={() => setEditingPatient(null)} onSaved={() => { setEditingPatient(null); refresh() }} />}
      {historyPatient && <PatientHistoryModal patient={historyPatient} requests={requests} onClose={() => setHistoryPatient(null)} />}
    </div>
  )
}

export default DoctorDashboard