import React, { useEffect, useRef } from 'react'
import { useGalleryStore } from '@/stores/galleryStore'

interface HeaderProps {
  onUploadClick: () => void
  onSettingsClick: () => void
}

const CATEGORIES = [
  { key: 'all',           icon: 'fa-th',             label: 'All'          },
  { key: 'landscape',     icon: 'fa-mountain',       label: 'Landscape'    },
  { key: 'night',         icon: 'fa-moon',           label: 'Night'        },
  { key: 'video',         icon: 'fa-film',           label: 'Videos'       },
  { key: 'uncategorized', icon: 'fa-question',       label: 'Other'        },
]

export const Header: React.FC<HeaderProps> = ({ onUploadClick, onSettingsClick }) => {
  const { searchTerm, setSearchTerm, currentFilter, setFilter, categories, mediaItems } = useGalleryStore()
  const inputRef = useRef<HTMLInputElement>(null)

  // Build dynamic chip list from store categories + static extras
  const chips = [
    { key: 'all', icon: 'fa-th', label: 'All' },
    ...categories.map(c => ({
      key: c.name.toLowerCase(),
      icon: 'fa-layer-group',
      label: c.name,
    })),
  ]

  const countFor = (key: string) => {
    if (key === 'all') return mediaItems.length
    return mediaItems.filter(i => i.category?.toLowerCase() === key).length
  }

  const handleClear = () => {
    setSearchTerm('')
    inputRef.current?.focus()
  }

  // Theme toggle (persisted)
  const toggleTheme = () => {
    const isLight = document.body.classList.toggle('light-mode')
    localStorage.setItem('nds-theme', isLight ? 'light' : 'dark')
  }

  useEffect(() => {
    const saved = localStorage.getItem('nds-theme')
    if (saved === 'light') document.body.classList.add('light-mode')
  }, [])

  return (
    <header id="site-header">
      <div className="header-content">

        {/* ── Top row ── */}
        <div className="header-top">
          {/* Logo */}
          <div className="header-logo">
            <div className="logo-icon-wrap">
              <i className="fas fa-images" />
            </div>
            <div className="logo-text-wrap">
              <span className="logo-name">NDS Archives</span>
              <span className="logo-tagline">Private Media Vault</span>
            </div>
          </div>

          {/* Actions */}
          <div className="header-actions">
            <button
              className="icon-btn"
              id="themeToggle"
              aria-label="Toggle theme"
              onClick={toggleTheme}
            >
              <i className="fas fa-moon" />
            </button>

            <button
              className="icon-btn"
              aria-label="Notifications"
              onClick={() => {/* toast placeholder */}}
            >
              <i className="fas fa-bell" />
            </button>

            <button
              className="icon-btn"
              aria-label="Settings"
              onClick={onSettingsClick}
            >
              <i className="fas fa-cog" />
            </button>

            <button
              type="button"
              className="pill-btn pill-btn--accent"
              onClick={onUploadClick}
            >
              <i className="fas fa-upload" />
              <span>Upload</span>
            </button>

            <button
              type="button"
              className="icon-btn logout-icon"
              aria-label="Logout"
            >
              <i className="fas fa-sign-out-alt" />
            </button>
          </div>
        </div>

        {/* ── Search ── */}
        <div className="search-row">
          <div className="search-wrapper">
            <i className="fas fa-search search-icon" />
            <input
              ref={inputRef}
              type="text"
              className="search-input"
              placeholder="Search your archive…"
              aria-label="Search gallery"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            <button
              type="button"
              className={`search-clear ${searchTerm ? 'show' : ''}`}
              aria-label="Clear search"
              onClick={handleClear}
            >
              <i className="fas fa-times" />
            </button>
          </div>
        </div>

        {/* ── Category chips ── */}
        <div className="category-filters" role="group" aria-label="Filter by category">
          {chips.map(chip => (
            <button
              key={chip.key}
              className={`chip ${currentFilter === chip.key || (chip.key === 'all' && !currentFilter) ? 'active' : ''}`}
              onClick={() => setFilter(chip.key === 'all' ? '' : chip.key)}
            >
              <i className={`fas ${chip.icon}`} />
              {chip.label}
              <span className="chip-count">{countFor(chip.key)}</span>
            </button>
          ))}
        </div>

      </div>
    </header>
  )
}
