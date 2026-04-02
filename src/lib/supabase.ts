import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface MediaItem {
  id: string
  filename: string
  title: string
  description: string
  category: string
  type: 'image' | 'video'
  url: string
  thumbnail_url?: string
  file_size: number
  created_at: string
  updated_at: string
  user_id?: string
}

export interface Category {
  id: string
  name: string
  color: string
  created_at: string
}

export interface User {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  created_at: string
} 