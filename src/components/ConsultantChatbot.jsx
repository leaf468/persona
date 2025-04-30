// src/components/ConsultantChatbot.jsx
import { useState, useEffect, useRef } from "react";
import { generateConsultantResponse } from "../services/consultantService";
import "../styles/ConsultantChatbot.css";
import React from "react";

const ConsultantChatbot = ({ consultantData }) => {
    // 상태 관리
    const [messages, setMessages] = useState([
        {
            role: "assistant",
            content:
                "안녕하세요! 저는 경영 컨설턴트 AI입니다. 어떤 도움이 필요하신가요?",
        },
    ]);
    const [userInput, setUserInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [consultantFiles, setConsultantFiles] = useState([]);
    const [selectedDocument, setSelectedDocument] = useState(null);

    // 채팅창 자동 스크롤을 위한 ref
    const chatContainerRef = useRef(null);

    // 컨설턴트 데이터 로드
    useEffect(() => {
        if (consultantData) {
            setConsultantFiles(consultantData.files || []);
        }
    }, [consultantData]);

    // 채팅창 자동 스크롤
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop =
                chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    // 사용자 메시지 전송 핸들러
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!userInput.trim()) return;

        // 사용자 메시지 추가
        const newUserMessage = { role: "user", content: userInput };
        setMessages((prev) => [...prev, newUserMessage]);
        setUserInput("");

        // 컨설턴트 응답 생성
        setIsLoading(true);
        try {
            const response = await generateConsultantResponse(
                userInput,
                messages,
                consultantFiles,
                selectedDocument
            );

            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: response.message },
            ]);

            // 참조 문서가 있는 경우 업데이트
            if (response.referencedDocument) {
                setSelectedDocument(response.referencedDocument);
            }
        } catch (error) {
            console.error("컨설턴트 응답 생성 오류:", error);
            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content:
                        "죄송합니다. 응답을 생성하는 중 오류가 발생했습니다.",
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    // 문서 선택 핸들러
    const handleDocumentSelect = (document) => {
        setSelectedDocument(document);
        setMessages((prev) => [
            ...prev,
            {
                role: "system",
                content: `"${document.title}" 문서를 선택했습니다. 이 문서를 기반으로 도움을 드리겠습니다.`,
            },
        ]);
    };

    // 메시지 내용을 여러 문단으로 나누어 표시하는 함수
    const formatMessageContent = (content) => {
        // 문단을 나누는 로직 (빈 줄이나 여러 줄바꿈으로 구분)
        const paragraphs = content.split(/\n{2,}/).filter((p) => p.trim());

        if (paragraphs.length <= 1) {
            // 문단이 하나뿐이라면 원래 텍스트 반환
            return <p>{content}</p>;
        }

        return (
            <>
                {paragraphs.map((paragraph, idx) => (
                    <p key={idx} className="message-paragraph">
                        {paragraph.split("\n").map((line, lineIdx) => (
                            <React.Fragment key={lineIdx}>
                                {line}
                                {lineIdx < paragraph.split("\n").length - 1 && (
                                    <br />
                                )}
                            </React.Fragment>
                        ))}
                    </p>
                ))}
            </>
        );
    };

    return (
        <div className="consultant-chatbot">
            <div className="consultant-header">
                <h2>경영 컨설턴트 AI</h2>
                <p className="consultant-subtitle">
                    비즈니스 전략, 마케팅, 인사 관리 등 다양한 경영 문제에 대해
                    질문하세요
                </p>
            </div>

            <div className="consultant-container">
                <div className="consultant-sidebar">
                    <div className="documents-section">
                        <h3 className="documents-title">참고 자료</h3>
                        <ul className="documents-list">
                            {consultantFiles.map((file, index) => (
                                <li
                                    key={index}
                                    className={`document-item ${
                                        selectedDocument &&
                                        selectedDocument.id === file.id
                                            ? "selected"
                                            : ""
                                    }`}
                                    onClick={() => handleDocumentSelect(file)}
                                >
                                    <div className="document-icon">
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                            />
                                        </svg>
                                    </div>
                                    <div className="document-info">
                                        <span className="document-title">
                                            {file.title}
                                        </span>
                                        <span className="document-type">
                                            {file.type}
                                        </span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {selectedDocument && (
                        <div className="document-preview">
                            <h3 className="preview-title">
                                {selectedDocument.title}
                            </h3>
                            <div className="preview-content">
                                <p>{selectedDocument.description}</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="chat-main">
                    <div className="chat-messages" ref={chatContainerRef}>
                        {messages.map((message, index) => (
                            <div
                                key={index}
                                className={`message ${message.role}-message`}
                            >
                                {message.role === "assistant" && (
                                    <div className="avatar consultant-avatar">
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
                                            />
                                        </svg>
                                    </div>
                                )}

                                <div
                                    className={`message-bubble ${message.role}-bubble`}
                                >
                                    {formatMessageContent(message.content)}
                                    {message.source && (
                                        <div className="message-source">
                                            출처: {message.source}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="message assistant-message">
                                <div className="avatar consultant-avatar">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
                                        />
                                    </svg>
                                </div>
                                <div className="message-bubble assistant-bubble loading-bubble">
                                    <span className="typing-indicator">
                                        <span className="dot"></span>
                                        <span className="dot"></span>
                                        <span className="dot"></span>
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    <form className="chat-input-form" onSubmit={handleSubmit}>
                        <input
                            type="text"
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            placeholder="경영 질문을 입력하세요..."
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
        </div>
    );
};

export default ConsultantChatbot;
