/**
 * Dashboard functionality for PDF Tool
 * Handles file management, uploads, and operations
 */

const Dashboard = {
    files: [],
    selectedFiles: new Set(),
    
    // Initialize dashboard
    init() {
        this.setupFileUpload();
        this.loadFiles();
        this.setupEventListeners();
        console.log('Dashboard initialized');
    },
    
    // Setup file upload functionality
    setupFileUpload() {
        const uploadArea = document.getElementById('dashboard-upload');
        const fileInput = document.getElementById('dashboard-files');
        
        if (!uploadArea || !fileInput) return;
        
        // Click to upload
        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });
        
        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            
            const files = Array.from(e.dataTransfer.files);
            this.uploadFiles(files);
        });
        
        // File input change
        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            this.uploadFiles(files);
        });
    },
    
    // Upload files to server
    async uploadFiles(files) {
        const progressContainer = document.getElementById('upload-progress');
        const progressBar = document.getElementById('progress-bar');
        const progressText = document.getElementById('progress-text');
        
        // Validate files
        const validFiles = [];
        for (const file of files) {
            const validation = App.validateFile(file);
            if (validation.valid) {
                validFiles.push(file);
            } else {
                App.showToast(validation.error, 'error');
            }
        }
        
        if (validFiles.length === 0) return;
        
        // Show progress
        progressContainer.style.display = 'block';
        progressBar.style.width = '0%';
        progressText.textContent = 'Uploading files...';
        
        try {
            for (let i = 0; i < validFiles.length; i++) {
                const file = validFiles[i];
                const formData = new FormData();
                formData.append('file', file);
                
                progressText.textContent = `Uploading ${file.name}...`;
                
                const response = await fetch('/pdf/upload', {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    App.showToast(`${file.name} uploaded successfully`, 'success');
                } else {
                    App.showToast(`Failed to upload ${file.name}: ${data.error}`, 'error');
                }
                
                // Update progress
                const progress = ((i + 1) / validFiles.length) * 100;
                progressBar.style.width = `${progress}%`;
            }
            
            // Refresh file list
            await this.loadFiles();
            
        } catch (error) {
            console.error('Upload error:', error);
            App.showToast('Upload failed', 'error');
        } finally {
            // Hide progress
            setTimeout(() => {
                progressContainer.style.display = 'none';
            }, 1000);
        }
    },
    
    // Load files from server
    async loadFiles() {
        const container = document.getElementById('files-container');
        if (!container) return;
        
        try {
            const response = await fetch('/pdf/api/files');
            const files = await response.json();
            
            this.files = files;
            this.renderFiles(container);
            
        } catch (error) {
            console.error('Error loading files:', error);
            container.innerHTML = `
                <div class="alert alert--error">
                    <i class="ri-error-warning-line"></i>
                    Failed to load files. Please refresh the page.
                </div>
            `;
        }
    },
    
    // Render files in the container
    renderFiles(container) {
        if (this.files.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="ri-file-pdf-line empty-state__icon"></i>
                    <h3 class="empty-state__title">No files yet</h3>
                    <p class="empty-state__text">Upload your first PDF file to get started</p>
                </div>
            `;
            return;
        }
        
        let html = '<div class="files__grid">';
        
        this.files.forEach(file => {
            const isSelected = this.selectedFiles.has(file.id);
            html += `
                <div class="file__card ${isSelected ? 'file__card--selected' : ''}" data-id="${file.id}">
                    <div class="file__header">
                        <i class="ri-file-pdf-line file__icon"></i>
                        <div class="file__checkbox">
                            <input type="checkbox" id="file-${file.id}" ${isSelected ? 'checked' : ''} 
                                   onchange="Dashboard.toggleFileSelection('${file.id}')">
                            <label for="file-${file.id}" class="sr-only">Select ${file.filename}</label>
                        </div>
                    </div>
                    
                    <div class="file__content">
                        <h3 class="file__name" title="${file.filename}">${file.filename}</h3>
                        <div class="file__meta">
                            <span class="file__size">${App.formatFileSize(file.filesize || 0)}</span>
                            ${file.page_count ? `<span class="file__pages">${file.page_count} pages</span>` : ''}
                            <span class="file__date">${this.formatDate(file.created_at)}</span>
                        </div>
                    </div>
                    
                    <div class="file__actions">
                        <button class="btn btn--outline btn--sm" onclick="Dashboard.downloadFile('${file.id}')">
                            <i class="ri-download-line"></i>
                        </button>
                        <button class="btn btn--outline btn--sm" onclick="Dashboard.showFileMenu('${file.id}', event)">
                            <i class="ri-more-line"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        
        // Add bulk actions if files are selected
        if (this.selectedFiles.size > 0) {
            html += this.getBulkActionsHTML();
        }
        
        container.innerHTML = html;
    },
    
    // Get bulk actions HTML
    getBulkActionsHTML() {
        return `
            <div class="bulk-actions">
                <div class="bulk-actions__header">
                    <h3>${this.selectedFiles.size} file(s) selected</h3>
                    <button class="btn btn--outline btn--sm" onclick="Dashboard.clearSelection()">
                        Clear Selection
                    </button>
                </div>
                
                <div class="bulk-actions__buttons">
                    <button class="btn btn--primary" onclick="Dashboard.mergeSelected()" 
                            ${this.selectedFiles.size < 2 ? 'disabled' : ''}>
                        <i class="ri-file-copy-line"></i>
                        Merge Selected
                    </button>
                    <button class="btn btn--danger" onclick="Dashboard.deleteSelected()">
                        <i class="ri-delete-bin-line"></i>
                        Delete Selected
                    </button>
                </div>
            </div>
        `;
    },
    
    // Setup event listeners
    setupEventListeners() {
        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + A to select all files
            if ((e.ctrlKey || e.metaKey) && e.key === 'a' && this.files.length > 0) {
                e.preventDefault();
                this.selectAllFiles();
            }
            
            // Delete key to delete selected files
            if (e.key === 'Delete' && this.selectedFiles.size > 0) {
                this.deleteSelected();
            }
        });
    },
    
    // Toggle file selection
    toggleFileSelection(fileId) {
        if (this.selectedFiles.has(fileId)) {
            this.selectedFiles.delete(fileId);
        } else {
            this.selectedFiles.add(fileId);
        }
        
        // Re-render files to update UI
        const container = document.getElementById('files-container');
        this.renderFiles(container);
    },
    
    // Select all files
    selectAllFiles() {
        this.files.forEach(file => {
            this.selectedFiles.add(file.id);
        });
        
        const container = document.getElementById('files-container');
        this.renderFiles(container);
    },
    
    // Clear selection
    clearSelection() {
        this.selectedFiles.clear();
        const container = document.getElementById('files-container');
        this.renderFiles(container);
    },
    
    // Download file
    downloadFile(fileId) {
        window.location.href = `/pdf/download/${fileId}`;
    },
    
    // Show file context menu
    showFileMenu(fileId, event) {
        event.stopPropagation();
        
        // Create context menu
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.innerHTML = `
            <button class="context-menu__item" onclick="Dashboard.extractText('${fileId}')">
                <i class="ri-text"></i>
                Extract Text
            </button>
            <button class="context-menu__item" onclick="Dashboard.splitFile('${fileId}')">
                <i class="ri-scissors-line"></i>
                Split PDF
            </button>
            <button class="context-menu__item" onclick="Dashboard.rotateFile('${fileId}')">
                <i class="ri-refresh-line"></i>
                Rotate PDF
            </button>
            <button class="context-menu__item context-menu__item--danger" onclick="Dashboard.deleteFile('${fileId}')">
                <i class="ri-delete-bin-line"></i>
                Delete
            </button>
        `;
        
        // Position menu
        menu.style.position = 'fixed';
        menu.style.top = `${event.clientY}px`;
        menu.style.left = `${event.clientX}px`;
        menu.style.zIndex = '1000';
        
        document.body.appendChild(menu);
        
        // Remove menu when clicking outside
        const removeMenu = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', removeMenu);
            }
        };
        
        setTimeout(() => {
            document.addEventListener('click', removeMenu);
        }, 10);
    },
    
    // Extract text from file
    async extractText(fileId) {
        try {
            const response = await fetch(`/pdf/extract_text/${fileId}`);
            const data = await response.json();
            
            if (response.ok) {
                App.showToast('Text extracted successfully', 'success');
                if (data.download_url) {
                    window.location.href = data.download_url;
                }
            } else {
                App.showToast(data.error || 'Failed to extract text', 'error');
            }
        } catch (error) {
            App.showToast('Error extracting text', 'error');
        }
    },
    
    // Split file
    async splitFile(fileId) {
        if (!confirm('This will split the PDF into individual pages. Continue?')) {
            return;
        }
        
        try {
            const response = await fetch(`/pdf/split/${fileId}`, {
                method: 'POST'
            });
            const data = await response.json();
            
            if (response.ok) {
                App.showToast(`PDF split into ${data.file_ids.length} pages`, 'success');
                this.loadFiles();
            } else {
                App.showToast(data.error || 'Failed to split PDF', 'error');
            }
        } catch (error) {
            App.showToast('Error splitting PDF', 'error');
        }
    },
    
    // Rotate file
    async rotateFile(fileId) {
        const angle = prompt('Enter rotation angle (90, 180, or 270):', '90');
        if (!angle) return;
        
        const parsedAngle = parseInt(angle);
        if (![90, 180, 270].includes(parsedAngle)) {
            App.showToast('Please enter a valid rotation angle (90, 180, or 270)', 'error');
            return;
        }
        
        try {
            const response = await fetch(`/pdf/rotate/${fileId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    rotation_angle: parsedAngle
                })
            });
            const data = await response.json();
            
            if (response.ok) {
                App.showToast('PDF rotated successfully', 'success');
                if (data.download_url) {
                    window.location.href = data.download_url;
                }
            } else {
                App.showToast(data.error || 'Failed to rotate PDF', 'error');
            }
        } catch (error) {
            App.showToast('Error rotating PDF', 'error');
        }
    },
    
    // Delete single file
    async deleteFile(fileId) {
        if (!confirm('Are you sure you want to delete this file?')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/files/${fileId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                App.showToast('File deleted successfully', 'success');
                this.loadFiles();
            } else {
                App.showToast('Failed to delete file', 'error');
            }
        } catch (error) {
            App.showToast('Error deleting file', 'error');
        }
    },
    
    // Merge selected files
    async mergeSelected() {
        if (this.selectedFiles.size < 2) {
            App.showToast('Please select at least 2 files to merge', 'error');
            return;
        }
        
        try {
            const response = await fetch('/pdf/merge', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    file_ids: Array.from(this.selectedFiles)
                })
            });
            const data = await response.json();
            
            if (response.ok) {
                App.showToast('Files merged successfully', 'success');
                if (data.download_url) {
                    window.location.href = data.download_url;
                }
                this.clearSelection();
                this.loadFiles();
            } else {
                App.showToast(data.error || 'Failed to merge files', 'error');
            }
        } catch (error) {
            App.showToast('Error merging files', 'error');
        }
    },
    
    // Delete selected files
    async deleteSelected() {
        if (this.selectedFiles.size === 0) return;
        
        const count = this.selectedFiles.size;
        if (!confirm(`Are you sure you want to delete ${count} file(s)?`)) {
            return;
        }
        
        try {
            const promises = Array.from(this.selectedFiles).map(fileId =>
                fetch(`/api/files/${fileId}`, { method: 'DELETE' })
            );
            
            await Promise.all(promises);
            
            App.showToast(`${count} file(s) deleted successfully`, 'success');
            this.clearSelection();
            this.loadFiles();
            
        } catch (error) {
            App.showToast('Error deleting files', 'error');
        }
    },
    
    // Refresh files
    async refreshFiles() {
        await this.loadFiles();
        App.showToast('Files refreshed', 'success');
    },
    
    // Format date
    formatDate(dateString) {
        if (!dateString) return 'Unknown';
        
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
            return 'Today';
        } else if (diffDays === 2) {
            return 'Yesterday';
        } else if (diffDays <= 7) {
            return `${diffDays - 1} days ago`;
        } else {
            return date.toLocaleDateString();
        }
    }
};

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    Dashboard.init();
});

// Make Dashboard available globally
window.Dashboard = Dashboard;