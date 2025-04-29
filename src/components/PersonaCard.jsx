// src/components/PersonaCard.jsx

import { useState, useEffect } from "react";
import "../styles/PersonaCard.css";

const PersonaCard = ({ persona, isSelected, onSelect, onChatStart }) => {
    const [expanded, setExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState("profile"); // 'profile', 'details', 'brands'
    const [imageLoading, setImageLoading] = useState(true);

    // 페르소나 속성에서 동기부여, 성격 등을 추출
    const getPersonalityTraits = () => {
        const traitsText = persona.personality || "";
        return traitsText
            .split(",")
            .map((trait) => trait.trim())
            .filter((t) => t);
    };

    // 페르소나에서 브랜드 추출 (예시 데이터가 없으면 기본값 제공)
    const getPersonaBrands = () => {
        return persona.brands || ["네이버", "카카오", "인스타그램"];
    };

    // 동기부여 요소 수치화 (0-100 사이)
    const getMotivations = () => {
        return {
            incentive: Math.floor(Math.random() * 50) + 50, // 자극 (50-100)
            fear: Math.floor(Math.random() * 30) + 10, // 두려움 (10-40)
            achievement: Math.floor(Math.random() * 50) + 50, // 성취 (50-100)
            growth: Math.floor(Math.random() * 40) + 60, // 성장 (60-100)
            power: Math.floor(Math.random() * 40) + 20, // 파워 (20-60)
            social: Math.floor(Math.random() * 60) + 20, // 소셜 (20-80)
        };
    };

    // 추가 정보 표시 토글
    const toggleExpand = () => {
        setExpanded(!expanded);
    };

    // 탭 변경 함수
    const changeTab = (tab) => {
        setActiveTab(tab);
    };

    // 성격 특성 막대 그래프 표시
    const renderPersonalityBars = () => {
        const traits = {
            extrovert: persona.personality?.includes("외향적") ? 80 : 30,
            introvert: persona.personality?.includes("내향적") ? 80 : 30,
            analytical: persona.personality?.includes("분석적") ? 80 : 40,
            creative: persona.personality?.includes("창의적") ? 80 : 40,
            organized: persona.personality?.includes("계획적") ? 80 : 30,
            flexible: persona.personality?.includes("유연한") ? 80 : 40,
        };

        return (
            <div className="personality-bars">
                <div className="personality-bar-item">
                    <span className="bar-label">내향적</span>
                    <div className="bar-container">
                        <div
                            className="bar-fill"
                            style={{ width: `${traits.introvert}%` }}
                        ></div>
                    </div>
                    <span className="bar-label">외향적</span>
                </div>

                <div className="personality-bar-item">
                    <span className="bar-label">분석적</span>
                    <div className="bar-container">
                        <div
                            className="bar-fill"
                            style={{ width: `${traits.analytical}%` }}
                        ></div>
                    </div>
                    <span className="bar-label">직관적</span>
                </div>

                <div className="personality-bar-item">
                    <span className="bar-label">계획적</span>
                    <div className="bar-container">
                        <div
                            className="bar-fill"
                            style={{ width: `${traits.organized}%` }}
                        ></div>
                    </div>
                    <span className="bar-label">즉흥적</span>
                </div>
            </div>
        );
    };

    // 동기부여 그래프 표시
    const renderMotivationChart = () => {
        const motivations = getMotivations();

        return (
            <div className="motivation-chart">
                <h4 className="chart-title">동기부여</h4>
                {Object.entries(motivations).map(([key, value]) => (
                    <div key={key} className="motivation-item">
                        <span className="motivation-label">
                            {key === "incentive"
                                ? "자극"
                                : key === "fear"
                                ? "두려움"
                                : key === "achievement"
                                ? "성취"
                                : key === "growth"
                                ? "성장"
                                : key === "power"
                                ? "권력"
                                : "사회성"}
                        </span>
                        <div className="motivation-bar-container">
                            <div
                                className="motivation-bar-fill"
                                style={{
                                    width: `${value}%`,
                                    backgroundColor:
                                        key === "incentive"
                                            ? "#ff6b6b"
                                            : key === "fear"
                                            ? "#339af0"
                                            : key === "achievement"
                                            ? "#20c997"
                                            : key === "growth"
                                            ? "#fcc419"
                                            : key === "power"
                                            ? "#7950f2"
                                            : "#74c0fc",
                                }}
                            ></div>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    // 선호 브랜드 표시
    const renderBrands = () => {
        const brands = getPersonaBrands();

        return (
            <div className="brands-section">
                <h4 className="section-title">선호 브랜드</h4>
                <div className="brands-grid">
                    {brands.map((brand, index) => (
                        <div key={index} className="brand-item">
                            <div className="brand-icon">
                                {brand.substring(0, 1)}
                            </div>
                            <span className="brand-name">{brand}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    // 탭 내용 렌더링
    const renderTabContent = () => {
        switch (activeTab) {
            case "profile":
                return (
                    <div className="tab-content profile-content">
                        <div className="persona-section">
                            <h3 className="persona-section-title">
                                라이프스타일
                            </h3>
                            <p className="persona-section-content">
                                {persona.dayInLife ||
                                    "일상 생활 정보가 없습니다."}
                            </p>
                        </div>

                        <div className="persona-section">
                            <h3 className="persona-section-title">성격 특성</h3>
                            <p className="persona-section-content">
                                {persona.personality}
                            </p>
                            {renderPersonalityBars()}
                        </div>

                        <div className="persona-section quotes-section">
                            <h3 className="persona-section-title">
                                자주 하는 말
                            </h3>
                            {persona.quotes &&
                                persona.quotes.map((quote, idx) => (
                                    <div key={idx} className="persona-quote">
                                        "{quote}"
                                    </div>
                                ))}
                        </div>
                    </div>
                );

            case "details":
                return (
                    <div className="tab-content details-content">
                        <div className="persona-section">
                            <h3 className="persona-section-title">목표</h3>
                            <p className="persona-section-content">
                                {persona.goals}
                            </p>
                            <ul className="bullet-list">
                                <li>
                                    수입/시간에 투자 대비 위해 목표계획 구매를
                                    원한다
                                </li>
                                <li>자원한 구매를 원한다</li>
                                <li>
                                    포인트나 무료로 즐거서 예대를 받길 원한다
                                </li>
                                <li>
                                    키앱에서는 이벤트를 놓치지 않고 참고
                                    싶어한다
                                </li>
                            </ul>
                        </div>

                        <div className="persona-section">
                            <h3 className="persona-section-title">불만사항</h3>
                            <ul className="bullet-list">
                                <li>
                                    정실시간을 손님이 틀리게 카페 어웨이 여한다
                                </li>
                                <li>
                                    다른 접이 역활 공대, 우왕수 있는 허켄 조오런
                                    전락하거나 불현다
                                </li>
                                <li>
                                    너비게이션 값, 우화언 지시들 환 한일 좋계
                                    저롱는 정우 만흥
                                </li>
                                <li>
                                    기존 너비게이션이 조모치의 운전술려네 믿막지
                                    있지 않음
                                </li>
                            </ul>
                        </div>

                        <div className="persona-section">
                            <h3 className="persona-section-title">필요성</h3>
                            <p className="persona-section-content">
                                {persona.needs}
                            </p>
                        </div>

                        <div className="persona-section">
                            <h3 className="persona-section-title">불편함</h3>
                            <p className="persona-section-content">
                                {persona.frustrations}
                            </p>
                        </div>
                    </div>
                );

            case "brands":
                return (
                    <div className="tab-content brands-content">
                        {renderBrands()}
                        {renderMotivationChart()}

                        <div className="preferred-channels">
                            <h4 className="section-title">선호 채널</h4>
                            <div className="channel-item">
                                <span className="channel-label">
                                    전통적 광고
                                </span>
                                <div className="channel-bar-container">
                                    <div
                                        className="channel-bar-fill"
                                        style={{ width: "30%" }}
                                    ></div>
                                </div>
                            </div>
                            <div className="channel-item">
                                <span className="channel-label">
                                    온라인 & 소셜 미디어
                                </span>
                                <div className="channel-bar-container">
                                    <div
                                        className="channel-bar-fill"
                                        style={{ width: "85%" }}
                                    ></div>
                                </div>
                            </div>
                            <div className="channel-item">
                                <span className="channel-label">추천</span>
                                <div className="channel-bar-container">
                                    <div
                                        className="channel-bar-fill"
                                        style={{ width: "65%" }}
                                    ></div>
                                </div>
                            </div>
                        </div>

                        <div className="devices-section">
                            <h4 className="section-title">
                                주로 사용하는 기기
                            </h4>
                            <div className="devices-container">
                                <div className="device-item">스마트폰</div>
                                <div className="device-item">노트북</div>
                                <div className="device-item">태블릿</div>
                            </div>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div
            className={`persona-card ${
                isSelected ? "persona-card-selected" : ""
            }`}
            onClick={() => !isSelected && onSelect(persona.id)}
        >
            <div
                className="persona-header"
                style={{
                    background: isSelected
                        ? "linear-gradient(to right, #ff6b6b, #ffa94d)"
                        : persona.gender === "여성"
                        ? "linear-gradient(to right, #f783ac, #da77f2)"
                        : "linear-gradient(to right, #4dabf7, #3b5bdb)",
                }}
            >
                <div className="persona-profile">
                    <div className="persona-avatar-container">
                        {imageLoading && (
                            <div className="persona-avatar-loading">
                                <div className="spinner-small"></div>
                            </div>
                        )}
                        <img
                            src={persona.photo || "/placeholder-persona.jpg"}
                            alt={persona.name}
                            className={`persona-avatar ${
                                imageLoading ? "persona-avatar-hidden" : ""
                            }`}
                            onLoad={() => setImageLoading(false)}
                            onError={(e) => {
                                setImageLoading(false);
                                e.target.onerror = null;
                                e.target.src = "/placeholder-persona.jpg";
                            }}
                        />
                    </div>
                    <div className="persona-info">
                        <h2 className="persona-name">{persona.name}</h2>
                        <p className="persona-meta">
                            {persona.age}세, {persona.gender} |{" "}
                            {persona.occupation}
                        </p>
                        <p className="persona-meta">
                            교육: {persona.education}
                        </p>
                    </div>
                </div>
            </div>

            {!expanded && !isSelected && (
                <div className="persona-body-preview">
                    <p className="persona-preview-text">
                        {persona.personality}
                    </p>
                    <button
                        className="button button-light"
                        onClick={(e) => {
                            e.stopPropagation(); // 이벤트 버블링 방지
                            toggleExpand();
                        }}
                    >
                        더 보기
                    </button>
                </div>
            )}

            {(expanded || isSelected) && (
                <div className="persona-body">
                    <div className="persona-tabs">
                        <button
                            className={`tab-button ${
                                activeTab === "profile" ? "active" : ""
                            }`}
                            onClick={() => changeTab("profile")}
                        >
                            일반 정보
                        </button>
                        <button
                            className={`tab-button ${
                                activeTab === "details" ? "active" : ""
                            }`}
                            onClick={() => changeTab("details")}
                        >
                            상세 정보
                        </button>
                        <button
                            className={`tab-button ${
                                activeTab === "brands" ? "active" : ""
                            }`}
                            onClick={() => changeTab("brands")}
                        >
                            동기부여
                        </button>
                    </div>

                    {renderTabContent()}

                    <div className="persona-actions">
                        {!isSelected ? (
                            <>
                                <button
                                    className="button button-light"
                                    onClick={(e) => {
                                        e.stopPropagation(); // 이벤트 버블링 방지
                                        toggleExpand();
                                    }}
                                >
                                    접기
                                </button>
                                <button
                                    className="button button-primary chat-button-visible"
                                    onClick={(e) => {
                                        e.stopPropagation(); // 이벤트 버블링 방지
                                        onSelect(persona.id);
                                    }}
                                >
                                    이 페르소나 선택
                                </button>
                            </>
                        ) : (
                            <button
                                className="button button-primary chat-button-visible"
                                onClick={(e) => {
                                    e.stopPropagation(); // 이벤트 버블링 방지
                                    onChatStart(persona.id);
                                }}
                            >
                                대화 시작하기
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PersonaCard;
