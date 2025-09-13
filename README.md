# PDF Tool - Professional PDF Processing Application

A comprehensive web application for PDF file processing, offering merge, split, compress, extract, rotate, and convert operations with a clean, modern interface.

## Features

### Core PDF Operations
- **Merge PDFs** - Combine multiple PDF files into one document
- **Split PDF** - Split PDFs into individual pages or specific ranges
- **Compress PDF** - Reduce file size while maintaining quality
- **Extract Text** - Extract text content from PDF files
- **Rotate Pages** - Rotate PDF pages to correct orientation
- **Convert Format** - Convert PDFs to Word, HTML, text, or images

### Advanced Features
- **User Authentication** - Secure login and registration system
- **File Management** - Dashboard for managing uploaded files
- **Batch Operations** - Process multiple files simultaneously
- **Progress Tracking** - Real-time upload and processing progress
- **Responsive Design** - Works on desktop, tablet, and mobile devices

## Technology Stack

### Backend
- **Flask** - Python web framework
- **SQLAlchemy** - Database ORM
- **Flask-Login** - User session management
- **PyPDF** - PDF processing library
- **Celery** - Background task processing
- **Redis** - Task queue and caching

### Frontend
- **Vanilla HTML/CSS/JavaScript** - No framework dependencies
- **Modern CSS Grid/Flexbox** - Responsive layouts
- **CSS Custom Properties** - Consistent theming
- **Progressive Enhancement** - Works without JavaScript

### Database
- **PostgreSQL** (recommended) or **SQLite** (development)
- **Alembic** - Database migrations

## Installation

### Prerequisites
- Python 3.8+
- Node.js 16+ (for development tools)
- Redis (for background tasks)
- PostgreSQL (recommended) or SQLite

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd pdf-tool
   ```

2. **Set up Python environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Initialize the database**
   ```bash
   python -c "from app import app, db; app.app_context().push(); db.create_all()"
   ```

5. **Start Redis (for background tasks)**
   ```bash
   redis-server
   ```

6. **Start Celery worker (in separate terminal)**
   ```bash
   celery -A tasks worker --loglevel=info
   ```

7. **Run the application**
   ```bash
   python app.py
   ```

8. **Access the application**
   - Open http://localhost:5000 in your browser
   - Register a new account or login

## Project Structure

```
pdf-tool/
├── app.py                          # Main Flask application
├── models.py                       # Database models
├── pdf_processor.py                # PDF processing logic
├── tasks.py                        # Celery background tasks
├── requirements.txt                # Python dependencies
├── README.md                       # This file
│
├── static/                         # Frontend assets
│   ├── css/
│   │   ├── main.css               # Main stylesheet
│   │   └── responsive.css         # Responsive design
│   ├── js/
│   │   ├── main.js                # Core application logic
│   │   ├── auth.js                # Authentication handling
│   │   ├── pdf-tools.js           # PDF tool functionality
│   │   ├── dashboard.js           # Dashboard functionality
│   │   └── csrf-protection.js     # CSRF security
│   ├── index.html                 # Main application page
│   └── dashboard.html             # User dashboard
│
├── templates/                      # Jinja2 templates
│   ├── login/
│   │   ├── index.html             # Login page
│   │   ├── register.html          # Registration page
│   │   └── css/                   # Login-specific styles
│   └── pdf_dashboard.html         # PDF operations dashboard
│
├── migrations/                     # Database migrations
├── advanced/                       # Advanced features
└── uploads/                        # File storage (created automatically)
```

## API Endpoints

### Authentication
- `POST /login` - User login
- `POST /register` - User registration
- `POST /logout` - User logout
- `GET /api/auth/status` - Check authentication status
- `GET /api/auth/me` - Get current user info

### File Operations
- `POST /pdf/upload` - Upload PDF file
- `GET /pdf/download/<file_id>` - Download file
- `GET /pdf/api/files` - List user files
- `DELETE /api/files/<file_id>` - Delete file

### PDF Processing
- `POST /pdf/merge` - Merge multiple PDFs
- `POST /pdf/split/<file_id>` - Split PDF
- `GET /pdf/extract_text/<file_id>` - Extract text
- `POST /pdf/rotate/<file_id>` - Rotate PDF pages
- `POST /api/process-pdf` - Generic processing endpoint

## Database Schema

### Core Tables
- **users** - User accounts and authentication
- **pdf_files** - Uploaded PDF file records
- **file_versions** - File version history
- **file_shares** - File sharing permissions
- **file_access_logs** - Access tracking

### Supporting Tables
- **user_login_history** - Login tracking
- **file_conversion_record** - Conversion history
- **app_config** - Application configuration

## Configuration

### Environment Variables
```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost/pdf_tool
# or for SQLite:
# DATABASE_URL=sqlite:///pdf_tool.db

# Security
SECRET_KEY=your-secret-key-here
CSRF_SECRET_KEY=your-csrf-secret-key

# Redis (for Celery)
REDIS_URL=redis://localhost:6379/0

# File Storage
UPLOAD_FOLDER=uploads
PROCESSED_FOLDER=processed
MAX_CONTENT_LENGTH=52428800  # 50MB

# AI Features (optional)
GROK_API_KEY=your-grok-api-key
```

### Flask Configuration
The application uses Flask's configuration system. Key settings:
- `MAX_CONTENT_LENGTH` - Maximum file upload size
- `UPLOAD_FOLDER` - Directory for uploaded files
- `PROCESSED_FOLDER` - Directory for processed files
- `SECRET_KEY` - Flask session encryption key

## Development

### Running in Development Mode
```bash
# Set Flask environment
export FLASK_ENV=development
export FLASK_DEBUG=1

# Run with auto-reload
python app.py
```

### Database Migrations
```bash
# Create migration
alembic revision --autogenerate -m "Description"

# Apply migrations
alembic upgrade head

# Rollback migration
alembic downgrade -1
```

### Testing
```bash
# Run tests
python -m pytest

# Run with coverage
python -m pytest --cov=.
```

## Deployment

### Production Setup
1. Set up a production database (PostgreSQL recommended)
2. Configure environment variables for production
3. Set up Redis for background tasks
4. Use a production WSGI server (Gunicorn recommended)
5. Set up a reverse proxy (Nginx recommended)
6. Configure SSL/TLS certificates

### Docker Deployment
```bash
# Build image
docker build -t pdf-tool .

# Run with docker-compose
docker-compose up -d
```

## Security Features

- **CSRF Protection** - All forms protected against CSRF attacks
- **File Validation** - Strict file type and size validation
- **User Authentication** - Secure login with password hashing
- **Access Control** - Users can only access their own files
- **Input Sanitization** - All user inputs are sanitized
- **Secure Headers** - Security headers for XSS protection

## Performance Optimizations

- **Background Processing** - Long operations run in background
- **File Caching** - Processed files are cached
- **Optimized CSS/JS** - Minified and compressed assets
- **Database Indexing** - Optimized database queries
- **Progressive Loading** - Files load progressively

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, please open an issue on GitHub or contact the development team.

## Changelog

### Version 2.0.0 (Current)
- Simplified frontend architecture (removed build tools)
- Improved responsive design
- Enhanced security features
- Better error handling
- Streamlined file management

### Version 1.0.0
- Initial release with basic PDF operations
- User authentication system
- File upload and management