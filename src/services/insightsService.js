export async function generateChatInsights(chatHistory, persona) {
    try {
        if (!import.meta.env.VITE_OPENAI_API_KEY) {
            return generateMockInsights(chatHistory, persona);
        }

        const lastMessages = chatHistory.slice(-10);
        const chatText = lastMessages
            .map(
                (m) =>
                    `${m.sender === "user" ? "사용자" : persona.name}: ${
                        m.content
                    }`
            )
            .join("\n");

        const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: `당신은 사용자와 가상 페르소나 간의 대화를 분석하여 인사이트를 제공하는 전문가입니다.
  다음 대화를 분석하고 JSON 형식으로만 응답하세요:
  summary: 대화 요약 (1-2문장)
  keyPoints: 핵심 포인트 목록 (최대 3개)
  userNeeds: 사용자의 니즈 목록 (최대 2개)
  suggestions: 제안 목록 (최대 2개)
  
  페르소나:
  이름: ${persona.name}
  나이: ${persona.age}세
  성별: ${persona.gender}
  직업: ${persona.occupation}
  성격: ${persona.personality}
  니즈: ${persona.needs}
  목표: ${persona.goals}
  불편함: ${persona.frustrations}
  
  대화:
  ${chatText}`,
                    },
                    {
                        role: "user",
                        content: "위 형식대로 JSON으로만 응답해주세요.",
                    },
                ],
                temperature: 0.5,
                max_tokens: 500,
            }),
        });

        if (!res.ok) {
            throw new Error(`OpenAI API 오류: ${res.status}`);
        }

        const data = await res.json();
        const match = data.choices[0].message.content.match(/\{[\s\S]*\}/);
        if (match) {
            return JSON.parse(match[0]);
        } else {
            throw new Error("인사이트 JSON 파싱 실패");
        }
    } catch (e) {
        console.error("generateChatInsights 오류:", e);
        return generateMockInsights(chatHistory, persona);
    }
}

export async function generateChatSummary(chatHistory, persona) {
    try {
        if (!import.meta.env.VITE_OPENAI_API_KEY) {
            return generateMockChatSummary(chatHistory, persona);
        }

        const chatText = chatHistory
            .filter((m) => m.sender !== "system")
            .map(
                (m) =>
                    `${m.sender === "user" ? "사용자" : persona.name}: ${
                        m.content
                    }`
            )
            .join("\n");

        const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: `사용자와 가상 페르소나 간의 전체 대화를 분석하고 JSON 형식으로 인사이트를 제공하세요:
  - summary: 전체 요약 (3-4문장)
  - keyPoints: 핵심 포인트 (4-6개)
  - userNeeds: 사용자 니즈 (3-4개)
  - suggestions: 제안 (3-4개)
  
  페르소나:
  이름: ${persona.name}
  나이: ${persona.age}세
  성별: ${persona.gender}
  직업: ${persona.occupation}
  성격: ${persona.personality}
  니즈: ${persona.needs}
  목표: ${persona.goals}
  불편함: ${persona.frustrations}
  
  대화:
  ${chatText}`,
                    },
                    {
                        role: "user",
                        content: "위 형식대로 JSON으로만 응답해주세요.",
                    },
                ],
                temperature: 0.5,
                max_tokens: 1000,
            }),
        });

        if (!res.ok) {
            throw new Error(`OpenAI API 오류: ${res.status}`);
        }

        const data = await res.json();
        const match = data.choices[0].message.content.match(/\{[\s\S]*\}/);
        if (match) {
            return JSON.parse(match[0]);
        } else {
            throw new Error("요약 JSON 파싱 실패");
        }
    } catch (e) {
        console.error("generateChatSummary 오류:", e);
        return generateMockChatSummary(chatHistory, persona);
    }
}

function generateMockInsights(chatHistory, persona) {
    const len = chatHistory.length;
    if (len <= 2) {
        return {
            summary: "대화가 시작되었습니다.",
            keyPoints: ["첫 대화가 시작되었습니다."],
            userNeeds: [],
            suggestions: ["페르소나의 관심사를 물어보세요."],
        };
    }
    if (len <= 5) {
        return {
            summary: "기본 정보 교환 중입니다.",
            keyPoints: ["페르소나 특성이 드러나고 있습니다."],
            userNeeds: ["더 깊은 이해가 필요합니다."],
            suggestions: ["구체적인 시나리오를 질문해보세요."],
        };
    }
    return {
        summary: "심층 대화가 진행 중입니다.",
        keyPoints: ["문제와 니즈가 논의되었습니다.", "목표가 공유되었습니다."],
        userNeeds: ["효율적 해결책", "명확한 기능 설명"],
        suggestions: [
            "마케팅 메시지를 구체화해보세요.",
            "구매 여정을 질문해보세요.",
        ],
    };
}

function generateMockChatSummary(chatHistory, persona) {
    return {
        summary: "대화를 요약합니다.",
        keyPoints: ["핵심 포인트 예시 1", "핵심 포인트 예시 2"],
        userNeeds: ["니즈 예시 1", "니즈 예시 2"],
        suggestions: ["제안 예시 1", "제안 예시 2"],
    };
}
