import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { registerUser } from '../api/client'

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
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-lg font-semibold text-text">Create account</h1>
          <p className="text-sm text-text-muted mt-1">Doctor or radiologist access</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-panel border border-border rounded-lg p-6 space-y-4">
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
            <label className="block text-xs font-mono text-text-muted uppercase tracking-wide mb-1">Name</label>
            <input
              required minLength={2}
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              className="w-full border border-border rounded px-3 py-2 text-sm text-text bg-bg focus:outline-none focus:border-text"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-text-muted uppercase tracking-wide mb-1">Email</label>
            <input
              type="email" required
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              className="w-full border border-border rounded px-3 py-2 text-sm text-text bg-bg focus:outline-none focus:border-text"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-text-muted uppercase tracking-wide mb-1">Password</label>
            <input
              type="password" required minLength={8}
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              className="w-full border border-border rounded px-3 py-2 text-sm text-text bg-bg focus:outline-none focus:border-text"
              placeholder="At least 8 characters"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-text-muted uppercase tracking-wide mb-1">Role</label>
            <select
              value={form.role}
              onChange={(e) => update('role', e.target.value)}
              className="w-full border border-border rounded px-3 py-2 text-sm text-text bg-bg focus:outline-none focus:border-text"
            >
              <option value="doctor">Doctor</option>
              <option value="radiologist">Radiologist</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-text text-bg text-sm font-medium px-4 py-2 rounded disabled:opacity-50"
          >
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-sm text-text-muted mt-4">
          Already have an account? <Link to="/login" className="text-text font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  )
}

export default Register