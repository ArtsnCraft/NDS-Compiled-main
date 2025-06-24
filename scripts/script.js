// NOTE: For local development, run a local server (e.g., `netlify dev`, `npm run serve`, or similar). Do NOT open index.html directly via file://

// Gallery data management
class GalleryManager {
    constructor() {
        this.galleryItems = [];
        this.loadFromAPI();
        this.initCurrentYear();
    }

    initCurrentYear() {
        document.getElementById('currentYear').textContent = new Date().getFullYear();
    }

    async loadFromAPI() {
        try {
            const response = await fetch('/.netlify/functions/get-gallery');
            const items = await response.json();
            this.galleryItems = items;
            this.renderGallery();
        } catch (error) {
            console.error('Failed to load gallery items:', error);
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
                <div class="item-actions">
                    <button class="action-btn" aria-label="Like"><i class="fas fa-heart"></i> Like</button>
                    <button class="action-btn" aria-label="Share"><i class="fas fa-share"></i> Share</button>
                    <button class="save-btn" aria-label="Save">Save</button>
                </div>
            `;

            galleryContainer.appendChild(galleryItem);
        });

        this.setupVideoHover();
    }

    setupVideoHover() {
        const videos = document.querySelectorAll('.gallery-item video');
        
        videos.forEach(video => {
            video.addEventListener('mouseenter', function() {
                this.play().catch(e => console.log('Autoplay prevented:', e));
            });
            
            video.addEventListener('mouseleave', function() {
                this.pause();
                this.currentTime = 0;
            });
        });
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

    handleScroll() {
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
            document.getElementById('loading').style.display = 'block';
            
            // In a real app, you would fetch more content here
            setTimeout(() => {
                document.getElementById('loading').style.display = 'none';
            }, 1500);
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

  // Initialize the rest of the app
  new GalleryApp(supa);
});