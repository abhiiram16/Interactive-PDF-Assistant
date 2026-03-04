"""
RAG Engine Module
Handles PDF parsing, text chunking, embedding generation,
similarity search, and LLM response generation.
"""

import numpy as np
from PyPDF2 import PdfReader
import google.generativeai as genai
from groq import Groq
from config import (
    GOOGLE_API_KEY, GROQ_API_KEY,
    CHUNK_SIZE, CHUNK_OVERLAP, TOP_K_RESULTS,
    EMBEDDING_MODEL, GEMINI_MODEL
)

# Configure the Gemini API
genai.configure(api_key=GOOGLE_API_KEY)


def parse_pdf(file_path):
    """
    Extract text content from a PDF file.
    Returns the full text as a single string.
    """
    try:
        reader = PdfReader(file_path)
        text = ""
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        return text.strip()
    except Exception as e:
        print(f"[ERROR] Failed to parse PDF: {e}")
        raise Exception(f"Could not parse the PDF file: {str(e)}")


def chunk_text(text, chunk_size=CHUNK_SIZE, overlap=CHUNK_OVERLAP):
    """
    Split text into overlapping chunks for better context preservation.
    Each chunk has `overlap` characters from the previous chunk.
    """
    if not text:
        return []

    chunks = []
    start = 0
    text_length = len(text)

    while start < text_length:
        end = start + chunk_size
        chunk = text[start:end]

        # Try to break at a sentence boundary if possible
        if end < text_length:
            # Look for the last period, question mark, or newline
            last_break = max(
                chunk.rfind('. '),
                chunk.rfind('? '),
                chunk.rfind('! '),
                chunk.rfind('\n')
            )
            if last_break > chunk_size * 0.3:  # Only break if we keep >30% of chunk
                end = start + last_break + 1
                chunk = text[start:end]

        chunks.append(chunk.strip())
        start = end - overlap  # Move back by overlap amount

    # Filter out very small chunks (less than 50 chars)
    chunks = [c for c in chunks if len(c) >= 50]

    print(f"[INFO] Created {len(chunks)} chunks from text ({text_length} chars)")
    return chunks


def get_embeddings(text_list):
    """
    Generate vector embeddings for a list of text chunks
    using Google's Gemini embedding model.
    """
    import time
    try:
        from google.api_core.exceptions import ResourceExhausted
    except ImportError:
        ResourceExhausted = Exception
        
    try:
        embeddings = []
        batch_size = 50 
        for i in range(0, len(text_list), batch_size):
            batch = text_list[i:i + batch_size]
            
            # Retry mechanism for rate limits (429)
            max_retries = 3
            retry_delay = 15  # seconds
            for attempt in range(max_retries):
                try:
                    result = genai.embed_content(
                        model=EMBEDDING_MODEL,
                        content=batch,
                        task_type="retrieval_document"
                    )
                    embeddings.extend(result['embedding'])
                    break  # Success, exit retry loop
                except Exception as e:
                    # Check if it's a rate limit error (usually 429 Resource Exhausted)
                    error_str = str(e).lower()
                    if "429" in error_str or "quota" in error_str or isinstance(e, ResourceExhausted):
                        if attempt < max_retries - 1:
                            print(f"[WARNING] Rate limit hit. Retrying batch in {retry_delay} seconds... (Attempt {attempt+1}/{max_retries})")
                            time.sleep(retry_delay)
                            retry_delay *= 2  # Exponential backoff
                        else:
                            print(f"[ERROR] Max retries reached for embeddings due to rate limits.")
                            raise e
                    else:
                        raise e # Not a rate limit error, raise immediately
            
            # Simple rate limit prevention between successful batches
            if i + batch_size < len(text_list):
                print(f"[INFO] Processed batch of {len(batch)} chunks, waiting 5s to respect rate limits...")
                time.sleep(5)

        print(f"[INFO] Generated {len(embeddings)} embeddings")
        return embeddings
    except Exception as e:
        print(f"[ERROR] Embedding generation failed: {e}")
        raise Exception(f"Failed to generate embeddings: {str(e)}")


def get_query_embedding(query):
    """
    Generate embedding for a search query.
    Uses 'retrieval_query' task type for better search results.
    """
    try:
        result = genai.embed_content(
            model=EMBEDDING_MODEL,
            content=query,
            task_type="retrieval_query"
        )
        return result['embedding']
    except Exception as e:
        print(f"[ERROR] Query embedding failed: {e}")
        raise Exception(f"Failed to generate query embedding: {str(e)}")


def cosine_similarity(vec_a, vec_b):
    """Calculate cosine similarity between two vectors."""
    a = np.array(vec_a)
    b = np.array(vec_b)
    dot_product = np.dot(a, b)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot_product / (norm_a * norm_b)


def find_relevant_chunks(query, chunks, embeddings, top_k=TOP_K_RESULTS):
    """
    Find the most relevant text chunks for a given query
    using cosine similarity between embeddings.
    """
    query_embedding = get_query_embedding(query)

    # Calculate similarity scores
    similarities = []
    for i, emb in enumerate(embeddings):
        score = cosine_similarity(query_embedding, emb)
        similarities.append((i, score))

    # Sort by similarity score (descending)
    similarities.sort(key=lambda x: x[1], reverse=True)

    # Return top-k most relevant chunks
    top_chunks = []
    for idx, score in similarities[:top_k]:
        top_chunks.append({
            "text": chunks[idx],
            "score": float(score),
            "index": idx
        })

    print(f"[INFO] Found {len(top_chunks)} relevant chunks (top score: {similarities[0][1]:.4f})")
    return top_chunks


def generate_response(query, context_chunks):
    """
    Generate a response using Google Gemini LLM
    with the retrieved context chunks.
    """
    try:
        # Build the context string from retrieved chunks
        context = "\n\n---\n\n".join([chunk["text"] for chunk in context_chunks])

        # Craft the prompt
        prompt = f"""You are a helpful AI assistant that answers questions based on the provided document context.
First, try to answer the question using ONLY the information from the context below.
If the answer is NOT found in the context, you may use your own general knowledge to answer the question, but please clarify that the information is from your general knowledge and not the document.

Be concise but thorough in your answers.

CONTEXT FROM DOCUMENT:
{context}

USER QUESTION: {query}

ANSWER:"""

        # Call Gemini
        model = genai.GenerativeModel(GEMINI_MODEL)
        response = model.generate_content(prompt)
        answer = response.text

        print(f"[INFO] Generated response using Gemini ({len(answer)} chars)")
        return answer

    except Exception as e:
        print(f"[WARNING] Gemini failed: {e}")
        print("[INFO] Trying Llama3 fallback...")
        # Try Llama3 fallback
        return generate_response_llama(query, context_chunks)


def generate_response_llama(query, context_chunks):
    """
    Fallback: Generate response using Llama3 via Groq API.
    Used when Gemini is unavailable or rate-limited.
    """
    try:
        if not GROQ_API_KEY:
            return "Both Gemini and Llama3 are unavailable. Please check your API keys in the .env file."

        client = Groq(api_key=GROQ_API_KEY)

        context = "\n\n---\n\n".join([chunk["text"] for chunk in context_chunks])

        messages = [
            {
                "role": "system",
                "content": """You are a helpful AI assistant. First, try to answer the user's question using ONLY the provided document context.
If the answer isn't in the context, use your own general knowledge to answer, but politely mention that it is not explicitly stated in the document.
Be concise, clear, and direct. DO NOT repeat the same lists or sentences over and over."""
            },
            {
                "role": "user",
                "content": f"CONTEXT:\n{context}\n\nQUESTION: {query}"
            }
        ]

        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=messages,
            temperature=0.5,
            frequency_penalty=0.6,
            max_tokens=1024,
        )

        answer = response.choices[0].message.content
        print(f"[INFO] Generated response using Llama3 fallback ({len(answer)} chars)")
        return answer

    except Exception as e:
        print(f"[ERROR] Llama3 fallback also failed: {e}")
        return f"Sorry, I encountered an error generating a response. Please try again. Error: {str(e)}"
