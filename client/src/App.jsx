import { useState } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import PdfUpload from './components/PdfUpload';
import ChatInterface from './components/ChatInterface';
import { createSession, getMessages } from './db/indexedDb';
import './App.css';

function App() {
  const [activeSession, setActiveSession] = useState(null);
  const [activePdfName, setActivePdfName] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Called when a PDF is successfully uploaded and processed
  const handleUploadSuccess = async (data) => {
    // Save session to IndexedDB
    await createSession(data.sessionId, data.pdfName);

    // Switch to chat view
    setActiveSession(data.sessionId);
    setActivePdfName(data.pdfName);
    setSidebarOpen(false);
  };

  // Called when user selects a previous session from sidebar
  const handleSessionSelect = (sessionId, pdfName) => {
    setActiveSession(sessionId);
    setActivePdfName(pdfName);
    setSidebarOpen(false);
  };

  // Reset to upload view
  const handleNewChat = () => {
    setActiveSession(null);
    setActivePdfName('');
    setSidebarOpen(false);
  };

  return (
    <div className="app">
      <Sidebar
        activeSession={activeSession}
        onSessionSelect={handleSessionSelect}
        onNewChat={handleNewChat}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      <div className="main-content">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="main-area">
          {activeSession ? (
            <ChatInterface
              sessionId={activeSession}
              pdfName={activePdfName}
            />
          ) : (
            <PdfUpload
              onUploadSuccess={handleUploadSuccess}
              isUploading={isUploading}
              setIsUploading={setIsUploading}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
