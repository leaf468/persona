// src/services/consultantService.js
import { getFilledPrompt } from "./promptService";

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
 * 질문 유형에 따라 전략적 조언이 필요한지 판단
 * @param {String} query - 사용자 질문
 * @returns {Boolean} - 전략적 조언 필요 여부
 */
const needsStrategicAdvice = (query) => {
    // 전략적 조언이 필요한 키워드 목록
    const strategicKeywords = [
        "전략",
        "strategy",
        "장기적",
        "long-term",
        "비전",
        "vision",
        "미션",
        "mission",
        "성장",
        "growth",
        "확장",
        "expansion",
        "혁신",
        "innovation",
        "경쟁",
        "competition",
        "시장",
        "market",
        "포지셔닝",
        "positioning",
        "차별화",
        "differentiation",
        "벤치마킹",
        "benchmarking",
        "리더십",
        "leadership",
        "조직문화",
        "culture",
        "변화관리",
        "change management",
        "의사결정",
        "decision making",
        "핵심역량",
        "core competency",
        "자원배분",
        "resource allocation",
    ];

    const lowerQuery = query.toLowerCase();

    // 문장에 전략적 키워드가 포함되어 있는지 확인
    return strategicKeywords.some((keyword) =>
        lowerQuery.includes(keyword.toLowerCase())
    );
};

/**
 * 웹 검색을 활용한 추가 정보 수집
 * @param {String} query - 사용자 질문
 * @returns {Promise<String>} - 웹 검색 결과
 */
const fetchWebSearchResults = async (query) => {
    try {
        // 이 부분은 실제 API 키와 엔드포인트로 대체해야 합니다
        // 예시 코드입니다
        if (!import.meta.env.VITE_SEARCH_API_KEY) {
            console.log("검색 API 키가, 웹 검색 결과를 시뮬레이션합니다.");
            return simulateWebSearchResults(query);
        }

        const response = await fetch(
            `https://api.search.provider.com/v1/search?q=${encodeURIComponent(
                query
            )}`,
            {
                headers: {
                    Authorization: `Bearer ${
                        import.meta.env.VITE_SEARCH_API_KEY
                    }`,
                },
            }
        );

        if (!response.ok) {
            throw new Error(`검색 API 호출 실패: ${response.status}`);
        }

        const data = await response.json();

        // 검색 결과에서 관련 정보 추출 및 포맷팅
        let searchResults = "";
        if (data.results && data.results.length > 0) {
            // 상위 3개 결과만 사용
            const topResults = data.results.slice(0, 3);
            searchResults = topResults
                .map(
                    (result) =>
                        `${result.title}\n${result.snippet}\n출처: ${result.url}`
                )
                .join("\n\n");
        }

        return searchResults;
    } catch (error) {
        console.error("웹 검색 오류:", error);
        return ""; // 오류 발생 시 빈 문자열 반환
    }
};

/**
 * 웹 검색 결과 시뮬레이션 (API 키 없을 때 사용)
 * @param {String} query - 사용자 질문
 * @returns {String} - 시뮬레이션된 검색 결과
 */
const simulateWebSearchResults = (query) => {
    const lowerQuery = query.toLowerCase();

    // 간단한 키워드 기반 시뮬레이션 응답
    if (lowerQuery.includes("전략") || lowerQuery.includes("strategy")) {
        return "비즈니스 전략 개발 가이드 - Harvard Business Review\n효과적인 비즈니스 전략은 명확한 목표 설정, 시장 분석, 경쟁 우위 파악 및 실행 계획으로 구성됩니다. 성공적인 전략은 기업의 핵심 역량과 시장 기회를 연결합니다.\n출처: hbr.org/strategy-guide\n\n마이클 포터의 5가지 경쟁 요인 분석 - 비즈니스 인사이트\n포터의 5가지 경쟁 요인(기존 경쟁자, 신규 진입자, 대체재, 공급자 및 구매자의 교섭력)은 산업 구조를 이해하고 수익성이 높은 시장 위치를 찾는 데 유용한 프레임워크입니다.\n출처: businessinsight.com/porter-five-forces";
    } else if (
        lowerQuery.includes("마케팅") ||
        lowerQuery.includes("marketing")
    ) {
        return "디지털 마케팅 트렌드 2025 - 마케팅 인사이트\n2025년 디지털 마케팅 트렌드는 AI 기반 개인화, 음성 검색 최적화, 몰입형 콘텐츠 경험, 데이터 프라이버시 중심 전략, 소셜 커머스 확대 등이 주목받고 있습니다.\n출처: marketinginsight.com/trends-2025\n\n통합 마케팅 커뮤니케이션의 중요성 - 마케팅 저널\n효과적인 통합 마케팅 커뮤니케이션(IMC)는 모든 채널에서 일관된 메시지를 전달하고, 고객 여정을 고려한 접근 방식이 중요합니다. 연구에 따르면 IMC를 적용한 기업은 평균 23% 높은 ROI를 달성했습니다.\n출처: marketingjournal.org/imc-importance";
    } else if (
        lowerQuery.includes("혁신") ||
        lowerQuery.includes("innovation")
    ) {
        return "기업 혁신의 8가지 핵심 요소 - 혁신 리서치\n성공적인 혁신 문화를 위한 핵심 요소: 1) 실패를 용인하는 문화, 2) 다양한 아이디어 장려, 3) 리더십 지원, 4) 자원 할당, 5) 고객 중심 접근, 6) 학습 문화, 7) 실험 및 프로토타이핑, 8) 혁신 측정 지표 수립\n출처: innovationresearch.org/elements\n\n디스럽션 시대의 혁신 전략 - 기술 혁신 저널\n디지털 전환 시대에 기업의 혁신 전략은 내부 R&D, 오픈 이노베이션, 벤처 투자, 인수합병, 생태계 구축 등 다양한 접근 방식을 균형 있게 활용해야 합니다.\n출처: techinnovationjournal.com/disruption-strategies";
    } else {
        return "최신 경영 트렌드 2025 - 비즈니스 인사이트\n2025년 주목할 경영 트렌드로는 분산형 조직 구조, 하이브리드 근무 모델 정착, 지속가능성 중심 경영, AI 기반 의사결정, 민첩한 인재 관리 등이 있습니다.\n출처: businessinsight.com/trends-2025\n\n성공적인 중소기업 성장 전략 - 스몰비즈니스 저널\n중소기업의 성공적인 성장을 위해서는 명확한 차별화 전략, 디지털 전환 가속화, 고객 경험 최적화, 탄력적인 공급망 구축, 인재 확보 및 유지가 중요합니다.\n출처: smallbusinessjournal.com/growth-strategies";
    }
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

        // 웹 검색을 통한 추가 정보 수집
        const webSearchResults = await fetchWebSearchResults(userMessage);

        // 질문 유형 분석 - 전략적 조언이 필요한지 확인
        const requiresStrategicAdvice = needsStrategicAdvice(userMessage);

        // 모델 선택 - 전략적 조언이 필요하면 GPT-o3-mini, 그렇지 않으면 GPT-4o
        const model = requiresStrategicAdvice ? "o4-mini" : "gpt-4o";

        console.log(
            `선택된 모델: ${model}, 전략적 조언 필요: ${requiresStrategicAdvice}`
        );

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
                    model: model, // 선택된 모델 사용
                    messages: [
                        {
                            role: "system",
                            content: await getFilledPrompt(
                                requiresStrategicAdvice ? "consultant_strategic" : "consultant_chat", 
                                {
                                    contextInfo: contextInfo
                                        ? `다음 정보를 참고하여 질문에 대답하세요: \n\n${contextInfo}`
                                        : "정보가 없는 경우 일반적인 경영 지식을 바탕으로 답변하세요.",
                                    webSearchResults: webSearchResults
                                        ? `최신 정보 및 웹 검색 결과도 참고하세요:\n\n${webSearchResults}`
                                        : "",
                                    strategyGuidance: requiresStrategicAdvice
                                        ? await getFilledPrompt("consultant_strategic")
                                        : "이 질문은 일반적인 정보 제공이 필요한 것으로 판단됩니다. 정확한 정보와 실용적인 관점에서 답변해주세요.",
                                    docReference: relevantDoc
                                        ? `참고한 문서: "${relevantDoc.title}"`
                                        : ""
                                }
                            ),
                        },
                        ...formattedHistory,
                        {
                            role: "user",
                            content: userMessage,
                        },
                    ],
                    temperature: requiresStrategicAdvice ? 0.5 : 0.7, // 전략적 조언은 낮은 온도로 더 정확하게
                    max_tokens: requiresStrategicAdvice ? 1000 : 800, // 전략적 조언은 더 긴 응답 허용
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
            isStrategicAdvice: requiresStrategicAdvice,
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

    // 전략적 조언이 필요한지 확인
    const requiresStrategicAdvice = needsStrategicAdvice(userMessage);

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

    // 전략적 조언이 필요한 경우 더 심층적인 내용 추가
    if (requiresStrategicAdvice) {
        response +=
            "\n\n이 주제에 대해 좀 더 심층적인 관점을 제공해드리자면, 효과적인 전략 실행을 위해서는 모든 이해관계자의 참여와 명확한 커뮤니케이션이 필수적입니다. 특히 중간 관리자들이 전략의 중요성을 이해하고 팀원들에게 전달할 수 있도록 지원하는 것이 중요합니다.\n\n또한, 빠르게 변화하는 시장 환경에서는 정기적인 전략 검토와 유연한 조정 메커니즘을 갖추는 것이 성공의 열쇠입니다. 데이터 기반 의사결정과 주요 성과 지표(KPI)를 통한 진행 상황 모니터링이 전략 실행의 효과를 크게 높일 수 있습니다.";
    }

    // 문서 참조 정보 추가 (있는 경우)
    if (relevantDoc) {
        response += `\n\n이 내용은 "${relevantDoc.title}" 문서를 참고했습니다.`;
    }

    return {
        message: response,
        referencedDocument: relevantDoc,
        isStrategicAdvice: requiresStrategicAdvice,
    };
};

export default {
    loadConsultantFiles,
    generateConsultantResponse,
};
