# Interactive PDF Assistant 🧠📄

A full-stack, AI-powered web application that allows users to upload PDF documents and have natural, interactive conversations with their content using advanced Retrieval-Augmented Generation (RAG) techniques.

## 🚀 Tech Stack

### Frontend (Client)
- **Framework:** React + Vite
- **Styling:** Vanilla CSS (Emerald/Dark Theme)
- **Local Storage:** Dexie.js (IndexedDB wrapper) for persisting chat history offline
- **HTTP Client:** Axios

### Backend (Server)
- **Framework:** Flask (Python)
- **CORS:** Flask-CORS for secure cross-origin requests
- **Environment Management:** python-dotenv (keeps API keys secure)

### AI & Text Processing
- **PDF Parsing:** PyPDF2
- **Vector Embeddings:** Google Generative AI (`gemini-embedding-001`)
- **Primary LLM:** Google `gemini-2.5-flash`
- **Fallback LLM:** Llama-3 (`llama-3.1-8b-instant`) via Groq API
- **Vector Search:** NumPy (Cosine Similarity)

---

## ✨ Key Features
1. **Smart PDF Parsing:** Upload any text-based PDF up to 16MB. The backend extracts text and intelligently splits it into overlapping chunks (2000 chars) to preserve context.
2. **RAG-based Chat:** Ask complex questions in plain conversational English. The system finds the most relevant chunks in your document and feeds them into Gemini 2.5/Llama 3 to generate highly accurate, context-aware answers.
3. **Offline Chat History:** Built-in IndexedDB support instantly loads your past chat sessions directly from your browser without waiting for server responses.
4. **Adaptive Rate-Limiting:** Built-in exponential backoff automatically handles free-tier API quotas (like Gemini's 100-chunk limits) when uploading massive PDFs.

---

## 🛠️ Setup Instructions

### 1. Backend Setup (/server)
1. Navigate to the server folder:
   ```bash
   cd server
   ```
2. Create and activate a Python virtual environment:
   ```bash
   # Windows
   python -m venv venv
   .\venv\Scripts\activate
   
   # Mac/Linux
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Install the required Python packages:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file in the `server` folder and add your API keys:
   ```env
   GOOGLE_API_KEY=your_google_api_key_here
   GROQ_API_KEY=your_groq_api_key_here
   ```
5. Run the Flask development server:
   ```bash
   python app.py
   ```
   *(Server will start on `http://localhost:5000`)*

### 2. Frontend Setup (/client)
1. Open a new terminal and navigate to the client folder:
   ```bash
   cd client
   ```
2. Install the necessary Node modules:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *(App will be running on `http://localhost:5173`)*

---

## 🗺️ Future Roadmap
- [ ] Add support for multiple PDFs in a single chat session
- [ ] Implement User Authentication (Login/Sign-up)
- [ ] Add Dark/Light mode toggle switch
- [ ] Integrate a real Vector Database (like Pinecone or Chroma) for scalable document storage
