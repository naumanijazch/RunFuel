import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthProvider'
import { useAuth } from './context/useAuth'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Planner from './pages/Planner'
import Settings from './pages/Settings'

function AppShell() {
  const { isAuthenticated, logout, user } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-app text-text-app">
      <nav className="flex flex-wrap items-center gap-4 border-b-4 border-border-app bg-shell px-4 py-3 text-sm text-inverse shadow-control">
        <Link className="flex items-center gap-2 font-bold text-inverse" to="/">
          <span className="h-4 w-4 rounded-full border-2 border-inverse bg-lens shadow-[0_0_18px_var(--color-lens)]" />
          <span>RunFuel</span>
        </Link>

        {isAuthenticated ? (
          <>
            <Link className="text-link hover:text-inverse" to="/">
              Dashboard
            </Link>
            <Link className="text-link hover:text-inverse" to="/planner">
              Planner
            </Link>
            <Link className="text-link hover:text-inverse" to="/settings">
              Settings
            </Link>
            <span className="ml-auto hidden text-lens sm:inline">{user?.email}</span>
            <button
              className="rounded border border-border-panel px-3 py-1.5 font-semibold text-inverse hover:border-lens"
              onClick={handleLogout}
              type="button"
            >
              Logout
            </button>
          </>
        ):(<></>)}
      </nav>

      <main className="mx-auto w-full max-w-6xl p-6">
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/planner"
            element={
              <ProtectedRoute>
                <Planner />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
