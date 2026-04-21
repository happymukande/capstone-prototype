import supabase from '../lib/supabaseClient.js'
import { getCurrentUser } from './authService.js'

async function ensureSupabase() {
  if (!supabase) return { success: false, error: 'Supabase client not initialized' }
  return { success: true }
}

export async function createLesson({ title, content, published = false }) {
  try {
    const ok = await ensureSupabase()
    if (!ok.success) return ok

    const userRes = await getCurrentUser()
    if (!userRes.success) return { success: false, error: 'Authentication required' }

    const userId = userRes.data.user.id

    const { data, error } = await supabase
      .from('lessons')
      .insert([{ title, content, published, created_by: userId }])
      .select()
      .single()

    if (error) {
      console.error('createLesson error:', error)
      return { success: false, error }
    }
    return { success: true, data }
  } catch (err) {
    console.error('createLesson unexpected error:', err)
    return { success: false, error: err?.message || err }
  }
}

export async function getLessons({ onlyPublished = true } = {}) {
  try {
    const ok = await ensureSupabase()
    if (!ok.success) return ok

    let query = supabase.from('lessons').select('*')
    if (onlyPublished) query = query.eq('published', true)

    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) {
      console.error('getLessons error:', error)
      return { success: false, error }
    }
    return { success: true, data }
  } catch (err) {
    console.error('getLessons unexpected error:', err)
    return { success: false, error: err?.message || err }
  }
}

export async function deleteLesson(id) {
  try {
    const ok = await ensureSupabase()
    if (!ok.success) return ok

    const userRes = await getCurrentUser()
    if (!userRes.success) return { success: false, error: 'Authentication required' }

    const { data: lesson, error: fetchError } = await supabase.from('lessons').select('id,created_by').eq('id', id).single()
    if (fetchError) {
      console.error('deleteLesson fetch error:', fetchError)
      return { success: false, error: fetchError }
    }

    const currentUser = userRes.data.user
    const currentRole = userRes.data.role

    const isOwner = lesson.created_by === currentUser.id
    const isTeacherOrAdmin = currentRole === 'teacher' || currentRole === 'admin'

    if (!isTeacherOrAdmin || (!isOwner && currentRole !== 'admin')) {
      return { success: false, error: 'Forbidden: insufficient permissions' }
    }

    const { error } = await supabase.from('lessons').delete().eq('id', id)
    if (error) {
      console.error('deleteLesson error:', error)
      return { success: false, error }
    }
    return { success: true }
  } catch (err) {
    console.error('deleteLesson unexpected error:', err)
    return { success: false, error: err?.message || err }
  }
}

export async function publishLesson(id) {
  try {
    const ok = await ensureSupabase()
    if (!ok.success) return ok

    const userRes = await getCurrentUser()
    if (!userRes.success) return { success: false, error: 'Authentication required' }

    // Only teacher/admin or owner can publish
    const { data: lesson, error: fetchError } = await supabase.from('lessons').select('id,created_by').eq('id', id).single()
    if (fetchError) return { success: false, error: fetchError }

    const currentUser = userRes.data.user
    const currentRole = userRes.data.role
    const isOwner = lesson.created_by === currentUser.id
    const isTeacherOrAdmin = currentRole === 'teacher' || currentRole === 'admin'

    if (!isTeacherOrAdmin || (!isOwner && currentRole !== 'admin')) {
      return { success: false, error: 'Forbidden: insufficient permissions' }
    }

    const { data, error } = await supabase.from('lessons').update({ published: true }).eq('id', id).select().single()
    if (error) {
      console.error('publishLesson error:', error)
      return { success: false, error }
    }
    return { success: true, data }
  } catch (err) {
    console.error('publishLesson unexpected error:', err)
    return { success: false, error: err?.message || err }
  }
}
