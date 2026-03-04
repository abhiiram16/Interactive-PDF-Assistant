import './Header.css';

function Header({ onMenuClick }) {
    return (
        <header className="app-header">
            <div className="header-left">
                <button className="menu-btn" onClick={onMenuClick}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <line x1="3" y1="12" x2="21" y2="12" />
                        <line x1="3" y1="18" x2="21" y2="18" />
                    </svg>
                </button>
                <div className="brand">
                    <h1>DocuMind AI</h1>
                </div>
            </div>
            <div className="header-right">
                <span className="header-tagline">PDF Chat Assistant powered by RAG</span>
                <div className="header-dot"></div>
            </div>
        </header>
    );
}

export default Header;
