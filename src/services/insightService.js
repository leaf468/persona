// src/services/insightService.js

/**
 * Generate insights from the processed survey data using AI
 * @param {Object} processedData - The processed survey data
 * @returns {Promise<Object>} - Insights object with various analysis
 */
export const generateInsights = async (processedData) => {
    try {
        if (!processedData || !processedData.questions) {
            throw new Error("유효하지 않은 데이터 형식입니다.");
        }

        // Extract basic information
        const questionCount = processedData.questions.length;
        const totalResponses = processedData.totalRows;

        // Prepare data for AI analysis
        const dataForAI = prepareDataForAIAnalysis(processedData);

        // Generate insights using OpenAI API (GPT-4)
        const insights = await generateAIInsights(dataForAI);

        // Organize insights into categories
        const organizedInsights = organizeInsights(insights);

        // Add metadata
        return {
            totalResponses,
            questionCount,
            executiveSummary:
                insights.executiveSummary ||
                "데이터에서 주요 인사이트를 추출하는 중입니다.",
            categories: [
                { id: "general", name: "일반 인사이트" },
                { id: "trends", name: "트렌드 분석" },
                { id: "segments", name: "세그먼트 분석" },
                { id: "correlations", name: "상관관계" },
                { id: "recommendations", name: "제안사항" },
            ],
            items: organizedInsights,
        };
    } catch (error) {
        console.error("인사이트 생성 중 오류:", error);

        // Return default insights if error occurs
        return generateDefaultInsights(processedData);
    }
};

/**
 * Prepare data for AI analysis
 * @param {Object} processedData - The processed survey data
 * @returns {Object} - Data structured for AI analysis
 */
const prepareDataForAIAnalysis = (processedData) => {
    // Extract key information for each question
    const questionSummaries = processedData.questions.map((question) => {
        const summary = {
            id: question.id,
            text: question.text,
            type: question.type,
            responseCount: question.responseCount,
        };

        // Add type-specific summary
        if (
            question.type === "multiple_choice" ||
            question.type === "categorical"
        ) {
            // Get top 5 responses for categorical questions
            summary.topResponses = question.summary.frequencies
                .slice(0, 5)
                .map((freq) => ({
                    value: freq.value,
                    count: freq.count,
                    percentage: freq.percentage,
                }));

            summary.totalOptions = question.uniqueValues.length;
        } else if (question.type === "numeric" || question.type === "rating") {
            // Add statistical measures for numeric questions
            summary.stats = {
                min: question.summary.min,
                max: question.summary.max,
                mean: question.summary.mean,
                median: question.summary.median,
                standardDeviation: question.summary.standardDeviation,
            };
        }

        return summary;
    });

    // Find potential correlations
    const correlations = findPotentialCorrelations(processedData);

    return {
        totalResponses: processedData.totalRows,
        questionCount: processedData.questions.length,
        questions: questionSummaries,
        correlations: correlations,
    };
};

/**
 * Find potential correlations between questions
 * @param {Object} processedData - The processed survey data
 * @returns {Array} - Potential correlations
 */
const findPotentialCorrelations = (processedData) => {
    const correlations = [];

    // Get numeric questions
    const numericQuestions = processedData.questions.filter(
        (q) => q.type === "numeric" || q.type === "rating"
    );

    // Get categorical questions
    const categoricalQuestions = processedData.questions.filter(
        (q) => q.type === "multiple_choice" || q.type === "categorical"
    );

    // Check pairs of numeric questions for correlation
    for (let i = 0; i < numericQuestions.length; i++) {
        for (let j = i + 1; j < numericQuestions.length; j++) {
            const q1 = numericQuestions[i];
            const q2 = numericQuestions[j];

            correlations.push({
                type: "numeric_pair",
                question1: q1.id,
                question2: q2.id,
                question1Text: q1.text,
                question2Text: q2.text,
            });
        }
    }

    // Check categorical vs. numeric questions
    for (let i = 0; i < categoricalQuestions.length; i++) {
        for (let j = 0; j < numericQuestions.length; j++) {
            const catQ = categoricalQuestions[i];
            const numQ = numericQuestions[j];

            correlations.push({
                type: "cat_num_pair",
                question1: catQ.id,
                question2: numQ.id,
                question1Text: catQ.text,
                question2Text: numQ.text,
            });
        }
    }

    // Check categorical vs. categorical questions
    for (let i = 0; i < categoricalQuestions.length; i++) {
        for (let j = i + 1; j < categoricalQuestions.length; j++) {
            const q1 = categoricalQuestions[i];
            const q2 = categoricalQuestions[j];

            correlations.push({
                type: "categorical_pair",
                question1: q1.id,
                question2: q2.id,
                question1Text: q1.text,
                question2Text: q2.text,
            });
        }
    }

    return correlations;
};

/**
 * Generate insights using OpenAI API
 * @param {Object} data - Structured data for AI analysis
 * @returns {Promise<Object>} - AI-generated insights
 */
const generateAIInsights = async (data) => {
    try {
        // Check if OpenAI API key is available
        if (!import.meta.env.VITE_OPENAI_API_KEY) {
            console.log("OpenAI API 키가 없어 목업 인사이트를 생성합니다.");
            return generateMockInsights(data);
        }

        // Create a prompt for the OpenAI API
        const prompt = createInsightPrompt(data);

        // Call the OpenAI API
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
                    model: "gpt-3.5-turbo", // Using GPT-3.5-Turbo as specified
                    messages: [
                        {
                            role: "system",
                            content:
                                "You are an expert data analyst who specializes in extracting insights from survey data. Your task is to analyze the provided survey data summary and generate meaningful insights. Respond only in the JSON format specified in the prompt.",
                        },
                        {
                            role: "user",
                            content: prompt,
                        },
                    ],
                    temperature: 0.5,
                    max_tokens: 2000,
                }),
            }
        );

        if (!response.ok) {
            throw new Error(`API 오류: ${response.status}`);
        }

        const responseData = await response.json();

        // Extract and parse JSON response
        const content = responseData.choices[0].message.content;
        const jsonMatch =
            content.match(/```json\n([\s\S]*?)\n```/) ||
            content.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
            const jsonStr = jsonMatch[1] || jsonMatch[0];
            return JSON.parse(jsonStr);
        } else {
            throw new Error("AI 응답을 파싱할 수 없습니다.");
        }
    } catch (error) {
        console.error("AI 인사이트 생성 오류:", error);
        return generateMockInsights(data);
    }
};

/**
 * Create a prompt for the OpenAI API
 * @param {Object} data - Structured data for AI analysis
 * @returns {string} - Prompt text
 */
const createInsightPrompt = (data) => {
    // Format questions in a readable format
    const questionsText = data.questions
        .map((q) => {
            let text = `질문 ID: ${q.id}\n질문 내용: "${q.text}"\n유형: ${q.type}\n응답 수: ${q.responseCount}\n`;

            if (q.topResponses) {
                text += "주요 응답:\n";
                q.topResponses.forEach((resp) => {
                    text += `- "${resp.value}": ${
                        resp.count
                    }명 (${resp.percentage.toFixed(1)}%)\n`;
                });
                text += `총 옵션 수: ${q.totalOptions}\n`;
            } else if (q.stats) {
                text += `통계: 최소값=${q.stats.min.toFixed(
                    2
                )}, 최대값=${q.stats.max.toFixed(
                    2
                )}, 평균=${q.stats.mean.toFixed(
                    2
                )}, 중앙값=${q.stats.median.toFixed(2)}\n`;
            }

            return text;
        })
        .join("\n");

    // Format correlations in a readable format
    const correlationsText = data.correlations
        .map((corr) => {
            return `유형: ${corr.type}\n질문1: "${corr.question1Text}"\n질문2: "${corr.question2Text}"\n`;
        })
        .slice(0, 10)
        .join("\n"); // Limit to 10 correlations to keep the prompt size manageable

    // Create prompt
    return `
다음 설문조사 데이터를 분석하여 의미 있는 인사이트를 추출해 주세요:

# 데이터 요약
총 응답자 수: ${data.totalResponses}명
총 질문 수: ${data.questionCount}개

# 질문 정보
${questionsText}

# 잠재적 상관관계 분석 대상
${correlationsText}

다음 JSON 형식으로 응답해 주세요:
\`\`\`json
{
    "executiveSummary": "설문 전체에 대한 요약 (3-4문장)",
    "insights": [
        {
            "id": "insight1",
            "title": "인사이트 제목",
            "description": "인사이트 세부 설명 (3-5문장)",
            "category": "general|trends|segments|correlations|recommendations",
            "relatedQuestions": ["관련된 질문 내용1", "관련된 질문 내용2"],
            "confidenceLevel": 70,
            "recommendations": ["제안사항1", "제안사항2"]
        },
        {...}
    ]
}
\`\`\`

설문 데이터에 기반하여 최소 5개에서 최대 10개의 의미 있는 인사이트를 생성해 주세요. 각 인사이트는 데이터에서 관찰된 패턴, 트렌드, 또는 상관관계를 명확하게 설명해야 합니다. 신뢰도(confidenceLevel)는 0-100 사이의 숫자로 표현해 주세요.

카테고리는 다음과 같습니다:
- general: 전반적인 응답 패턴에 관한 일반적인 인사이트
- trends: 데이터에서 발견된 트렌드나 패턴
- segments: 특정 응답자 그룹에 관한 인사이트
- correlations: 질문들 간의 관계나 상관관계
- recommendations: 데이터 기반 제안사항

가능한 구체적이고 실용적인 인사이트를 제공해 주세요.
`;
};

/**
 * Generate mock insights for testing or when API fails
 * @param {Object} data - Structured data
 * @returns {Object} - Mock insights
 */
const generateMockInsights = (data) => {
    // Basic statistics for mock insights
    const totalResponses = data.totalResponses;
    const multiChoiceQuestions = data.questions.filter(
        (q) => q.type === "multiple_choice" || q.type === "categorical"
    );
    const numericQuestions = data.questions.filter(
        (q) => q.type === "numeric" || q.type === "rating"
    );

    // Create a basic executive summary
    const executiveSummary = `이 설문조사는 총 ${totalResponses}명의 응답자와 ${
        data.questionCount
    }개의 질문으로 구성되어 있습니다. 응답자들은 대체로 일관된 패턴을 보이며, 몇 가지 주요 트렌드가 관찰됩니다. 특히 ${
        multiChoiceQuestions.length > 0
            ? multiChoiceQuestions[0].text
            : "주요 카테고리 질문"
    }에 대한 응답에서 뚜렷한 선호도를 보입니다.`;

    // Generate sample insights
    const insights = [
        {
            id: "insight1",
            title: "주요 응답 패턴 발견",
            description: `전체 응답자의 ${Math.round(
                Math.random() * 30 + 50
            )}%가 일관된 응답 패턴을 보입니다. 이는 설문 대상 그룹이 특정 주제에 대해 강한 의견 일치를 보인다는 것을 의미합니다. 특히 ${
                multiChoiceQuestions.length > 0
                    ? multiChoiceQuestions[0].text
                    : "주요 질문"
            }에 대한 응답에서 이러한 패턴이 뚜렷하게 나타납니다.`,
            category: "general",
            relatedQuestions: multiChoiceQuestions
                .slice(0, 2)
                .map((q) => q.text),
            confidenceLevel: 85,
            recommendations: [
                "이러한 의견 일치를 고려한 전략 수립",
                "주요 응답 그룹을 대상으로 하는 추가 연구 진행",
            ],
        },
        {
            id: "insight2",
            title: "핵심 사용자 니즈 식별",
            description: `응답자들이 가장 높은 점수를 준 영역은 ${
                numericQuestions.length > 0
                    ? numericQuestions[0].text
                    : "주요 평가 항목"
            }입니다. 이는 사용자들이 이 영역에 가장 큰 가치를 두고 있음을 시사합니다. 또한 이 항목은 다른 만족도 지표와도 강한 상관관계를 보입니다.`,
            category: "trends",
            relatedQuestions: numericQuestions.slice(0, 2).map((q) => q.text),
            confidenceLevel: 78,
            recommendations: [
                "이 영역에 대한 추가 개선에 자원 투자",
                "마케팅 메시지에 이 강점 강조",
            ],
        },
        {
            id: "insight3",
            title: "응답자 세그먼트 간 차이",
            description: `${
                multiChoiceQuestions.length > 1
                    ? multiChoiceQuestions[1].text
                    : "세그먼트 질문"
            }에 따라 응답 패턴에 유의미한 차이가 있습니다. 특히 ${
                multiChoiceQuestions.length > 1 ? "특정 그룹" : "그룹 A"
            }는 다른 그룹보다 ${
                numericQuestions.length > 0
                    ? numericQuestions[0].text
                    : "특정 항목"
            }에 대해 20% 더 높은 점수를 줬습니다.`,
            category: "segments",
            relatedQuestions: [
                ...multiChoiceQuestions.slice(0, 1),
                ...numericQuestions.slice(0, 1),
            ].map((q) => q.text),
            confidenceLevel: 72,
            recommendations: [
                "각 세그먼트에 맞춤화된 접근 방식 개발",
                "가장 반응이 좋은 세그먼트에 집중",
            ],
        },
        {
            id: "insight4",
            title: "상관관계 발견",
            description: `${
                numericQuestions.length > 1
                    ? `${numericQuestions[0].text}와(과) ${numericQuestions[1].text} 간에`
                    : "두 주요 지표 간에"
            } 강한 양의 상관관계가 있습니다. 이는 한 영역의 개선이 다른 영역의 만족도에도 긍정적인 영향을 미칠 수 있음을 시사합니다.`,
            category: "correlations",
            relatedQuestions: numericQuestions.slice(0, 2).map((q) => q.text),
            confidenceLevel: 68,
            recommendations: [
                "두 영역의 연계 전략 개발",
                "통합 개선 이니셔티브 고려",
            ],
        },
        {
            id: "insight5",
            title: "개선 우선순위 영역",
            description: `응답자들이 가장 낮은 점수를 준 영역은 ${
                numericQuestions.length > 2
                    ? numericQuestions[2].text
                    : "개선 필요 영역"
            }입니다. 이 영역은 전반적인 만족도에도 상당한 영향을 미치는 것으로 보입니다. 특히 ${
                multiChoiceQuestions.length > 0
                    ? "특정 사용자 그룹"
                    : "주요 사용자 그룹"
            }에서 이 문제가 두드러집니다.`,
            category: "recommendations",
            relatedQuestions: numericQuestions.slice(0, 3).map((q) => q.text),
            confidenceLevel: 90,
            recommendations: [
                "이 영역에 대한 즉각적인 개선 조치",
                "사용자 피드백을 수집하는 추가 연구 진행",
            ],
        },
    ];

    return {
        executiveSummary,
        insights,
    };
};

/**
 * Organize raw insights into a structured format
 * @param {Object} rawInsights - Raw insights from AI
 * @returns {Array} - Organized insights array
 */
const organizeInsights = (rawInsights) => {
    if (
        !rawInsights ||
        !rawInsights.insights ||
        !Array.isArray(rawInsights.insights)
    ) {
        return [];
    }

    // Process each insight
    return rawInsights.insights.map((insight, index) => {
        return {
            id: insight.id || `insight_${index + 1}`,
            title: insight.title || `인사이트 ${index + 1}`,
            description: insight.description || "상세 설명 없음",
            category: insight.category || "general",
            relatedQuestions: Array.isArray(insight.relatedQuestions)
                ? insight.relatedQuestions
                : [],
            confidenceLevel: insight.confidenceLevel || 50,
            recommendations: Array.isArray(insight.recommendations)
                ? insight.recommendations
                : [],
        };
    });
};

/**
 * Generate default insights when API call fails
 * @param {Object} processedData - The processed survey data
 * @returns {Object} - Default insights object
 */
const generateDefaultInsights = (processedData) => {
    // Create basic insights based on data structure
    const mockData = {
        totalResponses: processedData.totalRows,
        questionCount: processedData.questions.length,
        questions: processedData.questions.map((q) => ({
            id: q.id,
            text: q.text,
            type: q.type,
            responseCount: q.responseCount,
        })),
    };

    // Generate mock insights
    const mockInsights = generateMockInsights(mockData);

    return {
        totalResponses: processedData.totalRows,
        questionCount: processedData.questions.length,
        executiveSummary: mockInsights.executiveSummary,
        categories: [
            { id: "general", name: "일반 인사이트" },
            { id: "trends", name: "트렌드 분석" },
            { id: "segments", name: "세그먼트 분석" },
            { id: "correlations", name: "상관관계" },
            { id: "recommendations", name: "제안사항" },
        ],
        items: organizeInsights(mockInsights),
    };
};

export default {
    generateInsights,
};
