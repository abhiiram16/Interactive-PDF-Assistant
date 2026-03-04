/**
 * IndexedDB wrapper using Dexie.js
 * Manages chat sessions and messages for offline persistence
 */

import Dexie from 'dexie';

// Initialize the database
const db = new Dexie('RAGChatDB');

// Define schema
db.version(1).stores({
  sessions: '++id, sessionId, pdfName, createdAt',
  messages: '++id, sessionId, role, content, timestamp'
});

/**
 * Create a new chat session in IndexedDB
 */
export async function createSession(sessionId, pdfName) {
  try {
    const id = await db.sessions.add({
      sessionId,
      pdfName,
      createdAt: new Date().toISOString()
    });
    console.log(`[IndexedDB] Session created: ${sessionId}`);
    return id;
  } catch (err) {
    console.error('[IndexedDB] Failed to create session:', err);
    throw err;
  }
}

/**
 * Get all saved sessions, sorted by most recent
 */
export async function getAllSessions() {
  try {
    const sessions = await db.sessions.orderBy('createdAt').reverse().toArray();
    return sessions;
  } catch (err) {
    console.error('[IndexedDB] Failed to get sessions:', err);
    return [];
  }
}

/**
 * Add a message to a session
 * @param {string} sessionId - Backend session ID
 * @param {string} role - 'user' or 'assistant'
 * @param {string} content - Message content
 */
export async function addMessage(sessionId, role, content) {
  try {
    const id = await db.messages.add({
      sessionId,
      role,
      content,
      timestamp: new Date().toISOString()
    });
    return id;
  } catch (err) {
    console.error('[IndexedDB] Failed to add message:', err);
    throw err;
  }
}

/**
 * Get all messages for a given session
 */
export async function getMessages(sessionId) {
  try {
    const messages = await db.messages
      .where('sessionId')
      .equals(sessionId)
      .sortBy('timestamp');
    return messages;
  } catch (err) {
    console.error('[IndexedDB] Failed to get messages:', err);
    return [];
  }
}

/**
 * Delete a session and all its messages
 */
export async function deleteSession(sessionId) {
  try {
    await db.messages.where('sessionId').equals(sessionId).delete();
    await db.sessions.where('sessionId').equals(sessionId).delete();
    console.log(`[IndexedDB] Session deleted: ${sessionId}`);
  } catch (err) {
    console.error('[IndexedDB] Failed to delete session:', err);
  }
}

/**
 * Clear all data (for testing/reset)
 */
export async function clearAllData() {
  try {
    await db.sessions.clear();
    await db.messages.clear();
    console.log('[IndexedDB] All data cleared');
  } catch (err) {
    console.error('[IndexedDB] Failed to clear data:', err);
  }
}

export default db;
