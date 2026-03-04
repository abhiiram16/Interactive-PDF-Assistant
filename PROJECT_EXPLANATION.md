# PROJECT_EXPLANATION.md
# Interactive PDF Assistant - Technical Documentation

## Project Overview
The Interactive PDF Assistant is a full-stack web application designed to solve the problem of manually reading and searching through massive, text-heavy PDF documents. By utilizing Retrieval-Augmented Generation (RAG), the system allows users to upload a PDF and instantly ask natural language questions about its contents. The application efficiently retrieves relevant context from the document and uses an AI model to generate concise, accurate answers, saving users hours of manual research.

## System Architecture

```text
[ User (Web Browser) ] 
       │
       ▼
[ React + Vite Frontend (UI & Logic) ] ◄──► [ IndexedDB (Local Storage) ]
       │                                     Stores chat history offline
       ▼ 
   HTTP POST
(/upload, /chat)
       │
       ▼
[ Flask Backend (API Server) ] 
       │
       ├──► Parse PDF (PyPDF2)
       ├──► Chunk Text
       │
       ▼
[ Google Gemini API ] 
   (1. Embeddings: Converts text chunks to vectors)
   (2. LLM: Generates conversational answers)
       │
       ▼
[ NumPy (Cosine Similarity) ]
Matches user questions to document vectors
```

## The PDF Pipeline (Deep Dive)

### Extraction
When a user uploads a PDF, the backend receives the file and uses the **PyPDF2** library to iterate through every page. It systematically extracts all readable text into a single, massive string, ignoring images to keep the processing fast and focused on raw data.

### Chunking
Because AI models have strict token limits (meaning they can't process an entire book in one go), we must split the massive text into smaller pieces called **chunks**. I configured the chunk size to 2000 characters. Crucially, I implemented an **"overlap"** of 200 characters. This means the end of chunk A overlaps with the beginning of chunk B, ensuring that sentences or paragraphs aren't cut in half, which preserves context for the AI.

### Embeddings
Once the text is chunked, the chunks are sent to Google's **Gemini Embedding Model**. The model analyzes the semantic meaning of each chunk and converts it into a high-dimensional vector (a long list of numbers). This allows the system to understand the *meaning* of the text, rather than just doing a basic `Ctrl+F` keyword search.

## The Retrieval Logic (RAG)
When the user asks a question, the application uses **Retrieval-Augmented Generation (RAG)**:
1. The user's question is converted into a vector embedding.
2. The system uses **Cosine Similarity** (via NumPy) to compare the question's vector against all the document chunk vectors.
3. It retrieves the top 3 most mathematically similar chunks. These chunks represent the exact context needed to answer the question.
4. Finally, it feeds both the *user's question* and the *retrieved context* to the Gemini 2.5 Flash LLM, instructing it to answer the question using *only* that context.

## Frontend State & Storage
Instead of setting up a complex backend database (like PostgreSQL or MongoDB) just to save chat history, I utilized **IndexedDB** via the Dexie.js library directly on the frontend. 
IndexedDB allows the application to store session metadata and chat messages locally in the user's browser. This guarantees persistent chat history and lightning-fast load times when switching between past sessions, without requiring constant network requests to the server.

## Interview Cheat Sheet

*Here are 5 technical challenges I faced during development and how I resolved them:*

1. **Challenge:** Handling Massive PDFs Hitting API Rate Limits
   * **Resolution:** Initially, uploading large PDFs crashed the app because the backend sent chunks to the Gemini API one-by-one, instantly hitting the "100 requests per minute" free tier limit. I optimized the code to send chunks in arrays (batching) and implemented an exponential backoff retry mechanism to gracefully pause and retry if a `429 Quota Exceeded` error occurred. I also increased the text chunk size to 2000 to drastically reduce the total number of chunks.

2. **Challenge:** Preserving Context During Text Splitting
   * **Resolution:** Hard-splitting text every 500 characters often broke sentences in half, causing the AI to give poor answers. I implemented an overlapping chunk strategy (200 characters of overlap) and added logic to try breaking at natural sentence boundaries (like periods or newlines) so the AI always has complete thoughts to read.

3. **Challenge:** AI Hallucination and Repetition Loops
   * **Resolution:** When using the Llama-3 fallback model, it occasionally got stuck in a loop, endlessly repeating the same bullet points. I resolved this by fine-tuning the system prompt to explicitly forbid repetition and by adding a strict `frequency_penalty` (0.6) to the API parameters to force the model to generate diverse text.

4. **Challenge:** Managing Long-Running API Calls on the Frontend
   * **Resolution:** Because the backend sometimes needed to sleep for 45+ seconds to respect Google's rate limits while processing large PDFs, the Axios HTTP client on the frontend was timing out and showing a false "Upload Failed" error. I fixed this by configuring a custom Axios instance with an extended 10-minute timeout specifically for the upload route.

5. **Challenge:** Seamlessly Managing Multiple Chat Sessions
   * **Resolution:** Storing past chat sessions entirely in React state meant they were lost on refresh. To fix this without requiring user authentication or a backend database, I integrated IndexedDB. This required asynchronous JavaScript logic to ensure the database was fully loaded before rendering the chat UI, providing a smooth user experience.
