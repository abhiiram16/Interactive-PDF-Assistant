import { useState, useEffect, useRef } from 'react';
import { sendMessage } from '../api/api';
import { addMessage, getMessages } from '../db/indexedDb';
import './ChatInterface.css';

function ChatInterface({ sessionId, pdfName }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showSources, setShowSources] = useState(null);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        async function loadMessages() {
            if (sessionId) {
                const saved = await getMessages(sessionId);
                setMessages(saved.map(m => ({
                    role: m.role,
                    content: m.content,
                    timestamp: m.timestamp,
                    sources: m.sources || null
                })));
            }
        }
        loadMessages();
    }, [sessionId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        inputRef.current?.focus();
    }, [sessionId]);

    const handleSend = async () => {
        const query = input.trim();
        if (!query || isLoading) return;

        const userMsg = { role: 'user', content: query, timestamp: new Date().toISOString() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        await addMessage(sessionId, 'user', query);

        try {
            const response = await sendMessage(sessionId, query);

            const assistantMsg = {
                role: 'assistant',
                content: response.answer,
                timestamp: new Date().toISOString(),
                sources: response.sources || []
            };

            setMessages(prev => [...prev, assistantMsg]);
            await addMessage(sessionId, 'assistant', response.answer);

        } catch (err) {
            const errorMsg = {
                role: 'assistant',
                content: `Sorry, something went wrong: ${err.message}`,
                timestamp: new Date().toISOString(),
                isError: true
            };
            setMessages(prev => [...prev, errorMsg]);
            await addMessage(sessionId, 'assistant', errorMsg.content);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const formatTime = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="chat-container">
            {/* Chat Header */}
            <div className="chat-header">
                <div className="chat-header-info">
                    <span className="pdf-badge">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                        </svg>
                        {pdfName}
                    </span>
                    <span className="chat-status">
                        <span className={`status-dot ${isLoading ? 'loading' : 'ready'}`}></span>
                        {isLoading ? 'Thinking...' : 'Ready'}
                    </span>
                </div>
            </div>

            {/* Messages Area */}
            <div className="messages-area">
                {messages.length === 0 && (
                    <div className="empty-chat">
                        <div className="empty-icon">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                        </div>
                        <h3>Start a Conversation</h3>
                        <p>Ask any question about <strong>{pdfName}</strong></p>
                        <div className="suggestion-chips">
                            <button onClick={() => setInput('What is this document about?')}>
                                What is this document about?
                            </button>
                            <button onClick={() => setInput('Summarize the key points')}>
                                Summarize the key points
                            </button>
                            <button onClick={() => setInput('What are the main topics covered?')}>
                                What are the main topics?
                            </button>
                        </div>
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <div key={idx} className={`message ${msg.role} ${msg.isError ? 'error' : ''}`}>
                        <div className={`message-avatar ${msg.role}`}>
                            {msg.role === 'user' ? 'U' : 'AI'}
                        </div>
                        <div className="message-content">
                            <div className="message-bubble">
                                <p>{msg.content}</p>
                            </div>
                            <div className="message-meta">
                                <span className="message-time">{formatTime(msg.timestamp)}</span>
                                {msg.sources && msg.sources.length > 0 && (
                                    <button
                                        className="sources-btn"
                                        onClick={() => setShowSources(showSources === idx ? null : idx)}
                                    >
                                        {msg.sources.length} sources
                                    </button>
                                )}
                            </div>
                            {showSources === idx && msg.sources && (
                                <div className="sources-panel">
                                    <h4>Retrieved Context</h4>
                                    {msg.sources.map((source, sIdx) => (
                                        <div key={sIdx} className="source-item">
                                            <div className="source-score">
                                                Relevance: {(source.relevance_score * 100).toFixed(1)}%
                                            </div>
                                            <p className="source-text">{source.text}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="message assistant">
                        <div className="message-avatar assistant">AI</div>
                        <div className="message-content">
                            <div className="message-bubble typing">
                                <div className="typing-dots">
                                    <span></span><span></span><span></span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="chat-input-area">
                <div className="input-wrapper">
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask a question about your PDF..."
                        disabled={isLoading}
                        rows={1}
                    />
                    <button
                        className="send-btn"
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="22" y1="2" x2="11" y2="13" />
                            <polygon points="22 2 15 22 11 13 2 9 22 2" />
                        </svg>
                    </button>
                </div>
                <p className="input-hint">Press Enter to send, Shift+Enter for new line</p>
            </div>
        </div>
    );
}

export default ChatInterface;
