// src/services/consultantService.js

/**
 * 경영 컨설턴트 챗봇 서비스
 * 다양한 경영 관련 텍스트 파일을 참조하여 AI가 응답합니다.
 */

/**
 * 텍스트 파일 로드 및 초기화
 * @param {Array} fileNames - 로드할 파일 이름 배열
 * @returns {Promise<Array>} - 로드된 컨설턴트 파일 객체 배열
 */
export const loadConsultantFiles = async (fileNames) => {
    try {
        const loadedFiles = await Promise.all(
            fileNames.map(async (fileName, index) => {
                try {
                    const response = await fetch(
                        `/consultant_docs/${fileName}`
                    );
                    if (!response.ok) {
                        throw new Error(`파일 로드 실패: ${fileName}`);
                    }

                    const content = await response.text();

                    // 파일 이름에서 확장자 제거하고 제목 형식 지정
                    const title = fileName
                        .replace(/\.[^/.]+$/, "")
                        .replace(/_/g, " ");

                    return {
                        id: `doc-${index + 1}`,
                        fileName,
                        title,
                        content,
                        type: fileName.endsWith(".txt") ? "텍스트" : "문서",
                        description: `${getDescriptionFromContent(
                            content,
                            150
                        )}...`,
                    };
                } catch (error) {
                    console.error(`파일 로드 오류 (${fileName}):`, error);
                    return null;
                }
            })
        );

        return loadedFiles.filter(Boolean); // null 값 필터링
    } catch (error) {
        console.error("컨설턴트 파일 로드 오류:", error);
        throw error;
    }
};

/**
 * 컨텐츠에서 설명 텍스트 추출
 * @param {String} content - 문서 내용
 * @param {Number} length - 추출할 최대 길이
 * @returns {String} - 추출된 설명
 */
const getDescriptionFromContent = (content, length) => {
    // 제목 라인을 제외한 첫 몇 문장을 추출
    const lines = content.split("\n").filter((line) => line.trim());
    // 첫 번째 줄은 제목일 수 있으므로 건너뛰기
    const textLines = lines.slice(1);
    const description = textLines.join(" ").slice(0, length);
    return description;
};

/**
 * 주어진 질문에 가장 적합한 문서 찾기
 * @param {String} query - 사용자 질문
 * @param {Array} files - 참조할 파일 객체 배열
 * @returns {Object} - 가장 관련성 높은 문서
 */
const findRelevantDocument = (query, files) => {
    if (!files || files.length === 0) return null;

    // 간단한 키워드 매칭으로 관련 문서 찾기
    const keywords = query
        .toLowerCase()
        .split(/\s+/)
        .filter((word) => word.length > 2); // 짧은 단어 필터링

    // 가장 많은 키워드를 포함하는 문서 찾기
    let bestMatch = null;
    let maxMatches = 0;

    files.forEach((file) => {
        if (!file.content) return;

        const content = file.content.toLowerCase();
        let matches = 0;

        keywords.forEach((keyword) => {
            if (content.includes(keyword)) {
                matches++;
            }
        });

        // 문서 제목에 키워드가 있으면 가중치 부여
        const title = file.title.toLowerCase();
        keywords.forEach((keyword) => {
            if (title.includes(keyword)) {
                matches += 2; // 제목 일치에 더 높은 가중치
            }
        });

        if (matches > maxMatches) {
            maxMatches = matches;
            bestMatch = file;
        }
    });

    return bestMatch;
};

/**
 * 문서 내용에서 질문에 관련된 정보 추출
 * @param {String} query - 사용자 질문
 * @param {Object} document - 검색할 문서 객체
 * @returns {String} - 추출된 관련 정보
 */
const extractRelevantInfo = (query, document) => {
    if (!document || !document.content) return "";

    const content = document.content;
    const paragraphs = content.split("\n\n").filter((p) => p.trim().length > 0);

    // 질문에서 키워드 추출
    const keywords = query
        .toLowerCase()
        .split(/\s+/)
        .filter((word) => word.length > 2);

    // 각 문단의 관련성 점수 계산
    const scoredParagraphs = paragraphs.map((paragraph) => {
        const lowerParagraph = paragraph.toLowerCase();
        let score = 0;

        keywords.forEach((keyword) => {
            const regex = new RegExp(keyword, "g");
            const matches = (lowerParagraph.match(regex) || []).length;
            score += matches;
        });

        return { paragraph, score };
    });

    // 점수 기준으로 정렬
    scoredParagraphs.sort((a, b) => b.score - a.score);

    // 상위 2개 문단 추출 (또는 모든 관련 문단)
    const relevantParagraphs = scoredParagraphs
        .filter((p) => p.score > 0)
        .slice(0, 2)
        .map((p) => p.paragraph);

    if (relevantParagraphs.length === 0) {
        // 관련 정보가 없는 경우, 처음 문단 반환
        return paragraphs.slice(0, 1).join("\n\n");
    }

    return relevantParagraphs.join("\n\n");
};

/**
 * 응답을 여러 문단으로 구성하여 가독성 향상
 * @param {String} text - 원본 텍스트
 * @returns {String} - 문단으로 구성된 텍스트
 */
const formatResponseForReadability = (text) => {
    if (!text) return "";

    // 이미 문단이 잘 나뉘어 있는지 확인
    if (text.includes("\n\n")) return text;

    // 긴 문장을 기준으로 문단 분리 (일반적으로 마침표 뒤에 공백이 있는 경우)
    const sentences = text.split(/(?<=\. )/g);

    // 2-3개 문장마다 문단 나누기
    const paragraphs = [];
    let currentParagraph = [];

    sentences.forEach((sentence, index) => {
        currentParagraph.push(sentence);

        // 2-3개 문장마다 또는 마지막 문장에서 문단 완성
        if (currentParagraph.length >= 3 || index === sentences.length - 1) {
            paragraphs.push(currentParagraph.join(""));
            currentParagraph = [];
        }
    });

    return paragraphs.join("\n\n");
};

/**
 * 경영 컨설턴트 챗봇 응답 생성 함수
 * @param {String} userMessage - 사용자 메시지
 * @param {Array} chatHistory - 이전 대화 기록
 * @param {Array} consultantFiles - 참조할 파일 객체 배열
 * @param {Object} selectedDocument - 선택된 문서 (있는 경우)
 * @returns {Promise<Object>} - 컨설턴트 응답 및 참조 문서
 */
export const generateConsultantResponse = async (
    userMessage,
    chatHistory,
    consultantFiles,
    selectedDocument
) => {
    try {
        // OpenAI API 키가 없는 경우 로컬에서 응답 생성
        if (!import.meta.env.VITE_OPENAI_API_KEY) {
            console.log("OpenAI API 키가 없어 로컬 응답을 생성합니다.");
            return generateLocalConsultantResponse(
                userMessage,
                chatHistory,
                consultantFiles,
                selectedDocument
            );
        }

        // 관련 문서 찾기
        let relevantDoc = selectedDocument;
        if (!relevantDoc) {
            relevantDoc = findRelevantDocument(userMessage, consultantFiles);
        }

        // 문서에서 관련 정보 추출
        let contextInfo = "";
        let referencedDocument = null;

        if (relevantDoc) {
            contextInfo = extractRelevantInfo(userMessage, relevantDoc);
            referencedDocument = relevantDoc;
        }

        // 대화 기록 포맷팅
        const formattedHistory = chatHistory
            .filter((msg) => msg.role !== "system")
            .map((msg) => ({
                role: msg.role === "user" ? "user" : "assistant",
                content: msg.content,
            }));

        // OpenAI API 호출
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
                    model: "gpt-4", // 또는 사용 가능한 최신 모델
                    messages: [
                        {
                            role: "system",
                            content: `당신은 전문 경영 컨설턴트입니다. 비즈니스 전략, 마케팅, 인사 관리, 재무 관리 등 다양한 경영 분야에 대한 전문 지식을 가지고 있습니다.
                            ${
                                contextInfo
                                    ? `다음 정보를 참고하여 질문에 대답하세요: \n\n${contextInfo}`
                                    : "정보가 없는 경우 일반적인 경영 지식을 바탕으로 답변하세요."
                            }
                            
                            답변은 명확하고 전문적이되 이해하기 쉽게 작성하세요. 적절한 예시를 들면 좋습니다.
                            응답은 가독성을 위해 적절한 길이의 문단으로 나누어 작성하세요.
                            ${
                                relevantDoc
                                    ? `참고한 문서: "${relevantDoc.title}"`
                                    : ""
                            }`,
                        },
                        ...formattedHistory,
                        {
                            role: "user",
                            content: userMessage,
                        },
                    ],
                    temperature: 0.7,
                    max_tokens: 800,
                }),
            }
        );

        if (!response.ok) {
            throw new Error(`API 호출 실패: ${response.status}`);
        }

        const data = await response.json();
        const message = data.choices[0].message.content;

        // 응답 가독성 향상을 위한 포맷팅
        const formattedMessage = formatResponseForReadability(message);

        return {
            message: formattedMessage,
            referencedDocument,
        };
    } catch (error) {
        console.error("컨설턴트 응답 생성 오류:", error);
        throw error;
    }
};

/**
 * API 없이 로컬에서 경영 컨설턴트 응답 생성 함수
 */
const generateLocalConsultantResponse = async (
    userMessage,
    chatHistory,
    consultantFiles,
    selectedDocument
) => {
    // 1-2초 지연 시뮬레이션
    await new Promise((resolve) =>
        setTimeout(resolve, 1000 + Math.random() * 1000)
    );

    // 관련 문서 찾기
    let relevantDoc = selectedDocument;
    if (!relevantDoc) {
        relevantDoc = findRelevantDocument(userMessage, consultantFiles);
    }

    // 문서에서 관련 정보 추출
    let contextInfo = "";
    if (relevantDoc) {
        contextInfo = extractRelevantInfo(userMessage, relevantDoc);
    }

    // 키워드 기반 간단한 응답 로직
    let response = "";

    if (
        userMessage.toLowerCase().includes("전략") ||
        userMessage.toLowerCase().includes("strategy")
    ) {
        response =
            "비즈니스 전략은 조직의 목표를 달성하기 위한 장기적인 계획입니다.\n\n경쟁 우위를 확보하기 위해서는 시장 분석, 차별화 전략, 자원 배분 등을 고려해야 합니다. 특히 SWOT 분석을 통해 내부 역량과 외부 환경을 평가하는 것이 중요합니다.\n\n효과적인 전략 실행을 위해서는 명확한 목표 설정, 적절한 자원 배분, 그리고 지속적인 모니터링과 평가가 필요합니다.";
    } else if (
        userMessage.toLowerCase().includes("마케팅") ||
        userMessage.toLowerCase().includes("marketing")
    ) {
        response =
            "효과적인 마케팅 전략을 위해서는 타겟 고객을 명확히 정의하고, 가치 제안을 개발하며, 적절한 채널을 선택해야 합니다.\n\n디지털 마케팅이 중요해진 현재, 콘텐츠 마케팅과 소셜 미디어 활용은 필수적입니다.\n\n마케팅 활동의 ROI를 측정하고 지속적으로 최적화하는 데이터 기반 접근 방식이 성공의 핵심입니다.";
    } else if (
        userMessage.toLowerCase().includes("인사") ||
        userMessage.toLowerCase().includes("hr")
    ) {
        response =
            "인사 관리는 인재 확보, 개발, 유지의 세 가지 핵심 영역으로 나눌 수 있습니다.\n\n특히 요즘은 직원 경험과 조직 문화가 중요시되며, 원격 근무와 하이브리드 근무 모델을 효과적으로 관리하는 것이 중요합니다.\n\n직원 역량 개발과 성과 관리를 위한 지속적인 피드백 시스템 구축이 성공적인 인사 관리의 핵심 요소입니다.";
    } else if (
        userMessage.toLowerCase().includes("재무") ||
        userMessage.toLowerCase().includes("finance")
    ) {
        response =
            "재무 관리는 자금 조달, 투자, 위험 관리, 자본 구조 최적화 등을 포함합니다.\n\n현금 흐름 관리는 기업의 생존에 필수적이며, 재무 의사 결정은 항상 기회비용을 고려해야 합니다.\n\n효과적인 재무 계획을 위해서는 단기적 유동성과 장기적 수익성 사이의 균형을 유지하는 것이 중요합니다.";
    } else if (
        userMessage.toLowerCase().includes("혁신") ||
        userMessage.toLowerCase().includes("innovation")
    ) {
        response =
            "혁신은 단순한 아이디어 생성이 아닌 체계적인 프로세스입니다.\n\n조직 내 혁신 문화를 조성하고, 실패를 용인하며, 다양한 관점을 존중하는 환경이 필요합니다.\n\n점진적 혁신과 파괴적 혁신 모두 조직의 성장에 중요하며, 이를 위한 적절한 자원 배분과 실험적 접근 방식이 필요합니다.";
    } else {
        // 기본 응답 또는 문서 기반 응답
        if (contextInfo) {
            // 문서에서 추출한 정보가 있는 경우
            // 문단으로 나누기
            const paragraphs = contextInfo
                .split(/\n{2,}/)
                .filter((p) => p.trim());
            if (paragraphs.length > 1) {
                response = paragraphs.join("\n\n");
            } else {
                // 문단이 하나뿐인 경우, 문장 단위로 나누어 문단 생성
                const sentences = contextInfo.split(/(?<=\. )/g);
                let currentParagraph = [];
                const newParagraphs = [];

                sentences.forEach((sentence, index) => {
                    currentParagraph.push(sentence);
                    if (
                        currentParagraph.length >= 2 ||
                        index === sentences.length - 1
                    ) {
                        newParagraphs.push(currentParagraph.join(""));
                        currentParagraph = [];
                    }
                });

                response = newParagraphs.join("\n\n");
            }
        } else {
            // 기본 응답
            response =
                "경영에서는 전략적 사고와 실행력의 균형이 중요합니다.\n\n시장과 고객의 요구를 정확히 파악하고, 조직의 역량을 최대한 활용하는 것이 성공의 핵심입니다.\n\n리더십, 혁신, 효율성, 고객 중심 사고 등 다양한 요소가 조화롭게 작용할 때 지속 가능한 비즈니스 성과를 달성할 수 있습니다. 더 구체적인 질문을 주시면 더 자세한 답변을 드릴 수 있습니다.";
        }
    }

    // 문서 참조 정보 추가 (있는 경우)
    if (relevantDoc) {
        response += `\n\n이 내용은 "${relevantDoc.title}" 문서를 참고했습니다.`;
    }

    return {
        message: response,
        referencedDocument: relevantDoc,
    };
};

export default {
    loadConsultantFiles,
    generateConsultantResponse,
};
