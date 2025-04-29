// src/components/PersonaGenerator.jsx
import { useState, useEffect, useRef } from "react";
import { generateMultiplePersonas } from "../services/openAiService";
import PersonaSelection from "./PersonaSelection";
import PersonaChat from "./PersonaChat";
import "../styles/App.css";

const PersonaGenerator = ({ statsData }) => {
    // 사용자 입력 상태 관리
    const [targetMarket, setTargetMarket] = useState("");
    const [targetCustomer, setTargetCustomer] = useState("");
    const [problem, setProblem] = useState("");
    const [solution, setSolution] = useState("");

    // 채팅 및 페르소나 상태 관리
    const [messages, setMessages] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [personas, setPersonas] = useState([]);
    const [loading, setLoading] = useState(false);

    // 페르소나 선택 및 대화 상태 관리
    const [selectedPersonaId, setSelectedPersonaId] = useState(null);
    const [chatMode, setChatMode] = useState(false);

    // 자동 스크롤을 위한 ref
    const chatContainerRef = useRef(null);

    // 통계 데이터 요약 상태
    const [statsSummary, setStatsSummary] = useState({
        correlationsCount: 0,
        clustersCount: 0,
        topCorrelation: null,
        dominantCluster: null,
    });

    // 통계 데이터 요약 생성
    useEffect(() => {
        if (statsData) {
            // 상관관계 개수
            const correlationsCount = statsData.correlations
                ? statsData.correlations.length
                : 0;

            // 가장 큰 상관관계 찾기
            let topCorrelation = null;
            if (statsData.correlations && statsData.correlations.length > 0) {
                topCorrelation = statsData.correlations.reduce(
                    (prev, current) =>
                        Math.abs(current.coefficient) >
                        Math.abs(prev.coefficient)
                            ? current
                            : prev
                );
            }

            // 클러스터 개수
            const clustersCount = statsData.clusters
                ? statsData.clusters.length
                : 0;

            // 가장 큰 클러스터 찾기
            let dominantCluster = null;
            if (statsData.clusters && statsData.clusters.length > 0) {
                dominantCluster = statsData.clusters.reduce((prev, current) =>
                    current.size > prev.size ? current : prev
                );
            }

            setStatsSummary({
                correlationsCount,
                clustersCount,
                topCorrelation,
                dominantCluster,
            });
        }
    }, [statsData]);

    // 대화 단계 정의
    const steps = [
        {
            question:
                "안녕하세요! 페르소나를 생성하기 위해 목표 시장에 대해 알려주세요.",
            stateUpdater: setTargetMarket,
        },
        {
            question:
                "목표 고객층은 어떻게 되나요? 가능한 구체적으로 알려주세요.",
            stateUpdater: setTargetCustomer,
        },
        {
            question: "고객이 현재 겪고 있는 주요 문제는 무엇인가요?",
            stateUpdater: setProblem,
        },
        {
            question: "그 문제에 대해 어떤 솔루션을 제공하고자 하나요?",
            stateUpdater: setSolution,
        },
    ];

    // 초기 메시지 설정
    useEffect(() => {
        if (steps.length > 0 && messages.length === 0) {
            // 통계 데이터 소개 메시지 추가
            const introMessage = `안녕하세요! AI 페르소나 생성기입니다. 저는 ${statsSummary.correlationsCount}개의 상관관계 분석과 ${statsSummary.clustersCount}개의 소비자 클러스터 데이터를 바탕으로 정확한 페르소나를 생성할 수 있습니다.`;

            setMessages([
                { role: "assistant", content: introMessage },
                { role: "assistant", content: steps[0].question },
            ]);
        }
    }, [steps, statsSummary]);

    // 채팅창 자동 스크롤
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop =
                chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    // 사용자 입력 처리
    const handleUserInput = async (e) => {
        e.preventDefault();
        const userInput = e.target.message.value;
        if (!userInput.trim()) return;

        // 현재 단계에 맞는 상태 업데이트
        if (currentStep < steps.length) {
            steps[currentStep].stateUpdater(userInput);
        }

        // 메시지 추가
        const newMessages = [...messages, { role: "user", content: userInput }];
        setMessages(newMessages);
        e.target.message.value = "";

        // 다음 단계로 이동 또는 페르소나 생성
        if (currentStep < steps.length - 1) {
            // 다음 질문 표시
            setCurrentStep(currentStep + 1);
            setTimeout(() => {
                setMessages([
                    ...newMessages,
                    {
                        role: "assistant",
                        content: steps[currentStep + 1].question,
                    },
                ]);
            }, 500);
        } else {
            // 페르소나 생성 단계
            setLoading(true);
            try {
                // 생성 중 메시지 추가
                const processingMessage =
                    "입력해주신 정보와 통계 데이터를 기반으로 여러 페르소나를 생성하고 있습니다...";
                setMessages([
                    ...newMessages,
                    { role: "assistant", content: processingMessage },
                ]);

                // 여러 페르소나 생성 API 호출
                const generatedPersonas = await generateMultiplePersonas(
                    targetMarket,
                    targetCustomer,
                    problem,
                    solution,
                    statsData,
                    3 // 3명의 페르소나 생성
                );

                setPersonas(generatedPersonas);
                setMessages((prev) => [
                    ...prev,
                    {
                        role: "assistant",
                        content:
                            "페르소나가 생성되었습니다! 아래에서 확인하고 대화할 페르소나를 선택하세요.",
                    },
                ]);
            } catch (error) {
                console.error("Error generating personas:", error);
                setMessages((prev) => [
                    ...prev,
                    {
                        role: "assistant",
                        content: `페르소나 생성 중 오류가 발생했습니다: ${error.message}`,
                    },
                ]);
            } finally {
                setLoading(false);
            }
        }
    };

    // 페르소나 선택 핸들러
    const handlePersonaSelect = (personaId) => {
        console.log("페르소나 선택:", personaId);
        setSelectedPersonaId(personaId);
    };

    // 대화 시작 핸들러
    const handleChatStart = (personaId) => {
        console.log("대화 시작:", personaId);
        setSelectedPersonaId(personaId);
        setChatMode(true);
        console.log("채팅 모드 설정:", true);
    };

    // 대화 모드 종료 핸들러
    const handleBackFromChat = () => {
        console.log("채팅에서 돌아가기");
        setChatMode(false);
    };

    // 페르소나 재생성 핸들러
    const handleReset = () => {
        setPersonas([]);
        setSelectedPersonaId(null);
        setChatMode(false);
        setTargetMarket("");
        setTargetCustomer("");
        setProblem("");
        setSolution("");
        setCurrentStep(0);
        setMessages([
            {
                role: "assistant",
                content: `안녕하세요! AI 페르소나 생성기입니다. 저는 ${statsSummary.correlationsCount}개의 상관관계 분석과 ${statsSummary.clustersCount}개의 소비자 클러스터 데이터를 바탕으로 정확한 페르소나를 생성할 수 있습니다.`,
            },
            { role: "assistant", content: steps[0].question },
        ]);
    };

    // 선택된 페르소나 찾기
    const selectedPersona = selectedPersonaId
        ? personas.find((p) => p.id === selectedPersonaId)
        : null;

    console.log("현재 상태:", { chatMode, selectedPersonaId, selectedPersona });

    // 통계 데이터 요약 렌더링
    const renderStatsSummary = () => {
        return (
            <div className="stats-summary">
                <h3 className="stats-title">통계 데이터 요약</h3>
                <div className="stats-grid">
                    <div>
                        <p className="stats-item">
                            분석된 상관관계:{" "}
                            <span className="stats-value">
                                {statsSummary.correlationsCount}개
                            </span>
                        </p>
                        {statsSummary.topCorrelation && (
                            <p className="stats-item">
                                주요 상관관계:{" "}
                                <span className="stats-value">
                                    {statsSummary.topCorrelation.factors[0]} -{" "}
                                    {statsSummary.topCorrelation.factors[1]}
                                </span>
                                <span>
                                    {" "}
                                    ({statsSummary.topCorrelation.coefficient})
                                </span>
                            </p>
                        )}
                    </div>
                    <div>
                        <p className="stats-item">
                            소비자 클러스터:{" "}
                            <span className="stats-value">
                                {statsSummary.clustersCount}개
                            </span>
                        </p>
                        {statsSummary.dominantCluster && (
                            <p className="stats-item">
                                주요 클러스터 크기:{" "}
                                <span className="stats-value">
                                    {statsSummary.dominantCluster.size}명
                                </span>
                            </p>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // 대화 모드일 때 페르소나 채팅 표시
    if (chatMode && selectedPersona) {
        console.log("채팅 모드 렌더링:", selectedPersona);
        return (
            <div className="persona-generator">
                <PersonaChat
                    persona={selectedPersona}
                    onBack={handleBackFromChat}
                />
            </div>
        );
    }

    return (
        <div className="persona-generator">
            {/* 페르소나 생성 전: 대화 인터페이스 */}
            {personas.length === 0 ? (
                <div className="grid">
                    {/* 좌측: 챗봇 인터페이스 */}
                    <div>
                        {renderStatsSummary()}

                        <div className="chat-container">
                            <div
                                ref={chatContainerRef}
                                className="chat-messages"
                            >
                                {messages.map((msg, index) => (
                                    <div
                                        key={index}
                                        className={`message ${
                                            msg.role === "user"
                                                ? "message-user"
                                                : "message-assistant"
                                        }`}
                                    >
                                        <span
                                            className={`message-content ${
                                                msg.role === "user"
                                                    ? "message-content-user"
                                                    : "message-content-assistant"
                                            }`}
                                        >
                                            {msg.content}
                                        </span>
                                    </div>
                                ))}
                                {loading && (
                                    <div className="loading">
                                        <div className="spinner"></div>
                                        <p className="loading-text">
                                            페르소나 생성 중...
                                        </p>
                                    </div>
                                )}
                            </div>

                            <form
                                onSubmit={handleUserInput}
                                className="chat-form"
                            >
                                <input
                                    type="text"
                                    name="message"
                                    className="chat-input"
                                    placeholder="메시지를 입력하세요..."
                                    disabled={loading}
                                />
                                <button
                                    type="submit"
                                    className="chat-button"
                                    disabled={loading}
                                >
                                    전송
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* 우측: 대기 화면 */}
                    <div>
                        <div className="waiting">
                            <div className="waiting-content">
                                <svg
                                    className="waiting-icon"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                    ></path>
                                </svg>
                                <p className="waiting-text">
                                    모든 질문에 답변하시면 페르소나가 여기에
                                    표시됩니다.
                                </p>
                                <p className="waiting-subtext">
                                    AI가 통계 데이터를 분석하여 최적화된 3명의
                                    페르소나를 생성합니다.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* 페르소나 생성 후: 페르소나 선택 화면 */
                <div className="personas-container">
                    <PersonaSelection
                        personas={personas}
                        onPersonaSelect={handlePersonaSelect}
                        onChatStart={handleChatStart}
                    />

                    {/* 다시 시작하기 버튼 */}
                    <div className="reset-button-container">
                        <button
                            onClick={handleReset}
                            className="button button-dark"
                        >
                            다시 시작하기
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PersonaGenerator;
