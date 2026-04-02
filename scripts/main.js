document.addEventListener('DOMContentLoaded', function() {
    // --- Theme toggle ---
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const currentTheme = localStorage.getItem('theme') || (prefersDark ? 'dark' : 'light');
        if (currentTheme === 'dark') document.body.classList.add('dark-mode');
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const theme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
            localStorage.setItem('theme', theme);
        });
    }

    // --- Search and filter ---
    const searchInput = document.querySelector('.search-input');
    const searchButton = document.querySelector('.search-btn');
    const categoryFilters = document.querySelectorAll('.category-btn');
    const galleryItems = Array.from(document.querySelectorAll('.gallery-item'));

    function performSearch() {
        const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
        galleryItems.forEach(item => {
            const title = item.querySelector('.caption h3')?.textContent.toLowerCase() || '';
            const description = item.querySelector('.caption p')?.textContent.toLowerCase() || '';
            const category = item.querySelector('.category-tag')?.textContent.toLowerCase() || '';
            const matchesSearch = !searchTerm || title.includes(searchTerm) || description.includes(searchTerm) || category.includes(searchTerm);
            const currentCategory = document.querySelector('.category-btn.active')?.dataset.filter || 'all';
            const matchesCategory = currentCategory === 'all' || category.includes(currentCategory);
            item.style.display = matchesSearch && matchesCategory ? 'block' : 'none';
        });
    }
    if (searchInput) searchInput.addEventListener('input', performSearch);
    if (searchButton) searchButton.addEventListener('click', () => { if (searchInput) searchInput.value = ''; performSearch(); });
    categoryFilters.forEach(btn => btn.addEventListener('click', function() {
        categoryFilters.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        performSearch();
    }));

    // --- Video hover play/pause ---
    document.querySelectorAll('.gallery-item video').forEach(video => {
        video.addEventListener('mouseenter', function() { this.play().catch(() => {}); });
        video.addEventListener('mouseleave', function() { this.pause(); this.currentTime = 0; });
    });

    // --- Upload modal functionality ---
    const uploadBtn = document.getElementById('uploadBtn');
    const uploadModal = document.getElementById('uploadModal');
    const closeModal = document.getElementById('closeModal');
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const uploadPreview = document.getElementById('uploadPreview');
    const videoPreview = document.getElementById('videoPreview');
    const uploadForm = document.getElementById('uploadForm');
    const uploadProgress = document.getElementById('uploadProgress');
    const progressBar = document.getElementById('progressBar');
    const notification = document.getElementById('notification');
    const notificationMessage = document.getElementById('notificationMessage');

    if (uploadBtn && uploadModal) {
        uploadBtn.addEventListener('click', () => {
            uploadModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    }
    function closeUploadModal() {
        if (uploadModal) uploadModal.classList.remove('active');
        document.body.style.overflow = '';
        resetUploadForm();
    }
    if (closeModal) closeModal.addEventListener('click', closeUploadModal);
    if (uploadModal) uploadModal.addEventListener('click', (e) => { if (e.target === uploadModal) closeUploadModal(); });

    function resetUploadForm() {
        if (uploadForm) uploadForm.reset();
        if (uploadPreview) { uploadPreview.style.display = 'none'; uploadPreview.src = ''; }
        if (videoPreview) { videoPreview.style.display = 'none'; videoPreview.src = ''; }
        if (uploadProgress) uploadProgress.style.display = 'none';
        if (progressBar) progressBar.style.width = '0%';
        if (uploadArea) {
            uploadArea.querySelector('.upload-icon').style.display = 'block';
            uploadArea.querySelector('.upload-text').style.display = 'block';
        }
        if (fileInput) fileInput.value = '';
    }

    // --- Enhanced Lightbox functionality ---
    const lightboxModal = document.getElementById('lightboxModal');
    const lightboxClose = document.getElementById('lightboxClose');
    const lightboxImage = document.getElementById('lightboxImage');
    const lightboxVideo = document.getElementById('lightboxVideo');
    const lightboxTitle = document.getElementById('lightboxTitle');
    const lightboxDescription = document.getElementById('lightboxDescription');
    const lightboxCategory = document.getElementById('lightboxCategory');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    let currentIndex = 0;
    let filteredItems = [];

    function openLightbox(index) {
        currentIndex = index;
        if (lightboxModal) {
            lightboxModal.classList.add('active');
            document.body.style.overflow = 'hidden';
            // Removed body blur to prevent affecting lightbox content
            // document.body.classList.add('lightbox-open');
            showItem(currentIndex);
        }
    }

    function closeLightbox() {
        if (lightboxModal) {
            lightboxModal.classList.remove('active');
            document.body.style.overflow = '';
            // Removed body blur to prevent affecting lightbox content
            // document.body.classList.remove('lightbox-open');
            // Pause video if playing
            if (lightboxVideo) {
                lightboxVideo.pause();
                lightboxVideo.currentTime = 0;
            }
        }
    }

    function showItem(index) {
        const items = getVisibleItems();
        if (index < 0 || index >= items.length) return;
        
        const item = items[index];
        const img = item.querySelector('img');
        const vid = item.querySelector('video');
        const title = item.querySelector('.caption h3')?.textContent || '';
        const description = item.querySelector('.caption p')?.textContent || '';
        const category = item.querySelector('.category-tag')?.textContent || '';

        // Hide both media elements initially
        if (lightboxImage) lightboxImage.style.display = 'none';
        if (lightboxVideo) lightboxVideo.style.display = 'none';

        // Update info
        if (lightboxTitle) lightboxTitle.textContent = title;
        if (lightboxDescription) lightboxDescription.textContent = description;
        if (lightboxCategory) lightboxCategory.textContent = category;

        if (img && lightboxImage) {
            // Show image
            lightboxImage.src = img.src;
            lightboxImage.alt = title;
            lightboxImage.onload = () => {
                if (lightboxImage) lightboxImage.style.display = 'block';
            };
            if (lightboxVideo) lightboxVideo.src = '';
        } else if (vid && lightboxVideo) {
            // Show video
            const source = vid.querySelector('source');
            if (source) {
                lightboxVideo.src = source.src;
                lightboxVideo.onloadeddata = () => {
                    if (lightboxVideo) lightboxVideo.style.display = 'block';
                };
            }
            if (lightboxImage) lightboxImage.src = '';
        }
    }

    function getVisibleItems() {
        return Array.from(document.querySelectorAll('.gallery-item')).filter(item => 
            item.style.display !== 'none'
        );
    }

    function navigateLightbox(direction) {
        const items = getVisibleItems();
        if (items.length === 0) return;

        if (direction === 'prev') {
            currentIndex = (currentIndex - 1 + items.length) % items.length;
        } else {
            currentIndex = (currentIndex + 1) % items.length;
        }
        
        showItem(currentIndex);
    }

    // Add click handlers to gallery items
    document.querySelectorAll('.gallery-item').forEach((item, index) => {
        item.addEventListener('click', (e) => {
            // Don't open lightbox if clicking on buttons or checkboxes
            if (e.target.closest('.item-actions') || e.target.closest('.batch-select')) {
                return;
            }
            
            const visibleItems = getVisibleItems();
            const visibleIndex = visibleItems.indexOf(item);
            if (visibleIndex !== -1) {
                openLightbox(visibleIndex);
            }
        });
    });

    // Lightbox navigation
    if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
    if (prevBtn) prevBtn.addEventListener('click', () => navigateLightbox('prev'));
    if (nextBtn) nextBtn.addEventListener('click', () => navigateLightbox('next'));

    // Close lightbox when clicking outside
    if (lightboxModal) {
        lightboxModal.addEventListener('click', (e) => {
            if (e.target === lightboxModal) closeLightbox();
        });
    }

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (!lightboxModal || !lightboxModal.classList.contains('active')) return;
        
        switch(e.key) {
            case 'ArrowLeft':
                navigateLightbox('prev');
                break;
            case 'ArrowRight':
                navigateLightbox('next');
                break;
            case 'Escape':
                closeLightbox();
                break;
        }
    });

    // --- Animate save button ---
    document.querySelectorAll('.save-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            btn.classList.add('clicked');
            setTimeout(() => btn.classList.remove('clicked'), 200);
        });
    });

    // --- Drag-and-drop reordering for gallery items ---
    const gallery = document.querySelector('.gallery');
    let draggedItem = null;
    if (gallery) {
        gallery.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('gallery-item')) {
                draggedItem = e.target;
                e.dataTransfer.effectAllowed = 'move';
                setTimeout(() => draggedItem.classList.add('dragging'), 0);
            }
        });
        gallery.addEventListener('dragend', (e) => {
            if (draggedItem) {
                draggedItem.classList.remove('dragging');
                draggedItem = null;
            }
        });
        gallery.addEventListener('dragover', (e) => {
            if ((uploadModal && uploadModal.classList.contains('active')) ||
                (lightboxModal && lightboxModal.classList.contains('active'))) {
                return;
            }
            e.preventDefault();
            const afterElement = getDragAfterElement(gallery, e.clientY);
            if (afterElement == null) {
                gallery.appendChild(draggedItem);
            } else {
                gallery.insertBefore(draggedItem, afterElement);
            }
        });
        function getDragAfterElement(container, y) {
            const draggableElements = [...container.querySelectorAll('.gallery-item:not(.dragging)')];
            return draggableElements.reduce((closest, child) => {
                const box = child.getBoundingClientRect();
                const offset = y - box.top - box.height / 2;
                if (offset < 0 && offset > closest.offset) {
                    return { offset: offset, element: child };
                } else {
                    return closest;
                }
            }, { offset: -Infinity }).element;
        }
    }

    // --- Infinite scroll loading (simulated) ---
    window.addEventListener('scroll', function() {
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
            const loading = document.getElementById('loading');
            if (loading) loading.style.display = 'block';
            setTimeout(function() {
                if (loading) loading.style.display = 'none';
            }, 1500);
        }
    });

    // --- Notification utility ---
    function showNotification(message, type) {
        if (!notification || !notificationMessage) return;
        notification.className = `notification ${type}`;
        notificationMessage.textContent = message;
        notification.classList.add('show');
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }

    // --- Batch Actions ---
    const batchToolbar = document.getElementById('batchToolbar');
    const batchDelete = document.getElementById('batchDelete');
    const batchDownload = document.getElementById('batchDownload');
    const batchCount = document.getElementById('batchCount');
    const batchSelectAll = document.getElementById('batchSelectAll');

    function updateBatchToolbar() {
        const selected = galleryItems.filter(item => item.querySelector('.batch-select')?.checked && item.style.display !== 'none');
        const visible = galleryItems.filter(item => item.style.display !== 'none');
        
        // Only update toolbar if it exists
        if (batchToolbar) {
            if (selected.length > 0) {
                batchToolbar.style.display = 'flex';
                if (batchCount) batchCount.textContent = `${selected.length} selected`;
                if (batchDelete) batchDelete.disabled = false;
                if (batchDownload) batchDownload.disabled = false;
            } else {
                batchToolbar.style.display = 'none';
                if (batchDelete) batchDelete.disabled = true;
                if (batchDownload) batchDownload.disabled = true;
            }
        }
        
        galleryItems.forEach(item => {
            const checkbox = item.querySelector('.batch-select');
            if (checkbox) {
                if (checkbox.checked) {
                    item.classList.add('selected');
                    checkbox.setAttribute('aria-checked', 'true');
                } else {
                    item.classList.remove('selected');
                    checkbox.setAttribute('aria-checked', 'false');
                }
            }
        });
        
        // Sync select all checkbox (only if it exists)
        if (batchSelectAll) {
            batchSelectAll.checked = visible.length > 0 && selected.length === visible.length;
            batchSelectAll.indeterminate = selected.length > 0 && selected.length < visible.length;
            batchSelectAll.setAttribute('aria-checked', batchSelectAll.checked ? 'true' : (batchSelectAll.indeterminate ? 'mixed' : 'false'));
        }
    }

    if (batchSelectAll) {
        batchSelectAll.addEventListener('change', function() {
            const visible = galleryItems.filter(item => item.style.display !== 'none');
            visible.forEach(item => {
                const checkbox = item.querySelector('.batch-select');
                if (checkbox) checkbox.checked = batchSelectAll.checked;
            });
            updateBatchToolbar();
        });
    }

    galleryItems.forEach(item => {
        const checkbox = item.querySelector('.batch-select');
        if (checkbox) {
            checkbox.addEventListener('change', updateBatchToolbar);
        }
    });

    // After batch delete, update galleryItems array
    if (batchDelete) {
        batchDelete.addEventListener('click', function() {
            if (!confirm('Delete selected items?')) return;
            galleryItems.forEach(item => {
                const checkbox = item.querySelector('.batch-select');
                if (checkbox && checkbox.checked) {
                    item.remove();
                }
            });
            // Remove deleted items from galleryItems array
            for (let i = galleryItems.length - 1; i >= 0; i--) {
                if (!document.body.contains(galleryItems[i])) {
                    galleryItems.splice(i, 1);
                }
            }
            updateBatchToolbar();
        });
    }

    // After batch download, update toolbar (in case items are removed elsewhere)
    if (batchDownload) {
        batchDownload.addEventListener('click', function() {
            galleryItems.forEach(item => {
                const checkbox = item.querySelector('.batch-select');
                if (checkbox && checkbox.checked) {
                    const img = item.querySelector('img');
                    const vid = item.querySelector('video source');
                    if (img) {
                        const link = document.createElement('a');
                        link.href = img.src;
                        link.download = img.alt || 'download';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    } else if (vid) {
                        const link = document.createElement('a');
                        link.href = vid.src;
                        link.download = 'video';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    }
                }
            });
            updateBatchToolbar();
        });
    }

    // Keep toolbar in sync after search/filter
    if (searchInput) searchInput.addEventListener('input', updateBatchToolbar);
    categoryFilters.forEach(btn => btn.addEventListener('click', updateBatchToolbar));

    // Keyboard navigation for batch actions (only if elements exist)
    [batchDelete, batchDownload].forEach(btn => {
        if (btn) {
            btn.setAttribute('tabindex', '0');
            btn.addEventListener('keydown', function(e) {
                if ((e.key === 'Enter' || e.key === ' ') && !btn.disabled) {
                    e.preventDefault();
                    btn.click();
                }
            });
        }
    });

    // --- Editable Gallery Data & Category Management ---
    const galleryContainer = document.getElementById("gallery-container");
    const downloadJSONBtn = document.getElementById("downloadJSONBtn");
    let galleryData = [];
    const categories = ["birds", "pets", "landscape", "night", "video", "uncategorized"];

    async function fetchGalleryData() {
      try {
        const response = await fetch("galleryData.json");
        if (!response.ok) throw new Error("Failed to load gallery data");
        galleryData = await response.json();
        renderGallery();
      } catch (err) {
        if (galleryContainer) galleryContainer.innerHTML = `<div role='alert'>Could not load gallery data.</div>`;
      }
    }

    function renderGallery() {
      if (!galleryContainer) return;
      galleryContainer.innerHTML = "";
      galleryData.forEach((item, index) => {
        const div = document.createElement("div");
        div.className = "gallery-item";
        div.style.marginBottom = "1rem";
        div.style.background = "var(--card-bg, #222)";
        div.style.padding = "1rem";
        div.style.borderRadius = "8px";
        div.setAttribute("tabindex", "0");
        div.setAttribute("aria-label", `Edit ${item.filename}`);
        div.innerHTML = `
          <strong>${item.filename}</strong><br>
          <label>Category:</label>
          <select data-index="${index}" aria-label="Edit category for ${item.filename}">
            ${categories.map(c => `<option value="${c}" ${item.category === c ? "selected" : ""}>${c}</option>`).join("")}
          </select>
          <label style='margin-left:1rem;'>Title:</label>
          <input type='text' data-title-index="${index}" value="${item.title || ''}" aria-label="Edit title for ${item.filename}" style="margin-right:1rem;" />
          <label>Description:</label>
          <input type='text' data-desc-index="${index}" value="${item.description || ''}" aria-label="Edit description for ${item.filename}" />
        `;
        galleryContainer.appendChild(div);
      });
      // Attach change listeners
      galleryContainer.querySelectorAll("select").forEach(select => {
        select.addEventListener("change", function() {
          const idx = parseInt(this.getAttribute("data-index"));
          updateCategory(idx, this.value);
        });
      });
      galleryContainer.querySelectorAll("input[data-title-index]").forEach(input => {
        input.addEventListener("input", function() {
          const idx = parseInt(this.getAttribute("data-title-index"));
          galleryData[idx].title = this.value;
        });
      });
      galleryContainer.querySelectorAll("input[data-desc-index]").forEach(input => {
        input.addEventListener("input", function() {
          const idx = parseInt(this.getAttribute("data-desc-index"));
          galleryData[idx].description = this.value;
        });
      });
    }

    function updateCategory(index, newCategory) {
      galleryData[index].category = newCategory;
    }

    function downloadJSON() {
      const blob = new Blob([JSON.stringify(galleryData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "media_categories.json";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }

    if (downloadJSONBtn) {
      downloadJSONBtn.addEventListener("click", downloadJSON);
    }
    fetchGalleryData();

    // Add category dropdown to each gallery card
    galleryItems.forEach(item => {
        const tag = item.querySelector('.category-tag');
        if (tag && !item.querySelector('.category-dropdown')) {
            // Make tag clickable
            tag.setAttribute('tabindex', '0');
            tag.setAttribute('role', 'button');
            tag.setAttribute('aria-label', 'Change category');
            
            // Create dropdown
            const dropdown = document.createElement('div');
            dropdown.className = 'category-dropdown';
            
            // Define available categories
            const categories = ['Pets', 'Beaches', 'Sunrise', 'Art', 'Video', 'Uncategorized'];
            
            categories.forEach(cat => {
                const opt = document.createElement('button');
                opt.className = 'category-option';
                opt.textContent = cat;
                opt.setAttribute('data-category', cat.toLowerCase());
                
                // Mark current category as active
                if (item.getAttribute('data-category') === cat.toLowerCase() || 
                    (cat === 'Video' && item.getAttribute('data-category') === 'video')) {
                    opt.classList.add('active');
                }
                
                dropdown.appendChild(opt);
            });
            
            // Add dropdown directly to the category tag for perfect positioning
            tag.style.position = 'relative';
            tag.appendChild(dropdown);
            
            // Toggle dropdown function
            function toggleDropdown(e) {
                e.stopPropagation();
                
                // Close all other dropdowns
                document.querySelectorAll('.category-dropdown.open').forEach(d => {
                    if (d !== dropdown) {
                        d.classList.remove('open');
                        d.previousElementSibling?.classList.remove('active');
                    }
                });
                
                // Toggle current dropdown
                dropdown.classList.toggle('open');
                tag.classList.toggle('active');
                
                // Focus first option if opening
                if (dropdown.classList.contains('open')) {
                    const firstOpt = dropdown.querySelector('.category-option');
                    if (firstOpt) firstOpt.focus();
                }
            }
            
            // Event listeners for tag
            tag.addEventListener('click', toggleDropdown);
            tag.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleDropdown(e);
                }
            });
            
            // Category selection
            dropdown.querySelectorAll('.category-option').forEach(opt => {
                opt.addEventListener('click', function(e) {
                    e.stopPropagation();
                    
                    const newCategory = this.getAttribute('data-category');
                    
                    // Update item data
                    item.setAttribute('data-category', newCategory);
                    
                    // Update tag text (remove dropdown arrow from display)
                    const displayText = this.textContent;
                    tag.innerHTML = displayText;
                    
                    // Update tag data attribute
                    tag.setAttribute('data-category', newCategory);
                    
                    // Update dropdown active state
                    dropdown.querySelectorAll('.category-option').forEach(o => o.classList.remove('active'));
                    this.classList.add('active');
                    
                    // Close dropdown
                    dropdown.classList.remove('open');
                    tag.classList.remove('active');
                    
                    // Re-add dropdown arrow
                    tag.innerHTML = displayText + '<span style="margin-left: 0.3rem; font-size: 0.6rem;">▼</span>';
                    
                    // Update gallery data if available
                    const filename = item.querySelector('img, video source')?.getAttribute('src')?.split('/').pop();
                    if (filename && galleryData) {
                        const entry = galleryData.find(g => g.filename === filename);
                        if (entry) entry.category = newCategory;
                    }
                    
                    // Trigger search/filter update
                    performSearch();
                });
            });
            
            // Close dropdown on outside click
            document.addEventListener('click', function(e) {
                if (!dropdown.contains(e.target) && e.target !== tag) {
                    dropdown.classList.remove('open');
                    tag.classList.remove('active');
                }
            });
            
            // Close dropdown on Escape
            dropdown.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    dropdown.classList.remove('open');
                    tag.classList.remove('active');
                }
            });
        }
    });
});