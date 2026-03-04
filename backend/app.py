"""
Flask Backend for RAG PDF Chat Assistant
Provides endpoints for PDF upload, chat, and session management.
"""

import os
import uuid
import time
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
from config import UPLOAD_FOLDER, MAX_FILE_SIZE
from rag_engine import parse_pdf, chunk_text, get_embeddings, find_relevant_chunks, generate_response

# Integrate React Static Files for Production Deployment
client_dist_folder = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'client', 'dist')
app = Flask(__name__, static_folder=client_dist_folder, static_url_path='/')
CORS(app, origins=["http://localhost:5173", "http://127.0.0.1:5173"])

app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE

# ---- In-Memory Session Store ----
# Structure: { session_id: { "pdf_name": str, "chunks": list, "embeddings": list, "created_at": float } }
sessions = {}


@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    """Serve the React frontend and fallback to index.html for client-side routing."""
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return app.send_static_file(path)
    else:
        return app.send_static_file('index.html')


@app.route("/upload", methods=["POST"])
def upload_pdf():
    """
    Upload and process a PDF file.
    Steps: Save file -> Parse text -> Chunk text -> Generate embeddings -> Store in memory
    """
    try:
        # Validate file exists in request
        if "file" not in request.files:
            return jsonify({"error": "No file provided. Please upload a PDF file."}), 400

        file = request.files["file"]
        if file.filename == "":
            return jsonify({"error": "No file selected."}), 400

        # Validate it's a PDF
        if not file.filename.lower().endswith(".pdf"):
            return jsonify({"error": "Only PDF files are supported."}), 400

        # Save the file temporarily
        filename = secure_filename(file.filename)
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        file.save(file_path)
        print(f"[INFO] Saved PDF: {filename}")

        # Step 1: Parse the PDF
        print("[STEP 1] Parsing PDF...")
        text = parse_pdf(file_path)
        if not text or len(text.strip()) < 10:
            os.remove(file_path)
            return jsonify({"error": "Could not extract text from this PDF. It might be scanned/image-based."}), 400

        # Step 2: Chunk the text
        print("[STEP 2] Chunking text...")
        chunks = chunk_text(text)
        if not chunks:
            os.remove(file_path)
            return jsonify({"error": "PDF text too short to process."}), 400

        # Step 3: Generate embeddings
        print("[STEP 3] Generating embeddings...")
        embeddings = get_embeddings(chunks)

        # Step 4: Create a session
        session_id = str(uuid.uuid4())
        sessions[session_id] = {
            "pdf_name": filename,
            "chunks": chunks,
            "embeddings": embeddings,
            "created_at": time.time(),
            "total_chunks": len(chunks),
            "text_length": len(text)
        }

        # Clean up the uploaded file (we already extracted the text)
        os.remove(file_path)
        print(f"[INFO] Session created: {session_id} ({len(chunks)} chunks)")

        return jsonify({
            "success": True,
            "session_id": session_id,
            "pdf_name": filename,
            "total_chunks": len(chunks),
            "text_length": len(text),
            "message": f"PDF '{filename}' processed successfully! ({len(chunks)} chunks created)"
        }), 200

    except Exception as e:
        print(f"[ERROR] Upload failed: {e}")
        return jsonify({"error": f"Failed to process PDF: {str(e)}"}), 500


@app.route("/chat", methods=["POST"])
def chat():
    """
    Chat with an uploaded PDF.
    Retrieves relevant chunks and generates an AI response.
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided."}), 400

        session_id = data.get("session_id")
        query = data.get("query", "").strip()

        # Validate inputs
        if not session_id:
            return jsonify({"error": "session_id is required."}), 400

        if not query:
            return jsonify({"error": "Please enter a question."}), 400

        # Check if session exists
        if session_id not in sessions:
            return jsonify({"error": "Session not found. Please upload a PDF first."}), 404

        session = sessions[session_id]
        print(f"[INFO] Chat query for session {session_id[:8]}...: '{query[:50]}...'")

        # Step 1: Find relevant chunks
        relevant_chunks = find_relevant_chunks(
            query,
            session["chunks"],
            session["embeddings"]
        )

        # Step 2: Generate response
        answer = generate_response(query, relevant_chunks)

        # Return response with source info
        sources = [
            {
                "text": chunk["text"][:200] + "..." if len(chunk["text"]) > 200 else chunk["text"],
                "relevance_score": round(chunk["score"], 4)
            }
            for chunk in relevant_chunks
        ]

        return jsonify({
            "success": True,
            "answer": answer,
            "sources": sources,
            "pdf_name": session["pdf_name"]
        }), 200

    except Exception as e:
        print(f"[ERROR] Chat failed: {e}")
        return jsonify({"error": f"Failed to generate response: {str(e)}"}), 500


@app.route("/sessions", methods=["GET"])
def list_sessions():
    """List all active sessions with their metadata."""
    session_list = []
    for sid, data in sessions.items():
        session_list.append({
            "session_id": sid,
            "pdf_name": data["pdf_name"],
            "total_chunks": data["total_chunks"],
            "text_length": data["text_length"],
            "created_at": data["created_at"]
        })

    # Sort by most recent first
    session_list.sort(key=lambda x: x["created_at"], reverse=True)

    return jsonify({
        "sessions": session_list,
        "total": len(session_list)
    }), 200


@app.route("/sessions/<session_id>", methods=["DELETE"])
def delete_session(session_id):
    """Delete a specific session."""
    if session_id in sessions:
        pdf_name = sessions[session_id]["pdf_name"]
        del sessions[session_id]
        return jsonify({"success": True, "message": f"Session for '{pdf_name}' deleted."}), 200
    return jsonify({"error": "Session not found."}), 404


if __name__ == "__main__":
    print("=" * 50)
    print("  RAG PDF Chat Assistant - Backend Server")
    print("=" * 50)
    print(f"  Upload folder: {UPLOAD_FOLDER}")
    print(f"  Active sessions: {len(sessions)}")
    print("=" * 50)
    app.run(debug=True, host="0.0.0.0", port=5000)
