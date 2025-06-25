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
        document.getElementById('loading').style.display = 'block';

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
            this.loadingMore = false;
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
        galleryContainer.innerHTML = '';

        this.galleryItems.forEach(item => {
            const galleryItem = document.createElement('article');
            galleryItem.className = 'gallery-item';
            galleryItem.dataset.category = item.category;
            galleryItem.dataset.tags = item.tags.join(',');
            galleryItem.dataset.id = item.id;

            const isVideo = item.type === 'video';
            
            galleryItem.innerHTML = `
                <div class="image-wrapper">
                    <span class="category-tag">${item.category}</span>
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
        
        searchInput.addEventListener('input', () => this.performSearch());
        searchButton.addEventListener('click', () => {
            searchInput.value = '';
            this.performSearch();
        });
        
        categoryFilters.forEach(btn => {
            btn.addEventListener('click', () => this.filterByCategory(btn));
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
            document.getElementById('notificationModal').classList.add('active');
            document.body.style.overflow = 'hidden';
        });
        document.getElementById('closeNotificationModal').addEventListener('click', () => {
            document.getElementById('notificationModal').classList.remove('active');
            document.body.style.overflow = '';
        });
    }

    performSearch() {
        const searchInput = document.querySelector('.search-bar input');
        const searchTerm = searchInput.value.toLowerCase().trim();
        const galleryItems = document.querySelectorAll('.gallery-item');
        
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
        document.getElementById('uploadModal').classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeUploadModal() {
        document.getElementById('uploadModal').classList.remove('active');
        document.body.style.overflow = '';
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
        const userResult = await this.supa.auth.getUser();
        const user = userResult.data?.user;
        if (!user) {
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
                user_id: user.id
            };

            // Save metadata to DB via Netlify Function
            const response = await fetch('/.netlify/functions/upload-gallery', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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

    showNotification(message, type) {
        const notification = document.getElementById('notification');
        const notificationMessage = document.getElementById('notificationMessage');
        
        notification.className = `notification ${type}`;
        notificationMessage.textContent = message;
        notification.classList.add('show');
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
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
        document.getElementById('commentsModal').classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeCommentsModal() {
        document.getElementById('commentsModal').classList.remove('active');
        document.body.style.overflow = '';
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
}

document.addEventListener('DOMContentLoaded', () => {
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

  // Add gallery filter buttons to the UI
  const filterBar = document.createElement('div');
  filterBar.className = 'gallery-filter-bar';
  filterBar.innerHTML = `
    <button id="allMediaBtn" class="gallery-filter-btn active">All Media</button>
    <button id="myGalleryBtn" class="gallery-filter-btn">My Gallery</button>
  `;
  document.querySelector('main').insertAdjacentElement('beforebegin', filterBar);

  // Profile modal logic
  const profileModal = document.getElementById('profileModal');
  const closeProfileModal = document.getElementById('closeProfileModal');
  const signOutBtn = document.getElementById('signOutBtn');
  const profileEmail = document.getElementById('profileEmail');

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

  // Wire up filter buttons
  document.getElementById('allMediaBtn').addEventListener('click', () => {
    document.getElementById('allMediaBtn').classList.add('active');
    document.getElementById('myGalleryBtn').classList.remove('active');
    app.galleryManager.page = 1;
    app.galleryManager.allLoaded = false;
    app.galleryManager.loadFromAPI({ reset: true, userId: null });
  });
  document.getElementById('myGalleryBtn').addEventListener('click', async () => {
    document.getElementById('myGalleryBtn').classList.add('active');
    document.getElementById('allMediaBtn').classList.remove('active');
    const userResult = await supa.auth.getUser();
    const user = userResult.data?.user;
    app.galleryManager.page = 1;
    app.galleryManager.allLoaded = false;
    if (user) {
      app.galleryManager.loadFromAPI({ reset: true, userId: user.id });
    } else {
      app.galleryManager.loadFromAPI({ reset: true, userId: null });
    }
  });
});