"""
Script to apply the database schema migration.
This script provides a command-line interface to run the migration.
"""

import argparse
import logging
import os
import sys
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

def setup_flask_app():
    """Set up and return the Flask app."""
    try:
        # Add parent directory to path
        sys.path.insert(0, str(Path(__file__).parent.parent))
        
        # Import app
        from app import app
        
        # The db is already initialized in app.py, no need to init_app again
        
        return app
    except ImportError as e:
        logger.error(f"Error importing app: {e}")
        sys.exit(1)

def run_migration(app, method='script', force=False):
    """Run the database migration using the specified method."""
    try:
        if method == 'script':
            # Run migration script directly
            logger.info("Running migration script...")
            # Import the upgrade function
            migrations_dir = Path(__file__).parent
            sys.path.append(str(migrations_dir))
            
            try:
                from _20250907_update_schema import upgrade
                
                with app.app_context():
                    try:
                        upgrade()
                        logger.info("Migration completed successfully.")
                    except Exception as e:
                        logger.error(f"Error during upgrade: {e}")
                        import traceback
                        logger.error(traceback.format_exc())
                        sys.exit(1)
            except ImportError as e:
                logger.error(f"Error importing migration script: {e}")
                sys.exit(1)
        
        elif method == 'flask-migrate':
            # Run Flask-Migrate
            logger.info("Running Flask-Migrate...")
            try:
                from flask_migrate import Migrate, init, migrate, upgrade
                from models import db
                
                # Initialize Flask-Migrate
                migrate_instance = Migrate(app, db)
                
                # Run migration
                with app.app_context():
                    # Initialize migrations directory if it doesn't exist
                    try:
                        init()
                    except Exception:
                        logger.info("Migrations directory already exists.")
                    
                    # Generate migration
                    migrate(message="Apply improved schema")
                    
                    # Apply migration
                    upgrade()
                
                logger.info("Migration completed successfully.")
            except ImportError as e:
                logger.error(f"Error importing flask_migrate: {e}. Please install it with 'pip install Flask-Migrate'")
                sys.exit(1)
        
        elif method == 'recreate':
            # Recreate database from scratch
            if not force:
                confirm = input("This will DROP all tables and recreate the database. Are you sure? [y/N] ")
                if confirm.lower() != 'y':
                    logger.info("Operation cancelled.")
                    return
            
            logger.info("Recreating database...")
            
            try:
                from init_db import init_db
                from models import db
                
                with app.app_context():
                    # Drop all tables
                    db.drop_all()
                    
                    # Initialize database
                    init_db(app)
                
                logger.info("Database recreation completed successfully.")
            except ImportError as e:
                logger.error(f"Error importing init_db: {e}")
                sys.exit(1)
        
        else:
            logger.error(f"Unknown migration method: {method}")
            sys.exit(1)
    
    except Exception as e:
        logger.error(f"Error running migration: {e}")
        sys.exit(1)

def main():
    """Main entry point for the script."""
    parser = argparse.ArgumentParser(description='Apply database schema migration.')
    parser.add_argument('--method', choices=['script', 'flask-migrate', 'recreate'], default='script',
                        help='Migration method to use (default: script)')
    parser.add_argument('--force', action='store_true',
                        help='Force operation without confirmation (use with caution)')
    args = parser.parse_args()
    
    # Set up Flask app
    app = setup_flask_app()
    
    # Run migration
    run_migration(app, method=args.method, force=args.force)

if __name__ == '__main__':
    main()
