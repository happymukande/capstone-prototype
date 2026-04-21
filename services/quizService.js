import supabase from '../lib/supabaseClient.js'
import { getCurrentUser } from './authService.js'

async function ensureSupabase() {
  if (!supabase) return { success: false, error: 'Supabase client not initialized' }
  return { success: true }
}

export async function createQuiz({ lesson_id, question, options = [], correct_answer }) {
  try {
    const ok = await ensureSupabase()
    if (!ok.success) return ok

    const userRes = await getCurrentUser()
    if (!userRes.success) return { success: false, error: 'Authentication required' }

    // Ensure current user can manage quizzes for the lesson
    const { data: lesson, error: fetchError } = await supabase.from('lessons').select('id,created_by').eq('id', lesson_id).single()
    if (fetchError) return { success: false, error: fetchError }

    const currentUser = userRes.data.user
    const currentRole = userRes.data.role
    const isOwner = lesson.created_by === currentUser.id
    const isTeacherOrAdmin = currentRole === 'teacher' || currentRole === 'admin'

    if (!isTeacherOrAdmin || (!isOwner && currentRole !== 'admin')) {
      return { success: false, error: 'Forbidden: insufficient permissions' }
    }

    const payload = { lesson_id, question, options, correct_answer }
    const { data, error } = await supabase.from('quizzes').insert([payload]).select().single()
    if (error) {
      console.error('createQuiz error:', error)
      return { success: false, error }
    }
    return { success: true, data }
  } catch (err) {
    console.error('createQuiz unexpected error:', err)
    return { success: false, error: err?.message || err }
  }
}

export async function getQuizzesByLesson(lesson_id) {
  try {
    const ok = await ensureSupabase()
    if (!ok.success) return ok

    const { data, error } = await supabase.from('quizzes').select('*').eq('lesson_id', lesson_id)
    if (error) {
      console.error('getQuizzesByLesson error:', error)
      return { success: false, error }
    }
    return { success: true, data }
  } catch (err) {
    console.error('getQuizzesByLesson unexpected error:', err)
    return { success: false, error: err?.message || err }
  }
}

export async function deleteQuiz(id) {
  try {
    const ok = await ensureSupabase()
    if (!ok.success) return ok

    const userRes = await getCurrentUser()
    if (!userRes.success) return { success: false, error: 'Authentication required' }

    const { data: quiz, error: fetchError } = await supabase.from('quizzes').select('id,lesson_id').eq('id', id).single()
    if (fetchError) return { success: false, error: fetchError }

    // Fetch lesson to check ownership
    const { data: lesson, error: lessonError } = await supabase.from('lessons').select('id,created_by').eq('id', quiz.lesson_id).single()
    if (lessonError) return { success: false, error: lessonError }

    const currentUser = userRes.data.user
    const currentRole = userRes.data.role
    const isOwner = lesson.created_by === currentUser.id
    const isTeacherOrAdmin = currentRole === 'teacher' || currentRole === 'admin'

    if (!isTeacherOrAdmin || (!isOwner && currentRole !== 'admin')) {
      return { success: false, error: 'Forbidden: insufficient permissions' }
    }

    const { error } = await supabase.from('quizzes').delete().eq('id', id)
    if (error) {
      console.error('deleteQuiz error:', error)
      return { success: false, error }
    }
    return { success: true }
  } catch (err) {
    console.error('deleteQuiz unexpected error:', err)
    return { success: false, error: err?.message || err }
  }
}
