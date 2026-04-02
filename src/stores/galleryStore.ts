import { create } from 'zustand'
import { MediaItem, Category } from '@/lib/supabase'

interface GalleryState {
  // State
  mediaItems: MediaItem[]
  categories: Category[]
  selectedItems: string[]
  currentFilter: string
  searchTerm: string
  isLoading: boolean
  error: string | null
  
  // Actions
  setMediaItems: (items: MediaItem[]) => void
  setCategories: (categories: Category[]) => void
  addMediaItem: (item: MediaItem) => void
  updateMediaItem: (id: string, updates: Partial<MediaItem>) => void
  deleteMediaItem: (id: string) => void
  setSelectedItems: (ids: string[]) => void
  toggleItemSelection: (id: string) => void
  selectAllItems: () => void
  clearSelection: () => void
  setFilter: (filter: string) => void
  setSearchTerm: (term: string) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  
  // Computed
  filteredItems: () => MediaItem[]
  selectedCount: () => number
}

export const useGalleryStore = create<GalleryState>((set, get) => ({
  // Initial state
  mediaItems: [],
  categories: [],
  selectedItems: [],
  currentFilter: '',
  searchTerm: '',
  isLoading: false,
  error: null,
  
  // Actions
  setMediaItems: (items) => set({ mediaItems: items }),
  
  setCategories: (categories) => set({ categories }),
  
  addMediaItem: (item) => set((state) => ({
    mediaItems: [item, ...state.mediaItems]
  })),
  
  updateMediaItem: (id, updates) => set((state) => ({
    mediaItems: state.mediaItems.map(item =>
      item.id === id ? { ...item, ...updates } : item
    )
  })),
  
  deleteMediaItem: (id) => set((state) => ({
    mediaItems: state.mediaItems.filter(item => item.id !== id),
    selectedItems: state.selectedItems.filter(itemId => itemId !== id)
  })),
  
  setSelectedItems: (ids) => set({ selectedItems: ids }),
  
  toggleItemSelection: (id) => set((state) => ({
    selectedItems: state.selectedItems.includes(id)
      ? state.selectedItems.filter(itemId => itemId !== id)
      : [...state.selectedItems, id]
  })),
  
  selectAllItems: () => set((state) => ({
    selectedItems: state.filteredItems().map(item => item.id)
  })),
  
  clearSelection: () => set({ selectedItems: [] }),
  
  setFilter: (filter) => set({ currentFilter: filter }),
  
  setSearchTerm: (term) => set({ searchTerm: term }),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  setError: (error) => set({ error }),
  
  // Computed
  filteredItems: () => {
    const { mediaItems, currentFilter, searchTerm } = get()
    return mediaItems.filter(item => {
      const matchesFilter = !currentFilter || item.category === currentFilter
      const matchesSearch = !searchTerm || 
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase())
      return matchesFilter && matchesSearch
    })
  },
  
  selectedCount: () => get().selectedItems.length,
})) 