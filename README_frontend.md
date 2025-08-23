# PDF Tool Frontend

A modern, responsive web application for processing PDF files with various tools.

## Features

- **Merge PDFs**: Combine multiple PDF files into one document
- **Split PDF**: Split a PDF into multiple files by pages
- **Compress PDF**: Reduce PDF file size while maintaining quality
- **Rotate PDF**: Rotate PDF pages by 90, 180, or 270 degrees

## Frontend Technologies

- **React 18**: Modern React with hooks for state management
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **Babel**: In-browser JSX compilation
- **Drag & Drop**: File upload with drag and drop support

## Getting Started

### Option 1: Using Docker (Recommended)

1. **Start the application**:
   ```bash
   docker-compose up --build
   ```

2. **Access the frontend**:
   Open your browser and navigate to `http://localhost:5000`

### Option 2: Local Development

1. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Start the Flask backend**:
   ```bash
   python app.py
   ```

3. **Access the frontend**:
   Open your browser and navigate to `http://localhost:5000`

## How to Use

### 1. Select a Tool
- Choose from the available PDF tools on the home page
- Each tool has a description and icon

### 2. Upload Files
- **Drag & Drop**: Drag PDF files directly onto the dropzone
- **File Selector**: Click "Select Files" to choose files from your computer
- **Multiple Files**: Some tools support multiple file uploads

### 3. Configure Options
- Set tool-specific options (e.g., compression quality, rotation angle)
- Options vary by tool type

### 4. Process Files
- Click the tool button to start processing
- Monitor progress with the progress bar
- Download results when complete

## Supported File Types

- **Input**: PDF files only (`.pdf`)
- **Output**: Processed PDF files

## API Endpoints

The frontend communicates with these backend endpoints:

- `POST /upload` - Upload PDF files
- `POST /process` - Start PDF processing
- `GET /task/<task_id>` - Check task status
- `GET /download?key=<file_key>` - Download processed files

## Troubleshooting

### Common Issues

1. **Files not uploading**:
   - Ensure files are PDF format
   - Check browser console for errors
   - Verify backend services are running

2. **Processing fails**:
   - Check file size limits
   - Verify PDF files are not corrupted
   - Check backend logs for detailed errors

3. **Download issues**:
   - Ensure file processing completed successfully
   - Check browser download settings
   - Verify file permissions

### Browser Compatibility

- **Chrome**: 90+
- **Firefox**: 88+
- **Safari**: 14+
- **Edge**: 90+

## Development

### Project Structure

```
static/
├── index.html          # Main HTML file
├── app.js             # React application
└── styles.css         # Custom styles (if needed)
```

### Adding New Tools

1. **Update `toolConfig`** in `app.js`
2. **Add tool logic** in `tasks.py`
3. **Update task mapping** in `process_pdf_task`

### Styling

The application uses Tailwind CSS for styling. Custom styles can be added in `styles.css` if needed.

## Security Features

- **File Validation**: Only PDF files accepted
- **Malware Scanning**: ClamAV integration for file safety
- **Secure Uploads**: S3-compatible storage with access controls
- **Audit Logging**: Complete operation tracking

## Performance

- **Async Processing**: Celery background tasks
- **Progress Tracking**: Real-time status updates
- **Efficient Storage**: S3-compatible object storage
- **Scalable Architecture**: Microservices design

## License

This project is part of the PDF Tool suite. See the main project license for details.