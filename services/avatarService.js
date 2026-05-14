import * as ImagePicker from 'expo-image-picker'
import supabase, { hasSupabaseConfig } from '../lib/supabaseClient.js'

const AVATAR_BUCKET = 'avatars'
const AVATAR_MAX_BYTES = 5 * 1024 * 1024
const PROFILE_TABLE = 'user_profiles'

const pickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.7,
}

function ensureSupabase() {
  if (!hasSupabaseConfig || !supabase) {
    throw new Error('Supabase is required for profile pictures.')
  }
}

function getAvatarPath(userId) {
  return `${userId}.jpg`
}

function getPublicAvatarUrl(path) {
  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path)
  return `${data.publicUrl}?updated=${Date.now()}`
}

async function assertImageSize(asset, arrayBuffer) {
  const size = asset?.fileSize ?? arrayBuffer.byteLength
  if (size > AVATAR_MAX_BYTES) {
    throw new Error('Profile picture must be 5MB or smaller. Crop it tighter or choose a smaller image.')
  }
}

async function imageUriToArrayBuffer(uri) {
  const response = await fetch(uri)
  if (!response.ok) {
    throw new Error('Could not read the selected image.')
  }
  return await response.arrayBuffer()
}

async function saveAvatarUrl(userId, avatarUrl) {
  const { error } = await supabase
    .from(PROFILE_TABLE)
    .update({
      avatar_url: avatarUrl,
      last_active_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (error) throw error
}

export async function uploadAvatarAsset(userId, asset) {
  ensureSupabase()

  if (!userId) throw new Error('Sign in before updating your profile picture.')
  if (!asset?.uri) throw new Error('No image was selected.')

  const arrayBuffer = await imageUriToArrayBuffer(asset.uri)
  await assertImageSize(asset, arrayBuffer)

  const path = getAvatarPath(userId)
  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, arrayBuffer, {
      contentType: 'image/jpeg',
      cacheControl: '3600',
      upsert: true,
    })

  if (uploadError) throw uploadError

  const avatarUrl = getPublicAvatarUrl(path)
  await saveAvatarUrl(userId, avatarUrl)
  return avatarUrl
}

export async function pickAndUploadAvatar(userId) {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (!permission.granted) {
    throw new Error('Allow photo library access to choose a profile picture.')
  }

  const result = await ImagePicker.launchImageLibraryAsync(pickerOptions)
  if (result.canceled) return null

  return await uploadAvatarAsset(userId, result.assets?.[0])
}

export async function captureAndUploadAvatar(userId) {
  const permission = await ImagePicker.requestCameraPermissionsAsync()
  if (!permission.granted) {
    throw new Error('Allow camera access to take a profile picture.')
  }

  const result = await ImagePicker.launchCameraAsync(pickerOptions)
  if (result.canceled) return null

  return await uploadAvatarAsset(userId, result.assets?.[0])
}

export async function removeAvatar(userId) {
  ensureSupabase()

  if (!userId) throw new Error('Sign in before removing your profile picture.')

  const path = getAvatarPath(userId)
  const { error: removeError } = await supabase.storage.from(AVATAR_BUCKET).remove([path])
  if (removeError) throw removeError

  await saveAvatarUrl(userId, null)
}

export const AVATAR_SERVICE_CONFIG = {
  bucket: AVATAR_BUCKET,
  maxBytes: AVATAR_MAX_BYTES,
  profileTable: PROFILE_TABLE,
}
