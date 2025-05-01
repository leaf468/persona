// src/components/PersonaChat.jsx
import { useState, useEffect, useRef } from "react";
import { generateChatResponse } from "../services/chatService";
import { generateChatSummary } from "../services/insightsService";
import ChatInsights from "./ChatInsights";
import "../styles/PersonaChat.css";

const PersonaChat = ({ persona, onBack }) => {
    console.log("PersonaChat 렌더링:", persona);

    // 페르소나 정보가 없으면 오류 표시
    if (!persona) {
        return (
            <div className="persona-chat-container">
                <div className="chat-header">
                    <button className="back-button" onClick={onBack}>
                        <span>&larr;</span> 뒤로 가기
                    </button>
                    <div className="persona-chat-info">
                        <h2 className="chat-persona-name">오류</h2>
                    </div>
                </div>
                <div className="chat-content">
                    <p className="error">페르소나 정보를 찾을 수 없습니다.</p>
                </div>
            </div>
        );
    }

    // 상태 관리
    const [chatHistory, setChatHistory] = useState([
        {
            sender: "persona",
            content: `안녕하세요! 저는 ${persona.name}입니다. 무엇을 도와드릴까요?`,
        },
    ]);
    const [userInput, setUserInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [insights, setInsights] = useState({
        summary: "대화가 시작되었습니다.",
        keyPoints: [],
        userNeeds: [],
        suggestions: [],
    });

    const chatContainerRef = useRef(null);
    const inputRef = useRef(null);

    // 채팅창 자동 스크롤
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop =
                chatContainerRef.current.scrollHeight;
        }
    }, [chatHistory]);

    // 입력 필드 포커스
    useEffect(() => {
        if (inputRef.current && !isLoading) {
            inputRef.current.focus();
        }
    }, [isLoading]);

    // 사용자 입력 처리
    const handleSendMessage = async (e) => {
        e.preventDefault();

        if (!userInput.trim()) return;

        // 사용자 메시지 추가
        const newUserMessage = { sender: "user", content: userInput };
        setChatHistory((prev) => [...prev, newUserMessage]);
        setUserInput("");

        // 페르소나 응답 생성
        setIsLoading(true);
        try {
            // 페르소나 프로필 기반 응답 생성
            const response = await generateChatResponse(
                userInput,
                chatHistory,
                persona
            );

            // 응답 추가
            const personaResponse = {
                sender: "persona",
                content: response.message,
            };
            setChatHistory((prev) => [...prev, personaResponse]);

            // 인사이트 업데이트
            setInsights(response.insights);
        } catch (error) {
            console.error("대화 응답 생성 오류:", error);
            setChatHistory((prev) => [
                ...prev,
                {
                    sender: "system",
                    content:
                        "죄송합니다. 응답을 생성하는 중 오류가 발생했습니다.",
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    // 대화 요약 함수
    const handleSummarizeChat = async () => {
        if (chatHistory.length < 3) {
            // 대화가 너무 짧을 경우
            setInsights({
                ...insights,
                summary:
                    "충분한 대화가 이루어지지 않았습니다. 더 많은 대화 후 요약해주세요.",
            });
            return;
        }

        setIsSummarizing(true);
        try {
            // 서비스에서 채팅 요약 함수 호출
            const updatedInsights = await generateChatSummary(
                chatHistory,
                persona
            );
            setInsights(updatedInsights);

            // 요약 완료 메시지 추가
            setChatHistory((prev) => [
                ...prev,
                {
                    sender: "system",
                    content:
                        "대화가 요약되었습니다. 왼쪽 패널에서 인사이트를 확인하세요.",
                },
            ]);
        } catch (error) {
            console.error("대화 요약 중 오류:", error);
            setChatHistory((prev) => [
                ...prev,
                {
                    sender: "system",
                    content: "대화 요약 중 오류가 발생했습니다.",
                },
            ]);
        } finally {
            setIsSummarizing(false);
        }
    };

    return (
        <div className="persona-chat-container">
            <div className="chat-header">
                <button className="back-button" onClick={onBack}>
                    <span>&larr;</span> 뒤로 가기
                </button>
                <div className="persona-chat-info">
                    <img
                        src={persona.photo || "/placeholder-persona.jpg"}
                        alt={persona.name}
                        className="chat-persona-avatar"
                    />
                    <div>
                        <h2 className="chat-persona-name">{persona.name}</h2>
                        <p className="chat-persona-meta">
                            {persona.occupation}
                        </p>
                    </div>
                </div>
                {/* 대화 요약 버튼 */}
                <button
                    className="summarize-button"
                    onClick={handleSummarizeChat}
                    disabled={isSummarizing || chatHistory.length < 3}
                >
                    {isSummarizing ? "요약 중..." : "대화 요약"}
                </button>
            </div>

            <div className="chat-content">
                {/* 좌측 인사이트 패널 */}
                <div className="chat-insights-container">
                    <ChatInsights insights={insights} persona={persona} />
                </div>

                {/* 우측 채팅 패널 */}
                <div className="chat-messages-container">
                    <div className="chat-messages" ref={chatContainerRef}>
                        {chatHistory.map((message, index) => {
                            if (message.sender === "system") {
                                return (
                                    <div key={index} className="system-message">
                                        <div className="message-bubble">
                                            {message.content}
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <div
                                    key={index}
                                    className={`chat-message ${message.sender}-message`}
                                >
                                    {message.sender === "persona" && (
                                        <img
                                            src={
                                                persona.photo ||
                                                "/placeholder-persona.jpg"
                                            }
                                            alt={persona.name}
                                            className="chat-avatar"
                                        />
                                    )}
                                    <div className="message-bubble">
                                        {message.content}
                                    </div>
                                </div>
                            );
                        })}

                        {isLoading && (
                            <div className="chat-message persona-message">
                                <img
                                    src={
                                        persona.photo ||
                                        "/placeholder-persona.jpg"
                                    }
                                    alt={persona.name}
                                    className="chat-avatar"
                                />
                                <div className="message-bubble loading-bubble">
                                    <div className="typing-indicator">
                                        <span className="dot"></span>
                                        <span className="dot"></span>
                                        <span className="dot"></span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <form
                        className="chat-input-form"
                        onSubmit={handleSendMessage}
                    >
                        <input
                            type="text"
                            ref={inputRef}
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            placeholder={`${persona.name}에게 메시지 보내기...`}
                            className="chat-input"
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            className="chat-send-button"
                            disabled={isLoading || !userInput.trim()}
                        >
                            전송
                        </button>
                    </form>
                </div>
            </div>

            {/* 하단 버튼 추가 */}
            <div className="chat-footer">
                <button className="button button-secondary" onClick={onBack}>
                    페르소나 선택으로 돌아가기
                </button>
            </div>
        </div>
    );
};

export default PersonaChat;
