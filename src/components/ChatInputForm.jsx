// src/components/ChatInputForm.jsx
import { useEffect, useRef } from "react";

const ChatInputForm = ({ userInput, setUserInput, onSubmit, loading }) => {
    const inputRef = useRef(null);

    // 컴포넌트 마운트 시 입력 필드에 포커스
    useEffect(() => {
        if (inputRef.current && !loading) {
            inputRef.current.focus();
        }
    }, [loading]);

    const handleChange = (e) => {
        setUserInput(e.target.value);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!userInput.trim() || loading) return;
        onSubmit(e);
    };

    return (
        <form onSubmit={handleSubmit} className="chat-form">
            <input
                type="text"
                ref={inputRef}
                value={userInput}
                onChange={handleChange}
                className="chat-input"
                placeholder="메시지를 입력하세요..."
                disabled={loading}
                style={{
                    resize: "none", // 텍스트 영역 크기 조정 방지
                    overflow: "hidden", // 오버플로우 숨김
                    height: "2.5rem", // 고정 높이 설정
                    maxHeight: "2.5rem", // 최대 높이 제한
                }}
            />
            <button
                type="submit"
                className="chat-button"
                disabled={loading || !userInput.trim()}
            >
                전송
            </button>
        </form>
    );
};

export default ChatInputForm;
