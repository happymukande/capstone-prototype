import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Constants from 'expo-constants'
import { AppState, Platform } from 'react-native'
import { createClient, processLock } from '@supabase/supabase-js'

const extra = Constants.expoConfig?.extra ?? Constants.manifest2?.extra ?? {}

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  extra.EXPO_PUBLIC_SUPABASE_URL ||
  extra.supabaseUrl ||
  ''

const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  extra.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  extra.supabaseAnonKey ||
  ''

const backendDisabledRaw =
  process.env.EXPO_PUBLIC_DISABLE_BACKEND ??
  extra.EXPO_PUBLIC_DISABLE_BACKEND ??
  extra.disableBackend ??
  'false'

export const isBackendDisabled = String(backendDisabledRaw).toLowerCase() === 'true'

export const hasSupabaseConfig =
  Boolean(supabaseUrl) &&
  Boolean(supabaseAnonKey) &&
  !isBackendDisabled

const RETRYABLE_STATUS_CODES = new Set([408, 409, 429, 500, 502, 503, 504, 520])

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getRetryDelay(attempt) {
  const baseDelay = Math.min(750 * 2 ** attempt, 5000)
  return baseDelay + Math.floor(Math.random() * 250)
}

async function fetchWithRetry(input, init = {}) {
  const maxAttempts = 3
  let lastError = null

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
    const timeoutId = controller
      ? setTimeout(() => controller.abort(), 15000)
      : null

    try {
      const response = await fetch(input, {
        ...init,
        signal: controller?.signal ?? init.signal,
      })

      if (!RETRYABLE_STATUS_CODES.has(response.status) || attempt === maxAttempts - 1) {
        return response
      }
    } catch (error) {
      lastError = error
      if (attempt === maxAttempts - 1) {
        throw error
      }
    } finally {
      if (timeoutId) clearTimeout(timeoutId)
    }

    await sleep(getRetryDelay(attempt))
  }

  throw lastError ?? new Error('Network request failed')
}

const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        fetch: fetchWithRetry,
      },
      auth: {
        ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        lock: processLock,
      },
    })
  : null

if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh()
    } else {
      supabase.auth.stopAutoRefresh()
    }
  })
}

export default supabase
