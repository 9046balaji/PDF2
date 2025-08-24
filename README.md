
# PDF Tool - Professional Edition

A comprehensive PDF processing tool built with Flask, React, and SQLite. This application provides a modern web interface for various PDF operations including merge, split, compress, rotate, and advanced conversion features.

## 🚀 Features

### Core PDF Operations
- **Merge PDFs**: Combine multiple PDF files into one document
- **Split PDF**: Split PDF into multiple files by pages
- **Compress PDF**: Reduce file size while maintaining quality
- **Rotate PDF**: Rotate pages by 90°, 180°, or 270°

### Advanced PDF Conversion
- **PDF to Word**: Convert PDF to editable DOCX documents
- **PDF to Excel**: Extract tables and convert to Excel spreadsheets
- **PDF to JPG**: Convert PDF pages to high-quality images

### PDF Security & Protection
- **Protect PDF**: Add password protection and encryption
- **Unlock PDF**: Remove password protection from encrypted files

### PDF Enhancement
- **Add Watermarks**: Stamp text watermarks with custom opacity
- **Page Numbering**: Automatically add page numbers in various positions
- **Headers & Footers**: Insert custom headers and footers on every page

### 🤖 AI-Powered Document Intelligence
- **Chat with PDF**: Ask questions about your PDF content using RAG (Retrieval-Augmented Generation)
- **AI Analysis**: Get AI-powered summaries, named entity recognition (NER), and topic modeling
- **Document Classification**: Automatically classify document types using machine learning models

### 🔄 Workflow Automation
- **Automated Workflows**: Chain multiple PDF operations (unlock → OCR → compress → watermark)
- **Batch Processing**: Process multiple files with the same workflow
- **Task Chaining**: Execute complex PDF processing pipelines automatically

### User Features
- **User Authentication**: Secure user registration and login system
- **File Management**: Track upload history and processing records
- **Modern UI**: Responsive React frontend with Tailwind CSS
- **Database Integration**: SQLite backend with SQLAlchemy ORM
- **Session Management**: Secure Flask-Login integration

## 🛠️ Tech Stack

### Backend
- **Flask**: Python web framework
- **Flask-SQLAlchemy**: Database ORM
- **Flask-Login**: User authentication and session management
- **SQLite**: Local database (easy setup, no external dependencies)
- **pypdf/pikepdf**: Core PDF processing
- **pdfplumber**: Advanced text extraction and table detection
- **reportlab**: PDF generation and modification
- **pdf2image**: PDF to image conversion
- **python-docx**: Word document creation
- **openpyxl**: Excel spreadsheet creation
- **PyMuPDF**: Alternative PDF processing and image conversion

### AI/ML & Advanced Features
- **Celery**: Asynchronous task queue for background processing
- **Redis**: Message broker and result backend for Celery
- **LangChain**: RAG (Retrieval-Augmented Generation) framework
- **Transformers**: Hugging Face models for text generation and analysis
- **spaCy**: Natural language processing and named entity recognition
- **Gensim**: Topic modeling and document similarity
- **MLflow**: Machine learning model lifecycle management
- **scikit-learn**: Machine learning algorithms and utilities

### Frontend
- **React 18**: Modern JavaScript framework
- **Tailwind CSS**: Utility-first CSS framework
- **Babel**: JSX compilation in browser

### Security Features
- **Password Hashing**: Secure password storage using Werkzeug
- **Session Management**: Flask-Login for secure user sessions
- **Input Validation**: Comprehensive input sanitization
- **Path Traversal Protection**: Secure file handling
- **CSRF Protection**: Built-in Flask-Login security

## 📋 Prerequisites

- Python 3.8+
- SQLite3 (included with Python)
- Modern web browser with JavaScript enabled

## 🚀 Quick Start

### Local Development (Recommended)

1.  **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd PDF2
   ```

2.  **Set up Python virtual environment**
   ```bash
   python -m venv venv
   # On Windows
   venv\Scripts\activate
   # On macOS/Linux
   source venv/bin/activate
   ```

3.  **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4.  **Run the application**
   ```bash
   python app.py
   ```

5.  **Access the application**
    - Frontend: http://localhost:5000
    - Default admin user: `admin` / `admin123` (auto-generated)

### Advanced Infrastructure (Optional)

For production use or advanced features, you can use the full Docker infrastructure:

```bash
# Start the complete stack with AI features
docker-compose -f docker-compose-advanced.yml up -d

# This will start:
# - Redis (Celery broker)
# - Celery workers
# - Jaeger (distributed tracing)
# - MLflow (model management)
# - PostgreSQL (optional)
# - MinIO (S3-compatible storage)
# - Prometheus & Grafana (monitoring)
```

**Access Points:**
- **Main App**: http://localhost:5000
- **MLflow**: http://localhost:5001
- **Jaeger**: http://localhost:16686
- **MinIO Console**: http://localhost:9001
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3000 (admin/admin123)

### First Time Setup

The application will automatically:
- Create the SQLite database (`pdf_tool.db`)
- Set up all necessary tables
- Create a default admin user
- Initialize the file storage system

## 🔧 Configuration

### Environment Variables (Optional)

Create a `.env` file in the root directory for production settings:

```env
FLASK_SECRET_KEY=your-super-secure-random-key
FLASK_DEBUG=False
DATABASE_URL=sqlite:///pdf_tool.db
```

### Default Configuration

- **Database**: SQLite (`pdf_tool.db`)
- **Secret Key**: Auto-generated secure key
- **Debug Mode**: Enabled for development
- **File Storage**: Local `uploads/` and `processed/` folders

## 📁 Project Structure

```
PDF2/
├── app.py                 # Main Flask application
├── requirements.txt       # Python dependencies
├── static/
│   ├── index.html        # Main HTML file
│   ├── app.js           # React application
├── pdf_tool.py           # CLI tool for PDF operations
├── tasks.py              # Celery tasks for async processing
├── sdk.py                # Client SDK for API integration
├── tests/                # Test files
├── uploads/              # Uploaded files (created at runtime)
├── processed/            # Processed files (created at runtime)
├── bin/                  # Old/backup files
└── pdf_tool.db          # SQLite database (created at runtime)
```

## 🧪 Testing

### Manual Testing
1. Start the application: `python app.py`
2. Open http://localhost:5000 in your browser
3. Register a new user or use the default admin account
4. Test PDF operations by uploading and processing files

### API Testing
Use the included test scripts or test endpoints directly:

```bash
# Test authentication flow
python test_auth_flow.py

# Test specific endpoints
curl -X POST http://localhost:5000/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"test123"}'
```

## 📚 API Documentation

### Authentication Endpoints

- `GET/POST /register` - User registration
- `GET/POST /login` - User login
- `POST /logout` - User logout
- `GET /profile` - User profile (protected)

### PDF Processing Endpoints

- `POST /upload` - Upload PDF file
- `POST /process` - Process PDF with various operations
- `GET /task/<task_id>` - Get task status
- `GET /download` - Download processed file

### AI-Powered Endpoints

- `POST /api/chat-pdf` - Chat with PDF using AI
- `POST /api/analyze-pdf` - AI-powered PDF analysis
- `POST /api/classify-document` - Document classification
- `POST /api/workflow` - Execute automated workflows
- `GET /api/task-status/<task_id>` - Get task status for AI operations

### Public API (v1)

- `POST /api/v1/pdf/process` - Public API for PDF processing
- `GET /api/v1/docs/` - Interactive API documentation (Swagger)

### Supported Operations

- **merge**: Combine multiple PDFs
- **split**: Split PDF by pages
- **compress**: Reduce file size
- **rotate**: Rotate pages
- **pdf_to_word**: Convert to DOCX
- **pdf_to_excel**: Convert to XLSX
- **pdf_to_jpg**: Convert to images
- **protect**: Add password protection
- **unlock**: Remove password protection
- **watermark**: Add text watermarks
- **page_numbers**: Add page numbering
- **headers_footers**: Add headers/footers

### AI-Powered Operations

- **chat_pdf**: Chat with PDF using AI (RAG)
- **analyze_pdf**: AI-powered analysis (summary, NER, topics)
- **classify_document**: Document classification using ML
- **workflow**: Execute automated workflow chains

## 🔒 Security Features

### Authentication & Authorization
- Secure password hashing with Werkzeug
- Session-based authentication with Flask-Login
- Protected routes requiring user login
- Automatic session timeout

### File Security
- File type validation (PDF only)
- Secure filename handling
- Path traversal protection
- User file isolation

### Input Validation
- JSON payload validation
- Parameter sanitization
- Error message sanitization (no internal details exposed)

> **📖 For detailed security checkups and file preservation rules, see [SECURITY_AND_PRESERVATION_GUIDE.md](SECURITY_AND_PRESERVATION_GUIDE.md)**

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/yourusername/PDF2/issues) page
2. Create a new issue with detailed information
3. Check the terminal logs for error details

## 🔄 Changelog

### Version 2.0.0 (Current)
- **Security Improvements**: Enhanced authentication, input validation, and file security
- **Database**: Switched to SQLite for easier local development
- **Advanced Features**: Added 12+ PDF processing operations
- **UI Enhancements**: Modern React frontend with Tailwind CSS
- **Error Handling**: Comprehensive error handling and user feedback

### Version 1.0.0
- Initial release with core PDF functionality
- User authentication system
- Basic PDF operations (merge, split, compress, rotate)

---

**Note**: This is a development version optimized for local development. For production use, ensure proper security configurations, environment variable management, and consider using PostgreSQL for multi-user environments.

## ⚙️ Setup Log

This section documents the steps taken to set up the development environment.

1.  **Initial Setup:**
    *   Cloned the repository.
    *   Identified project dependencies from `requirements.txt`.

2.  **Dependency Installation:**
    *   Attempted to install dependencies using `pip install -r requirements.txt`.
    *   Encountered a build error with the `gensim` package on Python 3.13.

3.  **Python Version Management:**
    *   Installed `pyenv-win` to manage Python versions.
    *   Installed Python 3.12.10 using `pyenv-win`.
    *   Set Python 3.12.10 as the global Python version for the project.

4.  **Final Dependency Installation:**
    *   Successfully installed all project dependencies using Python 3.12.
