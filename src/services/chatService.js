// src/services/chatService.js
import { generateChatInsights } from "./insightsService";

/**
 * 페르소나 기반 챗봇 응답을 생성하는 함수
 * @param {string} userMessage - 사용자 메시지
 * @param {Array} chatHistory - 이전 대화 기록
 * @param {Object} persona - 페르소나 정보
 * @returns {Promise<Object>} - 페르소나 응답 및 인사이트
 */
export const generateChatResponse = async (
    userMessage,
    chatHistory,
    persona
) => {
    try {
        // OpenAI API 키가 없는 경우 로컬에서 응답 생성
        if (!import.meta.env.VITE_OPENAI_API_KEY) {
            console.log("OpenAI API 키가 없어 목업 응답을 생성합니다.");
            return generateMockChatResponse(userMessage, chatHistory, persona);
        }

        // API 키가 있는 경우 OpenAI API 호출
        const response = await fetch(
            "https://api.openai.com/v1/chat/completions",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${
                        import.meta.env.VITE_OPENAI_API_KEY
                    }`,
                },
                body: JSON.stringify({
                    model: "gpt-4",
                    messages: [
                        {
                            role: "system",
                            content: getPersonaSystemPrompt(persona),
                        },
                        ...formatChatHistory(chatHistory),
                        {
                            role: "user",
                            content: userMessage,
                        },
                    ],
                    temperature: 0.7,
                    max_tokens: 500,
                }),
            }
        );

        if (!response.ok) {
            throw new Error(`API 호출 실패: ${response.status}`);
        }

        const data = await response.json();
        const message = data.choices[0].message.content;

        // 대화 기록을 기반으로 인사이트 생성
        const updatedHistory = [
            ...chatHistory,
            { sender: "user", content: userMessage },
            { sender: "persona", content: message },
        ];

        // 인사이트 생성 함수 호출
        const insights = await generateChatInsights(updatedHistory, persona);

        return {
            message,
            insights,
        };
    } catch (error) {
        console.error("챗봇 응답 생성 오류:", error);
        throw error;
    }
};

/**
 * API 없이 로컬에서 목업 응답을 생성하는 함수
 */
const generateMockChatResponse = async (userMessage, chatHistory, persona) => {
    // 1-2초 지연 시뮬레이션
    await new Promise((resolve) =>
        setTimeout(resolve, 1000 + Math.random() * 1000)
    );

    // 키워드 기반 간단한 응답 로직
    let response = "";

    if (userMessage.includes("안녕") || userMessage.includes("반가워")) {
        response = `안녕하세요! 저는 ${persona.name}입니다. 오늘 어떻게 도와드릴까요?`;
    } else if (userMessage.includes("취미") || userMessage.includes("관심사")) {
        if (persona.gender === "여성") {
            response =
                "저는 온라인 쇼핑과 SNS 둘러보기를 좋아합니다. 특히 인스타그램에서 새로운 트렌드를 살펴보는 것을 즐겨요.";
        } else {
            response =
                "저는 최신 기술 트렌드 파악하기와 온라인 커뮤니티 활동을 주로 합니다. 가끔 운동도 하고요.";
        }
    } else if (userMessage.includes("문제") || userMessage.includes("불편")) {
        response = `${persona.frustrations}가 저에게는 가장 큰 문제예요. 이런 부분이 개선되면 좋을 것 같아요.`;
    } else if (userMessage.includes("솔루션") || userMessage.includes("해결")) {
        response = `${persona.goals}. 이런 솔루션이 있으면 정말 유용할 것 같아요!`;
    } else if (userMessage.includes("일상") || userMessage.includes("하루")) {
        response =
            persona.dayInLife ||
            "보통 아침에 일어나서 소셜미디어를 확인하고, 출근해서 업무를 봅니다. 퇴근 후에는 온라인 쇼핑이나 콘텐츠를 소비하는 편이에요.";
    } else {
        // 기본 응답
        const defaultResponses = [
            `흥미로운 질문이네요. ${persona.personality}인 저에게는 이런 주제가 중요해요.`,
            "그런 관점은 생각해보지 않았어요. 고려해볼 만한 내용인 것 같습니다.",
            "더 자세히 말씀해주실 수 있을까요? 어떤 상황에서 그런 생각을 하셨나요?",
            "저도 비슷한 경험이 있어요. 어떻게 해결하셨나요?",
            `${persona.needs}와 관련된 내용이라고 생각하는데, 어떻게 생각하세요?`,
        ];

        // 랜덤 응답 선택
        response =
            defaultResponses[
                Math.floor(Math.random() * defaultResponses.length)
            ];
    }

    // 대화 기록을 기반으로 인사이트 생성
    const updatedHistory = [
        ...chatHistory,
        { sender: "user", content: userMessage },
        { sender: "persona", content: response },
    ];

    try {
        // 인사이트 생성 함수 호출
        const insights = await generateChatInsights(updatedHistory, persona);

        return {
            message: response,
            insights,
        };
    } catch (error) {
        console.error("목업 인사이트 생성 오류:", error);

        // 오류 발생 시 기본 인사이트 반환
        return {
            message: response,
            insights: {
                summary: "대화가 진행 중입니다.",
                keyPoints: ["인사이트를 생성하는 중 오류가 발생했습니다."],
                userNeeds: [],
                suggestions: [],
            },
        };
    }
};

/**
 * 페르소나에 맞는 시스템 프롬프트를 생성하는 함수
 */
const getPersonaSystemPrompt = (persona) => {
    return `당신은 다음과 같은 특성을 가진 가상의 페르소나입니다:
- 이름: ${persona.name}
- 나이: ${persona.age}세
- 성별: ${persona.gender}
- 직업: ${persona.occupation}
- 교육 수준: ${persona.education}
- 성격 특성: ${persona.personality}
- 소비 행동: ${persona.behaviors}
- 필요성: ${persona.needs}
- 목표: ${persona.goals}
- 불편함: ${persona.frustrations}

이 페르소나의 관점에서 사용자와 대화하세요. 페르소나의 성격, 가치관, 니즈를 반영하여 응답하세요.
1인칭 시점으로 말하며 자연스럽고 인간적인 대화를 나누세요.
응답은 간결하게 유지하세요 (3-4문장 이내).`;
};

/**
 * 채팅 기록을 API 요청 형식으로 변환하는 함수
 */
const formatChatHistory = (chatHistory) => {
    return chatHistory.map((message) => ({
        role: message.sender === "user" ? "user" : "assistant",
        content: message.content,
    }));
};

export default {
    generateChatResponse,
};
