import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { bootstrapAuth, getAuthState, subscribeToAuthState } from '../services/authService.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const cached = getAuthState()
  const [session, setSession] = useState(cached.session)
  const [user, setUser] = useState(cached.user)
  const [role, setRole] = useState(cached.role)
  const [isLoading, setIsLoading] = useState(!cached.isReady)

  useEffect(() => {
    let isMounted = true

    const unsubscribe = subscribeToAuthState((next) => {
      if (!isMounted) return
      setSession(next.session)
      setUser(next.user)
      setRole(next.role)
    })

    const initialize = async () => {
      const { session: nextSession, user: nextUser, role: nextRole } = await bootstrapAuth()
      if (!isMounted) return
      setSession(nextSession)
      setUser(nextUser)
      setRole(nextRole)
      setIsLoading(false)
    }

    void initialize()

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [])

  const value = useMemo(
    () => ({
      session,
      user,
      role,
      isLoading,
      isAuthenticated: Boolean(user),
    }),
    [session, user, role, isLoading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
