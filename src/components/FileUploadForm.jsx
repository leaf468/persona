// src/components/FileUploadForm.jsx
import { useState, useRef } from "react";
import "../styles/FileUploadForm.css";

const FileUploadForm = ({ onFileUpload }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [surveyContext, setSurveyContext] = useState("");
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

    // Handle context text change
    const handleContextChange = (e) => {
        setSurveyContext(e.target.value);
    };

    // Open file dialog
    const handleSelectFileClick = () => {
        fileInputRef.current.click();
    };

    // Submit form
    const handleSubmit = (e) => {
        e.preventDefault();
        if (selectedFile) {
            onFileUpload(selectedFile, surveyContext);
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

                <div className="survey-context-container">
                    <h3>설문 맥락 정보 (선택사항)</h3>
                    <p className="context-description">
                        설문에 대한 추가 정보를 입력하면 더 정확한 시각화와 인사이트를 생성할 수 있습니다.
                    </p>
                    <textarea
                        className="survey-context-input"
                        placeholder="설문의 목적, 대상, 시장, 기대하는 결과 등을 입력하세요. 예: '20-30대 여성을 대상으로 한 화장품 선호도 조사로, 신제품 출시를 위한 시장 조사입니다.'"
                        value={surveyContext}
                        onChange={handleContextChange}
                        rows={5}
                    ></textarea>
                    <div className="context-suggestions">
                        <h4>입력 도움말:</h4>
                        <ul>
                            <li>어떤 목적으로 설문을 진행했나요?</li>
                            <li>설문 대상은 누구인가요? (연령, 성별, 직업 등)</li>
                            <li>어떤 시장이나 분야를 분석하고 있나요?</li>
                            <li>어떤 결론이나 결과를 얻고자 하나요?</li>
                            <li>이 데이터로 해결하려는 문제는 무엇인가요?</li>
                        </ul>
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
