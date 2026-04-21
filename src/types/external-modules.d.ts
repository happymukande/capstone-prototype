declare module '../context/AuthProvider' {
  import type { ReactNode } from 'react'

  export interface AuthContextValue {
    session: any
    user: any
    role: string | null
    isLoading: boolean
    isAuthenticated: boolean
  }

  export function AuthProvider(props: { children: ReactNode }): JSX.Element
  export function useAuth(): AuthContextValue
}

declare module '../../services/authService' {
  export function ensureSupabaseUserId(): Promise<string | null>
}

declare module '../../lib/supabaseClient' {
  const supabase: any
  export const hasSupabaseConfig: boolean
  export const isBackendDisabled: boolean
  export default supabase
}
