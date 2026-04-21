import supabase, { hasSupabaseConfig } from '../lib/supabaseClient.js'

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

function extractRole(user) {
  return user?.user_metadata?.role ?? null
}

function setCachedSession(session) {
  cachedSession = session ?? null
  cachedUser = session?.user ?? null
  cachedRole = extractRole(cachedUser)
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
    setCachedSession(session)
    authReady = true
    notifySubscribers(event)
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
  if (!isClient || !hasSupabaseConfig || !supabase) {
    authReady = true
    setCachedSession(null)
    return { session: null, user: null, role: null }
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

    setCachedSession(session)
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
      setCachedSession(response.data.session)
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
      setCachedSession(response.data.session)
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
    return { success: false, error: 'Supabase client not initialized' }
  }

  try {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('signOut error:', error)
      return { success: false, error }
    }

    setCachedSession(null)
    notifySubscribers('SIGNED_OUT')
    return { success: true }
  } catch (err) {
    console.error('signOut unexpected error:', err)
    return { success: false, error: err?.message || err }
  }
}

export async function ensureSupabaseUserId() {
  if (!isClient || !hasSupabaseConfig || !supabase) return null
  if (cachedUser?.id) return cachedUser.id

  try {
    const { user } = await bootstrapAuth()
    if (user?.id) return user.id

    if (!anonymousSignInPromise) {
      anonymousSignInPromise = (async () => {
        try {
          const response = await supabase.auth.signInAnonymously()
          if (response.error) {
            console.error('authService anonymous sign-in error:', response.error)
            return null
          }

          if (response.data?.session) {
            setCachedSession(response.data.session)
          } else if (response.data?.user) {
            cachedUser = response.data.user
            cachedRole = extractRole(response.data.user)
          }

          notifySubscribers('ANONYMOUS_SIGNIN')
          return response.data?.user?.id ?? null
        } catch (err) {
          console.error('authService anonymous sign-in unexpected error:', err)
          return null
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
