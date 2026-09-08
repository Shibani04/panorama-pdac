import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { loginUser } from '../api/client'
import { useAuth } from '../context/AuthContext'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const result = await loginUser({ email, password })
      login(result.access_token, result.user)
      navigate(result.user.role === 'doctor' ? '/doctor' : '/radiologist')
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
          <h1 className="text-lg font-semibold text-text">PANORAMA PDAC Detection</h1>
          <p className="text-sm text-text-muted mt-1">Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-panel border border-border rounded-lg p-6 space-y-4">
          {error && (
            <div className="bg-flag-positive-bg text-flag-positive text-sm rounded px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-mono text-text-muted uppercase tracking-wide mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-border rounded px-3 py-2 text-sm text-text bg-bg focus:outline-none focus:border-text"
              placeholder="you@hospital.org"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-text-muted uppercase tracking-wide mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-border rounded px-3 py-2 text-sm text-text bg-bg focus:outline-none focus:border-text"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-text text-bg text-sm font-medium px-4 py-2 rounded disabled:opacity-50"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-sm text-text-muted mt-4">
          No account? <Link to="/register" className="text-text font-medium">Register</Link>
        </p>
      </div>
    </div>
  )
}

export default Login