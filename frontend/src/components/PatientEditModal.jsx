import { Save, X } from 'lucide-react'
import { useState } from 'react'
import { updatePatient } from '../api/client'

function PatientEditModal({ patient, onClose, onSaved }) {
  const [form, setForm] = useState({ age: patient.age ?? '', sex: patient.sex || '', contact_no: patient.contact_no || '' })
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const updated = await updatePatient(patient.id, {
        age: form.age === '' ? null : Number(form.age),
        sex: form.sex || null,
        contact_no: form.contact_no || null,
      })
      onSaved(updated)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17213a]/35 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-panel shadow-[0_24px_70px_rgba(29,41,66,0.22)]">
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <div><p className="text-xs font-medium uppercase tracking-wide text-accent">Patient details</p><h2 className="mt-1 text-base font-semibold">Edit patient</h2></div>
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-text-muted hover:bg-bg hover:text-text"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {error && <div className="rounded-lg bg-flag-positive-bg px-3 py-2 text-sm text-flag-positive">{error}</div>}
          <div><p className="mb-1 text-xs font-medium uppercase tracking-wide text-text-muted">Name</p><div className="rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm text-text-muted">{patient.name}</div><p className="mt-1 text-xs text-text-muted">Name cannot be changed.</p></div>
          <div className="grid grid-cols-2 gap-3"><label className="text-xs font-medium text-text-muted">Age<input type="number" min="0" max="120" value={form.age} onChange={(event) => setForm({ ...form, age: event.target.value })} className="mt-1.5 w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text outline-none focus:border-accent" /></label><label className="text-xs font-medium text-text-muted">Sex<select value={form.sex} onChange={(event) => setForm({ ...form, sex: event.target.value })} className="mt-1.5 w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text outline-none focus:border-accent"><option value="">Select</option><option value="M">M</option><option value="F">F</option></select></label></div>
          <label className="block text-xs font-medium text-text-muted">Contact number<input value={form.contact_no} onChange={(event) => setForm({ ...form, contact_no: event.target.value })} className="mt-1.5 w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text outline-none focus:border-accent" /></label>
          <button type="submit" disabled={saving} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:brightness-105 disabled:opacity-50"><Save size={15} /> {saving ? 'Saving...' : 'Save changes'}</button>
        </form>
      </div>
    </div>
  )
}

export default PatientEditModal
