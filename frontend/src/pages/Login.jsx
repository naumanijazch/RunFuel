import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

function getErrorMessage(error) {
  return error.response?.data?.message || 'Something went wrong. Please try again.'
}

export default function Login() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { isAuthenticated, login, register } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const destination = location.state?.from?.pathname || '/'

  if (isAuthenticated) {
    return <Navigate to={destination} replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const credentials = { email, password }

      if (mode === 'register') {
        await register(credentials)
      } else {
        await login(credentials)
      }

      navigate(destination, { replace: true })
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-120px)] w-full max-w-md items-center">
      <section className="w-full rounded-lg border-4 border-border-app bg-panel p-6 text-left shadow-panel">
        <div className="mb-6">
          <div className="mb-4 flex items-center gap-2">
            <span className="h-6 w-6 rounded-full border-2 border-border-strong bg-lens shadow-[0_0_20px_var(--color-lens)]" />
            <span className="h-3 w-3 rounded-full bg-danger" />
            <span className="h-3 w-3 rounded-full bg-action" />
          </div>
          <h1 className="text-page-title font-bold text-heading">RunFuel</h1>
          <p className="mt-2 text-sm text-muted">
            Sign in to plan runs around gym fatigue.
          </p>
        </div>

        <div className="mb-5 grid grid-cols-2 rounded-md border border-border-strong bg-control p-1">
          <button
            className={`rounded px-3 py-2 text-sm font-medium ${
              mode === 'login' ? 'bg-panel text-heading' : 'text-link hover:text-inverse'
            }`}
            onClick={() => setMode('login')}
            type="button"
          >
            Login
          </button>
          <button
            className={`rounded px-3 py-2 text-sm font-medium ${
              mode === 'register' ? 'bg-panel text-heading' : 'text-link hover:text-inverse'
            }`}
            onClick={() => setMode('register')}
            type="button"
          >
            Register
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-heading">Email</span>
            <input
              autoComplete="email"
              className="w-full rounded-md border border-border-panel bg-input px-3 py-2 text-heading outline-none focus:border-focus"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-heading">Password</span>
            <input
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              className="w-full rounded-md border border-border-panel bg-input px-3 py-2 text-heading outline-none focus:border-focus"
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>

          {error ? (
            <div className="rounded-md border border-danger bg-danger-soft px-3 py-2 text-sm text-heading">
              {error}
            </div>
          ) : null}

          <button
            className="w-full rounded-md border-2 border-border-strong bg-action px-4 py-2.5 font-semibold text-action-text hover:bg-action-hover disabled:opacity-60"
            disabled={submitting}
            type="submit"
          >
            {submitting ? 'Please wait...' : mode === 'register' ? 'Create account' : 'Login'}
          </button>
        </form>
      </section>
    </div>
  )
}
