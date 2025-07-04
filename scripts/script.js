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
        this.loadFromAPI();
        this.initCurrentYear();
    }

    initCurrentYear() {
        document.getElementById('currentYear').textContent = new Date().getFullYear();
    }

    async loadFromAPI({ append = false, reset = false, userId = undefined } = {}) {
        if (this.loadingMore || this.allLoaded) return;
        this.loadingMore = true;
        const galleryContainer = document.getElementById('galleryContainer');
        if (galleryContainer) galleryContainer.classList.add('fading');
        document.getElementById('loading').style.display = 'block';
        document.getElementById('gallerySkeletons').style.display = 'flex';
        this.showSkeletons();
        document.getElementById('endMessage').style.display = 'none';

        if (reset) {
            this.page = 1;
            this.allLoaded = false;
            this.galleryItems = [];
            this.userId = userId !== undefined ? userId : null;
        }
        if (userId !== undefined) this.userId = userId;

        try {
            let url = `/.netlify/functions/get-gallery?page=${this.page}&pageSize=${this.pageSize}`;
            if (this.userId) url += `&user_id=${this.userId}`;
            const response = await fetch(url);
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
        } catch (error) {
            console.error('Failed to load gallery items:', error);
        } finally {
            document.getElementById('loading').style.display = 'none';
            document.getElementById('gallerySkeletons').style.display = 'none';
            this.loadingMore = false;
            this.hideSkeletons();
            if (this.allLoaded) {
                document.getElementById('endMessage').style.display = 'block';
            }
            if (galleryContainer) {
                setTimeout(() => galleryContainer.classList.remove('fading'), 250);
            }
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
            
            galleryItem.innerHTML = `
                <div class="image-wrapper">
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

            // Make the card clickable and keyboard accessible
            galleryItem.addEventListener('click', (e) => {
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
            uploadArea.addEventListener(eventName, this.highlightUploadArea);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, this.unhighlightUploadArea);
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
        const file = event.target.files[0];
        if (!file) return;

        // Hide the upload icon and text
        document.querySelector('.upload-icon').style.display = 'none';
        document.querySelector('.upload-text').style.display = 'none';

        if (file.type.startsWith('image/')) {
            document.getElementById('videoPreview').style.display = 'none';
            document.getElementById('videoPreview').src = '';
            
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById('uploadPreview').src = e.target.result;
                document.getElementById('uploadPreview').style.display = 'block';
                this.scrollModalToBottom();
            };
            reader.readAsDataURL(file);
        } else if (file.type.startsWith('video/')) {
            document.getElementById('uploadPreview').style.display = 'none';
            document.getElementById('uploadPreview').src = '';
            
            document.getElementById('videoPreview').src = URL.createObjectURL(file);
            document.getElementById('videoPreview').style.display = 'block';
            this.scrollModalToBottom();
        }
    }

    scrollModalToBottom() {
        setTimeout(() => {
            const modalContent = document.querySelector('.modal-content');
            modalContent.scrollTop = modalContent.scrollHeight;
        }, 100);
    }

    async handleUpload(e) {
        e.preventDefault();

        const fileInput = document.getElementById('fileInput');
        const file = fileInput.files[0];
        if (!file) {
            this.showNotification('Please select a file to upload', 'error');
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

        // Show progress bar
        const uploadProgress = document.getElementById('uploadProgress');
        const progressBar = document.getElementById('progressBar');
        uploadProgress.style.display = 'block';
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 10;
            if (progress > 90) progress = 90;
            progressBar.style.width = `${progress}%`;
        }, 200);

        try {
            // Upload file to Supabase Storage
            const fileExt = file.name.split('.').pop();
            const filePath = `${Date.now()}_${Math.random().toString(36).substr(2)}.${fileExt}`;
            const { data: uploadData, error: uploadError } = await this.supa.storage.from('media').upload(filePath, file);
            if (uploadError) {
                clearInterval(interval);
                this.showNotification('File upload failed: ' + uploadError.message, 'error');
                return;
            }
            // Get public URL
            const { data: urlData } = this.supa.storage.from('media').getPublicUrl(filePath);
            const publicURL = urlData.publicUrl;

            // Prepare metadata
            const newItem = {
                type: file.type.startsWith('image/') ? 'image' : 'video',
                src: publicURL,
                title: document.getElementById('mediaTitle').value,
                description: document.getElementById('mediaDescription').value,
                category: document.getElementById('mediaCategory').value,
                tags: document.getElementById('mediaTags').value.split(',').map(tag => tag.trim()),
                user_id: session.user.id
            };

            // Save metadata to DB via Netlify Function
            const response = await fetch('/.netlify/functions/upload-gallery', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify(newItem)
            });
            clearInterval(interval);
            progressBar.style.width = '100%';
            if (!response.ok) {
                this.showNotification('Upload failed: ' + (await response.text()), 'error');
                return;
            }
            this.showNotification('Media uploaded successfully!', 'success');
            this.resetUploadForm();
            // Optionally reload gallery
            this.galleryManager.loadFromAPI();
        } catch (error) {
            clearInterval(interval);
            this.showNotification('Upload failed. Please try again.', 'error');
            console.error('Upload error:', error);
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
        
        // Create a more natural image display that respects the image's aspect ratio
        const isVideo = item.type === 'video';
        const mediaElement = isVideo ? 
            `<video controls style='max-width:100%; max-height:60vh; border-radius:12px; object-fit:contain;' loading='lazy'>
                <source src='${item.src}' type='video/mp4'>
            </video>` :
            `<img src='${item.src}' alt='${item.title}' style='max-width:100%; max-height:60vh; border-radius:12px; object-fit:contain;' loading='lazy'>`;
        
        body.innerHTML = `
            <div class="media-container">
                ${mediaElement}
            </div>
        `;
        
        // Add navigation arrows
        this.addNavigationArrows(modal, item);
        
        this.openModal(modal);
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
}

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
      window.galleryApp.galleryManager.page = 1;
      window.galleryApp.galleryManager.allLoaded = false;
      window.galleryApp.galleryManager.loadFromAPI({ reset: true, userId: null });
    });
  }
});