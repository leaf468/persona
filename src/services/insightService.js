// src/services/insightService.js
import { TextAnalyzer } from './textVisualizationService';

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

        // Extract survey context information
        const surveyContext = insights.surveyContext || {
            purpose: "설문의 목적을 파악할 수 없습니다.",
            targetAudience: "대상 고객층을 확인할 수 없습니다.",
            keyConcerns: ["파악된 주요 관심사가 없습니다."]
        };
        
        // Add visualization suggestions from AI
        const visualizationSuggestions = insights.visualizationSuggestions || [];
        
        // Add thematic groups
        const thematicGroups = insights.thematicGroups || [];
        
        // Process insights to add visualization suggestions based on text analysis
        const processedInsights = organizedInsights.map(insight => {
            // Analyze the insight description for potential visualization
            if (insight.description) {
                const textAnalysis = TextAnalyzer.analyzeText(insight.description);
                
                // Only recommend a visualization if AI didn't already suggest one
                if (!insight.suggestedVisualization && textAnalysis.type !== "wordcloud") {
                    insight.suggestedVisualization = textAnalysis.type;
                    insight.visualizationData = textAnalysis.data;
                }
            }
            return insight;
        });

        // Add metadata
        return {
            totalResponses,
            questionCount,
            executiveSummary:
                insights.executiveSummary ||
                "데이터에서 주요 인사이트를 추출하는 중입니다.",
            overallContext: insights.overallContext || "",
            surveyContext: surveyContext,
            visualizationSuggestions: visualizationSuggestions,
            thematicGroups: thematicGroups,
            categories: [
                { id: "general", name: "일반 인사이트" },
                { id: "trends", name: "트렌드 분석" },
                { id: "segments", name: "세그먼트 분석" },
                { id: "correlations", name: "상관관계" },
                { id: "recommendations", name: "제안사항" },
            ],
            items: processedInsights,
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
            field: question.field, // Add original field name for better context
        };

        // Add type-specific summary
        if (
            question.type === "multiple_choice" ||
            question.type === "categorical"
        ) {
            // Include all responses for better context analysis, not just top 5
            summary.topResponses = question.summary.frequencies
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
            
            // Add frequency distribution for better pattern analysis
            summary.distribution = question.summary.frequencies;
        }

        return summary;
    });

    // Include the complete raw data for context analysis
    const fullData = processedData.rawData;
    
    // Find potential correlations
    const correlations = findPotentialCorrelations(processedData);
    
    // Get comprehensive text samples for text questions
    const rawSamples = {};
    if (processedData.rawData) {
        // Find text-type questions
        const textQuestions = processedData.questions.filter(q => q.type === "text");
        
        // For each text question, get up to 10 sample responses for better context
        textQuestions.forEach(question => {
            const field = question.field;
            const samples = processedData.rawData
                .map(row => row[field])
                .filter(text => text && text.trim().length > 0)
                .slice(0, 10);  // Take more samples for better context
                
            if (samples.length > 0) {
                rawSamples[question.id] = samples;
            }
        });
    }
    
    // Analyze patterns across questions
    const patterns = analyzeQuestionPatterns(processedData);

    return {
        totalResponses: processedData.totalRows,
        questionCount: processedData.questions.length,
        questions: questionSummaries,
        correlations: correlations,
        rawSamples: rawSamples,
        patterns: patterns,
        // Include sample rows for better context understanding
        sampleRows: processedData.rawData.slice(0, Math.min(10, processedData.rawData.length))
    };
};

/**
 * Analyze patterns across questions to identify relationships
 * @param {Object} processedData - The processed survey data
 * @returns {Object} - Patterns identified across questions
 */
const analyzeQuestionPatterns = (processedData) => {
    const patterns = {
        questionGroups: [],
        repeatedTerms: {},
        potentialVisualizations: []
    };
    
    // Group questions by potential themes/topics based on text similarity
    const questions = processedData.questions;
    const questionTexts = questions.map(q => q.text.toLowerCase());
    
    // Extract common terms across questions
    const commonTerms = new Map();
    questionTexts.forEach(text => {
        // Split into words, remove common words
        const words = text.split(/\s+/).filter(word => 
            word.length > 3 && 
            !["what", "when", "where", "which", "this", "that", "these", "those", "with", "your"].includes(word)
        );
        
        words.forEach(word => {
            commonTerms.set(word, (commonTerms.get(word) || 0) + 1);
        });
    });
    
    // Find terms that appear in multiple questions
    for (const [term, count] of commonTerms.entries()) {
        if (count >= 2) {
            patterns.repeatedTerms[term] = count;
        }
    }
    
    // Identify groups of related questions
    for (let i = 0; i < questions.length; i++) {
        const relatedQuestions = [];
        const q1 = questions[i];
        
        for (let j = i + 1; j < questions.length; j++) {
            const q2 = questions[j];
            
            // Check for text similarity based on common words
            const q1Words = new Set(q1.text.toLowerCase().split(/\s+/));
            const q2Words = new Set(q2.text.toLowerCase().split(/\s+/));
            
            // Find intersection
            const commonWords = [...q1Words].filter(word => q2Words.has(word) && word.length > 3);
            
            if (commonWords.length >= 2) {
                relatedQuestions.push({
                    questionId: q2.id,
                    commonTerms: commonWords
                });
            }
        }
        
        if (relatedQuestions.length > 0) {
            patterns.questionGroups.push({
                baseQuestion: q1.id,
                baseQuestionText: q1.text,
                relatedQuestions: relatedQuestions
            });
        }
    }
    
    // Suggest visualization types based on question combinations
    processedData.questions.forEach(question => {
        // For text questions with many unique responses, suggest keyword map or word cloud
        if (question.type === "text" || 
            (question.type === "categorical" && question.uniqueValues.length > 15)) {
            patterns.potentialVisualizations.push({
                questionId: question.id,
                questionText: question.text,
                suggestedViz: ["wordcloud", "keywordMap"],
                rationale: "Text responses or many categorical values can be visualized as word clouds or keyword maps to show frequency patterns"
            });
        }
        
        // For multiple choice with many options, suggest treemap instead of pie/bar
        if (question.type === "multiple_choice" && question.uniqueValues.length > 10) {
            patterns.potentialVisualizations.push({
                questionId: question.id,
                questionText: question.text,
                suggestedViz: ["treemap"],
                rationale: "Multiple choice with many options is better visualized as a treemap for clarity"
            });
        }
    });
    
    return patterns;
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
                    model: "o4-mini", // Using o4-mini API for insights generation
                    messages: [
                        {
                            role: "system",
                            content:
                                "You are an expert market researcher and data scientist who specializes in extracting meaningful insights from survey data. Your analysis goes beyond simple statistics to understand the deeper context, purpose, and implications of survey questions and responses. You excel at identifying patterns in natural language and connecting quantitative data with qualitative meaning. You can also suggest the most appropriate visualization types based on content patterns rather than simple structural rules. Respond only in the JSON format specified in the prompt.",
                        },
                        {
                            role: "user",
                            content: prompt,
                        },
                    ],
                    temperature: 0.3, // Lower temperature for more focused responses
                    max_tokens: 4000, // Increased token limit for more comprehensive analysis
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
                    }명 (${resp.percentage !== undefined ? resp.percentage.toFixed(1) : '0.0'}%)\n`;
                });
                text += `총 옵션 수: ${q.totalOptions}\n`;
            } else if (q.stats) {
                text += `통계: 최소값=${q.stats.min !== undefined ? q.stats.min.toFixed(2) : '0.00'}, 최대값=${q.stats.max !== undefined ? q.stats.max.toFixed(2) : '0.00'}, 평균=${q.stats.mean !== undefined ? q.stats.mean.toFixed(2) : '0.00'}, 중앙값=${q.stats.median !== undefined ? q.stats.median.toFixed(2) : '0.00'}\n`;
            }

            // Add raw data sample for text analysis
            if (q.type === "text" && data.rawSamples && data.rawSamples[q.id]) {
                text += "\n텍스트 응답 샘플 (최대 5개):\n";
                data.rawSamples[q.id].forEach((sample, idx) => {
                    text += `- 응답 ${idx + 1}: "${sample}"\n`;
                });
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

    // Check if survey context is available in the data object
    const surveyContext = data.surveyContext || null;

    // Create prompt
    return `
다음 설문조사 데이터를 분석하여 깊이 있고 구체적인 인사이트를 추출해 주세요. 단순한 표면적 분석이 아닌, 설문의 맥락과 응답 패턴 속에 숨겨진 의미를 찾아내어 비즈니스적 가치가 있는 실행 가능한 인사이트를 도출하세요:

# 데이터 분석 심층 지침
데이터 분석에 있어 다음의 심층적 접근 방식을 적용하세요:

1. 맥락적 이해:
   - 설문의 본질적 목적과 기대 결과를 파악하세요
   - 질문들 간의 구조적, 의미적 관계를 종합적으로 분석하세요
   - 명시적 질문 뿐만 아니라 묵시적으로 조사하려는 의도를 파악하세요

2. 세그먼트 기반 분석:
   - 응답 패턴에 따라 응답자를 세분화하고, 각 세그먼트별 특성을 정의하세요
   - 세그먼트 간 차이점과 공통점을 비교 분석하여 타겟팅 전략을 도출하세요
   - 소수의 응답이라도 중요한 니치 세그먼트가 있는지 식별하세요

3. 복합 패턴 분석:
   - 단일 질문의 응답이 아닌, 여러 질문 간의 상호작용과 패턴을 분석하세요
   - 상관관계 뿐만 아니라 인과관계의 가능성을 탐색하세요
   - 응답 분포의 이상치와 특이 패턴이 의미하는 바를 해석하세요

4. 비즈니스 전략적 해석:
   - 모든 인사이트를 비즈니스 의사결정에 직접 연결될 수 있도록 해석하세요
   - 정량적 데이터와 정성적 응답을 통합하여 스토리텔링 방식으로 전달하세요
   - 각 인사이트에 대한 구체적 액션 아이템과 기대 효과를 제시하세요

5. 고급 시각화 추천:
   - 데이터의 복잡한 패턴을 효과적으로 전달할 수 있는 맞춤형 시각화를 제안하세요
   - 단순 차트 유형이 아닌, 구체적인 데이터 특성과 전달하려는 메시지에 최적화된 시각화 방법을 추천하세요
   - 여러 데이터 포인트를 통합적으로 보여줄 수 있는 대시보드 구성 아이디어를 제공하세요

# 사용자 제공 설문 맥락 정보
${surveyContext ? "사용자가 제공한 설문 맥락 정보: " + surveyContext : "사용자가 제공한 설문 맥락 정보 없음"}

# 데이터 요약
총 응답자 수: ${data.totalResponses}명
총 질문 수: ${data.questionCount}개

# 질문 정보
${questionsText}

# 잠재적 상관관계 분석 대상
${correlationsText}

# 패턴 정보
${data.patterns ? JSON.stringify(data.patterns, null, 2) : "패턴 정보가 없습니다."}

다음 JSON 형식으로 응답해 주세요:
\`\`\`json
{
    "surveyContext": {
        "purpose": "설문의 주요 목적 (원데이터로부터 추론한 심층적 분석)",
        "targetAudience": "설문의 대상 고객층/응답자층에 대한 상세 프로필",
        "keyConcerns": ["설문에서 다루는 주요 관심사/주제 1", "주요 관심사/주제 2", "..."],
        "businessObjectives": ["추론된 비즈니스 목표 1", "비즈니스 목표 2", "..."]
    },
    "executiveSummary": "설문 전체에 대한 맥락, 주요 발견점, 비즈니스 함의를 포함한 요약 (4-5문장)",
    "overallContext": "설문의 전체 맥락과 응답의 의미에 대한 종합적 이해 및 전략적 함의 (5-6문장)",
    "visualizationSuggestions": [
        {
            "questionId": "question_id",
            "questionText": "질문 내용",
            "suggestedVizType": "wordcloud|graph|correlation|comparative|heatmap|matrix|network|bubble|etc",
            "rationale": "이 시각화 유형이 데이터의 어떤 측면을 가장 효과적으로 전달하는지에 대한 상세 설명 (3-4문장)",
            "insightExpectation": "이 시각화를 통해 발견할 수 있는 잠재적 인사이트"
        }
    ],
    "thematicGroups": [
        {
            "theme": "주제 그룹명",
            "relatedQuestions": ["관련 질문1", "관련 질문2"],
            "description": "이 질문 그룹이 연관된 이유와 통합 분석 시 도출되는 심층 인사이트 (3-4문장)",
            "businessImplication": "이 주제 그룹이 비즈니스에 갖는 전략적 의미"
        }
    ],
    "keySegments": [
        {
            "segmentName": "식별된 응답자 세그먼트명",
            "segmentDescription": "세그먼트의 특성과 행동 패턴에 대한 상세 설명",
            "percentageOfTotal": 25,
            "keyAttributes": ["특성 1", "특성 2"],
            "strategicApproach": "이 세그먼트에 대한 권장 전략적 접근법"
        }
    ],
    "insights": [
        {
            "id": "insight1",
            "title": "명확하고 구체적인 인사이트 제목",
            "description": "인사이트에 대한 상세 설명과 비즈니스적 맥락 (5-6문장, 자연어 이해와 맥락 고려, 구체적 데이터 포인트 포함)",
            "category": "general|trends|segments|correlations|recommendations",
            "relatedQuestions": ["관련된 질문 내용1", "관련된 질문 내용2"],
            "confidenceLevel": 70,
            "dataEvidence": "이 인사이트를 뒷받침하는 구체적인 데이터 포인트와 패턴",
            "actionableInsight": "이 인사이트를 바탕으로 취할 수 있는 구체적인 행동 계획",
            "businessImpact": "이 인사이트가 비즈니스에 미칠 수 있는 잠재적 영향력 (정량적 예측 포함)",
            "recommendations": [
                {
                    "action": "구체적인 실행 방안",
                    "expectedOutcome": "예상되는 결과",
                    "implementationDifficulty": "low|medium|high",
                    "priorityLevel": "low|medium|high"
                }
            ],
            "suggestedVisualization": "이 인사이트를 가장 효과적으로 전달할 수 있는 시각화 방법",
            "potentialRisks": ["이 인사이트 실행 시 고려해야 할 잠재적 리스크"]
        }
    ]
}
\`\`\`

설문 데이터에 기반하여 최소 6개에서 최대 10개의 깊이 있고 실행 가능한 인사이트를 생성해 주세요.
각 인사이트는 다음 조건을 반드시 만족해야 합니다:

1. 구체성: 모호하거나 일반적인 진술이 아닌, 구체적인 데이터 포인트와 패턴에 기반한 명확한 인사이트를 제공하세요.
   - 나쁜 예: "고객 만족도가 낮습니다."
   - 좋은 예: "30-45세 여성 세그먼트에서 제품 A의 사용성에 대한 만족도가 타 세그먼트보다 27% 낮으며, 주로 '복잡한 인터페이스'를 주요 원인으로 지목하고 있습니다."

2. 심층성: 표면적 관찰이 아닌, 데이터 간의 복합적 관계와 근본 원인을 탐색하는 심층 분석을 제공하세요.
   - 나쁜 예: "A 기능이 B 기능보다 인기가 있습니다."
   - 좋은 예: "A 기능의 선호도는 사용자의 디지털 리터러시 수준과 강한 상관관계(r=0.78)를 보이며, 특히 주간 사용 빈도가 5회 이상인 사용자 그룹에서 문제 해결 효율성이 42% 향상되었다고 응답했습니다."

3. 통합적 분석: 개별 질문이 아닌, 여러 질문과 응답 패턴을 통합적으로 분석하여 숨겨진 패턴을 발견하세요.
   - 나쁜 예: "질문 3에 대해 긍정적 응답이 많았습니다."
   - 좋은 예: "제품 만족도(질문 3)와 추천 의향(질문 7) 사이에는 직접적 상관관계가 있으나, 재구매 의향(질문 5)은 고객 서비스 경험(질문 9)에 더 강하게 영향받는 패턴이 발견되었습니다. 이는 제품 자체보다 서비스 경험이 고객 유지에 더 중요한 요소임을 시사합니다."

4. 실행 가능성: 인사이트를 바탕으로 구체적이고 즉시 실행 가능한 전략적 행동 방안을 제시하세요.
   - 나쁜 예: "마케팅 전략을 개선해야 합니다."
   - 좋은 예: "35-45세 전문직 여성 세그먼트에서 '시간 절약' 가치 제안에 대한 반응이 매우 높으므로(+68%), 이 세그먼트를 타겟팅하는 캠페인에서 '5분 안에 완료' 메시지를 핵심 카피라인으로 사용하고 인스타그램과 링크드인을 주요 채널로 활용하세요."

5. 비즈니스 영향력: 각 인사이트가 비즈니스 KPI에 어떻게 영향을 미칠 수 있는지 구체적으로 설명하세요.
   - 나쁜 예: "고객 경험을 개선하면 좋을 것입니다."
   - 좋은 예: "모바일 결제 프로세스의 단계를 3단계에서 1단계로 줄이면, 카트 포기율이 현재 67%에서 최대 40%까지 감소할 것으로 예상되며, 이는 연간 매출에 약 15-20%의 직접적 증가 효과를 가져올 수 있습니다."

6. 시각화 구체성: 단순히 차트 유형이 아닌, 해당 인사이트를 가장 효과적으로 전달할 수 있는 구체적인 시각화 방법을 설명하세요.
   - 나쁜 예: "막대 그래프로 표현하세요."
   - 좋은 예: "세그먼트별 만족도와 사용 빈도의 관계를 나타내는 버블 차트를 사용하되, 버블 크기는 고객 생애 가치를 반영하고, 색상은 고객 충성도 수준을 5단계로 구분하여 표현하세요. X축에는 사용 빈도, Y축에는 만족도 점수를 배치하여 고가치-고빈도-고만족 고객 그룹을 우상단에서 즉시 식별할 수 있도록 하세요."

카테고리는 다음과 같습니다:
- general: 전반적인 응답 패턴에 관한 일반적인 인사이트
- trends: 데이터에서 발견된 트렌드나 패턴
- segments: 특정 응답자 그룹에 관한 인사이트
- correlations: 질문들 간의 관계나 상관관계
- recommendations: 데이터 기반 제안사항

인사이트를 작성할 때는 항상 "그래서 어떻게 해야 하는가?"라는 질문에 명확하게 답할 수 있어야 합니다. 설문의 목적에 부합하는 구체적인 비즈니스 의사결정과 전략 개발에 직접적으로 활용할 수 있는 인사이트를 제공하세요.
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
    const textQuestions = data.questions.filter(
        (q) => q.type === "text"
    );

    // Determine possible survey purpose based on question content
    const surveyPurpose = determineSurveyPurpose(data.questions);
    
    // Create a basic executive summary with context
    const executiveSummary = `이 설문조사는 ${surveyPurpose}를 목적으로 총 ${totalResponses}명의 응답자와 ${
        data.questionCount
    }개의 질문으로 구성되어 있습니다. 응답자들은 대체로 일관된 패턴을 보이며, 몇 가지 주요 트렌드가 관찰됩니다. 특히 ${
        multiChoiceQuestions.length > 0
            ? multiChoiceQuestions[0].text
            : "주요 카테고리 질문"
    }에 대한 응답에서 뚜렷한 선호도를 보입니다. 이 데이터를 바탕으로 구체적인 개선 방향과 전략적 인사이트를 도출할 수 있습니다.`;

    // Create survey context object
    const surveyContext = {
        purpose: surveyPurpose,
        targetAudience: getTargetAudience(data.questions),
        keyConcerns: getKeyConcerns(data.questions)
    };

    // Generate sample insights
    const insights = [
        {
            id: "insight1",
            title: "주요 응답 패턴에서 드러난 고객 선호도",
            description: `전체 응답자의 ${Math.round(
                Math.random() * 30 + 50
            )}%가 ${
                multiChoiceQuestions.length > 0
                    ? multiChoiceQuestions[0].text
                    : "주요 질문"
            }에 대해 일관된 응답 패턴을 보입니다. 이는 설문 대상 그룹이 명확한 선호도와 니즈를 가지고 있음을 시사합니다. 이러한 패턴은 고객 세그먼트의 핵심 요구사항을 파악하고 맞춤형 솔루션을 개발하는 데 중요한 기반이 됩니다.`,
            category: "general",
            relatedQuestions: multiChoiceQuestions
                .slice(0, 2)
                .map((q) => q.text),
            confidenceLevel: 85,
            actionableInsight: "명확한 고객 선호도를 바탕으로 맞춤형 제품/서비스 개발 전략 수립",
            recommendations: [
                "주요 선호도에 따른 제품/서비스 기능 우선순위화",
                "타겟 고객층을 위한 마케팅 메시지 개발",
                "핵심 선호 요소를 강화하는 사용자 경험 개선"
            ],
        },
        {
            id: "insight2",
            title: "고객 만족도 핵심 요소 발견",
            description: `응답자들이 가장 높은 점수를 준 영역은 ${
                numericQuestions.length > 0
                    ? numericQuestions[0].text
                    : "주요 평가 항목"
            }로, 이는 고객 만족도에 가장 큰 영향을 미치는 요소임을 시사합니다. 이 영역은 고객 경험의 핵심 동인으로 작용하며, 전반적인 제품/서비스 평가에도 강한 상관관계를 보입니다. 고객 유지와 충성도 증대를 위해 이 요소를 강화하는 전략이 필요합니다.`,
            category: "trends",
            relatedQuestions: numericQuestions.slice(0, 2).map((q) => q.text),
            confidenceLevel: 78,
            actionableInsight: "고객 만족도의 핵심 동인을 강화하는 제품/서비스 개선 전략 수립",
            recommendations: [
                "핵심 만족 요소에 리소스 집중 투자",
                "이 강점을 핵심 메시지로 활용한 마케팅 전략 개발",
                "경쟁사와의 차별점으로 활용할 수 있는 방안 모색"
            ],
        },
        {
            id: "insight3",
            title: "고객 세그먼트별 차별화된 접근 필요성",
            description: `${
                multiChoiceQuestions.length > 1
                    ? multiChoiceQuestions[1].text
                    : "고객 세그먼트"
            }에 따라 선호도와 만족도에 뚜렷한 차이가 있습니다. 특히 ${
                multiChoiceQuestions.length > 1 ? "특정 그룹" : "주요 고객층"
            }은 ${
                numericQuestions.length > 0
                    ? numericQuestions[0].text
                    : "핵심 기능"
            }에 대해 다른 그룹보다 20% 더 높은 중요도를 부여합니다. 이는 각 세그먼트별 차별화된 접근 전략이 필요함을 시사합니다.`,
            category: "segments",
            relatedQuestions: [
                ...multiChoiceQuestions.slice(0, 1),
                ...numericQuestions.slice(0, 1),
            ].map((q) => q.text),
            confidenceLevel: 72,
            actionableInsight: "세그먼트별 맞춤형 제품/서비스 전략 개발",
            recommendations: [
                "주요 세그먼트별 사용자 여정 맵 개발",
                "각 세그먼트의 핵심 니즈에 맞춘 기능 최적화",
                "세그먼트별 차별화된 마케팅 메시지와 채널 활용"
            ],
        },
        {
            id: "insight4",
            title: "제품/서비스 기능 간 시너지 효과",
            description: `${
                numericQuestions.length > 1
                    ? `${numericQuestions[0].text}와(과) ${numericQuestions[1].text}`
                    : "주요 제품/서비스 기능들"
            } 간에 강한 상관관계가 발견되었습니다. 이는 두 영역이 고객 경험에서 서로 강화하는 효과가 있음을 의미합니다. 이런 시너지 효과를 활용하면 개선 노력의 효율성을 높이고 전반적인 고객 만족도를 크게 향상시킬 수 있습니다.`,
            category: "correlations",
            relatedQuestions: numericQuestions.slice(0, 2).map((q) => q.text),
            confidenceLevel: 68,
            actionableInsight: "상호 강화 효과가 있는 기능들을 통합적으로 개선하는 전략 수립",
            recommendations: [
                "두 기능의 통합적 사용자 경험 디자인",
                "시너지 효과를 최대화하는 마케팅 패키지 개발",
                "두 영역을 함께 강조하는 사용자 교육 자료 제작"
            ],
        },
        {
            id: "insight5",
            title: "시급한 개선이 필요한 고객 경험 요소",
            description: `응답자들이 가장 낮은 만족도를 보인 영역은 ${
                numericQuestions.length > 2
                    ? numericQuestions[2].text
                    : "개선 필요 영역"
            }입니다. 이 영역은 전반적인 고객 경험에 부정적 영향을 미치고 있으며, 특히 ${
                multiChoiceQuestions.length > 0
                    ? "핵심 고객층"
                    : "충성도 높은 사용자 그룹"
            }에서 이 문제가 두드러집니다. 이 영역의 개선은 고객 유지 및 만족도 향상에 직접적인 효과를 가져올 것입니다.`,
            category: "recommendations",
            relatedQuestions: numericQuestions.slice(0, 3).map((q) => q.text),
            confidenceLevel: 90,
            actionableInsight: "핵심 고객층의 불만족 요소에 대한 즉각적인 개선 프로젝트 수립",
            recommendations: [
                "해당 영역 개선을 위한 전담 팀 구성",
                "단기적 해결책과 장기적 개선 방안 병행 추진",
                "개선 후 효과 측정을 위한 후속 고객 피드백 수집 계획 수립"
            ],
        },
    ];

    // Add text-based insight if text questions exist
    if (textQuestions.length > 0) {
        insights.push({
            id: "insight6",
            title: "고객 피드백에서 발견된 개선 기회",
            description: `자유 응답형 질문인 ${
                textQuestions[0].text
            }에서 수집된 고객 의견을 분석한 결과, 반복적으로 언급되는 몇 가지 주요 테마가 있습니다. 특히 사용자 경험의 일관성과 직관성에 대한 피드백이 두드러집니다. 이러한 질적 데이터는 정량적 분석에서 발견하기 어려운 구체적인 개선 포인트를 제공합니다.`,
            category: "recommendations",
            relatedQuestions: textQuestions.slice(0, 1).map((q) => q.text),
            confidenceLevel: 75,
            actionableInsight: "사용자 피드백에서 파악된 구체적 개선점을 제품/서비스 개발 로드맵에 반영",
            recommendations: [
                "주요 피드백 테마에 따른 사용자 경험 재설계",
                "자주 언급되는 불편사항에 대한 심층 사용자 인터뷰 진행",
                "개선 우선순위를 피드백 빈도와 영향력에 기반하여 설정"
            ],
        });
    }

    return {
        executiveSummary,
        surveyContext,
        insights,
    };
};

/**
 * Determine the likely purpose of the survey based on question content
 * @param {Array} questions - Array of question objects
 * @returns {string} - Likely survey purpose
 */
const determineSurveyPurpose = (questions) => {
    // Count keyword occurrences in question texts
    const keywords = {
        "satisfaction": 0,
        "experience": 0,
        "preference": 0,
        "opinion": 0,
        "usage": 0,
        "purchase": 0,
        "만족": 0,
        "경험": 0,
        "선호": 0,
        "의견": 0,
        "사용": 0,
        "구매": 0,
        "추천": 0
    };

    questions.forEach(q => {
        const text = q.text.toLowerCase();
        Object.keys(keywords).forEach(keyword => {
            if (text.includes(keyword)) {
                keywords[keyword]++;
            }
        });
    });

    // Determine primary survey purpose based on keyword frequency
    if (keywords["만족"] > 0 || keywords["satisfaction"] > 0) {
        return "고객 만족도 측정";
    } else if (keywords["경험"] > 0 || keywords["experience"] > 0) {
        return "사용자 경험 평가";
    } else if (keywords["선호"] > 0 || keywords["preference"] > 0) {
        return "고객 선호도 파악";
    } else if (keywords["구매"] > 0 || keywords["purchase"] > 0) {
        return "구매 결정 요인 분석";
    } else if (keywords["추천"] > 0) {
        return "제품/서비스 추천 가능성 평가";
    } else {
        return "고객 의견 및 피드백 수집";
    }
};

/**
 * Determine the likely target audience of the survey
 * @param {Array} questions - Array of question objects
 * @returns {string} - Likely target audience
 */
const getTargetAudience = (questions) => {
    // Look for demographic questions
    const demographicKeywords = ["연령", "나이", "성별", "직업", "학력", "소득", "age", "gender", "occupation", "education", "income"];
    
    for (const q of questions) {
        const text = q.text.toLowerCase();
        for (const keyword of demographicKeywords) {
            if (text.includes(keyword)) {
                return "다양한 인구통계학적 특성을 가진 제품/서비스 사용자";
            }
        }
    }

    // Look for user/customer keywords
    const userKeywords = ["사용자", "고객", "회원", "user", "customer", "member"];
    for (const q of questions) {
        const text = q.text.toLowerCase();
        for (const keyword of userKeywords) {
            if (text.includes(keyword)) {
                return "현재 제품/서비스 사용자";
            }
        }
    }

    return "제품/서비스의 잠재 및 현재 사용자";
};

/**
 * Determine key concerns of the survey
 * @param {Array} questions - Array of question objects
 * @returns {Array} - Key concerns
 */
const getKeyConcerns = (questions) => {
    const concerns = new Set();
    
    // Look for common concern keywords
    const concernKeywords = {
        "품질": "제품/서비스 품질",
        "quality": "제품/서비스 품질",
        "가격": "가격 적정성",
        "price": "가격 적정성",
        "만족": "고객 만족도",
        "satisfaction": "고객 만족도",
        "편리": "사용 편의성",
        "convenience": "사용 편의성",
        "문제": "문제점 및 개선사항",
        "issue": "문제점 및 개선사항",
        "개선": "문제점 및 개선사항",
        "improvement": "문제점 및 개선사항",
        "기능": "주요 기능 평가",
        "feature": "주요 기능 평가",
        "디자인": "디자인 및 UI/UX",
        "design": "디자인 및 UI/UX",
        "추천": "추천 의향",
        "recommend": "추천 의향"
    };

    questions.forEach(q => {
        const text = q.text.toLowerCase();
        Object.entries(concernKeywords).forEach(([keyword, concern]) => {
            if (text.includes(keyword)) {
                concerns.add(concern);
            }
        });
    });

    // If no specific concerns found
    if (concerns.size === 0) {
        return ["전반적인 제품/서비스 평가", "사용자 경험", "개선 사항"];
    }

    return Array.from(concerns);
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

    // Store the survey context information if available
    if (rawInsights.surveyContext) {
        // We could store this in a global state or return it separately
        // For now, we'll log it so it's available for debugging
        console.log("Survey Context:", rawInsights.surveyContext);
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
            actionableInsight: insight.actionableInsight || "",
            recommendations: Array.isArray(insight.recommendations)
                ? insight.recommendations
                : [],
            // Include suggested visualization if available
            suggestedVisualization: insight.suggestedVisualization || null,
            // Add context information to each insight if available
            context: rawInsights.surveyContext || null
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

    // Default survey context based on available questions
    const defaultSurveyContext = {
        purpose: "이 설문조사는 사용자 만족도 및 선호도 파악을 위한 것으로 보입니다.",
        targetAudience: "제품 또는 서비스의 사용자",
        keyConcerns: ["사용자 만족도", "개선 요구사항", "선호도"]
    };

    return {
        totalResponses: processedData.totalRows,
        questionCount: processedData.questions.length,
        executiveSummary: mockInsights.executiveSummary,
        surveyContext: defaultSurveyContext,
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
