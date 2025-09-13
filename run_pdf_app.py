"""
Run the Flask application with PDF operations
"""

import os
import sys
from app import app
from flask_migrate import upgrade

# Ensure uploads and processed directories exist
os.makedirs('uploads', exist_ok=True)
os.makedirs('processed', exist_ok=True)

if __name__ == '__main__':
    # Run database migrations if needed
    with app.app_context():
        try:
            upgrade()
        except Exception as e:
            print(f"Warning: Database migration failed: {e}")
            print("Continuing with application startup...")
    
    # Run the application
    app.run(debug=True, host='0.0.0.0', port=5000)
