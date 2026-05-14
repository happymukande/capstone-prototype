import supabase, { hasSupabaseConfig } from '../lib/supabaseClient.js'
import AsyncStorage from '@react-native-async-storage/async-storage'

const isBrowser = typeof window !== 'undefined'
const isReactNative = typeof navigator !== 'undefined' && navigator.product === 'ReactNative'
const isClient = isBrowser || isReactNative

let cachedSession = null
let cachedUser = null
let cachedRole = null
let authReady = false
let bootstrapPromise = null
let authSubscription = null
let anonymousSignInPromise = null
const subscribers = new Set()
const LOCAL_GUEST_STORAGE_KEY = 'capstone.localGuest.v1'
const VALID_ROLES = new Set(['student', 'teacher', 'admin'])

function extractRole(user) {
  const metadataRole = String(user?.user_metadata?.role ?? '').toLowerCase()
  return VALID_ROLES.has(metadataRole) ? metadataRole : null
}

async function fetchUserRole(user) {
  const fallbackRole = extractRole(user) ?? 'student'
  if (!hasSupabaseConfig || !supabase || !user?.id) return fallbackRole

  try {
    const { data, error } = await supabase
      .from('app_user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) {
      console.error('authService: failed to fetch user role:', error)
      return fallbackRole
    }

    const databaseRole = String(data?.role ?? '').toLowerCase()
    return VALID_ROLES.has(databaseRole) ? databaseRole : fallbackRole
  } catch (err) {
    console.error('authService: failed to fetch user role:', err)
    return fallbackRole
  }
}

function setCachedSession(session) {
  cachedSession = session ?? null
  cachedUser = session?.user ?? null
  cachedRole = extractRole(cachedUser)
}

async function setCachedSessionWithRole(session) {
  cachedSession = session ?? null
  cachedUser = session?.user ?? null
  cachedRole = cachedUser ? await fetchUserRole(cachedUser) : null
}

function createLocalGuestUser(storedUser) {
  const now = new Date().toISOString()
  const id = storedUser?.id ?? `guest-${Date.now()}`
  return {
    id,
    email: '',
    is_anonymous: true,
    app_metadata: {},
    user_metadata: {
      role: 'student',
      username: storedUser?.user_metadata?.username ?? `guest_${id.slice(-6)}`,
      full_name: 'Guest learner',
      isGuest: true,
    },
    aud: 'authenticated',
    created_at: storedUser?.created_at ?? now,
    updated_at: now,
  }
}

function setCachedLocalGuest(user) {
  cachedSession = {
    access_token: `local-${user.id}`,
    token_type: 'bearer',
    user,
  }
  cachedUser = user
  cachedRole = 'student'
}

async function loadLocalGuestSession() {
  if (!isClient) return false
  try {
    const raw = await AsyncStorage.getItem(LOCAL_GUEST_STORAGE_KEY)
    if (!raw) return false
    const parsed = JSON.parse(raw)
    const user = createLocalGuestUser(parsed?.user)
    setCachedLocalGuest(user)
    return true
  } catch (err) {
    console.error('authService: failed to load local guest session:', err)
    return false
  }
}

async function saveLocalGuestSession(user) {
  if (!isClient) return
  try {
    await AsyncStorage.setItem(
      LOCAL_GUEST_STORAGE_KEY,
      JSON.stringify({
        user,
        savedAt: new Date().toISOString(),
      })
    )
  } catch (err) {
    console.error('authService: failed to save local guest session:', err)
  }
}

async function clearLocalGuestSession() {
  if (!isClient) return
  try {
    await AsyncStorage.removeItem(LOCAL_GUEST_STORAGE_KEY)
  } catch (err) {
    console.error('authService: failed to clear local guest session:', err)
  }
}

function notifySubscribers(event) {
  const payload = {
    event,
    session: cachedSession,
    user: cachedUser,
    role: cachedRole,
  }

  subscribers.forEach((callback) => {
    try {
      callback(payload)
    } catch (err) {
      console.error('authService subscriber error:', err)
    }
  })
}

function startAuthListener() {
  if (!isClient || !hasSupabaseConfig || !supabase || authSubscription) return

  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    void (async () => {
      await setCachedSessionWithRole(session)
      authReady = true
      notifySubscribers(event)
    })()
  })

  authSubscription = data?.subscription ?? data
}

function stopAuthListenerIfIdle() {
  if (subscribers.size > 0) return
  if (authSubscription?.unsubscribe) {
    authSubscription.unsubscribe()
  }
  authSubscription = null
}

export function subscribeToAuthState(callback) {
  if (typeof callback !== 'function') return () => {}

  subscribers.add(callback)
  startAuthListener()

  if (authReady) {
    callback({
      event: 'INITIAL_STATE',
      session: cachedSession,
      user: cachedUser,
      role: cachedRole,
    })
  }

  return () => {
    subscribers.delete(callback)
    stopAuthListenerIfIdle()
  }
}

export function getAuthState() {
  return {
    session: cachedSession,
    user: cachedUser,
    role: cachedRole,
    isReady: authReady,
  }
}

function isLockError(error) {
  if (!error) return false
  if (error?.isAcquireTimeout) return true

  const message = typeof error === 'string' ? error : error?.message ?? ''
  const name = typeof error === 'object' ? error?.name ?? '' : ''
  const combined = `${name} ${message}`

  return /NavigatorLockAcquireTimeoutError|ProcessLockAcquireTimeoutError|LockManager|lock:sb-.*-auth-token/i.test(
    combined
  )
}

async function readSessionOnce() {
  if (!isClient) return { session: null, error: null }
  try {
    const { data, error } = await supabase.auth.getSession()
    if (error) return { session: null, error }
    return { session: data?.session ?? null, error: null }
  } catch (err) {
    return { session: null, error: err }
  }
}

async function clearStaleSession() {
  if (!isClient) return
  try {
    await supabase.auth.signOut()
  } catch (err) {
    console.error('authService: failed to clear stale session:', err)
  }
}

export async function bootstrapAuth() {
  if (!isClient) {
    authReady = true
    setCachedSession(null)
    return { session: null, user: null, role: null }
  }

  if (!hasSupabaseConfig || !supabase) {
    await loadLocalGuestSession()
    authReady = true
    notifySubscribers('INITIAL_SESSION')
    return { session: cachedSession, user: cachedUser, role: cachedRole }
  }

  if (bootstrapPromise) return bootstrapPromise

  bootstrapPromise = (async () => {
    startAuthListener()

    let { session, error } = await readSessionOnce()

    if (error && isLockError(error)) {
      console.error('authService: lock timeout, clearing session and retrying once', error)
      await clearStaleSession()
      const retry = await readSessionOnce()
      session = retry.session
      if (retry.error) {
        console.error('authService: getSession retry failed:', retry.error)
      }
    } else if (error) {
      console.error('authService: getSession failed:', error)
    }

    if (session) {
      await setCachedSessionWithRole(session)
    } else {
      await loadLocalGuestSession()
    }
    authReady = true
    notifySubscribers('INITIAL_SESSION')

    return { session: cachedSession, user: cachedUser, role: cachedRole }
  })()

  return bootstrapPromise
}

/**
 * Sign up a new user and set role in user_metadata
 * @param {string} email
 * @param {string} password
 * @param {string} role - 'teacher'|'admin'|'student'
 */
export async function signUp(email, password, role = 'student') {
  if (!isClient) {
    return { success: false, error: 'Auth unavailable during server rendering' }
  }

  if (!hasSupabaseConfig || !supabase) {
    return { success: false, error: 'Supabase client not initialized' }
  }

  try {
    const response = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role } },
    })

    if (response.error) {
      console.error('signUp error:', response.error)
      return { success: false, error: response.error }
    }

    if (response.data?.session) {
      await setCachedSessionWithRole(response.data.session)
      notifySubscribers('SIGNED_UP')
    }

    return { success: true, data: response.data }
  } catch (err) {
    console.error('signUp unexpected error:', err)
    return { success: false, error: err?.message || err }
  }
}

/**
 * Sign in existing user
 */
export async function signIn(email, password) {
  if (!isClient) {
    return { success: false, error: 'Auth unavailable during server rendering' }
  }

  if (!hasSupabaseConfig || !supabase) {
    return { success: false, error: 'Supabase client not initialized' }
  }

  try {
    const response = await supabase.auth.signInWithPassword({ email, password })
    if (response.error) {
      console.error('signIn error:', response.error)
      return { success: false, error: response.error }
    }

    if (response.data?.session) {
      await clearLocalGuestSession()
      await setCachedSessionWithRole(response.data.session)
      notifySubscribers('SIGNED_IN')
    }

    return { success: true, data: response.data }
  } catch (err) {
    console.error('signIn unexpected error:', err)
    return { success: false, error: err?.message || err }
  }
}

/**
 * Get current authenticated user and role (from user_metadata)
 */
export async function getCurrentUser() {
  if (!isClient) {
    return { success: false, error: 'Auth unavailable during server rendering' }
  }

  if (!hasSupabaseConfig || !supabase) {
    return { success: false, error: 'Supabase client not initialized' }
  }

  try {
    if (cachedUser) {
      return { success: true, data: { user: cachedUser, role: cachedRole } }
    }

    const { user, role } = await bootstrapAuth()
    if (!user) return { success: false, error: 'No authenticated user' }

    return { success: true, data: { user, role } }
  } catch (err) {
    console.error('getCurrentUser unexpected error:', err)
    return { success: false, error: err?.message || err }
  }
}

export async function signOut() {
  if (!isClient) {
    return { success: false, error: 'Auth unavailable during server rendering' }
  }

  if (!hasSupabaseConfig || !supabase) {
    await clearLocalGuestSession()
    setCachedSession(null)
    notifySubscribers('SIGNED_OUT')
    return { success: true }
  }

  try {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('signOut error:', error)
      return { success: false, error }
    }

    await clearLocalGuestSession()
    setCachedSession(null)
    notifySubscribers('SIGNED_OUT')
    return { success: true }
  } catch (err) {
    console.error('signOut unexpected error:', err)
    return { success: false, error: err?.message || err }
  }
}

export async function ensureSupabaseUserId() {
  if (!isClient) return null
  if (cachedUser?.id) return cachedUser.id

  if (!hasSupabaseConfig || !supabase) {
    const user = createLocalGuestUser()
    setCachedLocalGuest(user)
    await saveLocalGuestSession(user)
    notifySubscribers('LOCAL_GUEST_SIGNIN')
    return user.id
  }

  try {
    const { user } = await bootstrapAuth()
    if (user?.id) return user.id

    if (!anonymousSignInPromise) {
      anonymousSignInPromise = (async () => {
        try {
          const response = await supabase.auth.signInAnonymously()
          if (response.error) {
            console.error('authService anonymous sign-in error:', response.error)
            const user = createLocalGuestUser()
            setCachedLocalGuest(user)
            await saveLocalGuestSession(user)
            notifySubscribers('LOCAL_GUEST_SIGNIN')
            return user.id
          }

          if (response.data?.session) {
            await clearLocalGuestSession()
            await setCachedSessionWithRole(response.data.session)
          } else if (response.data?.user) {
            cachedUser = response.data.user
            cachedRole = await fetchUserRole(response.data.user)
          }

          notifySubscribers('ANONYMOUS_SIGNIN')
          return response.data?.user?.id ?? null
        } catch (err) {
          console.error('authService anonymous sign-in unexpected error:', err)
          const user = createLocalGuestUser()
          setCachedLocalGuest(user)
          await saveLocalGuestSession(user)
          notifySubscribers('LOCAL_GUEST_SIGNIN')
          return user.id
        }
      })()
    }

    const userId = await anonymousSignInPromise
    anonymousSignInPromise = null
    return userId
  } catch (err) {
    console.error('ensureSupabaseUserId unexpected error:', err)
    return null
  }
}

export async function continueAsGuest() {
  const userId = await ensureSupabaseUserId()
  if (!userId) {
    return { success: false, error: 'Unable to create a guest session' }
  }

  return {
    success: true,
    data: {
      user: cachedUser,
      session: cachedSession,
    },
  }
}
