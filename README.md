
# Enhanced PDF Processing Tool

A comprehensive, enterprise-grade PDF processing application with AI-powered features, advanced document manipulation, and robust error handling.

## 🚀 **New Features (Latest Update)**

### **Enhanced PDF Processing Engine**
- **Advanced PDF Operations**: 50+ PDF manipulation features with validation
- **Document Conversion**: Support for Word, PowerPoint, Excel, HTML ↔ PDF
- **Workflow Automation**: Chain multiple operations for complex workflows
- **Bulk Processing**: Process multiple files simultaneously
- **Error Handling**: Comprehensive validation and error management

### **AI-Powered Features**
- **Chat with PDF**: Interactive Q&A with document content
- **AI Analysis**: Intelligent document summarization and insights
- **Document Classification**: ML-based document type identification
- **Automated Workflow**: AI-driven process optimization

### **Security & Compliance**
- **Digital Signatures**: PKI-based document signing
- **Password Protection**: AES-128 encryption for sensitive documents
- **PDF/A Compliance**: Long-term archival format support
- **Audit Logging**: Complete operation tracking and logging

## ✨ **Core Features**

### **PDF Manipulation**
- **Merge PDFs**: Combine multiple documents into one
- **Split PDF**: Separate into individual pages
- **Extract Pages**: Select specific pages
- **Remove Pages**: Delete unwanted content
- **Organize Pages**: Custom page ordering
- **Rotate PDF**: 90°, 180°, 270° rotation
- **Compress PDF**: Reduce file size
- **Watermark**: Add text/image watermarks
- **Page Numbers**: Automatic numbering
- **Protect/Unlock**: Password encryption/decryption

### **Document Conversion**
- **Word → PDF**: Preserve formatting and structure
- **PowerPoint → PDF**: Convert presentations
- **Excel → PDF**: Spreadsheet conversion
- **HTML → PDF**: Web page conversion
- **PDF → PowerPoint**: Extract content to slides

### **Advanced Editing**
- **Text Addition**: Overlay text on specific pages
- **Form Filling**: Populate PDF form fields
- **Annotations**: Highlights, lines, shapes
- **Redaction**: Secure information removal
- **Image Extraction**: Extract embedded images
- **OCR Processing**: Text recognition from images

### **Document Intelligence**
- **Text Extraction**: Clean text extraction
- **PDF Comparison**: Diff analysis between documents
- **Repair Tools**: Corrupted file recovery
- **Validation**: PDF/A compliance checking
- **Metadata**: Document information extraction

### **Image Processing**
- **Compression**: Quality-based optimization
- **Resizing**: Dimension adjustment
- **Cropping**: Area selection
- **Format Conversion**: JPG, PNG, GIF, etc.

## 🏗️ **Architecture**

### **Backend (Flask)**
- **Modular Design**: Blueprint-based architecture
- **Enhanced Processor**: `PDFProcessor` class with 50+ methods
- **Error Handling**: Custom exceptions and validation
- **Async Processing**: Celery task queue integration
- **Database**: SQLite by default (dev) via SQLAlchemy; PostgreSQL optional

### **Frontend (React/JSX)**
- **Modern UI**: Responsive design with Tailwind CSS
- **Tool Categories**: Core, AI, and Enhanced operations
- **Form Validation**: Client-side input validation
- **Real-time Updates**: Progress tracking and status updates
- **File Management**: Drag-and-drop upload support

### **AI Integration**
- **xAI Grok API**: Advanced language model integration
- **Celery Tasks**: Asynchronous AI processing
- **Redis Backend**: Task queue and caching
- **ML Models**: Document classification and analysis

## 📁 **Repository Structure**

```
PDF2/
├── 🚀 **CORE APPLICATION**
│   ├── app.py                    # Main Flask application (1,872 lines)
│   ├── pdf_processor.py          # PDF processing engine (1,055 lines)
│   ├── tasks.py                  # Background tasks for AI/ML (279 lines)
│   ├── advanced/advanced_api.py  # Advanced API endpoints (105 lines)
│   └── requirements.txt          # Core dependencies (51 lines)
│
├── 🌐 **FRONTEND**
│   └── static/
│       ├── index.html           # Main HTML page (23 lines)
│       ├── app.js              # React frontend (2,505 lines)
│       └── favicon.ico         # Website icon
│
├── 📚 **DOCUMENTATION**
│   ├── README.md               # Main documentation (this file)
│   └── LICENSE                 # MIT License
│
└── 📁 **RUNTIME DIRECTORIES** (auto-created)
    ├── uploads/                # User uploaded files (ignored by git)
    ├── processed/              # Generated files (ignored by git)
    └── instance/               # Database and runtime data (ignored by git)
```

### **Files Tracked by Git**
- **Core Application**: Flask backend, PDF processing engine, background tasks
- **Frontend**: React application with authentication and file management
- **Documentation**: README and license files
- **Configuration**: `.gitignore` and dependencies

### **Files Ignored by Git**
- **Sensitive Data**: `BIN/` folder, `.env` files, and credential files
- **Runtime Files**: `uploads/`, `processed/`, `instance/` directories
- **Development Files**: Virtual environments, logs, temporary files, test results
- **Non-Essential**: Standalone tools, enhanced dependencies, Docker files
- **Sensitive Directories**: `misc/`, `archive/misc/` containing example configurations

## 🧪 Quickstart (SQLite / Dev)
```bash
# Create and activate venv
python -m venv venv
venv\Scripts\activate    # Windows
# or
source venv/bin/activate  # macOS/Linux

# Install minimal deps
pip install -r requirements.txt

# Set up environment variables (see CONFIGURATION.md for details)
# Create a .env file in the project root or set environment variables

# Run the app (SQLite DB auto-initializes)
python app.py
# Visit http://localhost:5000
```

## 🔐 **Configuration**

This project uses environment variables for secure configuration. See [CONFIGURATION.md](CONFIGURATION.md) for detailed instructions on:

- Setting up environment variables
- Creating a `.env` file for development
- Docker environment configuration
- Available configuration options
- Security best practices

## 🛠️ **Installation & Setup**

### **Prerequisites**
```bash
# Python 3.8+
# (Optional) PostgreSQL 12+
# (Optional) Redis 6+
# Node.js 16+ (for development)
```

### **Backend Setup**
```bash
# Clone repository
git clone <repository-url>
cd PDF2

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt

# Optional: switch to advanced stack
# pip install -r requirements-enhanced.txt

# Create a .env file (see CONFIGURATION.md for details)
# Example:
echo FLASK_SECRET_KEY=development_only_key > .env
echo API_KEY=development_only_api_key >> .env

# Environment settings
set FLASK_APP=app.py
set FLASK_ENV=development

# Run application
python app.py
```

### **Frontend Setup**
```bash
# Build the frontend assets for production
# On Windows:
build_frontend.bat

# On Linux/macOS:
./build_frontend.sh

# Or manually:
cd static
npm install
npm run build
```

This will:
1. Install all required dependencies
2. Transpile JSX to JavaScript
3. Bundle the files for production
4. Output the result to the `static/dist` directory

After building, switch to production mode by renaming:
```bash
# Backup the development version
mv static/index.html static/index.development.html

# Use the production version
mv static/index.production.html static/index.html
```

## 📚 **API Endpoints**

### **Core Operations**
- `POST /process` - Standard PDF operations
- `GET /task/<id>` - Task status for core operations
- `GET /download?key=<file_key>` - File download

### **Enhanced Operations**
- `POST /enhanced/merge` - Advanced PDF merging (expects `file_keys` JSON)
- `POST /enhanced/split` - Enhanced PDF splitting (expects `file_key` JSON)
- `POST /enhanced/convert` - Document format conversion
- `POST /enhanced/workflow` - Execute processing workflows
- `POST /enhanced/bulk` - Bulk file processing

### **AI Operations**
- `POST /advanced/chat-pdf` - AI-powered PDF chat
- `POST /advanced/analyze-pdf` - Document analysis
- `POST /advanced/classify-document` - Document classification
- `POST /advanced/workflow` - AI workflow automation
- `GET /api/task-status/<id>` - AI task status

### **Authentication**
- `POST /register` - User registration
- `POST /login` - User authentication
- `POST /logout` - User logout
- `GET /profile` - User profile (requires login)
- `GET /auth/check` - Lightweight auth status (returns 401/200 if available)

## 🔧 **Configuration**

### **Environment Variables**
```bash
# Database
# For SQLite (default): no env needed
# For Postgres (optional):
DATABASE_URL=postgresql://user:pass@localhost/pdf_tool

# Redis / Celery (optional)
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Security
FLASK_SECRET_KEY=your_secret_key
FLASK_DEBUG=true
API_KEY=your_api_key_here
S3_SECRET_KEY=your_s3_secret_here

# File Storage
UPLOADS_FOLDER=./uploads
PROCESSED_FOLDER=./processed
MAX_CONTENT_LENGTH_MB=50
```

### **Using config_loader.py**
The application uses `config_loader.py` to safely load environment variables:

```python
# Import the helpers
from config_loader import get_secret_key, get_database_url, get_api_key

# Use in your application with secure fallbacks
app.config['SECRET_KEY'] = get_secret_key()
app.config['SQLALCHEMY_DATABASE_URI'] = get_database_url()

# Validate API requests securely
if api_key != get_api_key():
    return jsonify({"error": "Invalid API key"}), 403
```

## ❗ Error Handling & Troubleshooting

### Global Behavior
- Backend uses consistent JSON errors on API-like routes and returns SPA page for regular navigation.
- Flask-Login unauthorized requests to API/SPA paths return `{ "error": "Unauthorized" }` with `401`.
- Frontend detects auth using `/auth/check` and falls back to `/profile` automatically.

### Upload Errors
- "No file part" → Ensure form field name is `file` and request is multipart/form-data.
- "No selected file" → Filename is empty; pick a file.
- "Invalid file type. Only .pdf is allowed" → Only `.pdf` accepted in core `/upload`.
- `413 Request Entity Too Large` → File size exceeds `MAX_CONTENT_LENGTH_MB` (default 50MB).

### Enhanced Routes (file_keys)
- Enhanced endpoints require resolving `file_keys` to paths. If you see:
  - "File not found" → The DB record for that `file_key` is missing for the user.
  - "File not found on disk" → The file’s path is missing under `uploads/`.

### Notebook/Code Conversions
- `.ipynb` → PDF/DOCX require external tools:
  - `jupyter` (nbconvert), `pandoc`, and for PDF often `LaTeX` (`pdflatex`).
- `.py` → PDF/DOCX requires `pygments` and `pdflatex`/`pandoc`.
- Errors like "command not available" mean you must install the tool and ensure it’s on PATH.

### Common Frontend Issues
- React error "Element type is invalid" was fixed by safe icon rendering.
- If auth appears to "log out" after login:
  - Ensure cookies are allowed.
  - Check `/auth/check` (should be 200 after login) or fallback `/profile`.

### Logging
- Backend logs detailed exceptions for `/login` and `/register` with stack traces.
- Upload route logs the reason for failures (missing field, empty filename, invalid type).

## 📊 **Usage Examples**

### **Basic PDF Operations**
```python
from pdf_processor import PDFProcessor

processor = PDFProcessor()

# Merge PDFs
result = processor.merge_pdfs(['file1.pdf', 'file2.pdf'], 'merged.pdf')

# Split PDF
result = processor.split_pdf('input.pdf', './output_dir')

# Rotate PDF
result = processor.rotate_pdf('input.pdf', 'rotated.pdf', 90, [1, 2])
```

### **Document Conversion**
```python
# Word to PDF
result = processor.word_to_pdf('document.docx', 'output.pdf')

# PowerPoint to PDF
result = processor.powerpoint_to_pdf('presentation.pptx', 'output.pdf')

# Excel to PDF
result = processor.excel_to_pdf('spreadsheet.xlsx', 'output.pdf')
```

### **Advanced Features**
```python
# Add watermark
result = processor.watermark_pdf('input.pdf', 'watermarked.pdf', 'Confidential')

# Protect with password
result = processor.protect_pdf('input.pdf', 'protected.pdf', 'user123', 'owner456')

# Execute workflow
operations = [
    {'method': 'rotate_pdf', 'args': {'rotation': 90}},
    {'method': 'watermark_pdf', 'args': {'watermark_text': 'Processed'}}
]
result = processor.execute_workflow(operations)
```

### **AI Operations**
```python
# Chat with PDF (Celery)
result = chat_with_pdf.delay('document.pdf', 'What is the main topic?')
```

## 🧪 **Testing**

```bash
pytest
```

## 🚀 **Deployment**

- Dev: `python app.py` (SQLite)
- Prod: `gunicorn -w 4 -b 0.0.0.0:5000 app:app`

## 🔒 **Security Features**

- Input validation and file size limits
- Path sanitization for downloads
- Authenticated access for user data
- Environment variable management with secure fallbacks
- Credentials stored only in `.env` files (excluded from version control)
- Production configuration checks to prevent using development defaults
- Secure Docker configuration with placeholder credentials

## 📈 **Performance**

- Basic synchronous processing for core routes
- Optional Celery for async/AI routes

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Submit a pull request

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 **Acknowledgments**

- **PyPDF2**, **pdfminer**, **Pillow**, **Matplotlib**, **Celery**

---

**Built with ❤️ for the PDF processing community**
