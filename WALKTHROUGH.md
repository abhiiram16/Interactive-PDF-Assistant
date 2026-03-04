# DocuMind AI — WALKTHROUGH

## 📌 Project Overview

**DocuMind AI** is a full-stack web application that lets users upload PDF documents and have natural conversations about their content using **Retrieval-Augmented Generation (RAG)**.

It was built as a **BTech Final Year CSE Project** to demonstrate practical understanding of:
- Natural Language Processing (NLP)
- Vector Embeddings & Similarity Search
- Modern Web Development (React + Flask)
- API Integration with AI/ML services

---

## 🏗️ Architecture

```
┌─────────────────────┐     HTTP      ┌──────────────────────┐
│   React Frontend    │  ◄──────────► │   Flask Backend      │
│   (Vite + Dexie)    │   REST API    │   (Python + RAG)     │
│                     │               │                      │
│  • PDF Upload Zone  │               │  • PDF Parser        │
│  • Chat Interface   │               │  • Text Chunker      │
│  • Session Sidebar  │               │  • Embedding Engine   │
│  • IndexedDB Store  │               │  • Similarity Search  │
│                     │               │  • LLM Generation     │
└─────────────────────┘               └──────────┬───────────┘
                                                 │
                                      ┌──────────▼───────────┐
                                      │   External APIs      │
                                      │                      │
                                      │  • Google Gemini     │
                                      │    (embeddings+LLM)  │
                                      │  • Groq/Llama3       │
                                      │    (fallback LLM)    │
                                      └──────────────────────┘
```

---

## 🔄 RAG Data Flow

1. **PDF Upload** → User uploads a PDF via the drag-and-drop UI
2. **Text Extraction** → PyPDF2 extracts raw text from all pages
3. **Chunking** → Text is split into ~500 char overlapping chunks with smart sentence boundary detection
4. **Embedding** → Each chunk is converted to a vector using Google Gemini's `embedding-001` model
5. **Storage** → Chunks + embeddings are stored in-memory (Python dict) keyed by session ID
6. **Query** → User asks a question in the chat interface
7. **Query Embedding** → Question is converted to a vector
8. **Similarity Search** → Cosine similarity finds the top-3 most relevant chunks
9. **Context Assembly** → Retrieved chunks are assembled into a context prompt
10. **LLM Generation** → Google Gemini (or Llama3 fallback) generates an answer grounded in the context
11. **Response** → Answer + source references are displayed in the chat UI

---

## 📁 Project Structure

```
RAG project/
├── backend/
│   ├── venv/              # Python virtual environment
│   ├── app.py             # Flask server with endpoints
│   ├── rag_engine.py      # Core RAG logic
│   ├── config.py          # Configuration & API keys
│   ├── requirements.txt   # Python dependencies
│   ├── .env               # API keys (not committed)
│   └── uploads/           # Temporary PDF storage
│
├── frontend-app/
│   ├── src/
│   │   ├── App.jsx        # Root component
│   │   ├── App.css        # Global styles
│   │   ├── main.jsx       # Entry point
│   │   ├── components/
│   │   │   ├── PdfUpload.jsx       # PDF upload with drag-drop
│   │   │   ├── ChatInterface.jsx   # Chat UI with bubbles
│   │   │   ├── Sidebar.jsx         # Session history
│   │   │   └── Header.jsx          # Top bar
│   │   ├── db/
│   │   │   └── indexedDb.js        # Dexie.js IndexedDB wrapper
│   │   └── api/
│   │       └── api.js              # Axios API calls
│   ├── index.html
│   └── package.json
│
└── WALKTHROUGH.md          # This file
```

---

## 🔧 Tech Stack

| Layer      | Technology                  | Purpose                          |
|------------|-----------------------------|----------------------------------|
| Frontend   | React 19 + Vite             | Responsive SPA                   |
| Styling    | Vanilla CSS (dark theme)    | Modern UI with animations        |
| Storage    | IndexedDB (Dexie.js)        | Client-side session persistence  |
| HTTP       | Axios                       | API communication                |
| Backend    | Flask (Python)              | REST API server                  |
| PDF Parse  | PyPDF2                      | Text extraction from PDFs        |
| Embeddings | Google Gemini embedding-001 | Vector representation of text    |
| LLM        | Google Gemini 1.5 Flash     | Answer generation                |
| Fallback   | Llama3 via Groq             | Backup LLM when Gemini fails     |
| Math       | NumPy                       | Cosine similarity computation    |

---

## 🚀 How to Run

### Prerequisites
- Python 3.10+ installed
- Node.js 18+ installed
- Google Gemini API key ([Get one here](https://aistudio.google.com/apikey))
- (Optional) Groq API key for Llama3 fallback ([Get one here](https://console.groq.com))

### Step 1: Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Add your API keys to the .env file
# Edit backend/.env and replace the placeholder values
```

### Step 2: Configure API Keys

Edit `backend/.env`:
```env
GOOGLE_API_KEY=your_actual_gemini_api_key
GROQ_API_KEY=your_actual_groq_api_key    # optional
```

### Step 3: Start Backend

```bash
cd backend
venv\Scripts\activate
python app.py
# Server starts on http://localhost:5000
```

### Step 4: Start Frontend

```bash
cd frontend-app
npm install
npm run dev
# App opens on http://localhost:5173
```

### Step 5: Use the App
1. Open `http://localhost:5173` in your browser
2. Upload a PDF using the drag-and-drop zone
3. Wait for processing (parsing → chunking → embedding)
4. Start chatting! Ask questions about the PDF content

---

## 🔑 API Endpoints

| Method | Endpoint              | Description                        |
|--------|-----------------------|------------------------------------|
| GET    | `/`                   | Health check                       |
| POST   | `/upload`             | Upload & process a PDF             |
| POST   | `/chat`               | Send a question, get AI response   |
| GET    | `/sessions`           | List all active sessions           |
| DELETE | `/sessions/<id>`      | Delete a specific session          |

### Example: Upload a PDF

```bash
curl -X POST http://localhost:5000/upload \
  -F "file=@myfile.pdf"
```

### Example: Chat with PDF

```bash
curl -X POST http://localhost:5000/chat \
  -H "Content-Type: application/json" \
  -d '{"session_id": "abc-123", "query": "What is this document about?"}'
```

---

## 💡 Key Implementation Details

### Text Chunking Strategy
- Chunks are 500 characters with 50 character overlap
- Smart boundary detection breaks at sentence endings (`.` `?` `!` `\n`)
- Chunks shorter than 50 characters are filtered out

### Vector Search
- Uses numpy-based cosine similarity (no external vector DB needed)
- Query embeddings use `retrieval_query` task type for better search accuracy
- Document embeddings use `retrieval_document` task type
- Returns top-3 most relevant chunks by default

### Fallback Mechanism
- Primary: Google Gemini 1.5 Flash
- If Gemini fails (rate limit, API error), automatically falls back to Llama3 via Groq
- If both fail, returns a user-friendly error message

### Client-Side Storage (IndexedDB)
- Sessions table: stores session ID, PDF name, timestamp
- Messages table: stores full chat history per session
- Data persists across browser refreshes
- Session history shown in the sidebar

---

## 📦 Dependencies

### Python (backend)
- `flask` — Web framework
- `flask-cors` — Cross-Origin Resource Sharing
- `google-generativeai` — Gemini API client
- `PyPDF2` — PDF text extraction
- `langchain` + `langchain-google-genai` — LLM integration
- `python-dotenv` — Environment variable management
- `numpy` — Mathematical operations
- `groq` — Llama3 API client

### JavaScript (frontend)
- `react` — UI library
- `vite` — Build tool & dev server
- `axios` — HTTP client
- `dexie` — IndexedDB wrapper

---

## 🎓 Academic Context

This project demonstrates the following CS concepts:
- **Information Retrieval** — Finding relevant documents given a query
- **NLP & LLMs** — Using large language models for text understanding
- **Vector Databases** — Embedding-based similarity search
- **Full-Stack Development** — REST API design, SPA architecture
- **Client-Side Storage** — IndexedDB for offline data persistence
- **API Integration** — Working with third-party AI services

---

*Built by a BTech CSE student as a final year project, March 2026.*
