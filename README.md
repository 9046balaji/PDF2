# PDF Tool - Professional Edition

A comprehensive PDF processing tool built with Flask, React, and PostgreSQL. This application provides a modern web interface for various PDF operations including merge, split, compress, and rotate functionality.

## 🚀 Features

- **PDF Operations**: Merge, split, compress, and rotate PDF files
- **User Authentication**: Secure user registration and login system
- **File Management**: Track upload history and processing records
- **Modern UI**: Responsive React frontend with Tailwind CSS
- **Database Integration**: PostgreSQL backend with SQLAlchemy ORM
- **Docker Support**: Easy deployment with Docker and Docker Compose

## 🛠️ Tech Stack

### Backend
- **Flask**: Python web framework
- **Flask-SQLAlchemy**: Database ORM
- **Flask-Login**: User authentication
- **PostgreSQL**: Primary database
- **pypdf/pikepdf**: PDF processing libraries

### Frontend
- **React 18**: Modern JavaScript framework
- **Tailwind CSS**: Utility-first CSS framework
- **Babel**: JSX compilation in browser

### Infrastructure
- **Docker**: Containerization
- **Docker Compose**: Multi-container orchestration

## 📋 Prerequisites

- Python 3.8+
- PostgreSQL 12+
- Docker and Docker Compose (optional)
- Node.js (for development)

## 🚀 Quick Start

### Option 1: Local Development

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd PDF2
   ```

2. **Set up Python virtual environment**
   ```bash
   python -m venv venv
   # On Windows
   venv\Scripts\activate
   # On macOS/Linux
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up PostgreSQL database**
   ```bash
   # Start PostgreSQL (using Docker)
   docker-compose -f docker-compose-postgres.yml up -d
   
   # Or use your local PostgreSQL installation
   ```

5. **Run the application**
   ```bash
   python app.py
   ```

6. **Access the application**
   - Frontend: http://localhost:5000
   - API: http://localhost:5000/api

### Option 2: Docker Deployment

1. **Start all services**
   ```bash
   docker-compose up -d
   ```

2. **Access the application**
   - Frontend: http://localhost:5000
   - PostgreSQL: localhost:5432
   - pgAdmin: http://localhost:5050

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
FLASK_SECRET_KEY=your-secret-key-here
DATABASE_URL=postgresql://username:password@localhost:5432/pdf_tool
FLASK_ENV=development
```

### Database Setup

The application will automatically create the necessary tables on first run. Make sure your PostgreSQL user has the required permissions.

## 📁 Project Structure

```
PDF2/
├── app.py                 # Main Flask application
├── requirements.txt       # Python dependencies
├── static/               # Frontend assets
│   ├── index.html        # Main HTML file
│   ├── app.js           # React application
│   └── styles.css       # Custom styles
├── tests/                # Test files
├── docker-compose.yml    # Docker services
├── docker-compose-postgres.yml  # PostgreSQL setup
├── Dockerfile            # Application container
├── uploads/              # Uploaded files (created at runtime)
├── processed/            # Processed files (created at runtime)
└── bin/                  # Old/deleted files (created at runtime)
```

## 🧪 Testing

Run the test suite:

```bash
python -m pytest tests/
```

## 📚 API Documentation

### Authentication Endpoints

- `POST /register` - User registration
- `POST /login` - User login
- `POST /logout` - User logout
- `GET /profile` - User profile

### PDF Processing Endpoints

- `POST /upload` - Upload PDF file
- `POST /process` - Process PDF (merge, split, compress, rotate)
- `GET /task/<task_id>` - Get task status
- `GET /download` - Download processed file

### File Management Endpoints

- `GET /files` - List user's files
- `GET /history` - Processing history

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
3. Check the documentation in the `docs/` folder

## 🔄 Changelog

### Version 1.0.0
- Initial release with core PDF functionality
- User authentication system
- PostgreSQL database integration
- React frontend with Tailwind CSS
- Docker deployment support

---

**Note**: This is a development version. For production use, ensure proper security configurations and environment variable management.
