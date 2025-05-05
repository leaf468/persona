// src/components/InsightPanel.jsx
import { useState } from "react";
import "../styles/InsightPanel.css";
import LoadingIndicator from "./LoadingIndicator";

const InsightPanel = ({ insights, isLoading, fileData }) => {
    const [activeCategory, setActiveCategory] = useState("all"); // 'all', 'general', 'trends', 'correlations', etc.

    // Handle category change
    const handleCategoryChange = (category) => {
        setActiveCategory(category);
    };

    if (isLoading) {
        return <LoadingIndicator message="AI를 통해 인사이트 생성 중..." />;
    }

    if (!insights) {
        return (
            <div className="insights-empty-state">
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
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                </svg>
                <h3>아직 생성된 인사이트가 없습니다</h3>
                <p>분석이 완료되면 여기에 인사이트가 표시됩니다.</p>
            </div>
        );
    }

    // Filter insights based on selected category
    const filteredInsights =
        activeCategory === "all"
            ? insights.items
            : insights.items.filter((item) => item.category === activeCategory);

    return (
        <div className="insight-panel">
            <div className="insights-header">
                <h3>설문 데이터 인사이트</h3>
                <p className="insights-subtitle">
                    AI 분석을 통해 발견된 주요 인사이트
                </p>

                <div className="summary-metrics">
                    <div className="metric-item">
                        <span className="metric-label">총 응답 수</span>
                        <span className="metric-value">
                            {insights.totalResponses}
                        </span>
                    </div>
                    <div className="metric-item">
                        <span className="metric-label">질문 수</span>
                        <span className="metric-value">
                            {insights.questionCount}
                        </span>
                    </div>
                    <div className="metric-item">
                        <span className="metric-label">발견된 인사이트</span>
                        <span className="metric-value">
                            {insights.items.length}
                        </span>
                    </div>
                </div>

                <div className="exec-summary">
                    <h4>주요 요약</h4>
                    <p>{insights.executiveSummary}</p>
                </div>
            </div>

            <div className="insights-filter">
                <button
                    className={`filter-button ${
                        activeCategory === "all" ? "active" : ""
                    }`}
                    onClick={() => handleCategoryChange("all")}
                >
                    전체
                </button>
                {insights.categories.map((category) => (
                    <button
                        key={category.id}
                        className={`filter-button ${
                            activeCategory === category.id ? "active" : ""
                        }`}
                        onClick={() => handleCategoryChange(category.id)}
                    >
                        {category.name}
                    </button>
                ))}
            </div>

            <div className="insights-content">
                {filteredInsights.length === 0 ? (
                    <p className="no-insights-message">
                        선택한 카테고리에 해당하는 인사이트가 없습니다.
                    </p>
                ) : (
                    filteredInsights.map((insight) => (
                        <div key={insight.id} className="insight-card">
                            <div className="insight-header">
                                <span
                                    className={`insight-tag ${insight.category}`}
                                >
                                    {insights.categories.find(
                                        (c) => c.id === insight.category
                                    )?.name || insight.category}
                                </span>
                                <h4 className="insight-title">
                                    {insight.title}
                                </h4>
                            </div>

                            <div className="insight-body">
                                <p className="insight-description">
                                    {insight.description}
                                </p>

                                {insight.relatedQuestions &&
                                    insight.relatedQuestions.length > 0 && (
                                        <div className="insight-related-questions">
                                            <h5>관련 질문:</h5>
                                            <ul>
                                                {insight.relatedQuestions.map(
                                                    (question, idx) => (
                                                        <li key={idx}>
                                                            {question}
                                                        </li>
                                                    )
                                                )}
                                            </ul>
                                        </div>
                                    )}

                                {insight.recommendations &&
                                    insight.recommendations.length > 0 && (
                                        <div className="insight-recommendations">
                                            <h5>제안 사항:</h5>
                                            <ul>
                                                {insight.recommendations.map(
                                                    (rec, idx) => (
                                                        <li key={idx}>{rec}</li>
                                                    )
                                                )}
                                            </ul>
                                        </div>
                                    )}
                            </div>

                            <div className="insight-footer">
                                <span className="insight-confidence">
                                    신뢰도: {insight.confidenceLevel}%
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default InsightPanel;
