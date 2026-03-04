import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# API Keys
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

# RAG Configuration
CHUNK_SIZE = 2000         # Increased to 2000 to drastically reduce total chunks (Gemini limit is 100/min)
CHUNK_OVERLAP = 200       # Overlap between consecutive chunks
TOP_K_RESULTS = 3         # Number of relevant chunks to retrieve
EMBEDDING_MODEL = "models/gemini-embedding-001"
GEMINI_MODEL = "gemini-2.5-flash"

# Upload Configuration
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "uploads")
MAX_FILE_SIZE = 16 * 1024 * 1024  # 16MB max file size

# Make sure upload folder exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
