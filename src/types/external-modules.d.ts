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

declare module '../../services/avatarService' {
  export function pickAndUploadAvatar(userId: string): Promise<string | null>
  export function captureAndUploadAvatar(userId: string): Promise<string | null>
  export function removeAvatar(userId: string): Promise<void>
  export function uploadAvatarAsset(userId: string, asset: { uri: string; fileSize?: number | null }): Promise<string>
  export const AVATAR_SERVICE_CONFIG: {
    bucket: string
    maxBytes: number
    profileTable: string
  }
}

declare module '../services/avatarService' {
  export function pickAndUploadAvatar(userId: string): Promise<string | null>
  export function captureAndUploadAvatar(userId: string): Promise<string | null>
  export function removeAvatar(userId: string): Promise<void>
  export function uploadAvatarAsset(userId: string, asset: { uri: string; fileSize?: number | null }): Promise<string>
  export const AVATAR_SERVICE_CONFIG: {
    bucket: string
    maxBytes: number
    profileTable: string
  }
}

declare module '../../lib/supabaseClient' {
  const supabase: any
  export const hasSupabaseConfig: boolean
  export const isBackendDisabled: boolean
  export default supabase
}
