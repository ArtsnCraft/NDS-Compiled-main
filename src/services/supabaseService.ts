import { supabase } from '@/lib/supabase'
import { MediaItem, Category } from '@/lib/supabase'

export class SupabaseService {
  // Media Items
  static async getMediaItems(): Promise<MediaItem[]> {
    const { data, error } = await supabase
      .from('media_items')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  static async createMediaItem(item: Omit<MediaItem, 'id' | 'created_at' | 'updated_at'>): Promise<MediaItem> {
    const { data, error } = await supabase
      .from('media_items')
      .insert([item])
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async updateMediaItem(id: string, updates: Partial<MediaItem>): Promise<MediaItem> {
    const { data, error } = await supabase
      .from('media_items')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async deleteMediaItem(id: string): Promise<void> {
    const { error } = await supabase
      .from('media_items')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // Categories
  static async getCategories(): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name')

    if (error) throw error
    return data || []
  }

  static async createCategory(category: Omit<Category, 'id' | 'created_at'>): Promise<Category> {
    const { data, error } = await supabase
      .from('categories')
      .insert([category])
      .select()
      .single()

    if (error) throw error
    return data
  }

  // File Upload
  static async uploadFile(file: File, path: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from('media')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) throw error

    const { data: urlData } = supabase.storage
      .from('media')
      .getPublicUrl(data.path)

    return urlData.publicUrl
  }

  static async deleteFile(path: string): Promise<void> {
    const { error } = await supabase.storage
      .from('media')
      .remove([path])

    if (error) throw error
  }

  // Batch Operations
  static async batchDeleteMediaItems(ids: string[]): Promise<void> {
    const { error } = await supabase
      .from('media_items')
      .delete()
      .in('id', ids)

    if (error) throw error
  }

  // Search
  static async searchMediaItems(query: string): Promise<MediaItem[]> {
    const { data, error } = await supabase
      .from('media_items')
      .select('*')
      .or(`title.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  // Filter by category
  static async getMediaItemsByCategory(category: string): Promise<MediaItem[]> {
    const { data, error } = await supabase
      .from('media_items')
      .select('*')
      .eq('category', category)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  // Real-time subscriptions
  static subscribeToMediaItems(callback: (payload: any) => void) {
    return supabase
      .channel('media_items_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'media_items' }, 
        callback
      )
      .subscribe()
  }

  static subscribeToCategories(callback: (payload: any) => void) {
    return supabase
      .channel('categories_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'categories' }, 
        callback
      )
      .subscribe()
  }
} 