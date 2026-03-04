import { useEffect, useState } from 'react';
import { getAllSessions, deleteSession as dbDeleteSession } from '../db/indexedDb';
import './Sidebar.css';

function Sidebar({ activeSession, onSessionSelect, onNewChat, isOpen, onToggle }) {
    const [sessions, setSessions] = useState([]);

    useEffect(() => {
        loadSessions();
    }, [activeSession]);

    const loadSessions = async () => {
        const saved = await getAllSessions();
        setSessions(saved);
    };

    const handleDelete = async (e, sessionId) => {
        e.stopPropagation();
        await dbDeleteSession(sessionId);
        loadSessions();
        if (activeSession === sessionId) {
            onNewChat();
        }
    };

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} hr ago`;
        return date.toLocaleDateString();
    };

    return (
        <>
            {isOpen && <div className="sidebar-overlay" onClick={onToggle} />}

            <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <h2>Chat History</h2>
                    <button className="close-sidebar" onClick={onToggle}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                <button className="new-chat-btn" onClick={onNewChat}>
                    <span>+</span> New Chat
                </button>

                <div className="sessions-list">
                    {sessions.length === 0 ? (
                        <div className="no-sessions">
                            <p>No chat sessions yet</p>
                            <span>Upload a PDF to get started</span>
                        </div>
                    ) : (
                        sessions.map((session) => (
                            <div
                                key={session.id}
                                className={`session-item ${activeSession === session.sessionId ? 'active' : ''}`}
                                onClick={() => onSessionSelect(session.sessionId, session.pdfName)}
                            >
                                <div className="session-info">
                                    <span className="session-pdf">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                            <polyline points="14 2 14 8 20 8" />
                                        </svg>
                                        {session.pdfName}
                                    </span>
                                    <span className="session-time">{formatDate(session.createdAt)}</span>
                                </div>
                                <button
                                    className="delete-session"
                                    onClick={(e) => handleDelete(e, session.sessionId)}
                                    title="Delete session"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="3 6 5 6 21 6" />
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                    </svg>
                                </button>
                            </div>
                        ))
                    )}
                </div>

                <div className="sidebar-footer">
                    <div className="tech-stack">
                        <span>Built with</span>
                        <div className="tech-badges">
                            <span className="badge">React</span>
                            <span className="badge">Flask</span>
                            <span className="badge">Gemini</span>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}

export default Sidebar;
