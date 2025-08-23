import os
import uuid
import math
import time
from datetime import datetime, timezone
from flask import Flask, request, jsonify, send_file, abort, render_template_string
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
from pypdf import PdfReader, PdfWriter
import pikepdf

# --- App Initialization ---
app = Flask(__name__, static_folder='static', static_url_path='')
app.config['SECRET_KEY'] = 'your-secret-key-change-this-in-production'
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://pdf_user:9588@localhost:5432/pdf_tool'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize extensions
db = SQLAlchemy(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

# --- Database Models ---
class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    files = db.relationship('FileRecord', backref='user', lazy=True)

class FileRecord(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(200), nullable=False)
    original_filename = db.Column(db.String(200), nullable=False)
    file_size = db.Column(db.Integer, nullable=False)
    file_type = db.Column(db.String(50), nullable=False)
    upload_date = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

class ProcessingRecord(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    task_id = db.Column(db.String(100), unique=True, nullable=False)
    command = db.Column(db.String(50), nullable=False)
    input_files = db.Column(db.JSON, nullable=False)
    output_file = db.Column(db.String(200), nullable=False)
    status = db.Column(db.String(20), default='pending')
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    completed_at = db.Column(db.DateTime)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

# --- Configuration ---
UPLOAD_FOLDER = 'uploads'
PROCESSED_FOLDER = 'processed'
ALLOWED_EXTENSIONS = {'pdf'}

# Create folders if they don't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(PROCESSED_FOLDER, exist_ok=True)

# --- Task Management ---
app.task_results = {}
app.task_timestamps = {}

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

def cleanup_old_tasks():
    """Remove tasks older than 1 hour"""
    current_time = time.time()
    expired_tasks = [
        task_id for task_id, timestamp in app.task_timestamps.items()
        if current_time - timestamp > 3600  # 1 hour
    ]
    for task_id in expired_tasks:
        if task_id in app.task_results:
            del app.task_results[task_id]
        if task_id in app.task_timestamps:
            del app.task_timestamps[task_id]

# --- Helper Functions ---
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def format_bytes(bytes, decimals=2):
    if bytes == 0:
        return '0 Bytes'
    k = 1024
    dm = decimals if decimals >= 0 else 0
    sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    i = int(math.floor(math.log(bytes) / math.log(k)))
    return f"{round(bytes / math.pow(k, i), dm)} {sizes[i]}"

# --- Authentication Routes ---
@app.route('/register', methods=['POST'])
def register():
    try:
        if not request.is_json:
            return jsonify({'error': 'Content-Type must be application/json'}), 400
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Invalid JSON data'}), 400
        
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        
        if not username or not email or not password:
            return jsonify({'error': 'Username, email, and password are required'}), 400
        
        if len(password) < 6:
            return jsonify({'error': 'Password must be at least 6 characters long'}), 400
        
        if User.query.filter_by(username=username).first():
            return jsonify({'error': 'Username already exists'}), 400
        
        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'Email already exists'}), 400
        
        user = User(
            username=username,
            email=email,
            password_hash=generate_password_hash(password)
        )
        db.session.add(user)
        db.session.commit()
        
        return jsonify({'message': 'User registered successfully'}), 201
        
    except Exception as e:
        print(f"Registration error: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/login', methods=['POST'])
def login():
    try:
        if not request.is_json:
            return jsonify({'error': 'Content-Type must be application/json'}), 400
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Invalid JSON data'}), 400
        
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({'error': 'Username and password are required'}), 400
        
        user = User.query.filter_by(username=username).first()
        if user and check_password_hash(user.password_hash, password):
            login_user(user)
            return jsonify({'message': 'Logged in successfully'}), 200
        
        return jsonify({'error': 'Invalid username or password'}), 401
        
    except Exception as e:
        print(f"Login error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return jsonify({'message': 'Logged out successfully'}), 200

@app.route('/profile')
@login_required
def profile():
    return jsonify({
        'id': current_user.id,
        'username': current_user.username,
        'email': current_user.email,
        'created_at': current_user.created_at.isoformat()
    })

# --- Main Routes ---
@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/upload', methods=['POST'])
@login_required
def upload_file():
    if 'file' not in request.files:
        abort(400, "No file part")
    
    file = request.files['file']
    if file.filename == '':
        abort(400, "No selected file")
    
    if file and allowed_file(file.filename):
        # Generate unique filename
        filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4().hex}_{filename}"
        filepath = os.path.join(UPLOAD_FOLDER, unique_filename)
        
        # Save file
        file.save(filepath)
        
        # Record file in database
        file_record = FileRecord(
            filename=unique_filename,
            original_filename=filename,
            file_size=os.path.getsize(filepath),
            file_type='pdf',
            user_id=current_user.id
        )
        db.session.add(file_record)
        db.session.commit()
        
        return jsonify({
            'key': unique_filename,
            'filename': filename,
            'id': file_record.id
        })
    
    abort(400, "Invalid file type")

@app.route('/files')
@login_required
def get_user_files():
    """Get all files uploaded by the current user"""
    files = FileRecord.query.filter_by(user_id=current_user.id).order_by(FileRecord.upload_date.desc()).all()
    return jsonify([{
        'id': f.id,
        'filename': f.filename,
        'original_filename': f.original_filename,
        'file_size': f.file_size,
        'upload_date': f.upload_date.isoformat()
    } for f in files])

@app.route('/process', methods=['POST'])
@login_required
def process_pdf():
    data = request.json
    command = data.get('command')
    file_keys = data.get('file_keys', [])
    params = data.get('params', {})
    
    if not command or not file_keys:
        abort(400, "Missing command or file_keys")
    
    try:
        # Clean up old tasks first
        cleanup_old_tasks()
        
        result = None
        
        if command == 'merge':
            result = merge_pdfs(file_keys)
        elif command == 'split':
            result = split_pdf(file_keys[0], params)
        elif command == 'compress':
            result = compress_pdf(file_keys[0], params)
        elif command == 'rotate':
            result = rotate_pdf(file_keys[0], params)
        else:
            abort(400, f"Unknown command: {command}")
        
        # For compatibility with the frontend, return a task_id
        # In this simplified version, we process immediately
        task_id = str(uuid.uuid4())
        
        # Store the result and timestamp
        app.task_results[task_id] = result
        app.task_timestamps[task_id] = time.time()
        
        # Record processing in database
        processing_record = ProcessingRecord(
            task_id=task_id,
            command=command,
            input_files=file_keys,
            output_file=result['key'],
            status='completed',
            completed_at=datetime.now(timezone.utc),
            user_id=current_user.id
        )
        db.session.add(processing_record)
        db.session.commit()
        
        return jsonify({'task_id': task_id}), 202
        
    except Exception as e:
        abort(500, f"Processing failed: {str(e)}")

@app.route('/task/<task_id>')
@login_required
def task_status(task_id):
    """Get the status of a task"""
    # Clean up old tasks first
    cleanup_old_tasks()
    
    if task_id not in app.task_results:
        abort(404, "Task not found")
    
    result = app.task_results[task_id]
    
    # Return the result as if the task completed successfully
    return jsonify({
        'status': 'SUCCESS',
        'result': result
    })

@app.route('/history')
@login_required
def get_processing_history():
    """Get processing history for the current user"""
    history = ProcessingRecord.query.filter_by(user_id=current_user.id).order_by(ProcessingRecord.created_at.desc()).all()
    return jsonify([{
        'id': h.id,
        'task_id': h.task_id,
        'command': h.command,
        'input_files': h.input_files,
        'output_file': h.output_file,
        'status': h.status,
        'created_at': h.created_at.isoformat(),
        'completed_at': h.completed_at.isoformat() if h.completed_at else None
    } for h in history])

# --- PDF Processing Functions ---
def merge_pdfs(file_keys):
    """Merge multiple PDFs into one"""
    writer = PdfWriter()
    output_filename = f"merged_{uuid.uuid4().hex}.pdf"
    output_path = os.path.join(PROCESSED_FOLDER, output_filename)
    
    for key in file_keys:
        file_path = os.path.join(UPLOAD_FOLDER, key)
        if os.path.exists(file_path):
            reader = PdfReader(file_path)
            for page in reader.pages:
                writer.add_page(page)
    
    with open(output_path, 'wb') as output_file:
        writer.write(output_file)
    
    return {
        'key': output_filename,
        'filename': output_filename,
        'size': os.path.getsize(output_path)
    }

def split_pdf(file_key, params):
    """Split PDF into multiple files by pages"""
    file_path = os.path.join(UPLOAD_FOLDER, file_key)
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File {file_key} not found")
    
    pdf = pikepdf.open(file_path)
    pages = params.get('pages', '')
    
    if not pages:
        # Split every page
        for i, page in enumerate(pdf.pages):
            new_pdf = pikepdf.new()
            new_pdf.pages.append(page)
            split_filename = f"split_page_{i+1}_{uuid.uuid4().hex}.pdf"
            split_path = os.path.join(PROCESSED_FOLDER, split_filename)
            new_pdf.save(split_path)
    else:
        # Parse page ranges like "1-3,5,7-9"
        page_ranges = []
        for part in pages.split(','):
            if '-' in part:
                start, end = map(int, part.split('-'))
                page_ranges.extend(range(start, end + 1))
            else:
                page_ranges.append(int(part))
        
        for i, page_num in enumerate(page_ranges):
            if 1 <= page_num <= len(pdf.pages):
                new_pdf = pikepdf.new()
                new_pdf.pages.append(pdf.pages[page_num - 1])
                split_filename = f"split_page_{page_num}_{uuid.uuid4().hex}.pdf"
                split_path = os.path.join(PROCESSED_FOLDER, split_filename)
                new_pdf.save(split_path)
    
    # Return the first split file for now (in a real app, you'd return all files)
    first_file = [f for f in os.listdir(PROCESSED_FOLDER) if f.startswith('split_page_')][0]
    first_path = os.path.join(PROCESSED_FOLDER, first_file)
    
    return {
        'key': first_file,
        'filename': first_file,
        'size': os.path.getsize(first_path)
    }

def compress_pdf(file_key, params):
    """Compress PDF file"""
    file_path = os.path.join(UPLOAD_FOLDER, file_key)
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File {file_key} not found")
    
    quality = params.get('quality', 'medium')
    output_filename = f"compressed_{uuid.uuid4().hex}.pdf"
    output_path = os.path.join(PROCESSED_FOLDER, output_filename)
    
    pdf = pikepdf.open(file_path)
    
    # Apply compression based on quality setting
    if quality == 'low':
        pdf.save(output_path, linearize=True, compress_streams=True, preserve_pdfa=False)
    elif quality == 'high':
        pdf.save(output_path, linearize=True, compress_streams=False, preserve_pdfa=True)
    else:  # medium
        pdf.save(output_path, linearize=True, compress_streams=True, preserve_pdfa=True)
    
    return {
        'key': output_filename,
        'filename': output_filename,
        'size': os.path.getsize(output_path)
    }

def rotate_pdf(file_key, params):
    """Rotate PDF pages"""
    file_path = os.path.join(UPLOAD_FOLDER, file_key)
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File {file_key} not found")
    
    angle = int(params.get('angle', '90'))
    output_filename = f"rotated_{uuid.uuid4().hex}.pdf"
    output_path = os.path.join(PROCESSED_FOLDER, output_filename)
    
    pdf = pikepdf.open(file_path)
    
    # Rotate all pages
    for page in pdf.pages:
        page.rotate(angle, relative=True)
    
    pdf.save(output_path)
    
    return {
        'key': output_filename,
        'filename': output_filename,
        'size': os.path.getsize(output_path)
    }

@app.route('/download')
@login_required
def download_file():
    key = request.args.get('key')
    if not key:
        abort(400, "Missing 'key' parameter")
    
    file_path = os.path.join(PROCESSED_FOLDER, key)
    if not os.path.exists(file_path):
        abort(404, "File not found")
    
    return send_file(
        file_path,
        as_attachment=True,
        download_name=key
    )

# --- Database Initialization ---
def init_db():
    with app.app_context():
        db.create_all()
        print("Database tables created successfully!")

if __name__ == '__main__':
    print("Starting PDF Tool server with PostgreSQL...")
    print("Initializing database...")
    init_db()
    print("Access the frontend at: http://localhost:5000")
    print("Press Ctrl+C to stop the server")
    app.run(host='0.0.0.0', port=5000, debug=True)
