// src/components/DataVisualizationDashboard.jsx
import { useState, useEffect } from "react";
import { processDataFile } from "../services/dataProcessingService";
import { generateVisualizations } from "../services/visualizationService";
import { generateInsights } from "../services/insightService";
import FileUploadForm from "./FileUploadForm";
import VisualizationGallery from "./VisualizationGallery";
import InsightPanel from "./InsightPanel";
import LoadingIndicator from "./LoadingIndicator";
import "../styles/DataVisualizationDashboard.css";

const DataVisualizationDashboard = () => {
    // State management
    const [file, setFile] = useState(null);
    const [fileData, setFileData] = useState(null);
    const [visualizations, setVisualizations] = useState([]);
    const [insights, setInsights] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isGeneratingViz, setIsGeneratingViz] = useState(false);
    const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState("visualizations"); // "visualizations" or "insights"

    // Process file when uploaded
    const handleFileUpload = async (uploadedFile, surveyContext) => {
        setFile(uploadedFile);
        setError(null);
        setIsProcessing(true);

        try {
            // Process the file data with context
            const processedData = await processDataFile(uploadedFile);
            
            // Add survey context to the processed data if provided
            if (surveyContext) {
                processedData.surveyContext = surveyContext;
            }
            
            setFileData(processedData);

            // Generate visualizations automatically
            setIsGeneratingViz(true);
            const generatedVisualizations = await generateVisualizations(
                processedData
            );
            setVisualizations(generatedVisualizations);
            setIsGeneratingViz(false);

            // Generate insights with context information
            setIsGeneratingInsights(true);
            const generatedInsights = await generateInsights(processedData);
            setInsights(generatedInsights);
            setIsGeneratingInsights(false);
        } catch (err) {
            console.error("Error processing file:", err);
            setError(`파일 처리 중 오류가 발생했습니다: ${err.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    // Reset everything
    const handleReset = () => {
        setFile(null);
        setFileData(null);
        setVisualizations([]);
        setInsights(null);
        setError(null);
        setActiveTab("visualizations");
    };

    // Handle tab switching
    const handleTabChange = (tab) => {
        setActiveTab(tab);
    };

    return (
        <div className="data-visualization-dashboard">
            <div className="dashboard-header">
                <h2>데이터 시각화 대시보드</h2>
                <p className="dashboard-subtitle">
                    CSV 또는 Excel 파일을 업로드하여 자동으로 시각화 및
                    인사이트를 생성하세요
                </p>
            </div>

            {!file ? (
                <FileUploadForm onFileUpload={handleFileUpload} />
            ) : (
                <div className="dashboard-content">
                    <div className="dashboard-file-info">
                        <div className="file-details">
                            <span className="file-name">{file.name}</span>
                            <span className="file-size">
                                {(file.size / 1024).toFixed(2)} KB
                            </span>
                        </div>
                        <button
                            className="reset-button"
                            onClick={handleReset}
                            aria-label="새 파일 업로드"
                        >
                            새 파일 업로드
                        </button>
                    </div>

                    {error && (
                        <div className="error-message">
                            <p>{error}</p>
                        </div>
                    )}

                    {isProcessing ? (
                        <LoadingIndicator message="파일 처리 중..." />
                    ) : (
                        <>
                            <div className="dashboard-tabs">
                                <button
                                    className={`tab-button ${
                                        activeTab === "visualizations"
                                            ? "active"
                                            : ""
                                    }`}
                                    onClick={() =>
                                        handleTabChange("visualizations")
                                    }
                                >
                                    시각화
                                    {isGeneratingViz && (
                                        <span className="loading-dot"></span>
                                    )}
                                </button>
                                <button
                                    className={`tab-button ${
                                        activeTab === "insights" ? "active" : ""
                                    }`}
                                    onClick={() => handleTabChange("insights")}
                                >
                                    인사이트
                                    {isGeneratingInsights && (
                                        <span className="loading-dot"></span>
                                    )}
                                </button>
                            </div>

                            <div className="dashboard-tab-content">
                                {activeTab === "visualizations" && (
                                    <VisualizationGallery
                                        visualizations={visualizations}
                                        isLoading={isGeneratingViz}
                                    />
                                )}

                                {activeTab === "insights" && (
                                    <InsightPanel
                                        insights={insights}
                                        isLoading={isGeneratingInsights}
                                        fileData={fileData}
                                    />
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default DataVisualizationDashboard;
