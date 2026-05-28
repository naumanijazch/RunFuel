import { useEffect, useMemo, useState } from 'react'
import { api, clearAuthToken, getAuthToken, setAuthToken } from '../api/client'
import { AuthContext } from './authContext'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(Boolean(getAuthToken()))

  useEffect(() => {
    let active = true

    async function loadSession() {
      if (!getAuthToken()) {
        setLoading(false)
        return
      }

      try {
        const response = await api.get('/auth/me')

        if (active) {
          setUser(response.data.user)
        }
      } catch {
        clearAuthToken()

        if (active) {
          setUser(null)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadSession()

    return () => {
      active = false
    }
  }, [])

  async function login(credentials) {
    const response = await api.post('/auth/login', credentials)

    setAuthToken(response.data.token)
    setUser(response.data.user)

    return response.data.user
  }

  async function register(credentials) {
    const response = await api.post('/auth/register', credentials)

    setAuthToken(response.data.token)
    setUser(response.data.user)

    return response.data.user
  }

  async function logout() {
    try {
      if (getAuthToken()) {
        await api.post('/auth/logout')
      }
    } catch {
      // Local logout should still complete if the API session has expired.
    } finally {
      clearAuthToken()
      setUser(null)
    }
  }

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout
    }),
    [user, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
