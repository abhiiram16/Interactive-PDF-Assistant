import { useState, useRef } from 'react';
import { uploadPdf } from '../api/api';
import './PdfUpload.css';

function PdfUpload({ onUploadSuccess, isUploading, setIsUploading }) {
    const [dragActive, setDragActive] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState('');
    const [processingStep, setProcessingStep] = useState('');
    const fileInputRef = useRef(null);

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileInput = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const handleFile = async (file) => {
        if (!file.name.toLowerCase().endsWith('.pdf')) {
            setError('Please upload a PDF file only.');
            return;
        }

        if (file.size > 16 * 1024 * 1024) {
            setError('File is too large. Maximum size is 16MB.');
            return;
        }

        setError('');
        setIsUploading(true);
        setUploadProgress(0);
        setProcessingStep('Uploading file...');

        try {
            const onProgress = (percent) => {
                setUploadProgress(percent);
                if (percent === 100) {
                    setProcessingStep('Processing PDF... (parsing, chunking, embedding)');
                }
            };

            const result = await uploadPdf(file, onProgress);
            setProcessingStep('Done!');

            onUploadSuccess({
                sessionId: result.session_id,
                pdfName: result.pdf_name,
                totalChunks: result.total_chunks,
                textLength: result.text_length,
                message: result.message
            });

        } catch (err) {
            setError(err.message || 'Upload failed. Please try again.');
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
            setProcessingStep('');
        }
    };

    return (
        <div className="upload-container">
            <div className="upload-header">
                <h2>Upload Your PDF</h2>
                <p>Upload a PDF document and start asking questions about its content</p>
            </div>

            <div
                className={`drop-zone ${dragActive ? 'drag-active' : ''} ${isUploading ? 'uploading' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => !isUploading && fileInputRef.current?.click()}
            >
                {isUploading ? (
                    <div className="upload-progress">
                        <div className="spinner"></div>
                        <p className="progress-text">{processingStep}</p>
                        {uploadProgress > 0 && uploadProgress < 100 && (
                            <div className="progress-bar">
                                <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="drop-icon">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="17 8 12 3 7 8" />
                                <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                        </div>
                        <p className="drop-text">Drag & drop your PDF here</p>
                        <p className="drop-subtext">or click to browse files</p>
                        <span className="file-limit">Maximum file size: 16MB</span>
                    </>
                )}

                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleFileInput}
                    style={{ display: 'none' }}
                />
            </div>

            {error && (
                <div className="upload-error">
                    {error}
                </div>
            )}

            <div className="upload-features">
                <div className="feature">
                    <div className="feature-icon-wrap">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                    </div>
                    <div>
                        <h4>Smart Parsing</h4>
                        <p>Extracts and chunks text intelligently</p>
                    </div>
                </div>
                <div className="feature">
                    <div className="feature-icon-wrap">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2L2 7l10 5 10-5-10-5z" />
                            <path d="M2 17l10 5 10-5" />
                            <path d="M2 12l10 5 10-5" />
                        </svg>
                    </div>
                    <div>
                        <h4>AI Embeddings</h4>
                        <p>Powered by Google Gemini vectors</p>
                    </div>
                </div>
                <div className="feature">
                    <div className="feature-icon-wrap">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                    </div>
                    <div>
                        <h4>Natural Chat</h4>
                        <p>Ask questions in plain English</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PdfUpload;
