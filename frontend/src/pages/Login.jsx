import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { loginUser } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { HeartPulse, ShieldCheck } from 'lucide-react'

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
    <main className="min-h-screen grid lg:grid-cols-[.94fr_1.06fr] bg-white">
      <section className="hidden lg:flex relative overflow-hidden p-12 xl:px-20 bg-[#0C3448] text-white flex-col">
        <div className="absolute inset-0 opacity-20 bg-[linear-gradient(rgba(184,232,226,.16)_1px,transparent_1px),linear-gradient(90deg,rgba(184,232,226,.16)_1px,transparent_1px)] bg-[size:46px_46px]" />
        <div className="relative flex items-center gap-2.5 font-display font-extrabold tracking-wide"><HeartPulse size={25} className="text-[#A8DED7]" /> PANCREAAI</div>
        <div className="relative my-auto max-w-xl">
          <p className="text-[11px] uppercase tracking-[1.35px] text-[#A9C3C9] font-bold">AI-assisted imaging workspace</p>
          <h1 className="font-display text-5xl xl:text-6xl font-extrabold leading-tight tracking-[-2px] mt-5">Clarity for every<br /><em className="not-italic text-[#A8DED7]">clinical decision.</em></h1>
          <p className="text-[#B6CBD0] text-base leading-7 max-w-md mt-6">A focused review environment for pancreatic CT analysis, built around the clinical team.</p>
        </div>
        <div className="relative flex items-center gap-2 text-xs text-[#A9C3C9]"><ShieldCheck size={16} /> Secure clinical workspace <span>•</span> Research use only</div>
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

        <div className="mb-8"><p className="text-[11px] uppercase tracking-[1.35px] text-text-muted font-bold">Doctor and radiologist portal</p><h2 className="font-display text-4xl font-extrabold tracking-[-1.4px] mt-3">Welcome back</h2><p className="text-text-muted mt-2">Sign in to the clinical review workspace.</p></div>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-flag-positive-bg text-flag-positive text-sm rounded px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-border rounded-lg px-3.5 py-2.5 text-sm text-text bg-bg focus:outline-none focus:border-sidebar-text-active"
              placeholder="you@hospital.org"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-border rounded-lg px-3.5 py-2.5 text-sm text-text bg-bg focus:outline-none focus:border-sidebar-text-active"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-accent text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm hover:brightness-105 disabled:opacity-50 transition"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="flex items-center justify-center gap-1.5 text-sm text-text-muted mt-5">
          <ShieldCheck size={15} className="text-accent" />
          No account? <Link to="/register" className="text-accent font-semibold hover:underline">Register</Link>
        </p>
      </div>
      </section>
    </main>
  )
}

export default Login