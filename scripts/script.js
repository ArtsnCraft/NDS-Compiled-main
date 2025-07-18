// NOTE: For local development, run a local server (e.g., `netlify dev`, `npm run serve`, or similar). Do NOT open index.html directly via file://

// Gallery data management
class GalleryManager {
    constructor() {
        this.galleryItems = [];
        this.page = 1;
        this.pageSize = 20;
        this.loadingMore = false;
        this.allLoaded = false;
        this.userId = null;
        this.selectedItems = new Set();
        this.loadFromAPI();
        this.initCurrentYear();
    }

    initCurrentYear() {
        document.getElementById('currentYear').textContent = new Date().getFullYear();
    }

    async loadFromAPI({ append = false, reset = false, userId = undefined, sharedWithMe = false } = {}) {
        if (this.loadingMore || this.allLoaded) return;
        this.loadingMore = false;
            let url = `/.netlify/functions/get-gallery?page=${this.page}&pageSize=${this.pageSize}`;
            if (this.userId) url += `&user_id=${this.userId}`;
        if (sharedWithMe) url += `&shared_with_me=true`;
        let accessToken = null;
        if (window.galleryApp && window.galleryApp.supa) {
            const userResult = await window.galleryApp.supa.auth.getSession();
            const session = userResult.data?.session;
            accessToken = session?.access_token;
        }
        const response = await fetch(url, {
            headers: accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}
        });
            const items = await response.json();
            if (Array.isArray(items) && items.length > 0) {
                if (append) {
                    this.galleryItems = this.galleryItems.concat(items);
                } else {
                    this.galleryItems = items;
                }
                this.renderGallery();
                if (items.length < this.pageSize) {
                    this.allLoaded = true;
                }
            } else {
                this.allLoaded = true;
        }
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    saveToLocalStorage() {
        localStorage.setItem('galleryItems', JSON.stringify(this.galleryItems));
    }

    addItem(item) {
        this.galleryItems.unshift(item); // Add new item to beginning of array
        this.saveToLocalStorage();
        this.renderGallery();
    }

    renderGallery() {
        const galleryContainer = document.getElementById('galleryContainer');
        const emptyState = document.getElementById('galleryEmpty');
        galleryContainer.innerHTML = '';

        if (this.galleryItems.length === 0) {
            if (emptyState) emptyState.style.display = 'flex';
            return;
        } else {
            if (emptyState) emptyState.style.display = 'none';
        }

        this.galleryItems.forEach(item => {
            const galleryItem = document.createElement('article');
            galleryItem.className = 'gallery-item';
            galleryItem.dataset.category = item.category;
            galleryItem.dataset.tags = item.tags.join(',');
            galleryItem.dataset.id = item.id;
            galleryItem.tabIndex = 0; // Make card focusable
            galleryItem.setAttribute('role', 'button');
            galleryItem.setAttribute('aria-label', item.title || 'View media');

            const isVideo = item.type === 'video';
            // Checkbox only on hover or if selected
            let selectionCheckbox = `<input type="checkbox" class="select-checkbox" data-item-id="${item.id}" style="position:absolute;top:10px;left:10px;z-index:10;transform:scale(1.3);display:none;">`;
            if (this.selectedItems.has(item.id)) {
                selectionCheckbox = `<input type="checkbox" class="select-checkbox" data-item-id="${item.id}" checked style="position:absolute;top:10px;left:10px;z-index:10;transform:scale(1.3);display:block;">`;
            }
            galleryItem.innerHTML = `
                <div class="image-wrapper" style="position:relative;">
                    ${selectionCheckbox}
                    <span class="category-tag">${item.category}</span>
                    <div class="hover-overlay"></div>
                    ${isVideo ? `
                        <video loading="lazy">
                            <source src="${item.src}" type="video/mp4">
                            Your browser does not support the video tag.
                        </video>
                        <div class="video-icon">
                            <i class="fas fa-play"></i>
                        </div>
                    ` : `
                        <img src="${item.src}" loading="lazy" alt="${item.title}">
                    `}
                </div>
                <div class="caption">
                    <h3>${item.title}</h3>
                    <p>${item.description}</p>
                </div>
                <div class="gallery-item-interactions">
                    <div class="interaction-buttons">
                        <button class="interaction-btn like-btn" data-item-id="${item.id}" aria-label="Like">
                            <i class="fas fa-heart"></i>
                            <span class="like-count">${item.like_count || 0}</span>
                        </button>
                        <button class="interaction-btn comment-btn" data-item-id="${item.id}" aria-label="Comments">
                            <i class="fas fa-comment"></i>
                            <span class="comment-count">${item.comment_count || 0}</span>
                        </button>
                    </div>
                    <div class="interaction-counts">
                        <span>${item.like_count || 0} likes</span>
                        <span>${item.comment_count || 0} comments</span>
                    </div>
                </div>
            `;

            // Checkbox hover logic
            galleryItem.addEventListener('mouseenter', () => {
                const cb = galleryItem.querySelector('.select-checkbox');
                if (cb && !this.selectedItems.has(item.id)) cb.style.display = 'block';
            });
            galleryItem.addEventListener('mouseleave', () => {
                const cb = galleryItem.querySelector('.select-checkbox');
                if (cb && !this.selectedItems.has(item.id)) cb.style.display = 'none';
            });

            // Make the card clickable and keyboard accessible
            galleryItem.addEventListener('click', (e) => {
                const cb = e.target.closest('.select-checkbox');
                if (cb) {
                    this.toggleSelectItem(item.id);
                    e.stopPropagation();
                    return;
                }
                if (e.target.closest('.interaction-btn')) return;
                window.galleryApp.openMediaDetailModal(item);
            });
            galleryItem.addEventListener('keydown', (e) => {
                if ((e.key === 'Enter' || e.key === ' ') && !e.target.closest('.interaction-btn')) {
                    e.preventDefault();
                    window.galleryApp.openMediaDetailModal(item);
                }
            });

            galleryContainer.appendChild(galleryItem);
        });

        this.setupVideoHover();
        this.setupInteractionButtons();
        this.setupSelectionCheckboxes();
        window.galleryApp.updateFloatingControls();
    }

    setupVideoHover() {
        const videos = document.querySelectorAll('.gallery-item video');
        
        videos.forEach(video => {
            video.addEventListener('mouseenter', function() {
                // Only try to play if user has interacted with the page
                if (document.body.classList.contains('user-interacted')) {
                    this.play().catch(e => console.log('Autoplay prevented:', e));
                }
            });
            
            video.addEventListener('mouseleave', function() {
                this.pause();
                this.currentTime = 0;
            });
        });
    }

    setupInteractionButtons() {
        const likeButtons = document.querySelectorAll('.like-btn');
        const commentButtons = document.querySelectorAll('.comment-btn');
        
        likeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                // Delegate to the app instance
                window.galleryApp.handleLike(btn);
            });
        });
        
        commentButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                // Delegate to the app instance
                window.galleryApp.handleComment(btn);
            });
        });
    }

    setupSelectionCheckboxes() {
        const checkboxes = document.querySelectorAll('.select-checkbox');
        checkboxes.forEach(cb => {
            cb.addEventListener('change', (e) => {
                const id = cb.getAttribute('data-item-id');
                this.toggleSelectItem(id);
                e.stopPropagation();
            });
        });
    }

    toggleSelectItem(id) {
        if (this.selectedItems.has(id)) {
            this.selectedItems.delete(id);
        } else {
            this.selectedItems.add(id);
        }
        this.renderGallery();
    }

    selectAll() {
        this.galleryItems.forEach(item => this.selectedItems.add(item.id));
        this.renderGallery();
    }

    clearSelection() {
        this.selectedItems.clear();
        this.renderGallery();
    }

    getSelectedItems() {
        return Array.from(this.selectedItems);
    }

    handleScroll() {
        const gm = this.galleryManager;
        if (gm.loadingMore || gm.allLoaded) return;
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
            gm.page++;
            gm.loadFromAPI({ append: true });
        }
    }

    showSkeletons() {
        const skeletons = document.getElementById('gallerySkeletons');
        skeletons.innerHTML = '';
        for (let i = 0; i < 4; i++) {
            const div = document.createElement('div');
            div.className = 'skeleton-card';
            skeletons.appendChild(div);
        }
    }

    hideSkeletons() {
        document.getElementById('gallerySkeletons').innerHTML = '';
    }
}

// Main application
class GalleryApp {
    constructor(supa) {
        this.supa = supa;
        this.galleryManager = new GalleryManager();
        this.initTheme();
        this.initEventListeners();
        // --- Multi-upload state ---
        this.fileList = [];
        this.editingFileIdx = null;
        this.isEditFileMetaModalOpen = false;
    }

    initTheme() {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const currentTheme = localStorage.getItem('theme') || (prefersDark ? 'dark' : 'light');
        
        if (currentTheme === 'dark') {
            document.body.classList.add('dark-mode');
        }
    }

    initEventListeners() {
        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const theme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
            localStorage.setItem('theme', theme);
        });
        
        // Search functionality
        const searchInput = document.querySelector('.search-bar input');
        const searchButton = document.querySelector('.search-bar button');
        const categoryFilters = document.querySelectorAll('.category-filter');
        
        const debouncedSearch = this.debounce(() => this.performSearch(), 200);
        searchInput.addEventListener('input', debouncedSearch);
        
        searchButton.addEventListener('click', () => {
            searchInput.value = '';
            debouncedSearch();
        });
        
        categoryFilters.forEach(btn => {
            btn.addEventListener('click', () => {
                this.filterByCategory(btn);
                debouncedSearch();
            });
        });

        // Upload modal
        document.getElementById('uploadBtn').addEventListener('click', () => this.openUploadModal());
        document.getElementById('closeModal').addEventListener('click', () => this.closeUploadModal());
        document.getElementById('uploadAnother').addEventListener('click', () => this.resetUploadForm());

        // Upload form
        document.getElementById('uploadForm').addEventListener('submit', (e) => this.handleUpload(e));

        // Drag and drop
        const uploadArea = document.getElementById('uploadArea');
        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, (e) => {
                this.highlightUploadArea();
                this.showDragCount(e);
            });
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, (e) => {
                this.unhighlightUploadArea();
                this.hideDragCount();
            });
        });
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, this.preventDefaults);
        });
        
        uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        uploadArea.addEventListener('click', () => document.getElementById('fileInput').click());
        document.getElementById('fileInput').addEventListener('change', (e) => this.handleFileSelect(e));

        // Infinite scroll
        window.addEventListener('scroll', () => this.handleScroll());

        // Comments modal
        document.getElementById('closeCommentsModal').addEventListener('click', () => this.closeCommentsModal());
        document.getElementById('commentForm').addEventListener('submit', (e) => this.handleCommentSubmit(e));

        // Notification modal
        document.querySelector('button[aria-label="Notifications"]').addEventListener('click', () => {
            this.openModal(document.getElementById('notificationModal'));
        });
        document.getElementById('closeNotificationModal').addEventListener('click', () => {
            this.closeModal(document.getElementById('notificationModal'));
        });

        // Make category filters keyboard accessible
        document.querySelectorAll('.category-filter').forEach(btn => {
            btn.tabIndex = 0;
            btn.setAttribute('role', 'button');
            btn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    btn.click();
                }
            });
        });

        // Make upload button keyboard accessible
        const uploadBtn = document.getElementById('uploadBtn');
        if (uploadBtn) {
            uploadBtn.tabIndex = 0;
            uploadBtn.setAttribute('role', 'button');
            uploadBtn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    uploadBtn.click();
                }
            });
        }

        // Floating selection controls
        const floatingControls = document.getElementById('floatingSelectionControls');
        const editBtn = document.getElementById('editSelectedBtn');
        const selectAllBtn = document.getElementById('selectAllBtn');
        editBtn.addEventListener('click', () => {
            this.openEditGalleryModal();
        });
        selectAllBtn.addEventListener('click', () => {
            const allSelected = this.galleryManager.selectedItems.size === this.galleryManager.galleryItems.length;
            if (allSelected) {
                this.galleryManager.clearSelection();
            } else {
                this.galleryManager.selectAll();
            }
        });
        document.getElementById('closeEditGalleryModal').addEventListener('click', () => {
            this.closeEditGalleryModal();
        });
        document.getElementById('editGalleryForm').addEventListener('submit', (e) => {
            this.handleEditGallerySubmit(e);
        });
        document.getElementById('downloadSelectedBtn').addEventListener('click', () => {
            this.handleDownloadSelected();
        });
        document.getElementById('deleteSelectedBtn').addEventListener('click', () => {
            this.openDeleteConfirmModal();
        });
        document.getElementById('closeDeleteConfirmModal').addEventListener('click', () => {
            this.closeDeleteConfirmModal();
        });
        document.getElementById('cancelDeleteBtn').addEventListener('click', () => {
            this.closeDeleteConfirmModal();
        });
        document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
            this.handleDeleteSelected();
        });

        // Edit file metadata modal
        document.getElementById('editFileMetaModal').addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                this.closeEditFileMetaModal();
            }
        });
        document.getElementById('closeEditFileMetaModal').addEventListener('click', () => {
            this.closeEditFileMetaModal();
        });
        document.getElementById('editFileMetaForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const idx = this.editingFileIdx;
            if (idx == null) return this.closeEditFileMetaModal();
            this.fileList[idx].title = document.getElementById('editFileTitle').value;
            this.fileList[idx].description = document.getElementById('editFileDescription').value;
            this.fileList[idx].category = document.getElementById('editFileCategory').value;
            this.fileList[idx].tags = document.getElementById('editFileTags').value.split(',').map(t => t.trim()).filter(Boolean);
            this.renderFilePreviewList();
            this.closeEditFileMetaModal();
        });
        document.getElementById('copyMetaToAllBtn').addEventListener('click', () => {
            const idx = this.editingFileIdx;
            if (idx == null) return;
            const meta = {
                title: document.getElementById('editFileTitle').value,
                description: document.getElementById('editFileDescription').value,
                category: document.getElementById('editFileCategory').value,
                tags: document.getElementById('editFileTags').value.split(',').map(t => t.trim()).filter(Boolean)
            };
            this.fileList.forEach((f, i) => {
                if (i !== idx) {
                    f.title = meta.title;
                    f.description = meta.description;
                    f.category = meta.category;
                    f.tags = meta.tags;
                }
            });
            this.renderFilePreviewList();
        });
        // Prevent upload if edit modal is open
        document.getElementById('uploadForm').addEventListener('submit', (e) => {
            if (this.isEditFileMetaModalOpen) {
                e.preventDefault();
                this.showNotification('Finish editing file metadata before uploading.', 'error');
            }
        }, true);
    }

    performSearch() {
        const searchInput = document.querySelector('.search-bar input');
        const searchTerm = searchInput.value.toLowerCase().trim();
        const galleryItems = document.querySelectorAll('.gallery-item');
        const galleryContainer = document.getElementById('galleryContainer');
        if (galleryContainer) {
            galleryContainer.classList.add('fading');
            setTimeout(() => galleryContainer.classList.remove('fading'), 250);
        }

        galleryItems.forEach(item => {
            const title = item.querySelector('.caption h3').textContent.toLowerCase();
            const description = item.querySelector('.caption p').textContent.toLowerCase();
            const category = item.querySelector('.category-tag').textContent.toLowerCase();
            const tags = item.dataset.tags.toLowerCase();
            
            const matchesSearch = searchTerm === '' || 
                                title.includes(searchTerm) || 
                                description.includes(searchTerm) || 
                                category.includes(searchTerm) ||
                                tags.includes(searchTerm);
            
            const currentCategory = document.querySelector('.category-filter.active').dataset.category;
            const matchesCategory = currentCategory === 'all' || 
                                  category.includes(currentCategory);
            
            item.style.display = matchesSearch && matchesCategory ? 'block' : 'none';
        });
    }
    
    filterByCategory(btn) {
        document.querySelectorAll('.category-filter').forEach(btn => btn.classList.remove('active'));
        btn.classList.add('active');
        this.performSearch();
    }

    openUploadModal() {
        this.openModal(document.getElementById('uploadModal'));
    }

    closeUploadModal() {
        this.closeModal(document.getElementById('uploadModal'));
        this.resetUploadForm();
    }

    resetUploadForm() {
        document.getElementById('uploadForm').reset();
        document.getElementById('uploadPreview').style.display = 'none';
        document.getElementById('uploadPreview').src = '';
        document.getElementById('videoPreview').style.display = 'none';
        document.getElementById('videoPreview').src = '';
        document.getElementById('uploadProgress').style.display = 'none';
        document.getElementById('progressBar').style.width = '0%';
        
        document.querySelector('.upload-icon').style.display = 'block';
        document.querySelector('.upload-text').style.display = 'block';
        
        document.getElementById('fileInput').value = '';
        this.fileList = [];
        this.renderFilePreviewList();
    }

    highlightUploadArea() {
        document.getElementById('uploadArea').classList.add('dragover');
    }

    unhighlightUploadArea() {
        document.getElementById('uploadArea').classList.remove('dragover');
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length) {
            document.getElementById('fileInput').files = files;
            this.handleFileSelect({ target: document.getElementById('fileInput') });
        }
    }

    handleFileSelect(event) {
        const files = Array.from(event.target.files);
        if (!files || files.length === 0) return;
        // Add to fileList state
        this.fileList = files.map((file, idx) => ({
            file,
            id: `${file.name}_${file.size}_${file.lastModified}_${idx}`,
            status: 'pending',
            progress: 0
        }));
        this.renderFilePreviewList();
    }

    renderFilePreviewList() {
        const container = document.getElementById('filePreviewList');
        container.innerHTML = '';
        if (!this.fileList || this.fileList.length === 0) {
            document.getElementById('uploadPreview').style.display = 'none';
            document.getElementById('videoPreview').style.display = 'none';
            document.querySelector('.upload-icon').style.display = 'block';
            document.querySelector('.upload-text').style.display = 'block';
            return;
        }
        document.querySelector('.upload-icon').style.display = 'none';
        document.querySelector('.upload-text').style.display = 'none';
        this.fileList.forEach((item, idx) => {
            const div = document.createElement('div');
            div.className = 'file-preview-item';
            // Remove button
            const removeBtn = document.createElement('button');
            removeBtn.className = 'file-preview-remove';
            removeBtn.innerHTML = '&times;';
            removeBtn.title = 'Remove file';
            removeBtn.onclick = () => {
                this.fileList.splice(idx, 1);
                this.renderFilePreviewList();
                // Update file input value
                const dt = new DataTransfer();
                this.fileList.forEach(f => dt.items.add(f.file));
                document.getElementById('fileInput').files = dt.files;
            };
            div.appendChild(removeBtn);
            // Edit button
            const editBtn = document.createElement('button');
            editBtn.className = 'file-preview-edit';
            editBtn.innerHTML = '<i class="fas fa-pen"></i>';
            editBtn.title = 'Edit metadata';
            editBtn.style.position = 'absolute';
            editBtn.style.top = '2px';
            editBtn.style.left = '2px';
            editBtn.style.background = 'rgba(67,97,238,0.85)';
            editBtn.style.color = '#fff';
            editBtn.style.border = 'none';
            editBtn.style.borderRadius = '50%';
            editBtn.style.width = '20px';
            editBtn.style.height = '20px';
            editBtn.style.fontSize = '1rem';
            editBtn.style.cursor = 'pointer';
            editBtn.style.display = 'flex';
            editBtn.style.alignItems = 'center';
            editBtn.style.justifyContent = 'center';
            editBtn.style.zIndex = '2';
            editBtn.onclick = () => this.openEditFileMetaModal(idx);
            div.appendChild(editBtn);
            // Retry button for failed uploads
            if (item.status === 'failed') {
                const retryBtn = document.createElement('button');
                retryBtn.className = 'file-preview-retry';
                retryBtn.innerHTML = '<i class="fas fa-redo"></i>';
                retryBtn.title = 'Retry upload';
                retryBtn.style.position = 'absolute';
                retryBtn.style.bottom = '2px';
                retryBtn.style.right = '2px';
                retryBtn.style.background = 'rgba(76,201,240,0.85)';
                retryBtn.style.color = '#fff';
                retryBtn.style.border = 'none';
                retryBtn.style.borderRadius = '50%';
                retryBtn.style.width = '20px';
                retryBtn.style.height = '20px';
                retryBtn.style.fontSize = '1rem';
                retryBtn.style.cursor = 'pointer';
                retryBtn.style.display = 'flex';
                retryBtn.style.alignItems = 'center';
                retryBtn.style.justifyContent = 'center';
                retryBtn.style.zIndex = '2';
                retryBtn.onclick = () => this.retryFileUpload(idx);
                div.appendChild(retryBtn);
            }
            // Thumbnail or icon
            if (item.file.type.startsWith('image/')) {
                const img = document.createElement('img');
                img.className = 'file-preview-thumb';
                img.alt = item.file.name;
                const reader = new FileReader();
                reader.onload = (e) => { img.src = e.target.result; };
                reader.readAsDataURL(item.file);
                div.appendChild(img);
            } else if (item.file.type.startsWith('video/')) {
                const icon = document.createElement('div');
                icon.className = 'file-preview-icon';
                icon.innerHTML = '<i class="fas fa-video"></i>';
                div.appendChild(icon);
            } else {
                const icon = document.createElement('div');
                icon.className = 'file-preview-icon';
                icon.innerHTML = '<i class="fas fa-file"></i>';
                div.appendChild(icon);
            }
            // Filename
            const nameDiv = document.createElement('div');
            nameDiv.className = 'file-preview-filename';
            nameDiv.textContent = item.file.name;
            div.appendChild(nameDiv);
            // Per-file progress
            const progressDiv = document.createElement('div');
            progressDiv.className = 'file-preview-progress';
            const progressBar = document.createElement('div');
            progressBar.className = 'file-preview-progress-bar';
            progressBar.style.width = `${item.progress || 0}%`;
            progressDiv.appendChild(progressBar);
            div.appendChild(progressDiv);
            // Status
            const statusDiv = document.createElement('div');
            statusDiv.className = 'file-preview-status';
            statusDiv.textContent = item.status;
            div.appendChild(statusDiv);
            container.appendChild(div);
        });
    }

    openEditFileMetaModal(idx) {
        this.editingFileIdx = idx;
        this.isEditFileMetaModalOpen = true;
        const file = this.fileList[idx];
        // If no per-file meta, initialize from main form
        if (!file.title) file.title = document.getElementById('mediaTitle').value;
        if (!file.description) file.description = document.getElementById('mediaDescription').value;
        if (!file.category) file.category = document.getElementById('mediaCategory').value;
        if (!file.tags) file.tags = document.getElementById('mediaTags').value;
        document.getElementById('editFileTitle').value = file.title || '';
        document.getElementById('editFileDescription').value = file.description || '';
        document.getElementById('editFileCategory').value = file.category || '';
        document.getElementById('editFileTags').value = Array.isArray(file.tags) ? file.tags.join(', ') : (file.tags || '');
        document.getElementById('editFileMetaModal').classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeEditFileMetaModal() {
        this.isEditFileMetaModalOpen = false;
        document.getElementById('editFileMetaModal').classList.remove('active');
        document.body.style.overflow = '';
    }

    showDragCount(e) {
        // Show a count of files being dragged in (optional, simple badge)
        if (e && e.dataTransfer && e.dataTransfer.items) {
            let badge = document.getElementById('dragCountBadge');
            if (!badge) {
                badge = document.createElement('div');
                badge.id = 'dragCountBadge';
                badge.style.position = 'absolute';
                badge.style.top = '8px';
                badge.style.left = '8px';
                badge.style.background = 'var(--primary)';
                badge.style.color = '#fff';
                badge.style.borderRadius = '12px';
                badge.style.padding = '2px 10px';
                badge.style.fontSize = '0.9rem';
                badge.style.zIndex = '10';
                badge.style.pointerEvents = 'none';
                document.getElementById('uploadArea').appendChild(badge);
            }
            badge.textContent = `${e.dataTransfer.items.length} file${e.dataTransfer.items.length > 1 ? 's' : ''}`;
        }
    }
    hideDragCount() {
        const badge = document.getElementById('dragCountBadge');
        if (badge) badge.remove();
    }

    scrollModalToBottom() {
        setTimeout(() => {
            const modalContent = document.querySelector('.modal-content');
            modalContent.scrollTop = modalContent.scrollHeight;
        }, 100);
    }

    async handleUpload(e) {
        e.preventDefault();
        const files = this.fileList;
        if (!files || files.length === 0) {
            this.showNotification('Please select at least one file to upload', 'error');
            return;
        }
        // Check authentication
        const userResult = await this.supa.auth.getSession();
        const session = userResult.data?.session;
        const accessToken = session?.access_token;
        if (!session) {
            this.showNotification('You must be signed in to upload.', 'error');
            return;
        }
        let completed = 0;
        let failed = 0;
        const total = files.length;
        for (let i = 0; i < files.length; i++) {
            const item = files[i];
            this.fileList[i].status = 'uploading';
            this.fileList[i].progress = 0;
            this.renderFilePreviewList();
            try {
                const file = item.file;
                const fileExt = file.name.split('.').pop();
                const filePath = `${Date.now()}_${Math.random().toString(36).substr(2)}_${i}.${fileExt}`;
                let fakeProgress = 0;
                const progressInterval = setInterval(() => {
                    fakeProgress += Math.random() * 20;
                    if (fakeProgress > 90) fakeProgress = 90;
                    this.fileList[i].progress = fakeProgress;
                    this.renderFilePreviewList();
                }, 150);
                const { data: uploadData, error: uploadError } = await this.supa.storage.from('media').upload(filePath, file);
                clearInterval(progressInterval);
                this.fileList[i].progress = 100;
                this.renderFilePreviewList();
                if (uploadError) {
                    this.fileList[i].status = 'failed';
                    failed++;
                    continue;
                }
                const { data: urlData } = this.supa.storage.from('media').getPublicUrl(filePath);
                const publicURL = urlData.publicUrl;
                // Use per-file metadata if present, else fallback to main form
                const newItem = {
                    type: file.type.startsWith('image/') ? 'image' : 'video',
                    src: publicURL,
                    title: item.title || document.getElementById('mediaTitle').value,
                    description: item.description || document.getElementById('mediaDescription').value,
                    category: item.category || document.getElementById('mediaCategory').value,
                    tags: item.tags && item.tags.length ? item.tags : document.getElementById('mediaTags').value.split(',').map(t => t.trim()).filter(Boolean),
                    user_id: session.user.id,
                    visibility: document.getElementById('mediaVisibility').value,
                    shared_with: getSelectedUserIds('mediaSharedWith')
                };
                const response = await fetch('/.netlify/functions/upload-gallery', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}`
                    },
                    body: JSON.stringify(newItem)
                });
                if (!response.ok) {
                    this.fileList[i].status = 'failed';
                    failed++;
                    continue;
                }
                this.fileList[i].status = 'success';
                completed++;
            } catch (error) {
                this.fileList[i].status = 'failed';
                failed++;
            }
            this.renderFilePreviewList();
        }
        this.resetUploadForm();
        this.galleryManager.loadFromAPI();
        if (completed > 0 && failed === 0) {
            this.showNotification(`All ${completed} file(s) uploaded successfully!`, 'success');
        } else if (completed > 0 && failed > 0) {
            this.showNotification(`${completed} file(s) uploaded, ${failed} failed.`, 'error');
        } else {
            this.showNotification('All uploads failed. Please try again.', 'error');
        }
    }

    async retryFileUpload(idx) {
        const item = this.fileList[idx];
        if (!item) return;
        // Check authentication
        const userResult = await this.supa.auth.getSession();
        const session = userResult.data?.session;
        const accessToken = session?.access_token;
        if (!session) {
            this.showNotification('You must be signed in to upload.', 'error');
            return;
        }
        this.fileList[idx].status = 'uploading';
        this.fileList[idx].progress = 0;
        this.renderFilePreviewList();
        try {
            const file = item.file;
            const fileExt = file.name.split('.').pop();
            const filePath = `${Date.now()}_${Math.random().toString(36).substr(2)}_${idx}.${fileExt}`;
            let fakeProgress = 0;
            const progressInterval = setInterval(() => {
                fakeProgress += Math.random() * 20;
                if (fakeProgress > 90) fakeProgress = 90;
                this.fileList[idx].progress = fakeProgress;
                this.renderFilePreviewList();
            }, 150);
            const { data: uploadData, error: uploadError } = await this.supa.storage.from('media').upload(filePath, file);
            clearInterval(progressInterval);
            this.fileList[idx].progress = 100;
            this.renderFilePreviewList();
            if (uploadError) {
                this.fileList[idx].status = 'failed';
                this.showNotification('Retry failed: ' + uploadError.message, 'error');
                return;
            }
            const { data: urlData } = this.supa.storage.from('media').getPublicUrl(filePath);
            const publicURL = urlData.publicUrl;
            const newItem = {
                type: file.type.startsWith('image/') ? 'image' : 'video',
                src: publicURL,
                title: item.title || document.getElementById('mediaTitle').value,
                description: item.description || document.getElementById('mediaDescription').value,
                category: item.category || document.getElementById('mediaCategory').value,
                tags: item.tags && item.tags.length ? item.tags : document.getElementById('mediaTags').value.split(',').map(t => t.trim()).filter(Boolean),
                user_id: session.user.id,
                visibility: document.getElementById('mediaVisibility').value,
                shared_with: getSelectedUserIds('mediaSharedWith')
            };
            const response = await fetch('/.netlify/functions/upload-gallery', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify(newItem)
            });
            if (!response.ok) {
                this.fileList[idx].status = 'failed';
                this.showNotification('Retry failed: ' + (await response.text()), 'error');
                return;
            }
            this.fileList[idx].status = 'success';
            this.renderFilePreviewList();
            this.showNotification('File uploaded successfully!', 'success');
        } catch (error) {
            this.fileList[idx].status = 'failed';
            this.renderFilePreviewList();
            this.showNotification('Retry failed. Please try again.', 'error');
        }
    }

    showToast(message, type = "") {
        const toast = document.getElementById("toast");
        if (!toast) return;
        toast.className = "toast" + (type ? " " + type : "");
        toast.innerHTML =
            (type === "success"
                ? '<i class="fas fa-check-circle"></i>'
                : type === "error"
                ? '<i class="fas fa-exclamation-circle"></i>'
                : "") +
            `<span>${message}</span>`;
        setTimeout(() => {
            toast.classList.add("show");
        }, 10);
        clearTimeout(toast._timeout);
        toast._timeout = setTimeout(() => {
            toast.classList.remove("show");
        }, 3200);
    }

    showNotification(message, type) {
        // For backward compatibility, also show the old notification if needed
        // But now use toast for all user feedback
        this.showToast(message, type);
    }

    async handleLike(btn) {
        const itemId = btn.dataset.itemId;
        
        try {
            const { data: { session } } = await this.supa.auth.getSession();
            if (!session) {
                this.showNotification('Please sign in to like items', 'error');
                return;
            }

            const response = await fetch('/.netlify/functions/toggle-like', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ galleryItemId: itemId })
            });

            const result = await response.json();
            
            if (response.ok) {
                const likeCount = btn.querySelector('.like-count');
                const currentCount = parseInt(likeCount.textContent);
                
                if (result.liked) {
                    btn.classList.add('liked');
                    likeCount.textContent = currentCount + 1;
                    this.showNotification('Liked!', 'success');
                } else {
                    btn.classList.remove('liked');
                    likeCount.textContent = Math.max(0, currentCount - 1);
                }
                
                // Update the counts display
                const item = btn.closest('.gallery-item');
                const countsDisplay = item.querySelector('.interaction-counts');
                countsDisplay.innerHTML = `
                    <span>${likeCount.textContent} likes</span>
                    <span>${item.querySelector('.comment-count').textContent} comments</span>
                `;
            } else {
                this.showNotification(result.error || 'Failed to like item', 'error');
            }
        } catch (error) {
            console.error('Error handling like:', error);
            this.showNotification('Failed to like item', 'error');
        }
    }

    async handleComment(btn) {
        const itemId = btn.dataset.itemId;
        
        try {
            const { data: { session } } = await this.supa.auth.getSession();
            if (!session) {
                this.showNotification('Please sign in to comment', 'error');
                return;
            }

            this.currentItemId = itemId;
            this.openCommentsModal();
            await this.loadComments(itemId);
        } catch (error) {
            console.error('Error opening comments:', error);
            this.showNotification('Failed to load comments', 'error');
        }
    }

    openCommentsModal() {
        this.openModal(document.getElementById('commentsModal'));
    }

    closeCommentsModal() {
        this.closeModal(document.getElementById('commentsModal'));
        this.currentItemId = null;
    }

    async loadComments(itemId) {
        try {
            const response = await fetch('/.netlify/functions/get-comments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ galleryItemId: itemId })
            });

            const result = await response.json();
            
            if (response.ok) {
                this.renderComments(result.comments || []);
            } else {
                this.showNotification(result.error || 'Failed to load comments', 'error');
            }
        } catch (error) {
            console.error('Error loading comments:', error);
            this.showNotification('Failed to load comments', 'error');
        }
    }

    renderComments(comments) {
        const commentsList = document.getElementById('commentsList');
        
        if (comments.length === 0) {
            commentsList.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No comments yet. Be the first to comment!</p>';
            return;
        }

        commentsList.innerHTML = comments.map(comment => `
            <div class="comment-item">
                <div class="comment-header">
                    <span class="comment-author">${comment.profiles?.email || 'Unknown User'}</span>
                    <span class="comment-date">${new Date(comment.created_at).toLocaleDateString()}</span>
                </div>
                <div class="comment-content">${comment.content}</div>
            </div>
        `).join('');
    }

    async handleCommentSubmit(e) {
        e.preventDefault();
        
        const commentInput = document.getElementById('commentInput');
        const content = commentInput.value.trim();
        
        if (!content) return;

        try {
            const { data: { session } } = await this.supa.auth.getSession();
            if (!session) {
                this.showNotification('Please sign in to comment', 'error');
                return;
            }

            const response = await fetch('/.netlify/functions/add-comment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    galleryItemId: this.currentItemId,
                    content: content
                })
            });

            const result = await response.json();
            
            if (response.ok) {
                commentInput.value = '';
                await this.loadComments(this.currentItemId);
                this.showNotification('Comment added successfully!', 'success');
                
                // Update comment count in gallery
                const commentBtn = document.querySelector(`.comment-btn[data-item-id="${this.currentItemId}"]`);
                const commentCount = commentBtn.querySelector('.comment-count');
                const currentCount = parseInt(commentCount.textContent);
                commentCount.textContent = currentCount + 1;
                
                // Update the counts display
                const item = commentBtn.closest('.gallery-item');
                const countsDisplay = item.querySelector('.interaction-counts');
                const likeCount = item.querySelector('.like-count').textContent;
                countsDisplay.innerHTML = `
                    <span>${likeCount} likes</span>
                    <span>${commentCount.textContent} comments</span>
                `;
            } else {
                this.showNotification(result.error || 'Failed to add comment', 'error');
            }
        } catch (error) {
            console.error('Error adding comment:', error);
            this.showNotification('Failed to add comment', 'error');
        }
    }

    handleScroll() {
        const gm = this.galleryManager;
        if (gm.loadingMore || gm.allLoaded) return;
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
            gm.page++;
            gm.loadFromAPI({ append: true });
        }
    }

    openMediaDetailModal(item) {
        const modal = document.getElementById('mediaDetailModal');
        const body = document.getElementById('mediaDetailBody');
        document.getElementById('mediaDetailTitle').textContent = item.title || 'Media Details';
        // Get all visible gallery items
        const items = Array.from(document.querySelectorAll('.gallery-item'))
            .map(el => {
                const id = el.dataset.id;
                return this.galleryManager.galleryItems.find(i => i.id == id);
            })
            .filter(Boolean);
        const currentIndex = items.findIndex(i => i.id === item.id);
        const prevItem = currentIndex > 0 ? items[currentIndex - 1] : null;
        const nextItem = currentIndex < items.length - 1 ? items[currentIndex + 1] : null;
        // Main media element
        const isVideo = item.type === 'video';
        const mediaElement = isVideo ? 
            `<video controls style='max-width:100%; max-height:60vh; border-radius:12px; object-fit:contain;' loading='lazy'>
                <source src='${item.src}' type='video/mp4'>
            </video>` :
            `<img src='${item.src}' alt='${item.title}' style='max-width:100%; max-height:60vh; border-radius:12px; object-fit:contain;' loading='lazy'>`;
        // Side previews
        const prevPreview = prevItem ? `<div class="side-preview" style="margin-right:2vw;cursor:pointer;" onclick="window.galleryApp.openMediaDetailModal(window.galleryApp.galleryManager.galleryItems.find(i=>i.id=='${prevItem.id}'))"><img src='${prevItem.src}' alt='' style='max-width:80px; max-height:60vh; opacity:0.45; border-radius:12px; object-fit:contain;'/></div>` : '';
        const nextPreview = nextItem ? `<div class="side-preview" style="margin-left:2vw;cursor:pointer;" onclick="window.galleryApp.openMediaDetailModal(window.galleryApp.galleryManager.galleryItems.find(i=>i.id=='${nextItem.id}'))"><img src='${nextItem.src}' alt='' style='max-width:80px; max-height:60vh; opacity:0.45; border-radius:12px; object-fit:contain;'/></div>` : '';
        body.innerHTML = `
            <div class="media-container" style="display:flex;align-items:center;justify-content:center;">
                ${prevPreview}
                <div style="flex:1;display:flex;align-items:center;justify-content:center;">
                    ${mediaElement}
                </div>
                ${nextPreview}
            </div>
            <div class="info-section">
                <h3>${item.title}</h3>
                <p>${item.description || ''}</p>
                <p><strong>Category:</strong> ${item.category || '-'}</p>
            </div>
        `;
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        // Focus for keyboard navigation
        modal.tabIndex = 0;
        setTimeout(() => modal.focus(), 50);

        // --- Adaptive Touch Gesture Support ---
        let touchStartX = null;
        let touchStartY = null;
        let touchEndX = null;
        let touchEndY = null;
        const minSwipeDistance = 50; // px
        // Remove previous listeners if any
        if (modal._touchHandlerCleanup) modal._touchHandlerCleanup();
        const isMobile = window.innerWidth <= 768;
        const onTouchStart = (e) => {
            if (e.touches && e.touches.length === 1) {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
            }
        };
        const onTouchMove = (e) => {
            if (e.touches && e.touches.length === 1) {
                touchEndX = e.touches[0].clientX;
                touchEndY = e.touches[0].clientY;
            }
        };
        const onTouchEnd = (e) => {
            if (touchStartX !== null && touchEndX !== null && touchStartY !== null && touchEndY !== null) {
                const dx = touchEndX - touchStartX;
                const dy = touchEndY - touchStartY;
                if (isMobile) {
                    // Vertical swipe for mobile
                    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > minSwipeDistance) {
                        if (dy < 0 && nextItem) {
                            // Swipe up: next
                            this.openMediaDetailModal(nextItem);
                        } else if (dy > 0 && prevItem) {
                            // Swipe down: previous
                            this.openMediaDetailModal(prevItem);
                        }
                    }
                } else {
                    // Horizontal swipe for desktop
                    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > minSwipeDistance) {
                        if (dx < 0 && nextItem) {
                            // Swipe left: next
                            this.openMediaDetailModal(nextItem);
                        } else if (dx > 0 && prevItem) {
                            // Swipe right: previous
                            this.openMediaDetailModal(prevItem);
                        }
                    }
                }
            }
            touchStartX = touchStartY = touchEndX = touchEndY = null;
        };
        modal.addEventListener('touchstart', onTouchStart, { passive: true });
        modal.addEventListener('touchmove', onTouchMove, { passive: true });
        modal.addEventListener('touchend', onTouchEnd, { passive: true });
        // Cleanup handler to remove listeners when modal closes
        modal._touchHandlerCleanup = () => {
            modal.removeEventListener('touchstart', onTouchStart);
            modal.removeEventListener('touchmove', onTouchMove);
            modal.removeEventListener('touchend', onTouchEnd);
            delete modal._touchHandlerCleanup;
        };
        // Remove listeners on modal close
        const cleanupOnClose = () => {
            if (modal._touchHandlerCleanup) modal._touchHandlerCleanup();
            modal.removeEventListener('modalClose', cleanupOnClose);
        };
        modal.addEventListener('modalClose', cleanupOnClose);

        // --- Restore navigation arrows on desktop only ---
        if (!isMobile) {
            // Remove existing arrows
            const existingArrows = modal.querySelectorAll('.nav-arrow');
            existingArrows.forEach(arrow => arrow.remove());
            // Get all visible gallery items (again, for safety)
            const items = Array.from(document.querySelectorAll('.gallery-item'))
                .map(el => {
                    const id = el.dataset.id;
                    return this.galleryManager.galleryItems.find(i => i.id == id);
                })
                .filter(Boolean);
            const currentIndex = items.findIndex(i => i.id === item.id);
            // Create navigation arrows
            const prevArrow = document.createElement('button');
            prevArrow.className = 'nav-arrow prev';
            prevArrow.innerHTML = '<i class="fas fa-chevron-left"></i>';
            prevArrow.disabled = currentIndex <= 0;
            prevArrow.addEventListener('click', () => {
                if (currentIndex > 0) {
                    this.openMediaDetailModal(items[currentIndex - 1]);
                }
            });
            const nextArrow = document.createElement('button');
            nextArrow.className = 'nav-arrow next';
            nextArrow.innerHTML = '<i class="fas fa-chevron-right"></i>';
            nextArrow.disabled = currentIndex >= items.length - 1;
            nextArrow.addEventListener('click', () => {
                if (currentIndex < items.length - 1) {
                    this.openMediaDetailModal(items[currentIndex + 1]);
                }
            });
            modal.appendChild(prevArrow);
            modal.appendChild(nextArrow);
        }
    }

    addNavigationArrows(modal, currentItem) {
        // Remove existing arrows
        const existingArrows = modal.querySelectorAll('.nav-arrow');
        existingArrows.forEach(arrow => arrow.remove());
        
        // Get all visible gallery items
        const items = Array.from(document.querySelectorAll('.gallery-item'))
            .map(el => {
                const id = el.dataset.id;
                return this.galleryManager.galleryItems.find(i => i.id == id);
            })
            .filter(Boolean);
        
        const currentIndex = items.findIndex(i => i.id === currentItem.id);
        
        // Create navigation arrows
        const prevArrow = document.createElement('button');
        prevArrow.className = 'nav-arrow prev';
        prevArrow.innerHTML = '<i class="fas fa-chevron-left"></i>';
        prevArrow.disabled = currentIndex <= 0;
        prevArrow.addEventListener('click', () => {
            if (currentIndex > 0) {
                this.openMediaDetailModal(items[currentIndex - 1]);
            }
        });
        
        const nextArrow = document.createElement('button');
        nextArrow.className = 'nav-arrow next';
        nextArrow.innerHTML = '<i class="fas fa-chevron-right"></i>';
        nextArrow.disabled = currentIndex >= items.length - 1;
        nextArrow.addEventListener('click', () => {
            if (currentIndex < items.length - 1) {
                this.openMediaDetailModal(items[currentIndex + 1]);
            }
        });
        
        modal.appendChild(prevArrow);
        modal.appendChild(nextArrow);
        
        // Add keyboard navigation
        const handleKey = (e) => {
            if (e.key === 'ArrowLeft' && currentIndex > 0) {
                e.preventDefault();
                this.openMediaDetailModal(items[currentIndex - 1]);
            } else if (e.key === 'ArrowRight' && currentIndex < items.length - 1) {
                e.preventDefault();
                this.openMediaDetailModal(items[currentIndex + 1]);
            }
        };
        
        modal.addEventListener('keydown', handleKey);
        modal.tabIndex = 0;
        setTimeout(() => modal.focus(), 50);
        
        // Store the handler for cleanup
        modal._keyHandler = handleKey;
    }

    closeMediaDetailModal() {
        const modal = document.getElementById('mediaDetailModal');
        
        // Clean up navigation event listeners
        if (modal._keyHandler) {
            modal.removeEventListener('keydown', modal._keyHandler);
            delete modal._keyHandler;
        }
        
        // Remove navigation arrows
        const arrows = modal.querySelectorAll('.nav-arrow');
        arrows.forEach(arrow => arrow.remove());
        
        this.closeModal(modal);
    }

    // Focus trap for modals
    trapFocus(modal) {
        const focusableSelectors = 'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';
        const focusableEls = modal.querySelectorAll(focusableSelectors);
        if (!focusableEls.length) return;
        const firstEl = focusableEls[0];
        const lastEl = focusableEls[focusableEls.length - 1];
        function handleTab(e) {
            if (e.key !== 'Tab') return;
            if (e.shiftKey) {
                if (document.activeElement === firstEl) {
                    e.preventDefault();
                    lastEl.focus();
                }
            } else {
                if (document.activeElement === lastEl) {
                    e.preventDefault();
                    firstEl.focus();
                }
            }
        }
        modal.addEventListener('keydown', handleTab);
        // Focus first element
        setTimeout(() => firstEl.focus(), 50);
        // Remove handler on close
        function cleanup() { modal.removeEventListener('keydown', handleTab); }
        modal.addEventListener('modalClose', cleanup, { once: true });
    }

    // Patch modal open/close logic to use focus trap
    openModal(modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        this.trapFocus(modal);

        // Add backdrop click-to-close
        if (!modal._backdropHandler) {
            modal._backdropHandler = (e) => {
                if (e.target === modal) {
                    this.closeModal(modal);
                }
            };
            modal.addEventListener('mousedown', modal._backdropHandler);
        }
    }

    closeModal(modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        modal.dispatchEvent(new Event('modalClose'));
        // Remove backdrop click handler
        if (modal._backdropHandler) {
            modal.removeEventListener('mousedown', modal._backdropHandler);
            delete modal._backdropHandler;
        }
    }

    // Debounce utility
    debounce(fn, delay) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    updateSelectedCount() {
        const selectedCount = document.getElementById('selectedCount');
        const count = this.galleryManager.selectedItems.size;
        selectedCount.textContent = count > 0 ? `${count} selected` : '';
    }

    openEditGalleryModal() {
        // Optionally prefill category, description, caption if all selected items have the same value
        const selectedIds = this.galleryManager.getSelectedItems();
        if (selectedIds.length === 0) return;
        const items = this.galleryManager.galleryItems.filter(i => selectedIds.includes(i.id));
        const allSameCategory = items.every(i => i.category === items[0].category);
        const allSameDescription = items.every(i => i.description === items[0].description);
        const allSameCaption = items.every(i => i.caption === items[0].caption);
        document.getElementById('editCategory').value = allSameCategory ? items[0].category : '';
        document.getElementById('editDescription').value = allSameDescription ? (items[0].description || '') : '';
        document.getElementById('editCaption').value = allSameCaption ? (items[0].caption || '') : '';
        this.openModal(document.getElementById('editGalleryModal'));
    }

    closeEditGalleryModal() {
        this.closeModal(document.getElementById('editGalleryModal'));
    }

    async handleEditGallerySubmit(e) {
        e.preventDefault();
        const category = document.getElementById('editCategory').value;
        const description = document.getElementById('editDescription').value;
        const caption = document.getElementById('editCaption').value;
        const selectedIds = this.galleryManager.getSelectedItems();
        if (!category && !description && !caption) return;
        if (selectedIds.length === 0) return;
        // Call backend to update
        const { data: { session } } = await this.supa.auth.getSession();
        if (!session) {
            this.showNotification('Please sign in to edit items', 'error');
            return;
        }
        // Only send fields that are set
        const updates = selectedIds.map(id => {
            const update = { id };
            if (category) update.category = category;
            if (description) update.description = description;
            if (caption) update.caption = caption;
            return update;
        });
        const response = await fetch('/.netlify/functions/update-gallery-item', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify(updates)
        });
        if (response.ok) {
            this.showNotification('Gallery items updated!', 'success');
            if (this.galleryManager.clearSelection) this.galleryManager.clearSelection();
            const toggleBtn = document.getElementById('toggleSelectModeBtn');
            if (toggleBtn) toggleBtn.textContent = 'Select';
            document.getElementById('editSelectedBtn').style.display = 'none';
            this.closeEditGalleryModal();
            // Reload gallery
            this.galleryManager.loadFromAPI({ reset: true });
        } else {
            this.showNotification('Failed to update gallery items', 'error');
        }
    }

    updateFloatingControls() {
        const floatingControls = document.getElementById('floatingSelectionControls');
        const selectedCount = document.getElementById('selectedCount');
        const selectAllBtn = document.getElementById('selectAllBtn');
        const count = this.galleryManager.selectedItems.size;
        const total = this.galleryManager.galleryItems.length;
        if (count > 0) {
            floatingControls.style.display = 'flex';
            selectedCount.textContent = `${count} selected`;
            if (count === total && total > 0) {
                selectAllBtn.textContent = 'Deselect All';
            } else {
                selectAllBtn.textContent = 'Select All';
            }
        } else {
            floatingControls.style.display = 'none';
            selectedCount.textContent = '';
        }
    }

    openDeleteConfirmModal() {
        this.openModal(document.getElementById('deleteConfirmModal'));
    }
    closeDeleteConfirmModal() {
        this.closeModal(document.getElementById('deleteConfirmModal'));
    }

    async handleDeleteSelected() {
        const selectedIds = this.galleryManager.getSelectedItems();
        if (!selectedIds.length) return;
        const { data: { session } } = await this.supa.auth.getSession();
        if (!session) {
            this.showNotification('Please sign in to delete items', 'error');
            return;
        }
        const response = await fetch('/.netlify/functions/delete-gallery-item', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify(selectedIds)
        });
        if (response.ok) {
            this.showNotification('Deleted successfully!', 'success');
            this.closeDeleteConfirmModal();
            this.closeEditGalleryModal();
            this.galleryManager.clearSelection();
            this.galleryManager.loadFromAPI({ reset: true });
        } else {
            this.showNotification('Failed to delete', 'error');
        }
    }

    async handleDownloadSelected() {
        const selectedIds = this.galleryManager.getSelectedItems();
        if (!selectedIds.length) return;
        const items = this.galleryManager.galleryItems.filter(i => selectedIds.includes(i.id));
        if (items.length === 1) {
            // Single file: direct download
            const item = items[0];
            const url = item.src;
            const filename = item.title ? item.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'download';
            this.downloadFile(url, filename + this.getFileExtension(url));
        } else {
            // Multiple: zip
            if (!window.JSZip || !window.saveAs) {
                this.showNotification('Download libraries not loaded. Please try again.', 'error');
                return;
            }
            const zip = new window.JSZip();
            let count = 0;
            const self = this;
            items.forEach(item => {
                const url = item.src;
                const filename = (item.title ? item.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'file') + self.getFileExtension(url);
                fetch(url)
                    .then(res => res.blob())
                    .then(blob => {
                        zip.file(filename, blob);
                        count++;
                        if (count === items.length) {
                            zip.generateAsync({ type: 'blob' }).then(content => {
                                window.saveAs(content, 'gallery-download.zip');
                            });
                        }
                    })
                    .catch(() => {
                        count++;
                        if (count === items.length) {
                            zip.generateAsync({ type: 'blob' }).then(content => {
                                window.saveAs(content, 'gallery-download.zip');
                            });
                        }
                    });
            });
        }
    }

    downloadFile(url, filename) {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    getFileExtension(url) {
        const match = url.match(/\.[0-9a-z]+(?=[?#])|\.(?:mp4|jpg|jpeg|png|gif|webp|bmp|svg|mov|avi|mkv|webm|mp3|wav|ogg|flac|aac|m4a|zip|pdf|txt|docx|xlsx|pptx|csv|json|xml|html|js|css)$/i);
        return match ? match[0] : '';
    }
}

// --- User Fetching for Sharing ---
async function fetchUsersForSharing(currentUserId, supa) {
  const { data: users, error } = await supa
    .from('profiles')
    .select('id, username')
    .neq('id', currentUserId);
  if (error) {
    console.error('Error fetching users:', error);
    return [];
  }
  return users;
}

// --- Populate Multi-Selects ---
async function populateUserMultiSelect(selectId, currentUserId, supa) {
  const users = await fetchUsersForSharing(currentUserId, supa);
  const select = document.getElementById(selectId);
  if (!select) return;
  select.innerHTML = '';
  users.forEach(user => {
    const option = document.createElement('option');
    // Show username if available, else user ID
    option.value = user.id;
    option.textContent = user.username || user.id;
    select.appendChild(option);
  });
}

// --- Visibility Selectors Show/Hide Logic ---
function setupVisibilityHandlers() {
  // Upload Modal
  const vis = document.getElementById('mediaVisibility');
  const sharedWithGroup = document.getElementById('mediaSharedWithGroup');
  if (vis && sharedWithGroup) {
    vis.addEventListener('change', function() {
      sharedWithGroup.style.display = this.value === 'restricted' ? 'block' : 'none';
    });
  }
  // Edit Modal
  const editVis = document.getElementById('editVisibility');
  const editSharedWithGroup = document.getElementById('editSharedWithGroup');
  if (editVis && editSharedWithGroup) {
    editVis.addEventListener('change', function() {
      editSharedWithGroup.style.display = this.value === 'restricted' ? 'block' : 'none';
    });
  }
  // Per-file Meta Modal
  const fileVis = document.getElementById('editFileVisibility');
  const fileSharedWithGroup = document.getElementById('editFileSharedWithGroup');
  if (fileVis && fileSharedWithGroup) {
    fileVis.addEventListener('change', function() {
      fileSharedWithGroup.style.display = this.value === 'restricted' ? 'block' : 'none';
    });
  }
}

// --- Integrate with GalleryApp ---
const originalOpenUploadModal = GalleryApp.prototype.openUploadModal;
GalleryApp.prototype.openUploadModal = async function() {
  const userResult = await this.supa.auth.getSession();
  const session = userResult.data?.session;
  const userId = session?.user?.id;
  await populateUserMultiSelect('mediaSharedWith', userId, this.supa);
  setupVisibilityHandlers();
  originalOpenUploadModal.call(this);
};

const originalOpenEditGalleryModal = GalleryApp.prototype.openEditGalleryModal;
GalleryApp.prototype.openEditGalleryModal = async function() {
  const userResult = await this.supa.auth.getSession();
  const session = userResult.data?.session;
  const userId = session?.user?.id;
  await populateUserMultiSelect('editSharedWith', userId, this.supa);
  setupVisibilityHandlers();
  originalOpenEditGalleryModal.call(this);
};

const originalOpenEditFileMetaModal = GalleryApp.prototype.openEditFileMetaModal;
GalleryApp.prototype.openEditFileMetaModal = async function(idx) {
  const userResult = await this.supa.auth.getSession();
  const session = userResult.data?.session;
  const userId = session?.user?.id;
  await populateUserMultiSelect('editFileSharedWith', userId, this.supa);
  setupVisibilityHandlers();
  originalOpenEditFileMetaModal.call(this, idx);
};

// --- Save visibility/shared_with in upload logic ---
// In handleUpload and retryFileUpload, add:
// visibility: ...
// shared_with: ...

document.addEventListener('DOMContentLoaded', function() {
  // Initialize Supabase client
  const supa = supabase.createClient(
    'https://cgvwfhvhuwrzekmiimrr.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNndndmaHZodXdyemVrbWlpbXJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3ODMyNzcsImV4cCI6MjA2NjM1OTI3N30.GfFb9GvLO2gtJszzuRQrn0wVEeJ2VXtvSKVOHrpuFv8'
  );

  // Auth modal logic
  const authModal = document.getElementById('authModal');
  const closeAuthModal = document.getElementById('closeAuthModal');
  const toggleAuthModeBtn = document.getElementById('toggleAuthMode');
  const authForm = document.getElementById('authForm');
  const authModalTitle = document.getElementById('authModalTitle');
  const authSubmitBtn = document.getElementById('authSubmitBtn');

  let isSignInMode = true;

  function openAuthModal() {
    authModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
  function closeAuth() {
    authModal.classList.remove('active');
    document.body.style.overflow = '';
  }
  function toggleAuthMode() {
    isSignInMode = !isSignInMode;
    authModalTitle.textContent = isSignInMode ? 'Sign In' : 'Sign Up';
    authSubmitBtn.textContent = isSignInMode ? 'Sign In' : 'Sign Up';
    toggleAuthModeBtn.textContent = isSignInMode ? 'Switch to Sign Up' : 'Switch to Sign In';
  }

  closeAuthModal.addEventListener('click', closeAuth);
  toggleAuthModeBtn.addEventListener('click', toggleAuthMode);

  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    let result;
    if (isSignInMode) {
      result = await supa.auth.signInWithPassword({ email, password });
    } else {
      result = await supa.auth.signUp({ email, password });
    }
    if (result.error) {
      alert(result.error.message);
    } else {
      alert(isSignInMode ? 'Signed in!' : 'Signed up! Please check your email to confirm.');
      closeAuth();
      checkAuthSession();
    }
  });

  // Show/hide UI based on auth state
  function checkAuthSession() {
    const user = supa.auth.getUser ? supa.auth.getUser() : null;
    // Example: Show upload button only if logged in
    const uploadBtn = document.getElementById('uploadBtn');
    if (user) {
      uploadBtn.style.display = 'block';
    } else {
      uploadBtn.style.display = 'none';
    }
  }

  // Insert Sign In/Up button after DOM is ready
  document.querySelector('.user-actions').insertAdjacentHTML('beforeend', '<button id="openAuthModal" title="Sign In/Up" aria-label="Sign In/Up"><i class="fas fa-sign-in-alt"></i></button>');
  document.getElementById('openAuthModal').addEventListener('click', openAuthModal);
  supa.auth.onAuthStateChange(checkAuthSession);

  // Profile modal logic
  const profileModal = document.getElementById('profileModal');
  const closeProfileModal = document.getElementById('closeProfileModal');
  const signOutBtn = document.getElementById('signOutBtn');
  const profileEmail = document.getElementById('profileEmail');

  // --- Add fetchProfile function ---
  async function fetchProfile() {
    // Get user info
    const userResult = await window.galleryApp.supa.auth.getUser();
    const user = userResult.data?.user;
    if (!user) return;
    // Set email
    profileEmail.textContent = user.email || '-';
    // Fetch profile from Supabase
    const { data: profile, error } = await window.galleryApp.supa
      .from('profiles')
      .select('username, bio, avatar_url')
      .eq('id', user.id)
      .single();
    if (!error && profile) {
      if (window.profileDisplayName) window.profileDisplayName.value = profile.username || '';
      if (window.profileBio) window.profileBio.value = profile.bio || '';
      if (window.profileAvatar) window.profileAvatar.src = profile.avatar_url || '/assets/default-avatar.png';
    } else {
      if (window.profileDisplayName) window.profileDisplayName.value = '';
      if (window.profileBio) window.profileBio.value = '';
      if (window.profileAvatar) window.profileAvatar.src = '/assets/default-avatar.png';
    }
    // Show modal
    profileModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function openProfileModal() {
    supa.auth.getUser().then(({ data }) => {
      profileEmail.textContent = data?.user?.email || '-';
      profileModal.classList.add('active');
      document.body.style.overflow = 'hidden';
    });
  }
  function closeProfile() {
    profileModal.classList.remove('active');
    document.body.style.overflow = '';
  }
  closeProfileModal.addEventListener('click', closeProfile);
  signOutBtn.addEventListener('click', async () => {
    await supa.auth.signOut();
    closeProfile();
    location.reload();
  });

  // Wire up user profile icon to open modal
  document.querySelector('.user-actions button[aria-label="User profile"]').addEventListener('click', openProfileModal);

  // Enable video autoplay after user interaction
  document.addEventListener('click', () => {
    document.body.classList.add('user-interacted');
  }, { once: true });

  // Pass supa to GalleryApp
  const app = new GalleryApp(supa);
  window.galleryApp = app; // Make app globally available

  // Back to top button logic
  const backToTopBtn = document.getElementById('backToTopBtn');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 400) {
      backToTopBtn.style.display = 'flex';
    } else {
      backToTopBtn.style.display = 'none';
    }
  });
  backToTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Media Detail Modal close button
  document.getElementById('closeMediaDetailModal').addEventListener('click', () => {
    window.galleryApp.closeModal(document.getElementById('mediaDetailModal'));
  });

  // ESC key closes any open modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal.active').forEach(modal => {
        window.galleryApp.closeModal(modal);
      });
      document.body.style.overflow = '';
    }
  });

  // Inline validation for upload form
  const uploadForm = document.getElementById('uploadForm');
  if (uploadForm) {
    uploadForm.addEventListener('submit', function(e) {
      let valid = true;
      // Remove previous errors
      uploadForm.querySelectorAll('.form-error').forEach(el => el.remove());
      // Title
      const title = document.getElementById('mediaTitle');
      if (!title.value.trim()) {
        valid = false;
        const err = document.createElement('div');
        err.className = 'form-error';
        err.textContent = 'Title is required.';
        title.parentNode.appendChild(err);
      }
      // Category
      const category = document.getElementById('mediaCategory');
      if (!category.value) {
        valid = false;
        const err = document.createElement('div');
        err.className = 'form-error';
        err.textContent = 'Category is required.';
        category.parentNode.appendChild(err);
      }
      // File
      const file = document.getElementById('fileInput');
      if (!file.files || !file.files.length) {
        valid = false;
        const err = document.createElement('div');
        err.className = 'form-error';
        err.textContent = 'Please select a file.';
        file.parentNode.appendChild(err);
      }
      if (!valid) {
        e.preventDefault();
      }
    });
  }

  // --- Notification Frontend Integration ---
  async function fetchNotifications() {
    const userResult = await window.galleryApp.supa.auth.getSession();
    const session = userResult.data?.session;
    if (!session) return [];
    const res = await fetch('/.netlify/functions/get-notifications', {
      headers: { Authorization: `Bearer ${session.access_token}` }
    });
    if (!res.ok) return [];
    return await res.json();
  }

  async function markNotificationsRead() {
    const userResult = await window.galleryApp.supa.auth.getSession();
    const session = userResult.data?.session;
    if (!session) return;
    await fetch('/.netlify/functions/mark-notifications-read', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` }
    });
  }

  function renderNotifications(notifications) {
    const list = document.getElementById('notificationsList');
    if (!notifications.length) {
      list.innerHTML = '<p>No notifications yet.</p>';
      return;
    }
    list.innerHTML = notifications.map(n => {
      let msg = '';
      if (n.type === 'like') {
        msg = `<strong>${n.data.actor_email}</strong> liked your post.`;
      } else if (n.type === 'comment') {
        msg = `<strong>${n.data.actor_email}</strong> commented: "${n.data.content}"`;
      } else {
        msg = n.type;
      }
      return `<div class="notification-item${n.is_read ? '' : ' unread'}">${msg}<br><small>${new Date(n.created_at).toLocaleString()}</small></div>`;
    }).join('');
  }

  // Show badge for unread notifications
  async function updateNotificationBadge() {
    const notifications = await fetchNotifications();
    const unread = notifications.filter(n => !n.is_read).length;
    const badge = document.querySelector('button[aria-label="Notifications"] .badge');
    if (badge) {
      badge.style.display = unread > 0 ? 'inline-block' : 'none';
      badge.textContent = unread;
    }
  }

  // When notification modal opens, fetch and render notifications, mark as read
  const notificationBtn = document.querySelector('button[aria-label="Notifications"]');
  const notificationModal = document.getElementById('notificationModal');
  if (notificationBtn && notificationModal) {
    notificationBtn.addEventListener('click', async () => {
      const notifications = await fetchNotifications();
      renderNotifications(notifications);
      await markNotificationsRead();
      setTimeout(updateNotificationBadge, 500); // update badge after marking read
    });
  }
  // Update badge on page load and every 60s
  updateNotificationBadge();
  setInterval(updateNotificationBadge, 60000);

  // --- Profile Modal Enhancements ---
  const profileForm = document.getElementById('profileForm');
  const profileAvatar = document.getElementById('profileAvatar');
  const profileAvatarInput = document.getElementById('profileAvatarInput');
  const profileDisplayName = document.getElementById('profileDisplayName');
  const profileBio = document.getElementById('profileBio');

  // Avatar cropper modal elements
  const avatarCropperModal = document.getElementById('avatarCropperModal');
  const avatarCropperImage = document.getElementById('avatarCropperImage');
  const avatarCropperPreview = document.getElementById('avatarCropperPreview');
  const avatarCropperCancel = document.getElementById('avatarCropperCancel');
  const avatarCropperSave = document.getElementById('avatarCropperSave');
  let cropper = null;
  let croppedAvatarBlob = null;

  // Show cropper modal when user selects a new avatar
  profileAvatarInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      avatarCropperImage.src = ev.target.result;
      avatarCropperModal.classList.add('active');
      if (cropper) cropper.destroy();
      cropper = new Cropper(avatarCropperImage, {
        aspectRatio: 1,
        viewMode: 1,
        dragMode: 'move',
        preview: avatarCropperPreview,
        background: false,
        autoCropArea: 1,
        minContainerWidth: 320,
        minContainerHeight: 320,
        ready() {
          cropper.setCropBoxData({ width: 200, height: 200 });
        }
      });
    };
    reader.readAsDataURL(file);
  });

  avatarCropperCancel.addEventListener('click', () => {
    avatarCropperModal.classList.remove('active');
    if (cropper) cropper.destroy();
    cropper = null;
    profileAvatarInput.value = '';
  });

  avatarCropperSave.addEventListener('click', () => {
    if (!cropper) return;
    cropper.getCroppedCanvas({ width: 256, height: 256, imageSmoothingQuality: 'high' }).toBlob(blob => {
      croppedAvatarBlob = blob;
      // Show preview in profile modal
      profileAvatar.src = URL.createObjectURL(blob);
      avatarCropperModal.classList.remove('active');
      cropper.destroy();
      cropper = null;
    }, 'image/png', 0.96);
  });

  // Save profile changes
  profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userResult = await window.galleryApp.supa.auth.getUser();
    const user = userResult.data?.user;
    if (!user) return;
    let avatar_url = profileAvatar.src;
    // If a new avatar is selected and cropped, upload to Supabase Storage
    if (croppedAvatarBlob) {
      const ext = 'png';
      const filePath = `avatars/${user.id}.${ext}`;
      const { data: uploadData, error: uploadError } = await window.galleryApp.supa.storage.from('media').upload(filePath, croppedAvatarBlob, { upsert: true, contentType: 'image/png' });
      if (!uploadError) {
        const { data: urlData } = window.galleryApp.supa.storage.from('media').getPublicUrl(filePath);
        avatar_url = urlData.publicUrl;
      }
      croppedAvatarBlob = null;
    }
    // Upsert profile info
    const { error } = await window.galleryApp.supa
      .from('profiles')
      .upsert({
        id: user.id,
        username: profileDisplayName.value,
        bio: profileBio.value,
        avatar_url
      });
    if (!error) {
      window.galleryApp.showNotification('Profile updated!', 'success');
    } else {
      window.galleryApp.showNotification('Failed to update profile', 'error');
    }
  });

  // Fetch profile info when opening modal
  const openProfileModalBtn = document.querySelector('.user-actions button[aria-label="User profile"]');
  if (openProfileModalBtn) {
    openProfileModalBtn.removeEventListener('click', openProfileModal); // Remove old handler if any
    openProfileModalBtn.addEventListener('click', fetchProfile);
  }

  // After GalleryApp initialization and inside DOMContentLoaded
  const myGalleryBtn = document.getElementById('myGalleryBtn');
  if (myGalleryBtn) {
    myGalleryBtn.addEventListener('click', async () => {
      document.querySelectorAll('.category-filter').forEach(btn => btn.classList.remove('active'));
      myGalleryBtn.classList.add('active');
      // --- Instant feedback: clear gallery and show spinner ---
      const galleryContainer = document.getElementById('galleryContainer');
      const gallerySkeletons = document.getElementById('gallerySkeletons');
      if (galleryContainer) galleryContainer.innerHTML = '';
      if (gallerySkeletons) gallerySkeletons.style.display = 'flex';
      // ---
      const userResult = await window.galleryApp.supa.auth.getUser();
      const user = userResult.data?.user;
      window.galleryApp.galleryManager.page = 1;
      window.galleryApp.galleryManager.allLoaded = false;
      if (user) {
        window.galleryApp.galleryManager.loadFromAPI({ reset: true, userId: user.id });
      } else {
        window.galleryApp.galleryManager.loadFromAPI({ reset: true, userId: null });
      }
    });
  }

  const allMediaBtn = document.getElementById('allMediaBtn');
  if (allMediaBtn) {
    allMediaBtn.addEventListener('click', () => {
      document.querySelectorAll('.category-filter').forEach(btn => btn.classList.remove('active'));
      allMediaBtn.classList.add('active');
      // --- Instant feedback: clear gallery and show spinner ---
      const galleryContainer = document.getElementById('galleryContainer');
      const gallerySkeletons = document.getElementById('gallerySkeletons');
      if (galleryContainer) galleryContainer.innerHTML = '';
      if (gallerySkeletons) gallerySkeletons.style.display = 'flex';
      // ---
      window.galleryApp.galleryManager.page = 1;
      window.galleryApp.galleryManager.allLoaded = false;
      window.galleryApp.galleryManager.loadFromAPI({ reset: true, userId: null });
    });
  }

  const sharedWithMeBtn = document.getElementById('sharedWithMeBtn');
  if (sharedWithMeBtn) {
    sharedWithMeBtn.addEventListener('click', async () => {
      document.querySelectorAll('.category-filter').forEach(btn => btn.classList.remove('active'));
      sharedWithMeBtn.classList.add('active');
      // --- Instant feedback: clear gallery and show spinner ---
      const galleryContainer = document.getElementById('galleryContainer');
      const gallerySkeletons = document.getElementById('gallerySkeletons');
      if (galleryContainer) galleryContainer.innerHTML = '';
      if (gallerySkeletons) gallerySkeletons.style.display = 'flex';
      // ---
      window.galleryApp.galleryManager.page = 1;
      window.galleryApp.galleryManager.allLoaded = false;
      // Load shared-with-me items
      window.galleryApp.galleryManager.loadFromAPI({ reset: true, sharedWithMe: true });
    });
  }

  // Add JSZip and FileSaver via CDN for browser use
  if (!window.JSZip) {
      const jszipScript = document.createElement('script');
      jszipScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      document.head.appendChild(jszipScript);
  }
  if (!window.saveAs) {
      const fileSaverScript = document.createElement('script');
      fileSaverScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js';
      document.head.appendChild(fileSaverScript);
  }
});

// Helper to get selected user IDs from a multi-select
function getSelectedUserIds(selectId) {
  const select = document.getElementById(selectId);
  if (!select) return [];
  return Array.from(select.selectedOptions).map(opt => opt.value);
}