# PostgreSQL Setup Guide for PDF Tool

This guide will help you set up PostgreSQL with your PDF Tool application, enabling user authentication, file history tracking, and persistent data storage.

## 🚀 Quick Start

### Option 1: Local PostgreSQL Installation

1. **Install PostgreSQL**
   - **Windows**: Download from [postgresql.org](https://www.postgresql.org/download/windows/)
   - **macOS**: `brew install postgresql`
   - **Linux**: `sudo apt-get install postgresql postgresql-contrib`

2. **Start PostgreSQL Service**
   - **Windows**: PostgreSQL service should start automatically
   - **macOS**: `brew services start postgresql`
   - **Linux**: `sudo systemctl start postgresql`

3. **Create Database and User**
   ```bash
   # Connect to PostgreSQL as superuser
   sudo -u postgres psql
   
   # Create database and user
   CREATE DATABASE pdf_tool;
   CREATE USER pdf_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE pdf_tool TO pdf_user;
   \q
   ```

4. **Update Configuration**
   Edit `app_with_db.py` and update the database URI:
   ```python
   app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://pdf_user:your_password@localhost:5432/pdf_tool'
   ```

### Option 2: Docker PostgreSQL (Recommended for Development)

1. **Create docker-compose.yml**
   ```yaml
   version: '3.8'
   services:
     postgres:
       image: postgres:13
       environment:
         POSTGRES_DB: pdf_tool
         POSTGRES_USER: pdf_user
         POSTGRES_PASSWORD: your_password
       ports:
         - "5432:5432"
       volumes:
         - postgres_data:/var/lib/postgresql/data
   
   volumes:
     postgres_data:
   ```

2. **Start PostgreSQL**
   ```bash
   docker-compose up -d postgres
   ```

3. **Update Configuration**
   ```python
   app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://pdf_user:your_password@localhost:5432/pdf_tool'
   ```

### Option 3: Cloud PostgreSQL Services

#### Supabase (Free Tier Available)
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Get your database connection string
4. Update your app configuration

#### Railway
1. Go to [railway.app](https://railway.app)
2. Create a new PostgreSQL database
3. Copy the connection string
4. Update your app configuration

## 🔧 Database Setup

### 1. Run the Setup Script
```bash
python setup_database.py
```

### 2. Start the Enhanced Server
```bash
python app_with_db.py
```

The server will automatically create all necessary tables when it starts.

## 📊 Database Schema

The application creates three main tables:

### Users Table
```sql
CREATE TABLE "user" (
    id SERIAL PRIMARY KEY,
    username VARCHAR(80) UNIQUE NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(200) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Files Table
```sql
CREATE TABLE file_record (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(200) NOT NULL,
    original_filename VARCHAR(200) NOT NULL,
    file_size INTEGER NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER REFERENCES "user"(id) NOT NULL
);
```

### Processing History Table
```sql
CREATE TABLE processing_record (
    id SERIAL PRIMARY KEY,
    task_id VARCHAR(100) UNIQUE NOT NULL,
    command VARCHAR(50) NOT NULL,
    input_files JSON NOT NULL,
    output_file VARCHAR(200) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    user_id INTEGER REFERENCES "user"(id) NOT NULL
);
```

## 🔐 Authentication Features

### User Registration
- Username and email uniqueness validation
- Secure password hashing using Werkzeug
- Input validation and error handling

### User Login
- Session-based authentication using Flask-Login
- Secure password verification
- Automatic session management

### Protected Routes
- File uploads require authentication
- PDF processing requires authentication
- Download links require authentication
- User-specific file isolation

## 📁 File Management

### User File Isolation
- Each user can only see their own files
- Files are automatically associated with the logged-in user
- Secure file access control

### File History
- Track all uploaded files with metadata
- Monitor file processing history
- User-specific file statistics

## 🛠️ API Endpoints

### Authentication
- `POST /register` - User registration
- `POST /login` - User login
- `GET /logout` - User logout
- `GET /profile` - Get user profile

### File Management
- `POST /upload` - Upload PDF files (authenticated)
- `GET /files` - Get user's files (authenticated)
- `GET /history` - Get processing history (authenticated)

### PDF Processing
- `POST /process` - Process PDF files (authenticated)
- `GET /task/<task_id>` - Get task status (authenticated)
- `GET /download` - Download processed files (authenticated)

## 🔒 Security Features

### Password Security
- Passwords are hashed using Werkzeug's security functions
- Never store plain-text passwords
- Secure password validation

### Session Management
- Flask-Login handles user sessions
- Automatic session expiration
- Secure cookie handling

### File Access Control
- Users can only access their own files
- Database-level user isolation
- Secure file download endpoints

## 🚀 Deployment

### Environment Variables
Set these environment variables in production:

```bash
export FLASK_SECRET_KEY="your-super-secret-key-here"
export DATABASE_URL="postgresql://user:password@host:port/database"
export FLASK_ENV="production"
```

### Production Database
For production, use a managed PostgreSQL service:
- **AWS RDS**
- **Google Cloud SQL**
- **Azure Database for PostgreSQL**
- **Heroku Postgres**

### Security Considerations
1. Use strong, unique passwords
2. Enable SSL connections
3. Restrict database access to your application servers
4. Regular database backups
5. Monitor database access logs

## 🧪 Testing

### Test Database Connection
```bash
python setup_database.py
```

### Test User Registration
1. Start the server: `python app_with_db.py`
2. Open: `http://localhost:5000`
3. Click "Register" and create a test account
4. Login with your credentials
5. Test PDF upload and processing

### Database Verification
```bash
# Connect to your database
psql -h localhost -U pdf_user -d pdf_tool

# Check tables
\dt

# Check users
SELECT * FROM "user";

# Check files
SELECT * FROM file_record;
```

## 🔍 Troubleshooting

### Common Issues

1. **Connection Refused**
   - Ensure PostgreSQL is running
   - Check port 5432 is accessible
   - Verify firewall settings

2. **Authentication Failed**
   - Check username/password
   - Verify database exists
   - Check user permissions

3. **Table Creation Errors**
   - Ensure user has CREATE privileges
   - Check database connection
   - Verify SQLAlchemy version

4. **Import Errors**
   - Install required packages: `pip install flask-sqlalchemy psycopg2-binary flask-login`
   - Check Python version compatibility

### Debug Mode
Enable debug mode for detailed error messages:
```python
app.run(debug=True)
```

## 📈 Performance Tips

1. **Database Indexing**
   - Add indexes on frequently queried columns
   - Monitor query performance

2. **Connection Pooling**
   - Use connection pooling for production
   - Configure appropriate pool sizes

3. **File Storage**
   - Consider using S3-compatible storage for large files
   - Implement file cleanup for old processed files

## 🎯 Next Steps

After setting up PostgreSQL:

1. **Add User Management**
   - Password reset functionality
   - Email verification
   - User roles and permissions

2. **Enhanced File Features**
   - File sharing between users
   - File versioning
   - Advanced search and filtering

3. **Analytics Dashboard**
   - User activity metrics
   - File processing statistics
   - System performance monitoring

4. **API Rate Limiting**
   - Implement request throttling
   - User quota management
   - Abuse prevention

## 📚 Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Flask-SQLAlchemy Documentation](https://flask-sqlalchemy.palletsprojects.com/)
- [Flask-Login Documentation](https://flask-login.readthedocs.io/)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)

---

**Need Help?** Check the troubleshooting section or create an issue in the project repository.
