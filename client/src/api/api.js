/**
 * API Layer - Handles communication with Flask backend
 */

import axios from 'axios';

const API_BASE = 'http://localhost:5000';

// Create axios instance with defaults
const api = axios.create({
    baseURL: API_BASE,
    timeout: 600000, // 10 min timeout for large PDFs (accounts for Gemini API rate limit delays)
});

/**
 * Upload a PDF file to the backend for processing
 * @param {File} file - The PDF file object
 * @param {function} onProgress - Progress callback (0-100)
 * @returns {Promise} - Response with session_id and metadata
 */
export async function uploadPdf(file, onProgress) {
    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await api.post('/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: (progressEvent) => {
                if (onProgress && progressEvent.total) {
                    const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    onProgress(percent);
                }
            },
        });
        return response.data;
    } catch (error) {
        const message = error.response?.data?.error || 'Failed to upload PDF. Is the backend running?';
        throw new Error(message);
    }
}

/**
 * Send a chat message and get AI response
 * @param {string} sessionId - Current session ID
 * @param {string} query - User's question
 * @returns {Promise} - Response with answer and sources
 */
export async function sendMessage(sessionId, query) {
    try {
        const response = await api.post('/chat', {
            session_id: sessionId,
            query: query,
        });
        return response.data;
    } catch (error) {
        const message = error.response?.data?.error || 'Failed to get response. Please try again.';
        throw new Error(message);
    }
}

/**
 * Get all active sessions from the backend
 */
export async function getSessions() {
    try {
        const response = await api.get('/sessions');
        return response.data;
    } catch (error) {
        console.error('Failed to fetch sessions:', error);
        return { sessions: [], total: 0 };
    }
}

/**
 * Health check - verify backend is running
 */
export async function checkHealth() {
    try {
        const response = await api.get('/');
        return response.data;
    } catch (error) {
        return null;
    }
}
