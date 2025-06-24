// Gallery data management
class GalleryManager {
    constructor() {
        this.galleryItems = [];
        this.loadFromLocalStorage();
        this.initCurrentYear();
    }

    initCurrentYear() {
        document.getElementById('currentYear').textContent = new Date().getFullYear();
    }

    loadFromLocalStorage() {
        const savedItems = localStorage.getItem('galleryItems');
        if (savedItems) {
            this.galleryItems = JSON.parse(savedItems);
            this.renderGallery();
        } else {
            // Load initial demo data
            this.galleryItems = [
                {
                    id: this.generateId(),
                    type: 'video',
                    src: 'created/Bootgram vid(6).mp4',
                    title: 'Beautiful pets',
                    description: 'Time-lapse of a girl\'s pet',
                    category: 'video',
                    tags: ['pet', 'cute', 'animal']
                },
                {
                    id: this.generateId(),
                    type: 'video',
                    src: 'created/Bird (1).mp4',
                    title: 'Beautiful Sunset',
                    description: 'Time-lapse of sunset over mountains with birds',
                    category: 'video',
                    tags: ['sunset', 'birds', 'nature']
                },
                {
                    id: this.generateId(),
                    type: 'video',
                    src: 'created/Bootgram vid(1).mp4',
                    title: 'Beautiful pet',
                    description: 'Time-lapse of a girl\'s pet',
                    category: 'video',
                    tags: ['pet', 'animal']
                },
                {
                    id: this.generateId(),
                    type: 'image',
                    src: 'created/-Pets121 (25).jpg',
                    title: 'Rolling Green Hills',
                    description: 'Endless fields under blue skies',
                    category: 'landscape',
                    tags: ['nature', 'landscape', 'hills']
                }
            ];
            this.saveToLocalStorage();
            this.renderGallery();
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
    constructor() {
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
        
        // Show progress bar
        const uploadProgress = document.getElementById('uploadProgress');
        const progressBar = document.getElementById('progressBar');
        uploadProgress.style.display = 'block';
        
        // Simulate upload progress
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 10;
            if (progress > 90) progress = 90;
            progressBar.style.width = `${progress}%`;
        }, 200);
        
        try {
            // In a real app, you would upload to a server here
            // For demo, we'll simulate the upload
            await new Promise(resolve => setTimeout(resolve, 2000));
            clearInterval(interval);
            progressBar.style.width = '100%';
            
            // Create a URL for the uploaded file (in a real app, this would be the server response)
            const fileUrl = file.type.startsWith('image/') ? 
                URL.createObjectURL(file) : 
                file.type.startsWith('video/') ? 
                URL.createObjectURL(file) : 
                '';
            
            // Create new gallery item
            const newItem = {
                id: this.galleryManager.generateId(),
                type: file.type.startsWith('image/') ? 'image' : 'video',
                src: fileUrl,
                title: document.getElementById('mediaTitle').value,
                description: document.getElementById('mediaDescription').value,
                category: document.getElementById('mediaCategory').value,
                tags: document.getElementById('mediaTags').value.split(',').map(tag => tag.trim())
            };
            
            // Add to gallery
            this.galleryManager.addItem(newItem);
            
            // Show success notification
            this.showNotification('Media uploaded successfully!', 'success');
            
            // Reset form but keep modal open
            this.resetUploadForm();
            
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

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new GalleryApp();
});