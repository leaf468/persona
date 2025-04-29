// src/components/ChatInsights.jsx
import "../styles/ChatInsights.css";

const ChatInsights = ({ insights, persona }) => {
    if (!insights) {
        return (
            <div className="chat-insights">
                <div className="insights-header">
                    <h3>대화 인사이트</h3>
                    <p className="insights-subtitle">
                        대화 내용을 분석 중입니다...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="chat-insights">
            <div className="insights-header">
                <h3>대화 인사이트</h3>
                <p className="insights-subtitle">
                    {persona.name}와의 대화에서 얻은 인사이트
                </p>
            </div>

            <div className="insights-content">
                <div className="insight-section">
                    <h4 className="insight-title">요약</h4>
                    <p className="insight-text">{insights.summary}</p>
                </div>

                {insights.keyPoints && insights.keyPoints.length > 0 && (
                    <div className="insight-section">
                        <h4 className="insight-title">핵심 포인트</h4>
                        <ul className="insight-list">
                            {insights.keyPoints.map((point, index) => (
                                <li key={index} className="insight-item">
                                    {point}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {insights.userNeeds && insights.userNeeds.length > 0 && (
                    <div className="insight-section">
                        <h4 className="insight-title">사용자 니즈</h4>
                        <ul className="insight-list">
                            {insights.userNeeds.map((need, index) => (
                                <li key={index} className="insight-item">
                                    {need}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {insights.suggestions && insights.suggestions.length > 0 && (
                    <div className="insight-section">
                        <h4 className="insight-title">제안</h4>
                        <ul className="insight-list">
                            {insights.suggestions.map((suggestion, index) => (
                                <li key={index} className="insight-item">
                                    {suggestion}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatInsights;
