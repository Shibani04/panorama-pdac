import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { registerUser } from '../api/client'
import { HeartPulse } from 'lucide-react'

function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'doctor' })
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await registerUser(form)
      setSuccess(true)
      setTimeout(() => navigate('/login'), 1200)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen grid lg:grid-cols-[.94fr_1.06fr] bg-white">
      <section className="hidden lg:flex relative overflow-hidden p-12 xl:px-20 bg-[#0C3448] text-white flex-col">
        <div className="absolute inset-0 opacity-20 bg-[linear-gradient(rgba(184,232,226,.16)_1px,transparent_1px),linear-gradient(90deg,rgba(184,232,226,.16)_1px,transparent_1px)] bg-[size:46px_46px]" />
        <div className="relative flex items-center gap-2.5 font-display font-extrabold tracking-wide"><HeartPulse size={25} className="text-[#A8DED7]" /> PANCREAAI</div>
        <div className="relative my-auto max-w-xl"><p className="text-[11px] uppercase tracking-[1.35px] text-[#A9C3C9] font-bold">Clinical review workspace</p><h1 className="font-display text-5xl font-extrabold leading-tight tracking-[-2px] mt-5">Built for<br /><em className="not-italic text-[#A8DED7]">better review.</em></h1><p className="text-[#B6CBD0] text-base leading-7 max-w-md mt-6">Create secure access for the teams reviewing pancreatic CT analysis.</p></div>
      </section>
      <section className="flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-md">
        <div className="mb-7 flex items-center gap-3 lg:hidden">
          <div className="w-11 h-11 rounded-2xl bg-accent text-white flex items-center justify-center shadow-sm">
            <HeartPulse size={22} strokeWidth={1.8} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-[0.08em] text-text">PANCREAAI</h1>
            <p className="text-xs text-text-muted mt-0.5">PDAC Detection</p>
          </div>
        </div>

        <div className="mb-8"><p className="text-[11px] uppercase tracking-[1.35px] text-text-muted font-bold">PancreaAI access</p><h2 className="font-display text-4xl font-extrabold tracking-[-1.4px] mt-3">Create account</h2><p className="text-text-muted mt-2">Set up doctor or radiologist access.</p></div>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-flag-positive-bg text-flag-positive text-sm rounded px-3 py-2">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-flag-negative-bg text-flag-negative text-sm rounded px-3 py-2">
              Account created — redirecting to sign in…
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">Name</label>
            <input
              required minLength={2}
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              className="w-full border border-border rounded-lg px-3.5 py-2.5 text-sm text-text bg-bg focus:outline-none focus:border-sidebar-text-active"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">Email</label>
            <input
              type="email" required
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              className="w-full border border-border rounded-lg px-3.5 py-2.5 text-sm text-text bg-bg focus:outline-none focus:border-sidebar-text-active"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">Password</label>
            <input
              type="password" required minLength={8}
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              className="w-full border border-border rounded-lg px-3.5 py-2.5 text-sm text-text bg-bg focus:outline-none focus:border-sidebar-text-active"
              placeholder="At least 8 characters"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">Role</label>
            <select
              value={form.role}
              onChange={(e) => update('role', e.target.value)}
              className="w-full border border-border rounded-lg px-3.5 py-2.5 text-sm text-text bg-bg focus:outline-none focus:border-sidebar-text-active"
            >
              <option value="doctor">Doctor</option>
              <option value="radiologist">Radiologist</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-accent text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm hover:brightness-105 disabled:opacity-50 transition"
          >
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-sm text-text-muted mt-5">
          Already have an account? <Link to="/login" className="text-accent font-semibold hover:underline">Sign in</Link>
        </p>
      </div>
      </section>
    </main>
  )
}

export default Register