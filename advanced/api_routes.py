from flask import jsonify
from .pdf_operations_blueprint import pdf_operations
from models import PDFFile

# API Routes
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
