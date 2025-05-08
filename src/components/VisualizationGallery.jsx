// src/components/VisualizationGallery.jsx
import { useState } from "react";
import "../styles/VisualizationGallery.css";
import LoadingIndicator from "./LoadingIndicator";

const VisualizationGallery = ({ visualizations, isLoading }) => {
    const [selectedViz, setSelectedViz] = useState(null);

    // Handle visualization selection
    const handleVizSelect = (vizId) => {
        const selected = visualizations.find((viz) => viz.id === vizId);
        if (selected) {
            setSelectedViz(selected);
            console.log("Selected visualization:", vizId, selected.title);
        } else {
            console.error("Visualization not found with ID:", vizId);
        }
    };

    // Close the detail view
    const handleCloseDetail = () => {
        setSelectedViz(null);
    };

    if (isLoading) {
        return <LoadingIndicator message="시각화 생성 중..." />;
    }

    if (!visualizations || visualizations.length === 0) {
        return (
            <div className="viz-empty-state">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="empty-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                </svg>
                <h3>아직 생성된 시각화가 없습니다</h3>
                <p>데이터를 업로드하면 자동으로 시각화가 생성됩니다.</p>
            </div>
        );
    }

    return (
        <div className="visualization-gallery">
            {selectedViz ? (
                <div className="viz-detail-view">
                    <div className="viz-detail-header">
                        <h3>{selectedViz.title}</h3>
                        <button
                            className="close-detail-button"
                            onClick={handleCloseDetail}
                            aria-label="닫기"
                        >
                            &times;
                        </button>
                    </div>

                    <div className="viz-detail-content">
                        <div className="viz-large-display">
                            <div
                                className="chart-container"
                                dangerouslySetInnerHTML={{
                                    __html: selectedViz.svgContent,
                                }}
                            />
                        </div>

                        <div className="viz-detail-info">
                            <div className="viz-description">
                                <h4>설명</h4>
                                <p>{selectedViz.description}</p>
                            </div>

                            <div className="viz-metadata">
                                <h4>차트 정보</h4>
                                <ul>
                                    <li>
                                        <strong>차트 유형:</strong>{" "}
                                        {selectedViz.chartType}
                                    </li>
                                    <li>
                                        <strong>질문:</strong>{" "}
                                        {selectedViz.questionText}
                                    </li>
                                    <li>
                                        <strong>응답 수:</strong>{" "}
                                        {selectedViz.responseCount}
                                    </li>
                                </ul>
                            </div>

                            <div className="viz-data-summary">
                                <h4>주요 데이터 요약</h4>
                                <ul>
                                    {selectedViz.dataSummary &&
                                        selectedViz.dataSummary.map(
                                            (item, index) => (
                                                <li key={index}>{item}</li>
                                            )
                                        )}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    <h3 className="gallery-title">
                        생성된 시각화 ({visualizations.length})
                    </h3>

                    <div className="viz-grid">
                        {visualizations.map((viz, index) => (
                            <div
                                key={`${viz.id}_${index}`}
                                className="viz-card"
                                onClick={() => handleVizSelect(viz.id)}
                            >
                                <div className="viz-preview">
                                    <div
                                        className="chart-container"
                                        dangerouslySetInnerHTML={{
                                            __html: viz.svgContent,
                                        }}
                                    />
                                </div>
                                <div className="viz-info">
                                    <h4 className="viz-title">{viz.title}</h4>
                                    <p className="viz-type">{viz.chartType}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default VisualizationGallery;
