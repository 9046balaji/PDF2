"""
PDF Operations Blueprint
This module provides routes for PDF operations via a Flask Blueprint
"""

from flask import Blueprint, request, jsonify, send_file, render_template_string, current_app, url_for, render_template
from flask_login import login_required, current_user
from werkzeug.utils import secure_filename
import os
import uuid
import time
from datetime import datetime, timezone
import json
import logging
import io

# Import the PDF processor
from pdf_processor import PDFProcessor, PDFValidationError, PDFOperationError
from models import db, PDFFile, FileVersion, FileConversionRecord, FileAccessLog

# Create blueprint
pdf_operations = Blueprint('pdf_operations', __name__, url_prefix='/pdf')

# Helper functions
def allowed_file(filename):
    """Check if a file has an allowed extension"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in current_app.config.get('ALLOWED_EXTENSIONS', {'pdf'})

def get_upload_path(filename):
    """Generate a unique path for uploaded files"""
    timestamp = int(time.time())
    unique_filename = f"{timestamp}_{secure_filename(filename)}"
    return os.path.join(current_app.config.get('UPLOAD_FOLDER', 'uploads/'), unique_filename)

def get_processed_path(operation, extension='.pdf'):
    """Generate a unique path for processed files"""
    timestamp = int(time.time())
    unique_id = uuid.uuid4().hex[:8]
    filename = f"{operation}_{timestamp}_{unique_id}{extension}"
    return os.path.join(current_app.config.get('PROCESSED_FOLDER', 'processed/'), filename)

def log_file_access(file_id, action):
    """Log file access"""
    if not current_user.is_authenticated:
        user_id = None
    else:
        user_id = current_user.id
    
    log_entry = FileAccessLog(
        file_id=file_id,
        user_id=user_id,
        action=action,
        ip_address=request.remote_addr,
        user_agent=request.user_agent.string if request.user_agent else None
    )
    
    db.session.add(log_entry)
    db.session.commit()

def create_file_record(filename, storage_path, user_id=None):
    """Create a new file record in the database"""
    if not os.path.exists(storage_path):
        raise FileNotFoundError(f"File {storage_path} does not exist")
    
    # Get file size
    filesize = os.path.getsize(storage_path)
    
    # Get page count using the PDFProcessor
    try:
        pdf_processor = PDFProcessor()
        page_count = pdf_processor.get_page_count(storage_path)
    except Exception as e:
        logging.warning(f"Could not get page count: {str(e)}")
        page_count = None
    
    # Create the PDF file record
    pdf_file = PDFFile(
        owner_id=user_id,
        filename=filename,
        storage_path=storage_path,
        filesize=filesize,
        page_count=page_count,
        content_type='application/pdf'
    )
    
    db.session.add(pdf_file)
    db.session.commit()
    
    return pdf_file

# Routes
@pdf_operations.route('/upload', methods=['POST'])
def upload_pdf():
    """Upload a PDF file"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file and allowed_file(file.filename):
        # Create upload directory if it doesn't exist
        os.makedirs(current_app.config.get('UPLOAD_FOLDER', 'uploads/'), exist_ok=True)
        
        # Save the file
        storage_path = get_upload_path(file.filename)
        file.save(storage_path)
        
        # Create file record
        try:
            pdf_file = create_file_record(
                filename=file.filename,
                storage_path=storage_path,
                user_id=current_user.id if current_user.is_authenticated else None
            )
            
            # Log the upload
            log_file_access(pdf_file.id, 'upload')
            
            return jsonify({
                'message': 'File uploaded successfully',
                'file_id': str(pdf_file.id),
                'filename': pdf_file.filename,
                'page_count': pdf_file.page_count
            }), 201
            
        except Exception as e:
            # Clean up the file if database operation fails
            if os.path.exists(storage_path):
                os.remove(storage_path)
            return jsonify({'error': str(e)}), 500
    
    return jsonify({'error': 'Invalid file type'}), 400

@pdf_operations.route('/download/<file_id>', methods=['GET'])
def download_pdf(file_id):
    """Download a PDF file"""
    pdf_file = PDFFile.query.get(file_id)
    
    if not pdf_file:
        return jsonify({'error': 'File not found'}), 404
    
    # Check if user has access
    if current_user.is_authenticated and pdf_file.owner_id != current_user.id:
        # TODO: Add check for file shares
        pass
    
    # Log the download
    log_file_access(pdf_file.id, 'download')
    
    # Update access count
    pdf_file.access_count += 1
    db.session.commit()
    
    return send_file(pdf_file.storage_path, as_attachment=True, download_name=pdf_file.filename)

@pdf_operations.route('/merge', methods=['POST'])
def merge_pdfs():
    """Merge multiple PDFs into one"""
    file_ids = request.json.get('file_ids', [])
    
    if not file_ids or len(file_ids) < 2:
        return jsonify({'error': 'At least two file IDs required'}), 400
    
    try:
        # Get file paths
        file_paths = []
        for file_id in file_ids:
            pdf_file = PDFFile.query.get(file_id)
            if not pdf_file:
                return jsonify({'error': f'File {file_id} not found'}), 404
            
            # Check if user has access
            if current_user.is_authenticated and pdf_file.owner_id != current_user.id:
                # TODO: Add check for file shares
                pass
            
            file_paths.append(pdf_file.storage_path)
        
        # Create processed directory if it doesn't exist
        os.makedirs(current_app.config.get('PROCESSED_FOLDER', 'processed/'), exist_ok=True)
        
        # Merge the PDFs
        output_path = get_processed_path('merged')
        
        # Use the PDFProcessor to merge
        pdf_processor = PDFProcessor()
        pdf_processor.merge_pdfs(file_paths, output_path)
        
        # Create a file record for the merged PDF
        merged_file = create_file_record(
            filename=f"merged_{'_'.join([os.path.basename(path) for path in file_paths])}.pdf",
            storage_path=output_path,
            user_id=current_user.id if current_user.is_authenticated else None
        )
        
        # Log the operation
        for file_id in file_ids:
            log_file_access(file_id, 'merge_source')
        log_file_access(merged_file.id, 'merge_result')
        
        return jsonify({
            'message': 'PDFs merged successfully',
            'file_id': str(merged_file.id),
            'filename': merged_file.filename,
            'page_count': merged_file.page_count,
            'download_url': url_for('pdf_operations.download_pdf', file_id=merged_file.id)
        }), 200
        
    except (PDFValidationError, PDFOperationError) as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logging.error(f"Error merging PDFs: {str(e)}")
        return jsonify({'error': f'Failed to merge PDFs: {str(e)}'}), 500

@pdf_operations.route('/split/<file_id>', methods=['POST'])
def split_pdf(file_id):
    """Split a PDF into individual pages"""
    pdf_file = PDFFile.query.get(file_id)
    
    if not pdf_file:
        return jsonify({'error': 'File not found'}), 404
    
    # Check if user has access
    if current_user.is_authenticated and pdf_file.owner_id != current_user.id:
        # TODO: Add check for file shares
        pass
    
    try:
        # Create processed directory if it doesn't exist
        os.makedirs(current_app.config.get('PROCESSED_FOLDER', 'processed/'), exist_ok=True)
        
        # Create a directory for the split pages
        timestamp = int(time.time())
        unique_id = uuid.uuid4().hex[:8]
        split_dir = os.path.join(current_app.config.get('PROCESSED_FOLDER', 'processed/'), f"split_{timestamp}_{unique_id}")
        os.makedirs(split_dir, exist_ok=True)
        
        # Use the PDFProcessor to split
        pdf_processor = PDFProcessor()
        output_files = pdf_processor.split_pdf(pdf_file.storage_path, split_dir)
        
        # Create records for each split page
        split_files = []
        for i, output_path in enumerate(output_files):
            split_file = create_file_record(
                filename=f"page_{i+1}_{pdf_file.filename}",
                storage_path=output_path,
                user_id=current_user.id if current_user.is_authenticated else None
            )
            split_files.append(split_file)
            
            # Log the operation
            log_file_access(split_file.id, 'split_result')
        
        # Log the source operation
        log_file_access(pdf_file.id, 'split_source')
        
        return jsonify({
            'message': 'PDF split successfully',
            'file_ids': [str(f.id) for f in split_files],
            'filenames': [f.filename for f in split_files],
            'download_urls': [url_for('pdf_operations.download_pdf', file_id=f.id) for f in split_files]
        }), 200
        
    except (PDFValidationError, PDFOperationError) as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logging.error(f"Error splitting PDF: {str(e)}")
        return jsonify({'error': f'Failed to split PDF: {str(e)}'}), 500

@pdf_operations.route('/extract_text/<file_id>', methods=['GET'])
def extract_text(file_id):
    """Extract text from a PDF file"""
    pdf_file = PDFFile.query.get(file_id)
    
    if not pdf_file:
        return jsonify({'error': 'File not found'}), 404
    
    # Check if user has access
    if current_user.is_authenticated and pdf_file.owner_id != current_user.id:
        # TODO: Add check for file shares
        pass
    
    try:
        # Use the PDFProcessor to extract text
        pdf_processor = PDFProcessor()
        text = pdf_processor.extract_text(pdf_file.storage_path)
        
        # Create processed directory if it doesn't exist
        os.makedirs(current_app.config.get('PROCESSED_FOLDER', 'processed/'), exist_ok=True)
        
        # Save the extracted text to a file
        text_file_path = get_processed_path('extracted_text', '.txt')
        with open(text_file_path, 'w', encoding='utf-8') as f:
            f.write(text)
        
        # Create a file record for the text
        # Note: This is not a PDF, so we create a FileConversionRecord instead
        conversion = FileConversionRecord(
            file_id=pdf_file.id,
            from_format='pdf',
            to_format='txt',
            status='completed',
            output_file=text_file_path,
            completed_at=datetime.now(timezone.utc)
        )
        
        db.session.add(conversion)
        db.session.commit()
        
        # Log the operation
        log_file_access(pdf_file.id, 'extract_text')
        
        return jsonify({
            'message': 'Text extracted successfully',
            'text': text,
            'conversion_id': str(conversion.id),
            'download_url': url_for('pdf_operations.download_text', conversion_id=conversion.id)
        }), 200
        
    except (PDFValidationError, PDFOperationError) as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logging.error(f"Error extracting text: {str(e)}")
        return jsonify({'error': f'Failed to extract text: {str(e)}'}), 500

@pdf_operations.route('/download_text/<conversion_id>', methods=['GET'])
def download_text(conversion_id):
    """Download extracted text"""
    conversion = FileConversionRecord.query.get(conversion_id)
    
    if not conversion:
        return jsonify({'error': 'Conversion not found'}), 404
    
    # Check if user has access
    pdf_file = PDFFile.query.get(conversion.file_id)
    if pdf_file and current_user.is_authenticated and pdf_file.owner_id != current_user.id:
        # TODO: Add check for file shares
        pass
    
    # Log the download
    log_file_access(pdf_file.id, 'download_text')
    
    return send_file(
        conversion.output_file, 
        as_attachment=True, 
        download_name=f"extracted_text_{pdf_file.filename}.txt"
    )

@pdf_operations.route('/rotate/<file_id>', methods=['POST'])
def rotate_pdf(file_id):
    """Rotate a PDF file"""
    pdf_file = PDFFile.query.get(file_id)
    
    if not pdf_file:
        return jsonify({'error': 'File not found'}), 404
    
    # Check if user has access
    if current_user.is_authenticated and pdf_file.owner_id != current_user.id:
        # TODO: Add check for file shares
        pass
    
    try:
        rotation_angle = int(request.json.get('rotation_angle', 90))
        
        # Create processed directory if it doesn't exist
        os.makedirs(current_app.config.get('PROCESSED_FOLDER', 'processed/'), exist_ok=True)
        
        # Use the PDFProcessor to rotate
        pdf_processor = PDFProcessor()
        output_path = get_processed_path('rotated')
        pdf_processor.rotate_pdf(pdf_file.storage_path, output_path, rotation_angle)
        
        # Create a file record for the rotated PDF
        rotated_file = create_file_record(
            filename=f"rotated_{rotation_angle}_{pdf_file.filename}",
            storage_path=output_path,
            user_id=current_user.id if current_user.is_authenticated else None
        )
        
        # Create a new version record
        version = FileVersion(
            file_id=pdf_file.id,
            version_number=1,  # Assuming this is the first version
            storage_path=output_path,
            content_type='application/pdf',
            filesize=os.path.getsize(output_path)
        )
        
        db.session.add(version)
        db.session.commit()
        
        # Log the operation
        log_file_access(pdf_file.id, 'rotate_source')
        log_file_access(rotated_file.id, 'rotate_result')
        
        return jsonify({
            'message': 'PDF rotated successfully',
            'file_id': str(rotated_file.id),
            'filename': rotated_file.filename,
            'page_count': rotated_file.page_count,
            'version_id': str(version.id),
            'download_url': url_for('pdf_operations.download_pdf', file_id=rotated_file.id)
        }), 200
        
    except (PDFValidationError, PDFOperationError) as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logging.error(f"Error rotating PDF: {str(e)}")
        return jsonify({'error': f'Failed to rotate PDF: {str(e)}'}), 500

@pdf_operations.route('/extract_pages/<file_id>', methods=['POST'])
def extract_pages(file_id):
    """Extract specific pages from a PDF file"""
    pdf_file = PDFFile.query.get(file_id)
    
    if not pdf_file:
        return jsonify({'error': 'File not found'}), 404
    
    # Check if user has access
    if current_user.is_authenticated and pdf_file.owner_id != current_user.id:
        # TODO: Add check for file shares
        pass
    
    try:
        # Parse pages to extract
        pages = request.json.get('pages', [])
        if not pages:
            return jsonify({'error': 'No pages specified'}), 400
        
        # Create processed directory if it doesn't exist
        os.makedirs(current_app.config.get('PROCESSED_FOLDER', 'processed/'), exist_ok=True)
        
        # Use the PDFProcessor to extract pages
        pdf_processor = PDFProcessor()
        output_path = get_processed_path('extracted_pages')
        pdf_processor.extract_pages(pdf_file.storage_path, output_path, pages)
        
        # Create a file record for the extracted pages
        extracted_file = create_file_record(
            filename=f"pages_{'-'.join(map(str, pages))}_{pdf_file.filename}",
            storage_path=output_path,
            user_id=current_user.id if current_user.is_authenticated else None
        )
        
        # Log the operation
        log_file_access(pdf_file.id, 'extract_pages_source')
        log_file_access(extracted_file.id, 'extract_pages_result')
        
        return jsonify({
            'message': 'Pages extracted successfully',
            'file_id': str(extracted_file.id),
            'filename': extracted_file.filename,
            'page_count': extracted_file.page_count,
            'download_url': url_for('pdf_operations.download_pdf', file_id=extracted_file.id)
        }), 200
        
    except (PDFValidationError, PDFOperationError) as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logging.error(f"Error extracting pages: {str(e)}")
        return jsonify({'error': f'Failed to extract pages: {str(e)}'}), 500

# Dashboard template
@pdf_operations.route('/dashboard')
def pdf_dashboard():
    """PDF operations dashboard"""
    return render_template('pdf_dashboard.html')
    

# API route for listing files
@pdf_operations.route('/api/files', methods=['GET'])
def list_files():
    """List all PDF files"""
    files = PDFFile.query.all()
    
    result = []
    for pdf_file in files:
        result.append({
            'id': str(pdf_file.id),
            'filename': pdf_file.filename,
            'page_count': pdf_file.page_count,
            'filesize': pdf_file.filesize,
            'created_at': pdf_file.created_at.isoformat() if pdf_file.created_at else None,
            'last_accessed': pdf_file.last_accessed.isoformat() if pdf_file.last_accessed else None
        })
    
    return jsonify(result)


    template = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>PDF Operations Dashboard</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
            h1, h2 { color: #333; }
            .container { max-width: 1200px; margin: 0 auto; }
            .card { background: #f9f9f9; border-radius: 5px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
            .form-group { margin-bottom: 15px; }
            label { display: block; margin-bottom: 5px; font-weight: bold; }
            input, select { padding: 8px; width: 100%; box-sizing: border-box; }
            .button { background: #4CAF50; color: white; border: none; padding: 10px 15px; cursor: pointer; border-radius: 3px; }
            .danger { background: #f44336; }
            .file-item { border: 1px solid #ddd; padding: 15px; border-radius: 4px; }
            .file-name { font-weight: bold; margin-bottom: 8px; }
            .file-meta { color: #666; font-size: 0.9em; }
            .file-actions { margin-top: 15px; display: flex; gap: 8px; }
            .operation-btn { padding: 6px 10px; background: #2196F3; color: white; border: none; border-radius: 3px; cursor: pointer; text-decoration: none; font-size: 0.8em; }
            #dropzone { border: 2px dashed #ccc; padding: 40px; text-align: center; margin-bottom: 20px; }
            #dropzone.highlight { border-color: #4CAF50; background: #e8f5e9; }
            .hidden { display: none; }
            .modal { display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); }
            .modal-content { background: white; margin: 10% auto; padding: 20px; width: 50%; border-radius: 5px; box-shadow: 0 4px 8px rgba(0,0,0,0.2); }
            .close { float: right; font-size: 28px; font-weight: bold; cursor: pointer; }
            .tabs { display: flex; margin-bottom: 20px; border-bottom: 1px solid #ddd; }
            .tab { padding: 10px 20px; cursor: pointer; }
            .tab.active { border-bottom: 2px solid #4CAF50; font-weight: bold; }
            .tab-content { display: none; }
            .tab-content.active { display: block; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>PDF Operations Dashboard</h1>
            
            <div class="tabs">
                <div class="tab active" data-tab="upload">Upload</div>
                <div class="tab" data-tab="files">My Files</div>
                <div class="tab" data-tab="merge">Merge PDFs</div>
            </div>
            
            <div id="upload" class="tab-content active">
                <div class="card">
                    <h2>Upload New PDF</h2>
                    <div id="dropzone">
                        <p>Drag and drop PDF files here, or click to select files</p>
                        <input type="file" id="file-input" accept=".pdf" class="hidden">
                        <button id="browse-btn" class="button">Browse Files</button>
                    </div>
                    <div id="upload-progress" class="hidden">
                        <p>Uploading: <span id="upload-percentage">0%</span></p>
                    </div>
                </div>
            </div>
            
            <div id="files" class="tab-content">
                <div class="card">
                    <h2>My PDF Files</h2>
                    {% if user_files %}
                    <div class="grid">
                        {% for file in user_files %}
                        <div class="file-item">
                            <div class="file-name">{{ file.filename }}</div>
                            <div class="file-meta">
                                <div>Size: {{ (file.filesize / 1024)|round|int }} KB</div>
                                <div>Pages: {{ file.page_count or 'Unknown' }}</div>
                                <div>Uploaded: {{ file.created_at.strftime('%Y-%m-%d %H:%M') }}</div>
                            </div>
                            <div class="file-actions">
                                <a href="{{ url_for('pdf_operations.download_pdf', file_id=file.id) }}" class="operation-btn">Download</a>
                                <button class="operation-btn extract-text-btn" data-id="{{ file.id }}">Extract Text</button>
                                <button class="operation-btn rotate-btn" data-id="{{ file.id }}">Rotate</button>
                                <button class="operation-btn extract-pages-btn" data-id="{{ file.id }}">Extract Pages</button>
                                <button class="operation-btn split-btn" data-id="{{ file.id }}">Split</button>
                                <button class="operation-btn select-merge-btn" data-id="{{ file.id }}" data-name="{{ file.filename }}">Select for Merge</button>
                            </div>
                        </div>
                        {% endfor %}
                    </div>
                    {% else %}
                    <p>You don't have any PDF files yet. Upload one to get started.</p>
                    {% endif %}
                </div>
            </div>
            
            <div id="merge" class="tab-content">
                <div class="card">
                    <h2>Merge PDFs</h2>
                    <div id="selected-files">
                        <p>No files selected for merging. Go to "My Files" tab and select files to merge.</p>
                    </div>
                    <button id="merge-btn" class="button" disabled>Merge Selected PDFs</button>
                </div>
            </div>
            
            <!-- Modals -->
            <div id="rotate-modal" class="modal">
                <div class="modal-content">
                    <span class="close">&times;</span>
                    <h2>Rotate PDF</h2>
                    <form id="rotate-form">
                        <input type="hidden" id="rotate-file-id">
                        <div class="form-group">
                            <label for="rotation-angle">Rotation Angle:</label>
                            <select id="rotation-angle">
                                <option value="90">90° Clockwise</option>
                                <option value="180">180°</option>
                                <option value="270">90° Counter-clockwise</option>
                            </select>
                        </div>
                        <button type="submit" class="button">Rotate PDF</button>
                    </form>
                </div>
            </div>
            
            <div id="extract-pages-modal" class="modal">
                <div class="modal-content">
                    <span class="close">&times;</span>
                    <h2>Extract Pages</h2>
                    <form id="extract-pages-form">
                        <input type="hidden" id="extract-pages-file-id">
                        <div class="form-group">
                            <label for="pages-to-extract">Pages to Extract (comma-separated, starts at 0):</label>
                            <input type="text" id="pages-to-extract" placeholder="0,1,3">
                        </div>
                        <button type="submit" class="button">Extract Pages</button>
                    </form>
                </div>
            </div>
        </div>
        
        <script>
            document.addEventListener('DOMContentLoaded', function() {
                // Tab functionality
                const tabs = document.querySelectorAll('.tab');
                const tabContents = document.querySelectorAll('.tab-content');
                
                tabs.forEach(tab => {
                    tab.addEventListener('click', () => {
                        tabs.forEach(t => t.classList.remove('active'));
                        tabContents.forEach(c => c.classList.remove('active'));
                        
                        tab.classList.add('active');
                        document.getElementById(tab.dataset.tab).classList.add('active');
                    });
                });
                
                // File upload functionality
                const dropzone = document.getElementById('dropzone');
                const fileInput = document.getElementById('file-input');
                const browseBtn = document.getElementById('browse-btn');
                const uploadProgress = document.getElementById('upload-progress');
                const uploadPercentage = document.getElementById('upload-percentage');
                
                browseBtn.addEventListener('click', () => {
                    fileInput.click();
                });
                
                dropzone.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    dropzone.classList.add('highlight');
                });
                
                dropzone.addEventListener('dragleave', () => {
                    dropzone.classList.remove('highlight');
                });
                
                dropzone.addEventListener('drop', (e) => {
                    e.preventDefault();
                    dropzone.classList.remove('highlight');
                    
                    const files = e.dataTransfer.files;
                    if (files.length > 0) {
                        uploadFile(files[0]);
                    }
                });
                
                fileInput.addEventListener('change', () => {
                    if (fileInput.files.length > 0) {
                        uploadFile(fileInput.files[0]);
                    }
                });
                
                function uploadFile(file) {
                    if (!file.name.endsWith('.pdf')) {
                        alert('Please select a PDF file.');
                        return;
                    }
                    
                    const formData = new FormData();
                    formData.append('file', file);
                    
                    const xhr = new XMLHttpRequest();
                    
                    xhr.open('POST', '{{ url_for("pdf_operations.upload_pdf") }}', true);
                    
                    xhr.upload.onprogress = (e) => {
                        if (e.lengthComputable) {
                            const percentComplete = Math.round((e.loaded / e.total) * 100);
                            uploadProgress.classList.remove('hidden');
                            uploadPercentage.textContent = percentComplete + '%';
                        }
                    };
                    
                    xhr.onload = function() {
                        uploadProgress.classList.add('hidden');
                        
                        if (xhr.status === 201) {
                            const response = JSON.parse(xhr.responseText);
                            alert('File uploaded successfully!');
                            window.location.reload();
                        } else {
                            let errorMsg = 'Upload failed.';
                            try {
                                const response = JSON.parse(xhr.responseText);
                                errorMsg = response.error || errorMsg;
                            } catch (e) {}
                            alert(errorMsg);
                        }
                    };
                    
                    xhr.send(formData);
                }
                
                // Modal functionality
                const modals = document.querySelectorAll('.modal');
                const closeBtns = document.querySelectorAll('.close');
                
                closeBtns.forEach(btn => {
                    btn.addEventListener('click', () => {
                        modals.forEach(modal => {
                            modal.style.display = 'none';
                        });
                    });
                });
                
                window.addEventListener('click', (e) => {
                    modals.forEach(modal => {
                        if (e.target === modal) {
                            modal.style.display = 'none';
                        }
                    });
                });
                
                // Rotate functionality
                const rotateBtns = document.querySelectorAll('.rotate-btn');
                const rotateModal = document.getElementById('rotate-modal');
                const rotateForm = document.getElementById('rotate-form');
                const rotateFileId = document.getElementById('rotate-file-id');
                
                rotateBtns.forEach(btn => {
                    btn.addEventListener('click', () => {
                        rotateFileId.value = btn.dataset.id;
                        rotateModal.style.display = 'block';
                    });
                });
                
                rotateForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    
                    const fileId = rotateFileId.value;
                    const angle = document.getElementById('rotation-angle').value;
                    
                    fetch(`{{ url_for("pdf_operations.rotate_pdf", file_id="FILE_ID") }}`.replace('FILE_ID', fileId), {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ rotation_angle: parseInt(angle) }),
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.error) {
                            alert('Error: ' + data.error);
                        } else {
                            alert('PDF rotated successfully! You can download it from the link provided.');
                            rotateModal.style.display = 'none';
                            window.location.href = data.download_url;
                        }
                    })
                    .catch(error => {
                        alert('Error: ' + error);
                    });
                });
                
                // Extract Pages functionality
                const extractPagesBtns = document.querySelectorAll('.extract-pages-btn');
                const extractPagesModal = document.getElementById('extract-pages-modal');
                const extractPagesForm = document.getElementById('extract-pages-form');
                const extractPagesFileId = document.getElementById('extract-pages-file-id');
                
                extractPagesBtns.forEach(btn => {
                    btn.addEventListener('click', () => {
                        extractPagesFileId.value = btn.dataset.id;
                        extractPagesModal.style.display = 'block';
                    });
                });
                
                extractPagesForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    
                    const fileId = extractPagesFileId.value;
                    const pagesStr = document.getElementById('pages-to-extract').value;
                    const pages = pagesStr.split(',').map(p => parseInt(p.trim())).filter(p => !isNaN(p));
                    
                    if (pages.length === 0) {
                        alert('Please enter valid page numbers.');
                        return;
                    }
                    
                    fetch(`{{ url_for("pdf_operations.extract_pages", file_id="FILE_ID") }}`.replace('FILE_ID', fileId), {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ pages: pages }),
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.error) {
                            alert('Error: ' + data.error);
                        } else {
                            alert('Pages extracted successfully! You can download the result from the link provided.');
                            extractPagesModal.style.display = 'none';
                            window.location.href = data.download_url;
                        }
                    })
                    .catch(error => {
                        alert('Error: ' + error);
                    });
                });
                
                // Extract Text functionality
                const extractTextBtns = document.querySelectorAll('.extract-text-btn');
                
                extractTextBtns.forEach(btn => {
                    btn.addEventListener('click', () => {
                        const fileId = btn.dataset.id;
                        
                        fetch(`{{ url_for("pdf_operations.extract_text", file_id="FILE_ID") }}`.replace('FILE_ID', fileId))
                        .then(response => response.json())
                        .then(data => {
                            if (data.error) {
                                alert('Error: ' + data.error);
                            } else {
                                alert('Text extracted successfully! You can download the result from the link provided.');
                                window.location.href = data.download_url;
                            }
                        })
                        .catch(error => {
                            alert('Error: ' + error);
                        });
                    });
                });
                
                // Split functionality
                const splitBtns = document.querySelectorAll('.split-btn');
                
                splitBtns.forEach(btn => {
                    btn.addEventListener('click', () => {
                        const fileId = btn.dataset.id;
                        
                        if (confirm('This will split the PDF into individual pages. Continue?')) {
                            fetch(`{{ url_for("pdf_operations.split_pdf", file_id="FILE_ID") }}`.replace('FILE_ID', fileId), {
                                method: 'POST',
                            })
                            .then(response => response.json())
                            .then(data => {
                                if (data.error) {
                                    alert('Error: ' + data.error);
                                } else {
                                    alert('PDF split successfully into ' + data.file_ids.length + ' pages!');
                                    window.location.reload();
                                }
                            })
                            .catch(error => {
                                alert('Error: ' + error);
                            });
                        }
                    });
                });
                
                // Merge functionality
                const selectMergeBtns = document.querySelectorAll('.select-merge-btn');
                const selectedFilesContainer = document.getElementById('selected-files');
                const mergeBtn = document.getElementById('merge-btn');
                
                const selectedFiles = new Map();
                
                selectMergeBtns.forEach(btn => {
                    btn.addEventListener('click', () => {
                        const fileId = btn.dataset.id;
                        const fileName = btn.dataset.name;
                        
                        if (selectedFiles.has(fileId)) {
                            selectedFiles.delete(fileId);
                            btn.textContent = 'Select for Merge';
                        } else {
                            selectedFiles.set(fileId, fileName);
                            btn.textContent = 'Deselect';
                        }
                        
                        updateSelectedFilesList();
                    });
                });
                
                function updateSelectedFilesList() {
                    if (selectedFiles.size === 0) {
                        selectedFilesContainer.innerHTML = '<p>No files selected for merging. Go to "My Files" tab and select files to merge.</p>';
                        mergeBtn.disabled = true;
                    } else {
                        let html = '<p>Selected files for merging:</p><ul>';
                        selectedFiles.forEach((name, id) => {
                            html += `<li>${name} <button class="remove-selected" data-id="${id}">Remove</button></li>`;
                        });
                        html += '</ul>';
                        selectedFilesContainer.innerHTML = html;
                        mergeBtn.disabled = false;
                        
                        // Add event listeners to remove buttons
                        document.querySelectorAll('.remove-selected').forEach(btn => {
                            btn.addEventListener('click', () => {
                                const fileId = btn.dataset.id;
                                selectedFiles.delete(fileId);
                                
                                // Update the button text in the files tab
                                document.querySelector(`.select-merge-btn[data-id="${fileId}"]`).textContent = 'Select for Merge';
                                
                                updateSelectedFilesList();
                            });
                        });
                    }
                }
                
                mergeBtn.addEventListener('click', () => {
                    if (selectedFiles.size < 2) {
                        alert('Please select at least two files to merge.');
                        return;
                    }
                    
                    fetch('{{ url_for("pdf_operations.merge_pdfs") }}', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ file_ids: Array.from(selectedFiles.keys()) }),
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.error) {
                            alert('Error: ' + data.error);
                        } else {
                            alert('PDFs merged successfully! You can download the result from the link provided.');
                            window.location.href = data.download_url;
                        }
                    })
                    .catch(error => {
                        alert('Error: ' + error);
                    });
                });
            });
        </script>
    </body>
    </html>
    """
    
    return render_template_string(template, user_files=user_files)
