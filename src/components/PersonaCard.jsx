// src/components/PersonaCard.jsx

import { useState, useEffect } from "react";
import "../styles/PersonaCard.css";

// 페르소나 ID에 기반한 일관된 불릿 리스트 항목 생성
const generateConsistentBulletItems = (personaId, type, baseInfo) => {
    // 목표 관련 항목들
    const goalItems = [
        "효율적인 정보 접근 및 의사결정 지원을 원함",
        "시간과 비용을 절약할 수 있는 솔루션을 찾고 있음",
        "개인화된 경험과 맞춤형 서비스를 선호함",
        "사용하기 쉽고 직관적인 인터페이스를 중요시함",
        "데이터 기반의 통찰력 있는 분석을 추구함",
        "연결성과 통합이 용이한 시스템을 원함",
        "자동화를 통한 업무 최적화에 관심이 있음",
        "보안과 개인정보 보호에 높은 가치를 둠",
        "편리한 모바일 접근성을 중요하게 생각함",
        "지속 가능한 해결책과 장기적 가치를 중시함",
    ];

    // 불만 관련 항목들
    const frustrationItems = [
        "복잡하고 직관적이지 않은 사용자 인터페이스에 불만족",
        "긴 로딩 시간과 느린 성능에 좌절감을 느낌",
        "불충분한 개인화 옵션으로 인한 불편함",
        "관련 정보를 찾는 과정이 번거롭고 시간 소모적임",
        "기능 간 일관성 부족으로 사용에 혼란을 느낌",
        "데이터 보안 및 개인정보 보호에 대한 우려",
        "기술적 문제 발생 시 지원 서비스가 부족함",
        "사용자 피드백이 실제 개선으로 이어지지 않음",
        "정기적인 업데이트와 유지보수가 부족함",
        "타 시스템과의 통합 및 호환성 문제가 발생함",
    ];

    // 페르소나 ID로부터 고유한 항목 선택
    const getItemsForPersona = (items, count = 4) => {
        // 페르소나 ID에 따라 일관된 시드값 생성
        const generateSeed = (id, offset = 0) =>
            (id * 13 + offset) % items.length;

        const result = [];
        for (let i = 0; i < count; i++) {
            const index = generateSeed(personaId, i);
            let item = items[index];

            // 기본 정보(문제/솔루션)가 있으면 일부 항목에 통합
            if (baseInfo && i === 0) {
                if (type === "goals" && baseInfo.solution) {
                    item += ` - ${baseInfo.solution} 활용`;
                } else if (type === "frustrations" && baseInfo.problem) {
                    item += ` - ${baseInfo.problem} 문제와 관련하여`;
                }
            }

            result.push(item);
        }

        return result;
    };

    return type === "goals"
        ? getItemsForPersona(goalItems)
        : getItemsForPersona(frustrationItems);
};

const PersonaCard = ({ persona, isSelected, onSelect, onChatStart }) => {
    const [expanded, setExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState("profile"); // 'profile', 'details', 'brands'
    const [imageLoading, setImageLoading] = useState(true);
    const [goalItems, setGoalItems] = useState([]);
    const [frustrationItems, setFrustrationItems] = useState([]);

    // 페르소나 정보가 업데이트될 때 목표 및 불만 항목 생성
    useEffect(() => {
        if (persona && persona.id) {
            const baseInfo = {
                problem: persona.problem || "",
                solution: persona.solution || "",
            };

            setGoalItems(
                generateConsistentBulletItems(persona.id, "goals", baseInfo)
            );
            setFrustrationItems(
                generateConsistentBulletItems(
                    persona.id,
                    "frustrations",
                    baseInfo
                )
            );
        }
    }, [persona]);

    // 페르소나 ID를 기반으로 일관된 값 생성 (매번 같은 값 보장)
    const generateConsistentValue = (trait, baseValue = 50) => {
        // persona.id와 trait을 결합하여 일관된 해시 값을 생성
        const hashCode = (str) => {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = (hash << 5) - hash + char;
                hash = hash & hash; // 32bit 정수로 변환
            }
            return Math.abs(hash);
        };

        // persona.id와 trait을 결합하여 해시 생성
        const hash = hashCode(`${persona.id}-${trait}`);

        // 해시 값을 30-90 범위의 값으로 변환 (baseValue +- 20)
        return Math.min(90, Math.max(30, baseValue - 20 + (hash % 40)));
    };

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
            incentive: generateConsistentValue("incentive", 60), // 자극 (50-70)
            fear: generateConsistentValue("fear", 25), // 두려움 (10-40)
            achievement: generateConsistentValue("achievement", 65), // 성취 (50-80)
            growth: generateConsistentValue("growth", 70), // 성장 (60-80)
            power: generateConsistentValue("power", 40), // 파워 (20-60)
            social: generateConsistentValue("social", 50), // 소셜 (30-70)
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
            extrovert: persona.personality?.includes("외향적")
                ? 80
                : generateConsistentValue("extrovert", 30),
            introvert: persona.personality?.includes("내향적")
                ? 80
                : generateConsistentValue("introvert", 30),
            analytical: persona.personality?.includes("분석적")
                ? 80
                : generateConsistentValue("analytical", 40),
            creative: persona.personality?.includes("창의적")
                ? 80
                : generateConsistentValue("creative", 40),
            organized: persona.personality?.includes("계획적")
                ? 80
                : generateConsistentValue("organized", 30),
            flexible: persona.personality?.includes("유연한")
                ? 80
                : generateConsistentValue("flexible", 40),
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
                                {goalItems.map((item, index) => (
                                    <li key={index}>{item}</li>
                                ))}
                            </ul>
                        </div>

                        <div className="persona-section">
                            <h3 className="persona-section-title">불만사항</h3>
                            <ul className="bullet-list">
                                {frustrationItems.map((item, index) => (
                                    <li key={index}>{item}</li>
                                ))}
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
                                        style={{
                                            width: `${generateConsistentValue(
                                                "trad_ad",
                                                30
                                            )}%`,
                                        }}
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
                                        style={{
                                            width: `${generateConsistentValue(
                                                "social",
                                                85
                                            )}%`,
                                        }}
                                    ></div>
                                </div>
                            </div>
                            <div className="channel-item">
                                <span className="channel-label">추천</span>
                                <div className="channel-bar-container">
                                    <div
                                        className="channel-bar-fill"
                                        style={{
                                            width: `${generateConsistentValue(
                                                "recommendation",
                                                65
                                            )}%`,
                                        }}
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
