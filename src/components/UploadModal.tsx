import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useGalleryStore } from '@/stores/galleryStore'

interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
}

interface StagedFile {
  file: File
  preview: string
  category: string
  caption: string
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose }) => {
  const [staged, setStaged] = useState<StagedFile[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { categories, addMediaItem } = useGalleryStore()

  // Lock background scrolling while modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') handleCancel() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, staged])

  const VALID_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/mov', 'video/quicktime', 'video/webm']
  const MAX_SIZE_MB = 50

  const generateVideoThumbnail = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.src = URL.createObjectURL(file)
      video.currentTime = 1 // Seek to 1 second
      video.onloadedmetadata = () => {
        video.currentTime = Math.min(1, video.duration / 2) // Or middle
      }
      video.onseeked = () => {
        const canvas = document.createElement('canvas')
        canvas.width = 100
        canvas.height = 100
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height)
        const dataURL = canvas.toDataURL('image/jpeg')
        URL.revokeObjectURL(video.src)
        resolve(dataURL)
      }
      video.onerror = () => resolve('')
    })
  }

  const stageFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files)
    const errors: string[] = []

    const valid = arr.filter(f => {
      if (!VALID_TYPES.includes(f.type)) { errors.push(`${f.name}: unsupported format`); return false }
      if (f.size > MAX_SIZE_MB * 1024 * 1024) { errors.push(`${f.name}: exceeds 50 MB`); return false }
      return true
    })

    if (errors.length) setErrorMsg(errors.join(' · '))
    else setErrorMsg('')

    const newStaged: StagedFile[] = await Promise.all(valid.map(async f => {
      let preview = ''
      if (f.type.startsWith('image/')) {
        preview = URL.createObjectURL(f)
      } else if (f.type.startsWith('video/')) {
        preview = await generateVideoThumbnail(f)
      }
      return {
        file: f,
        preview,
        category: categories[0]?.name || 'Uncategorized',
        caption: f.name.replace(/\.[^.]+$/, ''),
      }
    }))

    setStaged(prev => [...prev, ...newStaged])
  }

  const handleDrag = useCallback((e: React.DragEvent, active: boolean) => {
    e.preventDefault(); e.stopPropagation()
    setDragOver(active)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation()
    setDragOver(false)
    if (e.dataTransfer.files.length) stageFiles(e.dataTransfer.files)
  }, [categories])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) stageFiles(e.target.files)
  }

  const removeStaged = (idx: number) => {
    setStaged(prev => {
      const item = prev[idx]
      if (item.preview.startsWith('blob:')) {
        URL.revokeObjectURL(item.preview)
      }
      return prev.filter((_, i) => i !== idx)
    })
  }

  const updateStaged = (idx: number, key: keyof StagedFile, value: string) => {
    setStaged(prev => prev.map((s, i) => i === idx ? { ...s, [key]: value } : s))
  }

  const handleUpload = async () => {
    if (!staged.length) { setErrorMsg('Please add at least one file'); return }
    setUploading(true); setProgress(0); setErrorMsg('')

    const interval = setInterval(() => {
      setProgress(p => { if (p >= 90) { clearInterval(interval); return 90 } return p + 8 })
    }, 180)

    await new Promise(r => setTimeout(r, 1800))
    clearInterval(interval); setProgress(100)

    staged.forEach(s => {
      addMediaItem({
        id: Date.now().toString() + Math.random(),
        filename: s.file.name,
        title: s.caption || s.file.name,
        description: '',
        category: s.category,
        type: s.file.type.startsWith('image/') ? 'image' : 'video',
        url: s.preview || URL.createObjectURL(s.file),
        file_size: s.file.size,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    })

    setTimeout(() => {
      setUploading(false); setProgress(0); setStaged([]); onClose()
    }, 600)
  }

  const handleCancel = () => {
    staged.forEach(s => {
      if (s.preview.startsWith('blob:')) {
        URL.revokeObjectURL(s.preview)
      }
    })
    setStaged([]); setErrorMsg(''); onClose()
  }

  if (!isOpen) return null

  return (
    <div className="upload-modal active" role="dialog" aria-modal="true" aria-labelledby="uploadModalTitle">
      {/* Backdrop */}
      <div
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
        onClick={handleCancel}
      />

      <div className="upload-modal-content" onClick={e => e.stopPropagation()}>
        {/* Close btn */}
        <button className="modal-close-btn" onClick={handleCancel} aria-label="Close">
          <i className="fas fa-times" />
        </button>

        {/* Header */}
        <div className="upload-modal-header">
          <h2 id="uploadModalTitle">Upload Files</h2>
          <p>Images &amp; videos · JPG PNG GIF WEBP MP4 MOV · Max 50 MB each</p>
        </div>

        {/* Drop zone */}
        <div
          className={`upload-area${dragOver ? ' drag-over' : ''}${uploading ? ' uploading' : ''}`}
          onDragEnter={e => handleDrag(e, true)}
          onDragOver={e => handleDrag(e, true)}
          onDragLeave={e => handleDrag(e, false)}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Upload area"
        >
          <i className="fas fa-cloud-upload-alt upload-icon" />
          <p className="upload-text">Drop files here or <span>click to browse</span></p>
          <p className="upload-subtext">You can add more files after the first selection</p>
          <input
            ref={fileInputRef}
            type="file"
            id="fileInput"
            accept="image/*,video/*"
            multiple
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </div>

        {/* Staged file list */}
        {staged.length > 0 && (
          <div className="upload-file-list">
            {staged.map((s, i) => (
              <div key={i} className="upload-file-item">
                {/* Thumbnail */}
                <div className="ufi-thumb">
                  {s.preview
                    ? <img src={s.preview} alt="" />
                    : <i className={`fas ${s.file.type.startsWith('video/') ? 'fa-film' : 'fa-file'}`} />
                  }
                </div>

                {/* Meta */}
                <div className="ufi-meta">
                  <span className="ufi-name">{s.file.name}</span>
                  <span className="ufi-size">
                    {(s.file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                  {/* Caption + category on second line */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      value={s.caption}
                      onChange={e => updateStaged(i, 'caption', e.target.value)}
                      placeholder="Caption…"
                      style={{
                        flex: 1, minWidth: 80,
                        padding: '4px 8px', borderRadius: 8,
                        border: '1px solid var(--glass-border)',
                        background: 'var(--surface)', color: 'var(--text)',
                        fontSize: '0.78rem', outline: 'none',
                      }}
                    />
                    <select
                      value={s.category}
                      onChange={e => updateStaged(i, 'category', e.target.value)}
                      style={{
                        padding: '4px 8px', borderRadius: 8,
                        border: '1px solid var(--glass-border)',
                        background: 'var(--surface)', color: 'var(--text)',
                        fontSize: '0.78rem', outline: 'none', cursor: 'pointer',
                      }}
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Remove */}
                <button
                  onClick={() => removeStaged(i)}
                  style={{
                    width: 28, height: 28, borderRadius: '50%',
                    border: '1px solid var(--glass-border)',
                    background: 'var(--surface)', color: 'var(--text-3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.75rem', cursor: 'pointer', transition: 'var(--t)',
                    flexShrink: 0,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; e.currentTarget.style.color = 'var(--error)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.color = 'var(--text-3)'; }}
                  aria-label="Remove"
                >
                  <i className="fas fa-times" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Error banner */}
        {errorMsg && (
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', borderRadius: 'var(--r-md)',
              background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
              color: 'var(--error)', fontSize: '0.82rem',
            }}
          >
            <i className="fas fa-triangle-exclamation" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Progress */}
        {uploading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-2)' }}>
              <span>Uploading…</span>
              <span>{progress}%</span>
            </div>
            <div style={{ height: 4, background: 'var(--surface)', borderRadius: 99, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%', width: `${progress}%`,
                  background: 'linear-gradient(90deg, var(--primary-deep), var(--accent))',
                  borderRadius: 99, transition: 'width 0.2s ease',
                }}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', gap: 12,
          }}
        >
          <span style={{ fontSize: '0.82rem', color: 'var(--text-3)' }}>
            {staged.length > 0 ? `${staged.length} file${staged.length !== 1 ? 's' : ''} ready` : ''}
          </span>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button className="pill-btn pill-btn--ghost" onClick={handleCancel}>
              Cancel
            </button>
            <button
              className="pill-btn pill-btn--accent"
              onClick={handleUpload}
              disabled={!staged.length || uploading}
              style={{ opacity: (!staged.length || uploading) ? 0.55 : 1 }}
            >
              <i className="fas fa-upload" />
              <span>{uploading ? 'Uploading…' : 'Upload'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
