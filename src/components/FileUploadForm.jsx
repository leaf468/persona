// src/components/FileUploadForm.jsx
import { useState, useRef } from "react";
import "../styles/FileUploadForm.css";

const FileUploadForm = ({ onFileUpload }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const fileInputRef = useRef(null);

    // Check if the file is a valid CSV or Excel file
    const isValidFile = (file) => {
        const validExtensions = [".csv", ".xlsx", ".xls"];
        const fileName = file.name.toLowerCase();
        return validExtensions.some((ext) => fileName.endsWith(ext));
    };

    // Handle drag events
    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files.length) {
            handleFiles(files[0]);
        }
    };

    // Handle file selection
    const handleFileInputChange = (e) => {
        const files = e.target.files;
        if (files.length) {
            handleFiles(files[0]);
        }
    };

    // Process the file
    const handleFiles = (file) => {
        if (!isValidFile(file)) {
            alert(
                "유효한 파일 형식이 아닙니다. CSV 또는 Excel 파일을 업로드해 주세요."
            );
            return;
        }

        setSelectedFile(file);
    };

    // Open file dialog
    const handleSelectFileClick = () => {
        fileInputRef.current.click();
    };

    // Submit form
    const handleSubmit = (e) => {
        e.preventDefault();
        if (selectedFile) {
            onFileUpload(selectedFile);
        }
    };

    return (
        <div className="file-upload-form-container">
            <form onSubmit={handleSubmit} className="file-upload-form">
                <div
                    className={`drop-area ${isDragging ? "dragging" : ""} ${
                        selectedFile ? "has-file" : ""
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={handleSelectFileClick}
                >
                    <input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={handleFileInputChange}
                        ref={fileInputRef}
                        className="file-input"
                    />

                    <div className="drop-message">
                        {!selectedFile ? (
                            <>
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="upload-icon"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                    />
                                </svg>
                                <h3>
                                    설문조사 파일을 여기에 끌어다 놓거나
                                    클릭하여 업로드하세요
                                </h3>
                                <p>지원 형식: CSV, XLSX, XLS</p>
                            </>
                        ) : (
                            <>
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="file-icon"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                    />
                                </svg>
                                <h3>{selectedFile.name}</h3>
                                <p>
                                    {(selectedFile.size / 1024).toFixed(2)} KB
                                </p>
                            </>
                        )}
                    </div>
                </div>

                {selectedFile && (
                    <div className="file-actions">
                        <button
                            type="button"
                            className="change-file-button"
                            onClick={handleSelectFileClick}
                        >
                            파일 변경
                        </button>
                        <button type="submit" className="upload-button">
                            분석 시작
                        </button>
                    </div>
                )}
            </form>
        </div>
    );
};

export default FileUploadForm;
