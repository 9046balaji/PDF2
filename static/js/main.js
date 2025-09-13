/**
 * Main JavaScript file for PDF Tool application
 * Handles navigation, modals, and core functionality
 */

// Global application state
const App = {
    state: {
        currentUser: null,
        isAuthenticated: false,
        selectedFiles: new Map(),
        currentTool: null
    },
    
    // Initialize the application
    init() {
        this.setupNavigation();
        this.setupModals();
        this.setupFileUpload();
        this.checkAuthStatus();
        this.setupEventListeners();
        console.log('PDF Tool application initialized');
    },
    
    // Setup navigation functionality
    setupNavigation() {
        const navToggle = document.getElementById('nav-toggle');
        const navMenu = document.getElementById('nav-menu');
        
        if (navToggle && navMenu) {
            navToggle.addEventListener('click', () => {
                navMenu.classList.toggle('active');
                
                // Update ARIA attributes
                const isOpen = navMenu.classList.contains('active');
                navToggle.setAttribute('aria-expanded', isOpen);
                
                // Change icon
                const icon = navToggle.querySelector('i');
                if (icon) {
                    icon.className = isOpen ? 'ri-close-line' : 'ri-menu-line';
                }
            });
            
            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!navMenu.contains(e.target) && !navToggle.contains(e.target)) {
                    navMenu.classList.remove('active');
                    navToggle.setAttribute('aria-expanded', 'false');
                    const icon = navToggle.querySelector('i');
                    if (icon) icon.className = 'ri-menu-line';
                }
            });
        }
    },
    
    // Setup modal functionality
    setupModals() {
        const modal = document.getElementById('pdf-tool-modal');
        const modalClose = document.getElementById('modal-close');
        
        if (modalClose && modal) {
            modalClose.addEventListener('click', () => {
                this.closeModal();
            });
            
            // Close modal when clicking outside
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal();
                }
            });
            
            // Close modal with Escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && modal.classList.contains('active')) {
                    this.closeModal();
                }
            });
        }
    },
    
    // Setup file upload functionality
    setupFileUpload() {
        // This will be enhanced by pdf-tools.js
        console.log('File upload setup initialized');
    },
    
    // Check authentication status
    async checkAuthStatus() {
        try {
            const response = await fetch('/api/auth/status');
            if (response.ok) {
                const data = await response.json();
                this.state.isAuthenticated = data.authenticated;
                this.state.currentUser = data.user;
                this.updateAuthUI();
            }
        } catch (error) {
            console.warn('Could not check auth status:', error);
            this.updateAuthUI();
        }
    },
    
    // Update authentication UI
    updateAuthUI() {
        const authContainer = document.getElementById('nav-auth');
        if (!authContainer) return;
        
        if (this.state.isAuthenticated && this.state.currentUser) {
            authContainer.innerHTML = `
                <span class="nav__user">Welcome, ${this.state.currentUser.username}</span>
                <button class="btn btn--outline btn--sm" onclick="App.logout()">
                    <i class="ri-logout-line"></i>
                    Logout
                </button>
            `;
        } else {
            authContainer.innerHTML = `
                <a href="/login" class="nav__link">Login</a>
                <a href="/register" class="btn btn--primary btn--sm">Register</a>
            `;
        }
    },
    
    // Setup global event listeners
    setupEventListeners() {
        // Handle tool card clicks
        document.querySelectorAll('.feature__card').forEach(card => {
            const toolButton = card.querySelector('.btn');
            if (toolButton) {
                toolButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    const tool = card.dataset.tool;
                    if (tool) {
                        this.openTool(tool);
                    }
                });
            }
        });
    },
    
    // Open a PDF tool modal
    openTool(toolName) {
        const modal = document.getElementById('pdf-tool-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');
        
        if (!modal || !modalTitle || !modalBody) return;
        
        this.state.currentTool = toolName;
        
        // Set modal title
        const toolTitles = {
            merge: 'Merge PDFs',
            split: 'Split PDF',
            compress: 'Compress PDF',
            extract: 'Extract Text',
            rotate: 'Rotate Pages',
            convert: 'Convert Format'
        };
        
        modalTitle.textContent = toolTitles[toolName] || 'PDF Tool';
        
        // Load tool content
        this.loadToolContent(toolName, modalBody);
        
        // Show modal
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    },
    
    // Close modal
    closeModal() {
        const modal = document.getElementById('pdf-tool-modal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
            this.state.currentTool = null;
        }
    },
    
    // Load tool-specific content
    loadToolContent(toolName, container) {
        const toolContent = {
            merge: this.getMergeToolHTML(),
            split: this.getSplitToolHTML(),
            compress: this.getCompressToolHTML(),
            extract: this.getExtractToolHTML(),
            rotate: this.getRotateToolHTML(),
            convert: this.getConvertToolHTML()
        };
        
        container.innerHTML = toolContent[toolName] || '<p>Tool not available</p>';
        
        // Initialize tool-specific functionality
        if (window.PDFTools && window.PDFTools.initTool) {
            window.PDFTools.initTool(toolName);
        }
    },
    
    // Get merge tool HTML
    getMergeToolHTML() {
        return `
            <div class="tool__content">
                <p class="tool__description">Select multiple PDF files to merge them into a single document.</p>
                
                <div class="upload__area" id="merge-upload">
                    <i class="ri-upload-cloud-line upload__icon"></i>
                    <p class="upload__text">Drop PDF files here or click to browse</p>
                    <p class="upload__subtext">Select multiple files to merge</p>
                    <input type="file" class="upload__input" id="merge-files" accept=".pdf" multiple>
                </div>
                
                <div class="file__list" id="merge-file-list"></div>
                
                <div class="tool__actions">
                    <button class="btn btn--primary" id="merge-execute" disabled>
                        <i class="ri-file-copy-line"></i>
                        Merge PDFs
                    </button>
                </div>
            </div>
        `;
    },
    
    // Get split tool HTML
    getSplitToolHTML() {
        return `
            <div class="tool__content">
                <p class="tool__description">Split a PDF file into individual pages or specific ranges.</p>
                
                <div class="upload__area" id="split-upload">
                    <i class="ri-upload-cloud-line upload__icon"></i>
                    <p class="upload__text">Drop a PDF file here or click to browse</p>
                    <p class="upload__subtext">Select one PDF file to split</p>
                    <input type="file" class="upload__input" id="split-files" accept=".pdf">
                </div>
                
                <div class="file__list" id="split-file-list"></div>
                
                <div class="form__group">
                    <label class="form__label">Split Method</label>
                    <select class="form__select" id="split-method">
                        <option value="pages">Split into individual pages</option>
                        <option value="ranges">Split by page ranges</option>
                    </select>
                </div>
                
                <div class="form__group" id="page-ranges-group" style="display: none;">
                    <label class="form__label">Page Ranges</label>
                    <input type="text" class="form__input" id="page-ranges" placeholder="e.g., 1-3, 5, 7-9">
                    <p class="form__help">Specify page ranges separated by commas</p>
                </div>
                
                <div class="tool__actions">
                    <button class="btn btn--primary" id="split-execute" disabled>
                        <i class="ri-scissors-line"></i>
                        Split PDF
                    </button>
                </div>
            </div>
        `;
    },
    
    // Get compress tool HTML
    getCompressToolHTML() {
        return `
            <div class="tool__content">
                <p class="tool__description">Reduce PDF file size while maintaining quality.</p>
                
                <div class="upload__area" id="compress-upload">
                    <i class="ri-upload-cloud-line upload__icon"></i>
                    <p class="upload__text">Drop a PDF file here or click to browse</p>
                    <p class="upload__subtext">Select one PDF file to compress</p>
                    <input type="file" class="upload__input" id="compress-files" accept=".pdf">
                </div>
                
                <div class="file__list" id="compress-file-list"></div>
                
                <div class="form__group">
                    <label class="form__label">Compression Level</label>
                    <select class="form__select" id="compression-level">
                        <option value="low">Low (better quality)</option>
                        <option value="medium" selected>Medium (balanced)</option>
                        <option value="high">High (smaller file size)</option>
                    </select>
                </div>
                
                <div class="tool__actions">
                    <button class="btn btn--primary" id="compress-execute" disabled>
                        <i class="ri-compasses-2-line"></i>
                        Compress PDF
                    </button>
                </div>
            </div>
        `;
    },
    
    // Get extract tool HTML
    getExtractToolHTML() {
        return `
            <div class="tool__content">
                <p class="tool__description">Extract text content from PDF files.</p>
                
                <div class="upload__area" id="extract-upload">
                    <i class="ri-upload-cloud-line upload__icon"></i>
                    <p class="upload__text">Drop a PDF file here or click to browse</p>
                    <p class="upload__subtext">Select one PDF file to extract text from</p>
                    <input type="file" class="upload__input" id="extract-files" accept=".pdf">
                </div>
                
                <div class="file__list" id="extract-file-list"></div>
                
                <div class="tool__actions">
                    <button class="btn btn--primary" id="extract-execute" disabled>
                        <i class="ri-text"></i>
                        Extract Text
                    </button>
                </div>
            </div>
        `;
    },
    
    // Get rotate tool HTML
    getRotateToolHTML() {
        return `
            <div class="tool__content">
                <p class="tool__description">Rotate PDF pages to correct orientation.</p>
                
                <div class="upload__area" id="rotate-upload">
                    <i class="ri-upload-cloud-line upload__icon"></i>
                    <p class="upload__text">Drop a PDF file here or click to browse</p>
                    <p class="upload__subtext">Select one PDF file to rotate</p>
                    <input type="file" class="upload__input" id="rotate-files" accept=".pdf">
                </div>
                
                <div class="file__list" id="rotate-file-list"></div>
                
                <div class="form__group">
                    <label class="form__label">Rotation Angle</label>
                    <select class="form__select" id="rotation-angle">
                        <option value="90">90° Clockwise</option>
                        <option value="180">180°</option>
                        <option value="270">90° Counter-clockwise</option>
                    </select>
                </div>
                
                <div class="tool__actions">
                    <button class="btn btn--primary" id="rotate-execute" disabled>
                        <i class="ri-refresh-line"></i>
                        Rotate PDF
                    </button>
                </div>
            </div>
        `;
    },
    
    // Get convert tool HTML
    getConvertToolHTML() {
        return `
            <div class="tool__content">
                <p class="tool__description">Convert PDF files to other formats.</p>
                
                <div class="upload__area" id="convert-upload">
                    <i class="ri-upload-cloud-line upload__icon"></i>
                    <p class="upload__text">Drop a PDF file here or click to browse</p>
                    <p class="upload__subtext">Select one PDF file to convert</p>
                    <input type="file" class="upload__input" id="convert-files" accept=".pdf">
                </div>
                
                <div class="file__list" id="convert-file-list"></div>
                
                <div class="form__group">
                    <label class="form__label">Output Format</label>
                    <select class="form__select" id="output-format">
                        <option value="docx">Word Document (.docx)</option>
                        <option value="html">HTML (.html)</option>
                        <option value="txt">Plain Text (.txt)</option>
                        <option value="images">Images (.png)</option>
                    </select>
                </div>
                
                <div class="tool__actions">
                    <button class="btn btn--primary" id="convert-execute" disabled>
                        <i class="ri-file-transfer-line"></i>
                        Convert PDF
                    </button>
                </div>
            </div>
        `;
    },
    
    // Logout functionality
    async logout() {
        try {
            const response = await fetch('/logout', { method: 'POST' });
            if (response.ok) {
                this.state.isAuthenticated = false;
                this.state.currentUser = null;
                this.updateAuthUI();
                this.showToast('Logged out successfully', 'success');
                setTimeout(() => {
                    window.location.href = '/login';
                }, 1000);
            }
        } catch (error) {
            console.error('Logout error:', error);
            this.showToast('Error logging out', 'error');
        }
    },
    
    // Show toast notification
    showToast(message, type = 'success') {
        const toastContainer = document.querySelector('.toast-container') || this.createToastContainer();
        
        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;
        
        const iconMap = {
            success: 'ri-check-line',
            error: 'ri-error-warning-line',
            warning: 'ri-alert-line'
        };
        
        toast.innerHTML = `
            <i class="toast__icon ${iconMap[type] || iconMap.success}"></i>
            <div class="toast__message">${message}</div>
            <button class="toast__close">
                <i class="ri-close-line"></i>
            </button>
        `;
        
        toastContainer.appendChild(toast);
        
        // Show toast
        setTimeout(() => toast.classList.add('show'), 10);
        
        // Auto remove after 5 seconds
        const autoRemove = setTimeout(() => this.removeToast(toast), 5000);
        
        // Manual close
        const closeBtn = toast.querySelector('.toast__close');
        closeBtn.addEventListener('click', () => {
            clearTimeout(autoRemove);
            this.removeToast(toast);
        });
    },
    
    // Create toast container if it doesn't exist
    createToastContainer() {
        const container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
        return container;
    },
    
    // Remove toast
    removeToast(toast) {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    },
    
    // Format file size
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },
    
    // Validate file
    validateFile(file, options = {}) {
        const { maxSize = 50 * 1024 * 1024, allowedTypes = ['application/pdf'] } = options;
        
        // Check file type
        if (!allowedTypes.includes(file.type)) {
            return { valid: false, error: 'Please select a PDF file' };
        }
        
        // Check file size
        if (file.size > maxSize) {
            return { valid: false, error: `File size exceeds ${this.formatFileSize(maxSize)} limit` };
        }
        
        return { valid: true };
    }
};

// Global function for opening tools (called from HTML)
function openTool(toolName) {
    App.openTool(toolName);
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// Make App available globally for debugging
window.App = App;