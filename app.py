import os
import uuid
import math
import time
import logging
from datetime import datetime, timezone
from flask import Flask, request, jsonify, send_file, abort, render_template_string
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from flask_mail import Mail, Message
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature
from pypdf import PdfReader, PdfWriter
import pikepdf
import io
import tempfile

# Twilio and Redis for OTP
try:
    from twilio.rest import Client
    from twilio.base.exceptions import TwilioRestException
    import redis
    TWILIO_AVAILABLE = True
    REDIS_AVAILABLE = True
except ImportError:
    TWILIO_AVAILABLE = False
    REDIS_AVAILABLE = False
    logging.warning("Twilio or Redis not available - OTP functionality disabled")

import random
import string

# AI/ML and Advanced Features
try:
    from flask_restx import Api, Resource, fields
    from functools import wraps
    RESTX_AVAILABLE = True
except ImportError:
    RESTX_AVAILABLE = False
    logging.warning("Flask-RESTX not available - API documentation disabled")

try:
    from opentelemetry import trace
    from opentelemetry.instrumentation.flask import FlaskInstrumentor
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor
    from opentelemetry.exporter.jaeger.thrift import JaegerExporter
    from opentelemetry.sdk.resources import Resource, SERVICE_NAME
    TELEMETRY_AVAILABLE = True
except ImportError:
    TELEMETRY_AVAILABLE = False
    logging.warning("OpenTelemetry not available - observability disabled")

# --- App Initialization ---
app = Flask(__name__, static_folder='static', static_url_path='')
app.config['SECRET_KEY'] = os.environ.get('FLASK_SECRET_KEY', 'dev-secret-key-change-in-production')
# Use SQLite for development - no external database required
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///pdf_tool.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize extensions
db = SQLAlchemy(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

# Flask-Mail configuration
app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', 587))
app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS', 'true').lower() == 'true'
app.config['MAIL_USE_SSL'] = os.getenv('MAIL_USE_SSL', 'false').lower() == 'true'
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME', '')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD', '')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER', 'noreply@pdf-tool.com')

mail = Mail(app)
serializer = URLSafeTimedSerializer(app.config['SECRET_KEY'])

# Twilio configuration for OTP
if TWILIO_AVAILABLE:
    twilio_client = Client(
        os.getenv('TWILIO_ACCOUNT_SID', ''),
        os.getenv('TWILIO_AUTH_TOKEN', '')
    )
    twilio_phone = os.getenv('TWILIO_PHONE_NUMBER', '')

# Redis configuration for OTP storage
if REDIS_AVAILABLE:
    try:
        redis_client = redis.Redis(
            host=os.getenv('REDIS_HOST', 'localhost'),
            port=int(os.getenv('REDIS_PORT', 6379)),
            db=int(os.getenv('REDIS_DB', 0)),
            decode_responses=True
        )
        # Test connection
        redis_client.ping()
    except Exception as e:
        logging.warning(f"Redis connection failed: {e}")
        REDIS_AVAILABLE = False

# --- Database Models ---
class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    phone_number = db.Column(db.String(20), unique=True, nullable=True)
    password_hash = db.Column(db.String(200), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    google_drive_token = db.Column(db.Text, nullable=True)  # For Google Drive integration
    webhook_url = db.Column(db.String(255), nullable=True)  # For Zapier/Make integration
    suggested_workflow = db.Column(db.JSON, nullable=True)  # For personalized workflows
    files = db.relationship('FileRecord', backref='user', lazy=True)

class FileRecord(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(200), nullable=False)
    original_filename = db.Column(db.String(200), nullable=False)
    file_size = db.Column(db.Integer, nullable=False)
    file_type = db.Column(db.String(50), nullable=False)
    doc_type = db.Column(db.String(50), nullable=True)  # For document classification
    doc_metadata = db.Column(db.JSON, nullable=True)  # For document metadata
    upload_date = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    team_id = db.Column(db.Integer, db.ForeignKey('team.id'), nullable=True)  # For team management

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

class Team(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    files = db.relationship('FileRecord', backref='team', lazy=True)
    memberships = db.relationship('TeamMembership', backref='team', lazy=True)

class TeamMembership(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    team_id = db.Column(db.Integer, db.ForeignKey('team.id'), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='member')  # 'admin' or 'member'
    joined_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    user = db.relationship('User', backref='team_memberships')

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
@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'GET':
        return app.send_static_file('index.html')
    
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
        print(f"Registration error occurred")  # Don't expose error details
        db.session.rollback()
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'GET':
        return app.send_static_file('index.html')
    
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
        print(f"Login error occurred")  # Don't expose error details
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
        'phone_number': current_user.phone_number,
        'created_at': current_user.created_at.isoformat()
    })

# --- Password Reset Routes ---
@app.route('/request-password-reset', methods=['POST'])
def request_password_reset():
    try:
        if not request.is_json:
            return jsonify({'error': 'Content-Type must be application/json'}), 400
        
        data = request.get_json()
        email = data.get('email')
        
        if not email:
            return jsonify({'error': 'Email is required'}), 400
        
        user = User.query.filter_by(email=email).first()
        if not user:
            # Don't reveal if email exists or not for security
            return jsonify({'message': 'If the email exists, a password reset link has been sent'}), 200
        
        # Generate reset token
        token = serializer.dumps(user.email, salt=os.environ.get('PASSWORD_RESET_SALT', 'default-salt-for-dev'))
        
        # Create reset URL
        reset_url = f"{request.host_url}reset-password/{token}"
        
        # Send email
        try:
            msg = Message(
                'Password Reset Request',
                recipients=[user.email],
                body=f'''To reset your password, visit the following link:
{reset_url}

If you did not make this request, simply ignore this email.

This link will expire in 1 hour.
'''
            )
            mail.send(msg)
            return jsonify({'message': 'Password reset email sent successfully'}), 200
        except Exception as e:
            logging.error(f"Failed to send email: {e}")
            return jsonify({'error': 'Failed to send password reset email'}), 500
            
    except Exception as e:
        logging.error(f"Password reset request error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/reset-password/<token>', methods=['POST'])
def reset_password(token):
    try:
        if not request.is_json:
            return jsonify({'error': 'Content-Type must be application/json'}), 400
        
        data = request.get_json()
        new_password = data.get('new_password')
        
        if not new_password or len(new_password) < 6:
            return jsonify({'error': 'New password must be at least 6 characters long'}), 400
        
        try:
            email = serializer.loads(token, salt=os.environ.get('PASSWORD_RESET_SALT', 'default-salt-for-dev'), max_age=3600)  # 1 hour expiry
        except SignatureExpired:
            return jsonify({'error': 'Password reset link has expired'}), 400
        except BadSignature:
            return jsonify({'error': 'Invalid password reset link'}), 400
        
        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Update password
        user.password_hash = generate_password_hash(new_password)
        db.session.commit()
        
        return jsonify({'message': 'Password reset successfully'}), 200
        
    except Exception as e:
        logging.error(f"Password reset error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

# --- OTP Authentication Routes ---
@app.route('/send-otp', methods=['POST'])
def send_otp():
    if not TWILIO_AVAILABLE or not REDIS_AVAILABLE:
        return jsonify({'error': 'OTP service not available'}), 503
    
    try:
        if not request.is_json:
            return jsonify({'error': 'Content-Type must be application/json'}), 400
        
        data = request.get_json()
        phone_number = data.get('phone_number')
        
        if not phone_number:
            return jsonify({'error': 'Phone number is required'}), 400
        
        # Generate 6-digit OTP
        otp = ''.join(random.choices(string.digits, k=6))
        
        # Store OTP in Redis with 5-minute expiry
        redis_client.setex(f"otp:{phone_number}", 300, otp)
        
        # Send OTP via SMS
        try:
            message = twilio_client.messages.create(
                body=f'Your PDF Tool verification code is: {otp}. Valid for 5 minutes.',
                from_=twilio_phone,
                to=phone_number
            )
            return jsonify({'message': 'OTP sent successfully'}), 200
        except TwilioRestException as e:
            logging.error(f"Twilio error: {e}")
            return jsonify({'error': 'Failed to send OTP'}), 500
            
    except Exception as e:
        logging.error(f"Send OTP error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/verify-otp', methods=['POST'])
def verify_otp():
    if not TWILIO_AVAILABLE or not REDIS_AVAILABLE:
        return jsonify({'error': 'OTP service not available'}), 503
    
    try:
        if not request.is_json:
            return jsonify({'error': 'Content-Type must be application/json'}), 400
        
        data = request.get_json()
        phone_number = data.get('phone_number')
        otp = data.get('otp')
        
        if not phone_number or not otp:
            return jsonify({'error': 'Phone number and OTP are required'}), 400
        
        # Verify OTP from Redis
        stored_otp = redis_client.get(f"otp:{phone_number}")
        if not stored_otp or stored_otp != otp:
            return jsonify({'error': 'Invalid or expired OTP'}), 400
        
        # Find or create user
        user = User.query.filter_by(phone_number=phone_number).first()
        if not user:
            # Create new user with phone number
            username = f"user_{phone_number[-4:]}"  # Use last 4 digits as username
            user = User(
                username=username,
                email=f"{username}@phone.com",  # Placeholder email
                phone_number=phone_number,
                password_hash=generate_password_hash('')  # No password for OTP users
            )
            db.session.add(user)
            db.session.commit()
        
        # Login user
        login_user(user)
        
        # Clear OTP from Redis
        redis_client.delete(f"otp:{phone_number}")
        
        return jsonify({'message': 'OTP verified successfully', 'user': {
            'id': user.id,
            'username': user.username,
            'phone_number': user.phone_number
        }}), 200
        
    except Exception as e:
        logging.error(f"Verify OTP error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

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
        
        try:
            from tasks import on_upload_processing
            on_upload_processing.delay(file_record.id, filepath)
        except ImportError:
            logging.warning("Celery tasks not available for post-upload processing.")

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
        elif command == 'pdf_to_word':
            result = convert_to_word(file_keys[0], params)
        elif command == 'pdf_to_excel':
            result = convert_to_excel(file_keys[0], params)
        elif command == 'pdf_to_jpg':
            result = convert_to_jpg(file_keys[0], params)
        elif command == 'protect':
            result = protect_pdf(file_keys[0], params)
        elif command == 'unlock':
            result = unlock_pdf(file_keys[0], params)
        elif command == 'watermark':
            result = add_watermark(file_keys[0], params)
        elif command == 'page_numbers':
            result = add_page_numbers(file_keys[0], params)
        elif command == 'header_footer':
            result = add_header_footer(file_keys[0], params)
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

# --- NEW ADVANCED FEATURES ---

def convert_to_word(file_key, params):
    """Convert PDF to Word document"""
    try:
        import pdfplumber
        import docx
    except ImportError:
        raise ImportError("pdfplumber and python-docx are required for PDF to Word conversion")
    
    file_path = os.path.join(UPLOAD_FOLDER, file_key)
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File {file_key} not found")
    
    output_filename = f"converted_{uuid.uuid4().hex}.docx"
    output_path = os.path.join(PROCESSED_FOLDER, output_filename)
    
    # Create Word document
    doc = docx.Document()
    
    # Extract text with layout preservation
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text(layout=True)
            if text:
                doc.add_paragraph(text)
            doc.add_page_break()
    
    doc.save(output_path)
    
    return {
        'key': output_filename,
        'filename': output_filename,
        'size': os.path.getsize(output_path)
    }

def convert_to_excel(file_key, params):
    """Convert PDF tables to Excel"""
    try:
        import pdfplumber
        import openpyxl
    except ImportError:
        raise ImportError("pdfplumber and openpyxl are required for PDF to Excel conversion")
    
    file_path = os.path.join(UPLOAD_FOLDER, file_key)
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File {file_key} not found")
    
    output_filename = f"converted_{uuid.uuid4().hex}.xlsx"
    output_path = os.path.join(PROCESSED_FOLDER, output_filename)
    
    # Create Excel workbook
    wb = openpyxl.Workbook()
    ws = wb.active
    
    # Extract tables from PDF
    with pdfplumber.open(file_path) as pdf:
        for page_num, page in enumerate(pdf.pages):
            tables = page.extract_tables()
            for table_idx, table in enumerate(tables):
                for row_idx, row in enumerate(table):
                    for col_idx, cell in enumerate(row):
                        if cell:  # Only add non-empty cells
                            ws.cell(row=row_idx + 1, column=col_idx + 1, value=cell)
    
    wb.save(output_path)
    
    return {
        'key': output_filename,
        'filename': output_filename,
        'size': os.path.getsize(output_path)
    }

def convert_to_jpg(file_key, params):
    """Convert PDF to JPG images"""
    try:
        # Try pdf2image first, fall back to PyMuPDF if poppler not available
        try:
            from pdf2image import convert_from_path
            from PIL import Image
            
            file_path = os.path.join(UPLOAD_FOLDER, file_key)
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"File {file_key} not found")
            
            pages = params.get('pages', 'all')
            dpi = int(params.get('dpi', '150'))
            
            # Convert PDF to images
            images = convert_from_path(file_path, dpi=dpi)
            
            # Save images
            image_files = []
            for i, img in enumerate(images):
                if pages == 'all' or str(i+1) in pages.split(','):
                    image_filename = f"converted_page_{i+1}_{uuid.uuid4().hex}.jpg"
                    image_path = os.path.join(PROCESSED_FOLDER, image_filename)
                    img.save(image_path, 'JPEG', quality=95)
                    image_files.append(image_filename)
            
            # Return the first image for now (in a real app, you'd return all images)
            first_image = image_files[0] if image_files else None
            if first_image:
                first_path = os.path.join(PROCESSED_FOLDER, first_image)
                return {
                    'key': first_image,
                    'filename': first_image,
                    'size': os.path.getsize(first_path)
                }
            else:
                raise ValueError("No images were created")
                
        except Exception as e:
            # Fallback to PyMuPDF if pdf2image fails
            if 'pymupdf' in str(e).lower() or 'poppler' in str(e).lower():
                import fitz  # PyMuPDF
                from PIL import Image
                
                file_path = os.path.join(UPLOAD_FOLDER, file_key)
                if not os.path.exists(file_path):
                    raise FileNotFoundError(f"File {file_key} not found")
                
                pages = params.get('pages', 'all')
                dpi = int(params.get('dpi', '150'))
                
                # Open PDF with PyMuPDF
                pdf_document = fitz.open(file_path)
                
                # Convert pages to images
                image_files = []
                for page_num in range(pdf_document.page_count):
                    if pages == 'all' or str(page_num + 1) in pages.split(','):
                        page = pdf_document[page_num]
                        
                        # Calculate zoom factor for DPI
                        zoom = dpi / 72.0
                        mat = fitz.Matrix(zoom, zoom)
                        
                        # Render page to image
                        pix = page.get_pixmap(matrix=mat)
                        img_data = pix.tobytes("ppm")
                        
                        # Convert to PIL Image and save as JPG
                        img = Image.frombytes("RGB", [pix.width, pix.height], img_data)
                        image_filename = f"converted_page_{page_num + 1}_{uuid.uuid4().hex}.jpg"
                        image_path = os.path.join(PROCESSED_FOLDER, image_filename)
                        img.save(image_path, 'JPEG', quality=95)
                        image_files.append(image_filename)
                
                pdf_document.close()
                
                # Return the first image
                first_image = image_files[0] if image_files else None
                if first_image:
                    first_path = os.path.join(PROCESSED_FOLDER, first_image)
                    return {
                        'key': first_image,
                        'filename': first_image,
                        'size': os.path.getsize(first_path)
                    }
                else:
                    raise ValueError("No images were created")
            else:
                raise e
                
    except ImportError as e:
        raise ImportError("Either pdf2image+Pillow or PyMuPDF+Pillow are required for PDF to JPG conversion")

def protect_pdf(file_key, params):
    """Encrypt PDF with password protection"""
    file_path = os.path.join(UPLOAD_FOLDER, file_key)
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File {file_key} not found")
    
    password = params.get('password', '')
    if not password:
        raise ValueError("Password is required for PDF protection")
    
    output_filename = f"protected_{uuid.uuid4().hex}.pdf"
    output_path = os.path.join(PROCESSED_FOLDER, output_filename)
    
    # Open and encrypt PDF
    pdf = pikepdf.open(file_path)
    pdf.save(
        output_path,
        encryption=pikepdf.Encryption(owner=password, user=password, R=4)
    )
    
    return {
        'key': output_filename,
        'filename': output_filename,
        'size': os.path.getsize(output_path)
    }

def unlock_pdf(file_key, params):
    """Remove password protection from PDF"""
    file_path = os.path.join(UPLOAD_FOLDER, file_key)
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File {file_key} not found")
    
    password = params.get('password', '')
    if not password:
        raise ValueError("Password is required to unlock PDF")
    
    output_filename = f"unlocked_{uuid.uuid4().hex}.pdf"
    output_path = os.path.join(PROCESSED_FOLDER, output_filename)
    
    # Open encrypted PDF and save without encryption
    pdf = pikepdf.open(file_path, password=password)
    pdf.save(output_path)
    
    return {
        'key': output_filename,
        'filename': output_filename,
        'size': os.path.getsize(output_path)
    }

def add_watermark(file_key, params):
    """Add text watermark to PDF"""
    try:
        from reportlab.pdfgen import canvas
        from reportlab.lib.pagesizes import letter
    except ImportError:
        raise ImportError("reportlab is required for watermarking")
    
    file_path = os.path.join(UPLOAD_FOLDER, file_key)
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File {file_key} not found")
    
    watermark_text = params.get('text', 'CONFIDENTIAL')
    opacity = float(params.get('opacity', '0.3'))
    
    output_filename = f"watermarked_{uuid.uuid4().hex}.pdf"
    output_path = os.path.join(PROCESSED_FOLDER, output_filename)
    
    # Create watermark PDF
    packet = io.BytesIO()
    can = canvas.Canvas(packet, pagesize=letter)
    can.setFont("Helvetica", 40)
    can.setFillAlpha(opacity)
    can.rotate(45)
    can.drawString(200, 100, watermark_text)
    can.save()
    packet.seek(0)
    
    # Read watermark and input PDF
    watermark_pdf = PdfReader(packet)
    watermark_page = watermark_pdf.pages[0]
    
    input_pdf = PdfReader(file_path)
    output_writer = PdfWriter()
    
    # Apply watermark to each page
    for page in input_pdf.pages:
        page.merge_page(watermark_page)
        output_writer.add_page(page)
    
    # Save watermarked PDF
    with open(output_path, "wb") as f:
        output_writer.write(f)
    
    return {
        'key': output_filename,
        'filename': output_filename,
        'size': os.path.getsize(output_path)
    }

def add_page_numbers(file_key, params):
    """Add page numbers to PDF"""
    try:
        from reportlab.pdfgen import canvas
        from reportlab.lib.pagesizes import letter
    except ImportError:
        raise ImportError("reportlab is required for page numbering")
    
    file_path = os.path.join(UPLOAD_FOLDER, file_key)
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File {file_key} not found")
    
    start_number = int(params.get('start', '1'))
    position = params.get('position', 'bottom-right')
    
    output_filename = f"numbered_{uuid.uuid4().hex}.pdf"
    output_path = os.path.join(PROCESSED_FOLDER, output_filename)
    
    input_pdf = PdfReader(file_path)
    output_writer = PdfWriter()
    
    # Add page numbers to each page
    for i, page in enumerate(input_pdf.pages, start_number):
        # Create temporary PDF with page number using NamedTemporaryFile for security
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as temp_file:
            temp_pdf = temp_file.name
        
        try:
            c = canvas.Canvas(temp_pdf, pagesize=letter)
            
            # Position page number based on setting
            if position == 'bottom-right':
                c.drawString(500, 20, str(i))
            elif position == 'bottom-center':
                c.drawString(300, 20, str(i))
            elif position == 'bottom-left':
                c.drawString(100, 20, str(i))
            elif position == 'top-right':
                c.drawString(500, 780, str(i))
            elif position == 'top-center':
                c.drawString(300, 780, str(i))
            elif position == 'top-left':
                c.drawString(100, 780, str(i))
            
            c.save()
            
            # Merge page number with original page
            num_reader = PdfReader(temp_pdf)
            page.merge_page(num_reader.pages[0])
            output_writer.add_page(page)
        finally:
            # Clean up temporary file
            if os.path.exists(temp_pdf):
                os.unlink(temp_pdf)
    
    # Save numbered PDF
    with open(output_path, "wb") as f:
        output_writer.write(f)
    
    return {
        'key': output_filename,
        'filename': output_filename,
        'size': os.path.getsize(output_path)
    }

def add_header_footer(file_key, params):
    """Add headers and footers to PDF"""
    try:
        from reportlab.pdfgen import canvas
        from reportlab.lib.pagesizes import letter
    except ImportError:
        raise ImportError("reportlab is required for headers/footers")
    
    file_path = os.path.join(UPLOAD_FOLDER, file_key)
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File {file_key} not found")
    
    header_text = params.get('header', '')
    footer_text = params.get('footer', '')
    
    output_filename = f"header_footer_{uuid.uuid4().hex}.pdf"
    output_path = os.path.join(PROCESSED_FOLDER, output_filename)
    
    input_pdf = PdfReader(file_path)
    output_writer = PdfWriter()
    
    # Add header/footer to each page
    for page in input_pdf.pages:
        # Create temporary PDF with header/footer using NamedTemporaryFile for security
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as temp_file:
            temp_pdf = temp_file.name
        
        try:
            c = canvas.Canvas(temp_pdf, pagesize=letter)
            
            if header_text:
                c.drawString(100, 800, header_text)
            if footer_text:
                c.drawString(100, 20, footer_text)
            
            c.save()
            
            # Merge header/footer with original page
            hf_reader = PdfReader(temp_pdf)
            page.merge_page(hf_reader.pages[0])
            output_writer.add_page(page)
        finally:
            # Clean up temporary file
            if os.path.exists(temp_pdf):
                os.unlink(temp_pdf)
    
    # Save PDF with headers/footers
    with open(output_path, "wb") as f:
        output_writer.write(f)
    
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
    
    # Prevent path traversal attacks
    if '..' in key or '/' in key or '\\' in key:
        abort(400, "Invalid file key")
    
    file_path = os.path.join(PROCESSED_FOLDER, key)
    
    # Ensure the file is actually within the PROCESSED_FOLDER
    try:
        file_path = os.path.abspath(file_path)
        if not file_path.startswith(os.path.abspath(PROCESSED_FOLDER)):
            abort(400, "Invalid file path")
    except (OSError, ValueError):
        abort(400, "Invalid file path")
    
    if not os.path.exists(file_path):
        abort(404, "File not found")
    
        return send_file(
        file_path,
        as_attachment=True,
        download_name=key
    )

# ============================================================================
# AI-POWERED DOCUMENT INTELLIGENCE ROUTES
# ============================================================================

@app.route('/api/chat-pdf', methods=['POST'])
@login_required
def api_chat_pdf():
    """Chat with PDF using AI"""
    try:
        data = request.json
        file_key = data.get('file_key')
        question = data.get('question')
        
        if not file_key or not question:
            return jsonify({"error": "Missing file_key or question"}), 400
        
        # Find the actual file path
        file_record = FileRecord.query.filter_by(filename=file_key, user_id=current_user.id).first()
        if not file_record:
            return jsonify({"error": "File not found"}), 404
        
        file_path = os.path.join(UPLOAD_FOLDER, file_record.filename)
        if not os.path.exists(file_path):
            return jsonify({"error": "File not found on disk"}), 404
        
        # Import and run the AI task
        try:
            from tasks import chat_with_pdf
            result = chat_with_pdf.delay(file_path, question)
            return jsonify({"task_id": result.id}), 202
        except ImportError:
            return jsonify({"error": "AI features not available"}), 503
        
    except Exception as e:
        logging.error(f"Chat PDF error: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/api/analyze-pdf', methods=['POST'])
@login_required
def api_analyze_pdf():
    """Analyze PDF with AI: summarization, NER, topic modeling"""
    try:
        data = request.json
        file_key = data.get('file_key')
        
        if not file_key:
            return jsonify({"error": "Missing file_key"}), 400
        
        # Find the actual file path
        file_record = FileRecord.query.filter_by(filename=file_key, user_id=current_user.id).first()
        if not file_record:
            return jsonify({"error": "File not found"}), 404
        
        file_path = os.path.join(UPLOAD_FOLDER, file_record.filename)
        if not os.path.exists(file_path):
            return jsonify({"error": "File not found on disk"}), 404
        
        # Import and run the AI task
        try:
            from tasks import analyze_pdf
            result = analyze_pdf.delay(file_path)
            return jsonify({"task_id": result.id}), 202
        except ImportError:
            return jsonify({"error": "AI features not available"}), 503
        
    except Exception as e:
        logging.error(f"Analyze PDF error: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/api/classify-document', methods=['POST'])
@login_required
def api_classify_document():
    """Classify document using MLflow models"""
    try:
        data = request.json
        file_key = data.get('file_key')
        
        if not file_key:
            return jsonify({"error": "Missing file_key"}), 400
        
        # Find the actual file path
        file_record = FileRecord.query.filter_by(filename=file_key, user_id=current_user.id).first()
        if not file_record:
            return jsonify({"error": "File not found"}), 404
        
        file_path = os.path.join(UPLOAD_FOLDER, file_record.filename)
        if not os.path.exists(file_path):
            return jsonify({"error": "File not found on disk"}), 404
        
        # Import and run the AI task
        try:
            from tasks import classify_document
            result = classify_document.delay(file_path)
            return jsonify({"task_id": result.id}), 202
        except ImportError:
            return jsonify({"error": "AI features not available"}), 503
        
    except Exception as e:
        logging.error(f"Classify document error: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/api/multi-document-chat', methods=['POST'])
@login_required
def api_multi_document_chat():
    try:
        data = request.json
        file_keys = data.get('file_keys')
        question = data.get('question')
        
        if not file_keys or not question:
            return jsonify({"error": "Missing file_keys or question"}), 400
        
        file_paths = []
        for file_key in file_keys:
            file_record = FileRecord.query.filter_by(filename=file_key, user_id=current_user.id).first()
            if not file_record:
                return jsonify({"error": f"File not found: {file_key}"}), 404
            
            file_path = os.path.join(UPLOAD_FOLDER, file_record.filename)
            if not os.path.exists(file_path):
                return jsonify({"error": f"File not found on disk: {file_key}"}), 404
            file_paths.append(file_path)
        
        try:
            from tasks import multi_document_chat
            result = multi_document_chat.delay(file_paths, question)
            return jsonify({"task_id": result.id}), 202
        except ImportError:
            return jsonify({"error": "AI features not available"}), 503
        
    except Exception as e:
        logging.error(f"Multi-document chat error: {e}")
        return jsonify({"error": "Internal server error"}), 500

# ============================================================================
# WORKFLOW AUTOMATION ROUTES
# ============================================================================

@app.route('/api/workflow', methods=['POST'])
@login_required
def api_workflow():
    """Execute automated workflow with chained PDF operations"""
    try:
        data = request.json
        file_key = data.get('file_key')
        commands = list(data.get('commands', []))
        
        if not file_key or not commands:
            return jsonify({"error": "Missing file_key or commands"}), 400
        
        # Find the actual file path
        file_record = FileRecord.query.filter_by(filename=file_key, user_id=current_user.id).first()
        if not file_record:
            return jsonify({"error": "File not found"}), 404
        
        file_path = os.path.join(UPLOAD_FOLDER, file_record.filename)
        if not os.path.exists(file_path):
            return jsonify({"error": "File not found on disk"}), 404
        
        # Import and run the workflow task
        try:
            from tasks import workflow_master
            result = workflow_master.delay(file_path, commands)
            return jsonify({"task_id": result.id}), 202
        except ImportError:
            return jsonify({"error": "Workflow features not available"}), 503
        
    except Exception as e:
        logging.error(f"Workflow error: {e}")
        return jsonify({"error": "Internal server error"}), 500

# ============================================================================
# Cloud Storage Integration
# ============================================================================

from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaIoBaseDownload
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
import json
import io

SCOPES = ['https://www.googleapis.com/auth/drive.readonly', 'https://www.googleapis.com/auth/drive.file']
CLIENT_CONFIG = json.loads(os.getenv('GOOGLE_CLIENT_CONFIG', '{}'))

@app.route('/connect-drive')
@login_required
def connect_drive():
    flow = InstalledAppFlow.from_client_config(CLIENT_CONFIG, SCOPES)
    flow.redirect_uri = url_for('oauth2callback', _external=True)
    authorization_url, state = flow.authorization_url(access_type='offline', include_granted_scopes='true')
    session['state'] = state
    return redirect(authorization_url)

@app.route('/oauth2callback')
@login_required
def oauth2callback():
    state = session['state']
    flow = InstalledAppFlow.from_client_config(CLIENT_CONFIG, SCOPES, state=state)
    flow.redirect_uri = url_for('oauth2callback', _external=True)
    authorization_response = request.url
    flow.fetch_token(authorization_response=authorization_response)
    credentials = flow.credentials
    current_user.google_drive_token = credentials.to_json()
    db.session.commit()
    return redirect(url_for('index'))

@app.route('/list-drive-files', methods=['GET'])
@login_required
def list_drive_files():
    try:
        if not current_user.google_drive_token:
            return jsonify({"error": "Drive not connected"}), 401
        
        creds = Credentials.from_authorized_user_info(json.loads(current_user.google_drive_token), SCOPES)
        if creds.expired and creds.refresh_token:
            creds.refresh(Request())
        
        service = build('drive', 'v3', credentials=creds)
        results = service.files().list(q="mimeType='application/pdf'", pageSize=10, fields="nextPageToken, files(id, name)").execute()
        files = results.get('files', [])
        return jsonify(files), 200
    except Exception as e:
        logger.error(f"List drive error: {e}\n{traceback.format_exc()}")
        return jsonify({"error": "Failed to list files"}), 500

@app.route('/import-drive-file', methods=['POST'])
@login_required
def import_drive_file():
    try:
        data = request.json
        drive_file_id = data.get('drive_file_id')
        if not drive_file_id:
            return jsonify({"error": "drive_file_id is required"}), 400
        
        from tasks import import_from_drive
        task = import_from_drive.delay(current_user.id, drive_file_id)
        return jsonify({"task_id": task.id}), 202
    except Exception as e:
        logger.error(f"Import drive file error: {e}\n{traceback.format_exc()}")
        return jsonify({"error": "Failed to import file"}), 500

# ============================================================================
# TASK STATUS ROUTES
# ============================================================================

@app.route('/api/task-status/<task_id>', methods=['GET'])
@login_required
def celery_task_status(task_id):
    """Get the status of a Celery task"""
    try:
        from celery.result import AsyncResult
        from tasks import celery
        
        task = AsyncResult(task_id, app=celery)
        if task.state == 'PENDING':
            return jsonify({'status': 'PENDING'})
        elif task.state != 'FAILURE':
            return jsonify({'status': 'SUCCESS', 'result': task.info})
        else:
            return jsonify({'status': 'FAILURE', 'error': str(task.info)})
    except Exception as e:
        logging.error(f"Task status error: {e}")
        return jsonify({"error": "Internal server error"}), 500

# ============================================================================
# PUBLIC API (RESTX)
# ============================================================================

if RESTX_AVAILABLE:
    # Initialize RESTX API
    from flask import Blueprint
    api_bp = Blueprint('api', __name__)
    api = Api(api_bp, version='1.0', title='PDF Tool API', 
              description='API for PDF processing', doc='/docs/')
    
    # Models
    upload_model = api.model('Upload', {
        'file_key': fields.String(required=True, description='File key'),
        'operation': fields.String(required=True, description='Operation e.g., compress')
    })
    
    # Namespace
    ns = api.namespace('pdf', description='PDF operations')
    
    def api_key_required(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            api_key = request.headers.get('X-API-KEY')
            if api_key != os.getenv('API_KEY', 'default-api-key'):
                logging.warning("Invalid API key attempt")
                api.abort(403, 'Invalid API key')
            return f(*args, **kwargs)
        return decorated
    
    @ns.route('/process')
    class ProcessPDF(Resource):
        @ns.doc('process_pdf')
        @ns.expect(upload_model)
        @api_key_required
        def post(self):
            try:
                data = api.payload
                file_key = data.get('file_key')
                operation = data.get('operation')
                
                if not file_key or not operation:
                    api.abort(400, 'Missing file_key or operation')
                
                # Import and run the task
                try:
                    from tasks import process_pdf_task
                    result = process_pdf_task.delay(operation, [file_key])
                    return {'task_id': result.id}, 202
                except ImportError:
                    api.abort(503, 'Processing features not available')
                    
            except ValueError as e:
                api.abort(400, str(e))
            except Exception as e:
                logging.error(f"API error: {e}")
                api.abort(500, f'Internal error: {str(e)}')
    
    # Register the API blueprint
    app.register_blueprint(api_bp, url_prefix='/api/v1')

# ============================================================================
# OBSERVABILITY SETUP
# ============================================================================

if TELEMETRY_AVAILABLE:
    try:
        # Set up resource
        resource = Resource(attributes={SERVICE_NAME: "pdf-tool-app"})
        
        # Tracer provider
        trace.set_tracer_provider(TracerProvider(resource=resource))
        
        # Jaeger exporter
        jaeger_exporter = JaegerExporter(
            agent_host_name=os.getenv('JAEGER_HOST', 'localhost'),
            agent_port=int(os.getenv('JAEGER_PORT', 6831))
        )
        trace.get_tracer_provider().add_span_processor(BatchSpanProcessor(jaeger_exporter))
        
        # Instrument Flask
        FlaskInstrumentor().instrument_app(app)
        
        logging.info("OpenTelemetry instrumentation enabled")
    except Exception as e:
        logging.error(f"Failed to setup OpenTelemetry: {e}")
        TELEMETRY_AVAILABLE = False

# --- Database Initialization ---
def init_db():
    with app.app_context():
        db.create_all()
        
        # Create a default user if none exists
        if User.query.first() is None:
            # Generate a secure random password
            import secrets
            import string
            alphabet = string.ascii_letters + string.digits
            secure_password = ''.join(secrets.choice(alphabet) for _ in range(16))
            
            default_user = User(
                username='admin',
                email='admin@example.com',
                password_hash=generate_password_hash(secure_password)
            )
            db.session.add(default_user)
            db.session.commit()
            print(f"Default user created: admin/{secure_password}")
            print("⚠️  IMPORTANT: Save this password securely!")
        
        print("Database tables created successfully!")

if __name__ == '__main__':
    print("Starting PDF Tool server with SQLite...")
    print("Initializing database...")
    init_db()
    print("Access the frontend at: http://localhost:5000")
    print("Press Ctrl+C to stop the server")
    
    # Use environment variable to control debug mode
    debug_mode = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    app.run(host='0.0.0.0', port=5000, debug=debug_mode)
