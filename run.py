"""
Application entry point
"""
import os
from app import create_app

# Create application instance
app = create_app(os.environ.get('FLASK_ENV', 'development'))

if __name__ == '__main__':
    # Ensure upload directories exist
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs(app.config['PROCESSED_FOLDER'], exist_ok=True)
    
    # Run the application
    app.run(
        host=os.environ.get('FLASK_HOST', '0.0.0.0'),
        port=int(os.environ.get('FLASK_PORT', 5000)),
        debug=app.config.get('DEBUG', False)
    )