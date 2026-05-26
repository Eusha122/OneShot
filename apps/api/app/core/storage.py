import logging
from pathlib import Path

logger = logging.getLogger(__name__)

# Base storage directory
BASE_STORAGE = Path("storage")

# Specific storage subdirectories
UPLOADS_DIR = BASE_STORAGE / "uploads"
TEXTBOOKS_DIR = BASE_STORAGE / "textbooks"
CHROMA_DIR = BASE_STORAGE / "chroma"

def init_storage():
    """
    Ensures all required storage directories exist.
    Called during application startup.
    """
    logger.info("Creating storage directories...")
    directories = [BASE_STORAGE, UPLOADS_DIR, TEXTBOOKS_DIR, CHROMA_DIR]
    
    for directory in directories:
        directory.mkdir(parents=True, exist_ok=True)
        
    logger.info("Storage directories initialized successfully.")
