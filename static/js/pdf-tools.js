/**
 * PDF Tools functionality
 * Handles file uploads, processing, and tool-specific operations
 */

const PDFTools = {
    // Current files for processing
    files: new Map(),
    
    // Initialize tool-specific functionality
    initTool(toolName) {
        console.log(`Initializing ${toolName} tool`);
        
        // Setup file upload for the tool
        this.setupFileUpload(toolName);
        
        // Setup tool-specific functionality
        switch (toolName) {
            case 'merge':
                this.initMergeTool();
                break;
            case 'split':
                this.initSplitTool();
                break;
            case 'compress':
                this.initCompressTool();
                break;
            case 'extract':
                this.initExtractTool();
                break;
            case 'rotate':
                this.initRotateTool();
                break;
            case 'convert':
                this.initConvertTool();
                break;
        }
    },
    
    // Setup file upload for a tool
    setupFileUpload(toolName) {
        const uploadArea = document.getElementById(`${toolName}-upload`);
        const fileInput = document.getElementById(`${toolName}-files`);
        const fileList = document.getElementById(`${toolName}-file-list`);
        
        if (!uploadArea || !fileInput || !fileList) return;
        
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
            this.handleFiles(files, toolName);
        });
        
        // File input change
        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            this.handleFiles(files, toolName);
        });
    },
    
    // Handle selected files
    handleFiles(files, toolName) {
        const fileList = document.getElementById(`${toolName}-file-list`);
        const executeButton = document.getElementById(`${toolName}-execute`);
        
        // Clear previous files for single-file tools
        if (!['merge'].includes(toolName)) {
            this.files.clear();
        }
        
        // Validate and add files
        files.forEach(file => {
            const validation = App.validateFile(file);
            if (validation.valid) {
                this.files.set(file.name, file);
            } else {
                App.showToast(validation.error, 'error');
            }
        });
        
        // Update file list display
        this.updateFileList(fileList, toolName);
        
        // Enable/disable execute button
        if (executeButton) {
            executeButton.disabled = this.files.size === 0;
        }
    },
    
    // Update file list display
    updateFileList(container, toolName) {
        if (this.files.size === 0) {
            container.innerHTML = '';
            return;
        }
        
        let html = '';
        this.files.forEach((file, fileName) => {
            html += `
                <div class="file__item">
                    <div class="file__info">
                        <i class="ri-file-pdf-line file__icon"></i>
                        <div class="file__details">
                            <h4>${fileName}</h4>
                            <p>${App.formatFileSize(file.size)}</p>
                        </div>
                    </div>
                    <div class="file__actions">
                        <button class="btn btn--outline btn--sm" onclick="PDFTools.removeFile('${fileName}', '${toolName}')">
                            <i class="ri-delete-bin-line"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    },
    
    // Remove file from list
    removeFile(fileName, toolName) {
        this.files.delete(fileName);
        const fileList = document.getElementById(`${toolName}-file-list`);
        const executeButton = document.getElementById(`${toolName}-execute`);
        
        this.updateFileList(fileList, toolName);
        
        if (executeButton) {
            executeButton.disabled = this.files.size === 0;
        }
    },
    
    // Initialize merge tool
    initMergeTool() {
        const executeButton = document.getElementById('merge-execute');
        if (executeButton) {
            executeButton.addEventListener('click', () => {
                this.executeMerge();
            });
        }
    },
    
    // Initialize split tool
    initSplitTool() {
        const executeButton = document.getElementById('split-execute');
        const splitMethod = document.getElementById('split-method');
        const pageRangesGroup = document.getElementById('page-ranges-group');
        
        if (splitMethod && pageRangesGroup) {
            splitMethod.addEventListener('change', () => {
                pageRangesGroup.style.display = 
                    splitMethod.value === 'ranges' ? 'block' : 'none';
            });
        }
        
        if (executeButton) {
            executeButton.addEventListener('click', () => {
                this.executeSplit();
            });
        }
    },
    
    // Initialize compress tool
    initCompressTool() {
        const executeButton = document.getElementById('compress-execute');
        if (executeButton) {
            executeButton.addEventListener('click', () => {
                this.executeCompress();
            });
        }
    },
    
    // Initialize extract tool
    initExtractTool() {
        const executeButton = document.getElementById('extract-execute');
        if (executeButton) {
            executeButton.addEventListener('click', () => {
                this.executeExtract();
            });
        }
    },
    
    // Initialize rotate tool
    initRotateTool() {
        const executeButton = document.getElementById('rotate-execute');
        if (executeButton) {
            executeButton.addEventListener('click', () => {
                this.executeRotate();
            });
        }
    },
    
    // Initialize convert tool
    initConvertTool() {
        const executeButton = document.getElementById('convert-execute');
        if (executeButton) {
            executeButton.addEventListener('click', () => {
                this.executeConvert();
            });
        }
    },
    
    // Execute merge operation
    async executeMerge() {
        if (this.files.size < 2) {
            App.showToast('Please select at least 2 files to merge', 'error');
            return;
        }
        
        const formData = new FormData();
        this.files.forEach((file) => {
            formData.append('files', file);
        });
        formData.append('operation', 'merge');
        
        await this.processFiles(formData, 'Merging PDFs...');
    },
    
    // Execute split operation
    async executeSplit() {
        if (this.files.size !== 1) {
            App.showToast('Please select exactly one file to split', 'error');
            return;
        }
        
        const splitMethod = document.getElementById('split-method').value;
        const pageRanges = document.getElementById('page-ranges').value;
        
        if (splitMethod === 'ranges' && !pageRanges.trim()) {
            App.showToast('Please specify page ranges', 'error');
            return;
        }
        
        const formData = new FormData();
        this.files.forEach((file) => {
            formData.append('file', file);
        });
        formData.append('operation', 'split');
        formData.append('split_method', splitMethod);
        if (pageRanges) {
            formData.append('page_ranges', pageRanges);
        }
        
        await this.processFiles(formData, 'Splitting PDF...');
    },
    
    // Execute compress operation
    async executeCompress() {
        if (this.files.size !== 1) {
            App.showToast('Please select exactly one file to compress', 'error');
            return;
        }
        
        const compressionLevel = document.getElementById('compression-level').value;
        
        const formData = new FormData();
        this.files.forEach((file) => {
            formData.append('file', file);
        });
        formData.append('operation', 'compress');
        formData.append('compression_level', compressionLevel);
        
        await this.processFiles(formData, 'Compressing PDF...');
    },
    
    // Execute extract operation
    async executeExtract() {
        if (this.files.size !== 1) {
            App.showToast('Please select exactly one file to extract text from', 'error');
            return;
        }
        
        const formData = new FormData();
        this.files.forEach((file) => {
            formData.append('file', file);
        });
        formData.append('operation', 'extract_text');
        
        await this.processFiles(formData, 'Extracting text...');
    },
    
    // Execute rotate operation
    async executeRotate() {
        if (this.files.size !== 1) {
            App.showToast('Please select exactly one file to rotate', 'error');
            return;
        }
        
        const rotationAngle = document.getElementById('rotation-angle').value;
        
        const formData = new FormData();
        this.files.forEach((file) => {
            formData.append('file', file);
        });
        formData.append('operation', 'rotate');
        formData.append('rotation_angle', rotationAngle);
        
        await this.processFiles(formData, 'Rotating PDF...');
    },
    
    // Execute convert operation
    async executeConvert() {
        if (this.files.size !== 1) {
            App.showToast('Please select exactly one file to convert', 'error');
            return;
        }
        
        const outputFormat = document.getElementById('output-format').value;
        
        const formData = new FormData();
        this.files.forEach((file) => {
            formData.append('file', file);
        });
        formData.append('operation', 'convert');
        formData.append('output_format', outputFormat);
        
        await this.processFiles(formData, 'Converting PDF...');
    },
    
    // Process files with the backend
    async processFiles(formData, loadingMessage) {
        try {
            // Show loading state
            this.showProcessingState(loadingMessage);
            
            const response = await fetch('/api/process-pdf', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (response.ok) {
                App.showToast('Operation completed successfully!', 'success');
                
                // Handle download
                if (data.download_url) {
                    window.location.href = data.download_url;
                } else if (data.file_id) {
                    window.location.href = `/pdf/download/${data.file_id}`;
                }
                
                // Close modal after short delay
                setTimeout(() => {
                    App.closeModal();
                }, 1000);
            } else {
                App.showToast(data.error || 'Operation failed', 'error');
            }
        } catch (error) {
            console.error('Processing error:', error);
            App.showToast('An error occurred during processing', 'error');
        } finally {
            this.hideProcessingState();
        }
    },
    
    // Show processing state
    showProcessingState(message) {
        const executeButtons = document.querySelectorAll('[id$="-execute"]');
        executeButtons.forEach(button => {
            button.disabled = true;
            button.innerHTML = `
                <div class="spinner"></div>
                ${message}
            `;
        });
    },
    
    // Hide processing state
    hideProcessingState() {
        const executeButtons = document.querySelectorAll('[id$="-execute"]');
        executeButtons.forEach(button => {
            button.disabled = false;
            
            // Restore original button content based on tool
            const toolName = button.id.replace('-execute', '');
            const buttonContent = {
                merge: '<i class="ri-file-copy-line"></i> Merge PDFs',
                split: '<i class="ri-scissors-line"></i> Split PDF',
                compress: '<i class="ri-compasses-2-line"></i> Compress PDF',
                extract: '<i class="ri-text"></i> Extract Text',
                rotate: '<i class="ri-refresh-line"></i> Rotate PDF',
                convert: '<i class="ri-file-transfer-line"></i> Convert PDF'
            };
            
            button.innerHTML = buttonContent[toolName] || 'Execute';
        });
    }
};

// Make PDFTools available globally
window.PDFTools = PDFTools;