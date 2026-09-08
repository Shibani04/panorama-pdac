import { useState, useEffect } from 'react'
import { Plus, LogOut, Users, FileX } from 'lucide-react'
import { Link } from 'react-router-dom'
import { listMyPatients, addPatient, createRequest, listMyRequests } from '../api/client'
import { useAuth } from '../context/AuthContext'
import StatsOverview from '../components/StatsOverview'
import EmptyState from '../components/EmptyState'

function DoctorDashboard() {
  const { user, logout } = useAuth()
  const [patients, setPatients] = useState([])
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddPatient, setShowAddPatient] = useState(false)
  const [newPatient, setNewPatient] = useState({ name: '', age: '', sex: 'M', contact_no: '' })
  const [error, setError] = useState(null)

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

  async function handleCreateRequest(patientId) {
    setError(null)
    try {
      await createRequest({ patient_id: patientId })
      refresh()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">PANORAMA PDAC Detection</h1>
          <p className="text-sm text-text-muted">Doctor console — {user?.name}</p>
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
            <StatsOverview
              requests={requests}
              extraStat={
                <div className="bg-panel border border-border rounded-lg px-4 py-3">
                  <p className="text-xs font-mono text-text-muted uppercase tracking-wide">Patients</p>
                  <p className="text-2xl font-semibold mt-1">{patients.length}</p>
                </div>
              }
            />

            <div className="grid grid-cols-2 gap-6">
              <div className="bg-panel border border-border rounded-lg">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <span className="text-xs font-mono text-text-muted uppercase tracking-wide">
                    {patients.length} patients
                  </span>
                  <button
                    onClick={() => setShowAddPatient(!showAddPatient)}
                    className="flex items-center gap-1 text-sm font-medium bg-text text-bg px-3 py-1.5 rounded"
                  >
                    <Plus size={14} /> Add patient
                  </button>
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
                ) : (
                  patients.map((p) => (
                    <div key={p.id} className="px-4 py-3 border-b border-border flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{p.name}</p>
                        <p className="text-xs text-text-muted">{p.age ? `${p.age}y` : ''} {p.sex}</p>
                      </div>
                      <button onClick={() => handleCreateRequest(p.id)} className="text-xs font-medium text-text-muted hover:text-text underline">
                        Request scan
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="bg-panel border border-border rounded-lg">
                <div className="px-4 py-3 border-b border-border">
                  <span className="text-xs font-mono text-text-muted uppercase tracking-wide">
                    {requests.length} requests
                  </span>
                </div>

                {requests.length === 0 ? (
                  <EmptyState icon={FileX} title="No requests yet" subtitle="Request a scan for a patient to see it here" />
                ) : (
                  requests.map((r) => (
                    <Link key={r.id} to={`/case/${r.id}`} className="block px-4 py-3 border-b border-border hover:bg-bg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-mono">{r.id}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-bg border border-border text-text-muted">
                          {r.status}
                        </span>
                      </div>
                      {r.prediction !== null && (
                        <p className="text-xs text-text-muted mt-1">Prediction: {(r.prediction * 100).toFixed(0)}%</p>
                      )}
                    </Link>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default DoctorDashboard