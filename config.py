"""
Configuration settings for PDF Tool application
"""
import os
from datetime import timedelta

class Config:
    """Base configuration class"""
    
    # Basic Flask settings
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    
    # Database settings
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///pdf_tool.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
    }
    
    # File upload settings
    UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER') or 'uploads'
    PROCESSED_FOLDER = os.environ.get('PROCESSED_FOLDER') or 'processed'
    MAX_CONTENT_LENGTH = int(os.environ.get('MAX_CONTENT_LENGTH', 50 * 1024 * 1024))  # 50MB
    ALLOWED_EXTENSIONS = {'pdf'}
    
    # Security settings
    WTF_CSRF_ENABLED = True
    WTF_CSRF_TIME_LIMIT = None
    SESSION_COOKIE_SECURE = os.environ.get('SESSION_COOKIE_SECURE', 'False').lower() == 'true'
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    PERMANENT_SESSION_LIFETIME = timedelta(days=7)
    
    # Redis settings (for Celery)
    REDIS_URL = os.environ.get('REDIS_URL') or 'redis://localhost:6379/0'
    CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL') or REDIS_URL
    CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND') or REDIS_URL
    
    # AI/ML settings (optional)
    GROK_API_KEY = os.environ.get('GROK_API_KEY')
    GROK_API_ENDPOINT = os.environ.get('GROK_API_ENDPOINT') or 'https://api.x.ai/v1/chat/completions'
    
    # Email settings (for password reset)
    MAIL_SERVER = os.environ.get('MAIL_SERVER')
    MAIL_PORT = int(os.environ.get('MAIL_PORT') or 587)
    MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', 'True').lower() == 'true'
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
    
    # Logging
    LOG_LEVEL = os.environ.get('LOG_LEVEL') or 'INFO'

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    WTF_CSRF_ENABLED = False  # Disable CSRF in development for easier testing

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    SESSION_COOKIE_SECURE = True
    
class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    WTF_CSRF_ENABLED = False
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'

# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}