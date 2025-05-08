export async function generateChatInsights(chatHistory, persona) {
    try {
        if (!import.meta.env.VITE_OPENAI_API_KEY) {
            return generateMockInsights(chatHistory, persona);
        }

        const lastMessages = chatHistory ? chatHistory.slice(-10) : [];
        const chatText = lastMessages
            .map(
                (m) => {
                    if (!m) return '';
                    const sender = m.sender === "user" ? "사용자" : (persona && persona.name ? persona.name : "AI");
                    const content = m.content || "";
                    return `${sender}: ${content}`;
                }
            )
            .filter(text => text)
            .join("\n");

        const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: "o4-mini", // Using o4-mini API for chat analysis
                messages: [
                    {
                        role: "system",
                        content: `당신은 사용자와 가상 페르소나 간의 대화를 분석하여 심층적이고 구체적인 인사이트를 제공하는 전문가입니다. 단순한 표면적 관찰이 아닌, 대화의 맥락과 패턴 속에서 비즈니스적 가치가 있는 실행 가능한 인사이트를 도출하세요.

# 분석 가이드라인
1. 대화 맥락의 심층 이해:
   - 사용자의 실제 의도와 감정을 파악하세요
   - 페르소나와 사용자 간의 상호작용 패턴을 분석하세요
   - 명시적 표현뿐만 아니라 암시적 니즈도 포착하세요

2. 세그먼트 및 페르소나 통찰:
   - 사용자의 행동 패턴이 어떤 고객 세그먼트를 대표하는지 분석하세요
   - 페르소나의 특성과 사용자 요구 사이의 적합성을 평가하세요
   - 사용자-페르소나 상호작용에서 나타나는 마케팅 기회를 식별하세요

3. 비즈니스 전략적 함의:
   - 대화에서 발견된 인사이트가 제품/서비스 개발에 주는 시사점을 도출하세요
   - 마케팅 메시지와 고객 접점 전략에 활용할 수 있는 요소를 식별하세요
   - 데이터 기반의 의사결정을 위한 구체적 행동 방안을 제시하세요

# 응답 요구사항
다음 대화를 분석하고 정확히 다음 JSON 형식으로만 응답하세요:

{
  "summary": "대화의 맥락과 핵심 내용을 포함하는 상세 요약 (3-4문장)",
  "interactionAnalysis": "사용자-페르소나 상호작용 패턴과 그 효과성에 대한 분석 (3-4문장)",
  "keyThemes": [
    {
      "theme": "식별된 주요 주제/관심사",
      "context": "이 주제가 대화에서 어떻게 드러났는지에 대한 설명",
      "businessImplication": "이 주제가 비즈니스에 갖는 의미"
    }
  ],
  "userNeeds": [
    {
      "need": "식별된 사용자 니즈",
      "evidence": "대화에서 이 니즈가 드러난 구체적 증거",
      "intensityLevel": "high|medium|low",
      "addressingStrategy": "이 니즈를 해결하기 위한 구체적 전략"
    }
  ],
  "personsaEffectiveness": {
    "overallRating": "high|medium|low",
    "strengthPoints": ["페르소나의 효과적인 측면 1", "측면 2"],
    "improvementAreas": ["개선이 필요한 영역 1", "영역 2"],
    "recommendedAdjustments": ["페르소나 조정 제안 1", "제안 2"]
  },
  "actionableInsights": [
    {
      "insight": "구체적이고 실행 가능한 인사이트",
      "rationale": "이 인사이트를 도출한 분석적 근거",
      "applicationArea": "product|marketing|customer_service|etc",
      "businessImpact": "이 인사이트가 비즈니스에 미칠 수 있는 잠재적 영향",
      "implementationSteps": ["실행 단계 1", "단계 2"]
    }
  ],
  "marketingOpportunities": [
    {
      "opportunity": "식별된 마케팅 기회",
      "targetSegment": "이 기회에 적합한 고객 세그먼트",
      "keyMessage": "효과적일 것으로 예상되는 핵심 메시지",
      "channels": ["권장 채널 1", "채널 2"],
      "expectedOutcome": "이 접근법의 예상 결과"
    }
  ]
}

페르소나:
이름: ${persona && persona.name ? persona.name : "AI"}
나이: ${persona && persona.age ? persona.age : ""}세
성별: ${persona && persona.gender ? persona.gender : ""}
직업: ${persona && persona.occupation ? persona.occupation : ""}
성격: ${persona && persona.personality ? persona.personality : ""}
니즈: ${persona && persona.needs ? persona.needs : ""}
목표: ${persona && persona.goals ? persona.goals : ""}
불편함: ${persona && persona.frustrations ? persona.frustrations : ""}

대화:
${chatText}`,
                    },
                    {
                        role: "user",
                        content: "위 형식대로 JSON으로만 응답해주세요. 반드시 완전한 JSON 형식이어야 합니다.",
                    },
                ],
                temperature: 0.3,
                max_tokens: 1000,
            }),
        });

        if (!res.ok) {
            throw new Error(`OpenAI API 오류: ${res.status}`);
        }

        const data = await res.json();
        if (data && data.choices && data.choices.length > 0 && 
            data.choices[0].message && data.choices[0].message.content) {
            
            const content = data.choices[0].message.content;
            const match = content.match(/\{[\s\S]*\}/);
            
            if (match) {
                try {
                    // 완전한 JSON 응답 파싱
                    const parsedData = JSON.parse(match[0]);
                    
                    // 기존 형식으로 변환하여 호환성 유지 (필요한 경우)
                    const compatibleFormat = {
                        summary: parsedData.summary || "",
                        keyPoints: parsedData.keyThemes ? parsedData.keyThemes.map(theme => theme.theme) : [],
                        userNeeds: parsedData.userNeeds ? parsedData.userNeeds.map(need => need.need) : [],
                        suggestions: parsedData.actionableInsights ? parsedData.actionableInsights.map(insight => insight.insight) : [],
                        // 새로운 확장된 형식 데이터
                        interactionAnalysis: parsedData.interactionAnalysis || "",
                        keyThemes: parsedData.keyThemes || [],
                        detailedUserNeeds: parsedData.userNeeds || [],
                        personaEffectiveness: parsedData.personsaEffectiveness || {},
                        actionableInsights: parsedData.actionableInsights || [],
                        marketingOpportunities: parsedData.marketingOpportunities || []
                    };
                    
                    return compatibleFormat;
                } catch (err) {
                    console.error("JSON 파싱 오류:", err);
                    return generateMockInsights(chatHistory, persona); 
                }
            } else {
                console.warn("JSON 형식을 찾을 수 없습니다");
                return generateMockInsights(chatHistory, persona);
            }
        } else {
            console.warn("API 응답이 예상 형식이 아닙니다");
            return generateMockInsights(chatHistory, persona);
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

        const safeHistory = chatHistory || [];
        const chatText = safeHistory
            .filter((m) => m && m.sender !== "system")
            .map(
                (m) => {
                    const sender = m.sender === "user" ? "사용자" : (persona && persona.name ? persona.name : "AI");
                    const content = m.content || "";
                    return `${sender}: ${content}`;
                }
            )
            .join("\n");

        const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: "o4-mini", // Using o4-mini API for chat analysis
                messages: [
                    {
                        role: "system",
                        content: `당신은 사용자와 가상 페르소나 간의 전체 대화를 분석하여 심층적이고 종합적인 인사이트를 제공하는 전문가입니다. 단순한 요약이 아닌, 대화에서 드러나는 패턴, 니즈, 기회 요소를 비즈니스적 관점에서 분석하세요.

# 분석 심층 지침
1. 대화 전체의 종합적 맥락 파악:
   - 대화의 시작부터 끝까지 흐름과 발전 양상을 추적하세요
   - 초기 대화와 후기 대화 간의 변화와 발전을 분석하세요
   - 사용자의 태도 변화와 페르소나에 대한 반응 추이를 살펴보세요

2. 비즈니스 인텔리전스 도출:
   - 제품/서비스 개발에 활용할 수 있는 통찰을 식별하세요
   - 사용자 경험 개선을 위한 구체적 요소를 파악하세요
   - 경쟁 우위 확보를 위한 전략적 요소를 추출하세요

3. 전략적 기회 분석:
   - 대화에서 드러난 미충족 니즈를 식별하세요
   - 고객 경험의 핵심 접점과 개선 가능성을 탐색하세요
   - 페르소나 최적화를 위한 구체적 방향성을 제시하세요

# 응답 요구사항
다음 대화 전체를 분석하고 정확히 다음 JSON 형식으로만 응답하세요:

{
  "executiveSummary": "전체 대화의 비즈니스적 의미와 핵심 발견점을 포함한 요약 (4-5문장)",
  "conversationEvolution": {
    "initialStage": "대화 초기 단계의 특성과 주요 패턴",
    "developmentStage": "대화 중간 단계에서의 발전과 변화",
    "conclusionStage": "대화 마무리 단계의 특성과 결과",
    "overallDynamics": "전체 대화 흐름의 패턴과 역동성"
  },
  "keyThemes": [
    {
      "theme": "식별된 주요 주제/관심사",
      "frequency": "high|medium|low",
      "significance": "주제의 대화 내 중요도와 비즈니스적 의미",
      "relatedInsights": ["관련 인사이트 1", "인사이트 2"]
    }
  ],
  "userProfile": {
    "attitudePattern": "사용자의 전반적 태도와 의사소통 스타일",
    "informationSeekingStyle": "사용자의 정보 탐색 및 질문 패턴",
    "decisionMakingFactors": ["의사결정 요인 1", "요인 2"],
    "painPoints": ["불편 사항/문제점 1", "문제점 2"],
    "potentialSegment": "사용자가 대표할 수 있는 고객 세그먼트"
  },
  "detailedUserNeeds": [
    {
      "need": "식별된 사용자 니즈",
      "context": "니즈가 드러난 맥락",
      "priorityLevel": "high|medium|low",
      "fulfillmentStrategy": "니즈 충족을 위한 전략적 접근법",
      "businessOpportunity": "이 니즈가 제공하는 비즈니스 기회"
    }
  ],
  "personaPerformanceAnalysis": {
    "overallEffectiveness": "high|medium|low",
    "keyStrengths": ["페르소나의 강점 1", "강점 2"],
    "developmentAreas": ["개선 영역 1", "영역 2"],
    "authenticityRating": "high|medium|low",
    "engagementSuccessRate": "high|medium|low",
    "optimizationRecommendations": ["최적화 제안 1", "제안 2"]
  },
  "strategicInsights": [
    {
      "insight": "전략적 인사이트",
      "evidenceFromConversation": "대화에서 이 인사이트를 뒷받침하는 증거",
      "businessImplications": "이 인사이트의 비즈니스적 함의",
      "applicationAreas": ["적용 가능 영역 1", "영역 2"],
      "recommendedActions": ["권장 조치 1", "조치 2"]
    }
  ],
  "productDevelopmentOpportunities": [
    {
      "opportunity": "제품/서비스 개발 기회",
      "userNeedAddressed": "해결하는 사용자 니즈",
      "marketPotential": "high|medium|low",
      "developmentComplexity": "high|medium|low",
      "suggestedFeatures": ["제안 기능 1", "기능 2"]
    }
  ],
  "marketingRecommendations": [
    {
      "recommendation": "마케팅 전략 제안",
      "targetAudience": "대상 고객층",
      "valueProposition": "효과적일 것으로 예상되는 가치 제안",
      "messageFraming": "메시지 프레이밍 방식",
      "channelStrategy": "채널 전략 제안",
      "expectedImpact": "예상되는 효과와 영향"
    }
  ],
  "conversationQualityMetrics": {
    "relevanceScore": 0-10,
    "engagementLevel": "high|medium|low",
    "informationValue": "high|medium|low",
    "emotionalConnection": "high|medium|low",
    "problemResolutionRate": "high|medium|low"
  }
}

페르소나:
이름: ${persona && persona.name ? persona.name : "AI"}
나이: ${persona && persona.age ? persona.age : ""}세
성별: ${persona && persona.gender ? persona.gender : ""}
직업: ${persona && persona.occupation ? persona.occupation : ""}
성격: ${persona && persona.personality ? persona.personality : ""}
니즈: ${persona && persona.needs ? persona.needs : ""}
목표: ${persona && persona.goals ? persona.goals : ""}
불편함: ${persona && persona.frustrations ? persona.frustrations : ""}

대화:
${chatText}`,
                    },
                    {
                        role: "user",
                        content: "위 형식대로 JSON으로만 응답해주세요. 반드시 완전한 JSON 형식이어야 합니다.",
                    },
                ],
                temperature: 0.3,
                max_tokens: 1500,
            }),
        });

        if (!res.ok) {
            throw new Error(`OpenAI API 오류: ${res.status}`);
        }

        const data = await res.json();
        if (data && data.choices && data.choices.length > 0 && 
            data.choices[0].message && data.choices[0].message.content) {
            
            const content = data.choices[0].message.content;
            const match = content.match(/\{[\s\S]*\}/);
            
            if (match) {
                try {
                    // 완전한 JSON 응답 파싱
                    const parsedData = JSON.parse(match[0]);
                    
                    // 기존 형식으로 변환하여 호환성 유지 (필요한 경우)
                    const compatibleFormat = {
                        summary: parsedData.executiveSummary || "",
                        keyPoints: parsedData.keyThemes ? parsedData.keyThemes.map(theme => theme.theme) : [],
                        userNeeds: parsedData.detailedUserNeeds ? parsedData.detailedUserNeeds.map(need => need.need) : [],
                        suggestions: parsedData.strategicInsights ? parsedData.strategicInsights.map(insight => insight.insight) : [],
                        // 새로운 확장된 형식 데이터
                        conversationEvolution: parsedData.conversationEvolution || {},
                        keyThemes: parsedData.keyThemes || [],
                        userProfile: parsedData.userProfile || {},
                        detailedUserNeeds: parsedData.detailedUserNeeds || [],
                        personaPerformanceAnalysis: parsedData.personaPerformanceAnalysis || {},
                        strategicInsights: parsedData.strategicInsights || [],
                        productDevelopmentOpportunities: parsedData.productDevelopmentOpportunities || [],
                        marketingRecommendations: parsedData.marketingRecommendations || [],
                        conversationQualityMetrics: parsedData.conversationQualityMetrics || {}
                    };
                    
                    return compatibleFormat;
                } catch (err) {
                    console.error("JSON 파싱 오류:", err);
                    return generateMockChatSummary(chatHistory, persona); 
                }
            } else {
                console.warn("JSON 형식을 찾을 수 없습니다");
                return generateMockChatSummary(chatHistory, persona);
            }
        } else {
            console.warn("API 응답이 예상 형식이 아닙니다");
            return generateMockChatSummary(chatHistory, persona);
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
            // 기존 호환 형식
            summary: "대화가 시작되었습니다.",
            keyPoints: ["첫 대화가 시작되었습니다."],
            userNeeds: [],
            suggestions: ["페르소나의 관심사를 물어보세요."],
            
            // 새 확장 형식
            interactionAnalysis: "대화가 이제 막 시작되어 특별한 패턴이 아직 드러나지 않았습니다.",
            keyThemes: [
                {
                    theme: "초기 대화 단계",
                    context: "아직 대화가 충분히 진행되지 않아 주요 주제가 명확하게 드러나지 않았습니다.",
                    businessImplication: "사용자의 관심사를 파악하기 위한 더 많은 대화가 필요합니다."
                }
            ],
            detailedUserNeeds: [
                {
                    need: "페르소나 이해",
                    evidence: "초기 대화 시작",
                    intensityLevel: "medium",
                    addressingStrategy: "페르소나의 특성을 자연스럽게 드러내는 대화 전개"
                }
            ],
            personaEffectiveness: {
                overallRating: "medium",
                strengthPoints: ["기본적인 대화 시작"],
                improvementAreas: ["더 적극적인 대화 주도"],
                recommendedAdjustments: ["사용자의 관심사를 파악하는 질문하기"]
            },
            actionableInsights: [
                {
                    insight: "사용자의 관심사를 파악하는 질문으로 대화 시작하기",
                    rationale: "초기 대화에서 사용자의 니즈와 관심사를 빠르게 파악하는 것이 중요합니다.",
                    applicationArea: "conversation",
                    businessImpact: "사용자 참여도 향상 및 대화 효율성 증가",
                    implementationSteps: ["페르소나의 특성을 반영한 질문하기", "사용자 응답에 공감하기"]
                }
            ],
            marketingOpportunities: []
        };
    }
    if (len <= 5) {
        return {
            // 기존 호환 형식
            summary: "기본 정보 교환 중입니다.",
            keyPoints: ["페르소나 특성이 드러나고 있습니다."],
            userNeeds: ["더 깊은 이해가 필요합니다."],
            suggestions: ["구체적인 시나리오를 질문해보세요."],
            
            // 새 확장 형식
            interactionAnalysis: "초기 정보 교환 단계로, 페르소나와 사용자가 서로에 대한 기본적인 이해를 형성하고 있습니다. 대화의 깊이는 아직 제한적이나 발전 가능성이 있습니다.",
            keyThemes: [
                {
                    theme: "기본 정보 교환",
                    context: "페르소나와 사용자가 서로에 대한 기본 정보를 공유하고 있습니다.",
                    businessImplication: "사용자의 기본적인 니즈와 관심사를 파악할 수 있는 단계입니다."
                },
                {
                    theme: "페르소나 특성 탐색",
                    context: "사용자가 페르소나의 특성과 배경에 관심을 보이고 있습니다.",
                    businessImplication: "페르소나의 전문성과 신뢰성을 확립하는 중요한 시점입니다."
                }
            ],
            detailedUserNeeds: [
                {
                    need: "깊은 이해와 맥락",
                    evidence: "기본적인 질문과 응답",
                    intensityLevel: "medium",
                    addressingStrategy: "맥락이 풍부한 구체적 정보 제공"
                },
                {
                    need: "페르소나의 전문성 확인",
                    evidence: "페르소나의 배경에 대한 질문",
                    intensityLevel: "high",
                    addressingStrategy: "관련 영역의 전문 지식 시연"
                }
            ],
            personaEffectiveness: {
                overallRating: "medium",
                strengthPoints: ["기본적인 정보 제공", "페르소나 특성 표현"],
                improvementAreas: ["대화 깊이 확장", "사용자 관심사에 더 집중"],
                recommendedAdjustments: ["구체적인 예시와 시나리오 활용", "사용자 니즈에 초점 맞추기"]
            },
            actionableInsights: [
                {
                    insight: "구체적인 시나리오로 대화 심화하기",
                    rationale: "실제 적용 사례를 통해 사용자의 이해와 관심을 높일 수 있습니다.",
                    applicationArea: "conversation",
                    businessImpact: "사용자 참여 증가 및 문제 해결 효과성 향상",
                    implementationSteps: ["관련 산업의 실제 사례 공유", "사용자의 상황에 맞는 맞춤형 시나리오 제시"]
                }
            ],
            marketingOpportunities: [
                {
                    opportunity: "페르소나의 전문성 강조",
                    targetSegment: "해당 분야에 관심 있는, 전문성을 중시하는 사용자",
                    keyMessage: "검증된 경험과 전문 지식을 바탕으로 한 신뢰할 수 있는 조언",
                    channels: ["전문 콘텐츠", "케이스 스터디"],
                    expectedOutcome: "브랜드 신뢰도 및 전문성 인식 향상"
                }
            ]
        };
    }
    return {
        // 기존 호환 형식
        summary: "심층 대화가 진행 중입니다.",
        keyPoints: ["문제와 니즈가 논의되었습니다.", "목표가 공유되었습니다."],
        userNeeds: ["효율적 해결책", "명확한 기능 설명"],
        suggestions: [
            "마케팅 메시지를 구체화해보세요.",
            "구매 여정을 질문해보세요.",
        ],
        
        // 새 확장 형식
        interactionAnalysis: "대화가 심층적인 단계로 발전했으며, 구체적인 문제와 니즈, 목표가 명확하게 논의되고 있습니다. 페르소나와 사용자 간의 상호작용이 더 풍부하고 의미 있게 이루어지고 있습니다.",
        keyThemes: [
            {
                theme: "구체적 문제 해결",
                context: "사용자가 직면한 구체적인 문제와 해결 방안이 논의되었습니다.",
                businessImplication: "제품/서비스의 가치 제안이 사용자의 실제 문제 해결에 얼마나 효과적인지 검증할 수 있습니다."
            },
            {
                theme: "목표 설정 및 달성 전략",
                context: "사용자와 페르소나가 공통의 목표와 이를 달성하기 위한 전략에 대해 논의했습니다.",
                businessImplication: "제품/서비스가 사용자의 목표 달성을 어떻게 지원할 수 있는지 명확히 할 수 있습니다."
            }
        ],
        detailedUserNeeds: [
            {
                need: "효율적 해결책",
                evidence: "시간과 비용 효율성에 대한 언급",
                intensityLevel: "high",
                addressingStrategy: "구체적인 ROI와 효율성 지표를 활용한 설명"
            },
            {
                need: "명확한 기능 설명",
                evidence: "기능 작동 방식에 대한 질문",
                intensityLevel: "high",
                addressingStrategy: "시각적 자료와 단계별 설명을 통한 명확한 정보 제공"
            }
        ],
        personaEffectiveness: {
            overallRating: "high",
            strengthPoints: ["구체적 문제 해결 접근", "목표 중심적 대화"],
            improvementAreas: ["마케팅 메시지 구체화", "구매 여정 안내"],
            recommendedAdjustments: ["사용자의 구체적 상황에 맞는 마케팅 메시지 개발", "구매 단계별 지원 방안 제시"]
        },
        actionableInsights: [
            {
                insight: "사용자 세그먼트에 맞는 마케팅 메시지 구체화",
                rationale: "심층 대화를 통해 파악된 사용자의 구체적 니즈와 목표를 반영한 메시지가 필요합니다.",
                applicationArea: "marketing",
                businessImpact: "전환율 향상 및 고객 획득 비용 감소",
                implementationSteps: ["니즈 기반 메시지 프레임워크 개발", "성공 사례 중심의 콘텐츠 제작"]
            },
            {
                insight: "구매 여정 각 단계별 지원 강화",
                rationale: "사용자가 의사결정 과정에서 필요로 하는 정보와 지원을 명확히 파악했습니다.",
                applicationArea: "sales",
                businessImpact: "구매 전환율 증가 및 판매 주기 단축",
                implementationSteps: ["구매 단계별 콘텐츠 최적화", "의사결정 지원 도구 개발"]
            }
        ],
        marketingOpportunities: [
            {
                opportunity: "사용자 성공 스토리 중심 마케팅",
                targetSegment: "유사한 문제를 가진 잠재 고객",
                keyMessage: "실제 사용자가 어떻게 목표를 달성했는지에 초점",
                channels: ["케이스 스터디", "소셜 미디어 테스티모니얼"],
                expectedOutcome: "신뢰도 향상 및 전환율 증가"
            },
            {
                opportunity: "구매 여정 최적화",
                targetSegment: "구매 고려 단계의 잠재 고객",
                keyMessage: "쉽고 명확한 의사결정 과정",
                channels: ["제품 데모", "비교 가이드"],
                expectedOutcome: "구매 주기 단축 및 전환율 향상"
            }
        ]
    };
}

function generateMockChatSummary(chatHistory, persona) {
    return {
        // 기존 호환 형식
        summary: "이 대화에서는 사용자와 페르소나 간에 주요 관심사와 니즈가 교환되었으며, 특정 문제 해결을 위한 접근 방식이 논의되었습니다. 페르소나는 사용자의 질문에 전문적으로 응답하며 신뢰를 구축했습니다.",
        keyPoints: ["사용자의 주요 관심사 식별", "페르소나의 전문성 발휘", "구체적 문제 해결 방안 논의", "향후 행동 계획 수립"],
        userNeeds: ["전문적인 조언과 가이드", "구체적인 문제 해결책", "신뢰할 수 있는 정보 소스", "맞춤형 접근 방식"],
        suggestions: ["사용자의 특정 상황에 맞는 구체적 사례 제시", "단계별 실행 계획 제공", "추가 리소스 및 도구 소개", "후속 질문으로 대화 심화"],
        
        // 새 확장 형식
        conversationEvolution: {
            initialStage: "대화 초기에는 기본적인 정보 교환과 상호 이해 형성에 중점을 두었습니다.",
            developmentStage: "중간 단계에서는 구체적인 문제와 니즈에 대한 심층적인 논의가 이루어졌습니다.",
            conclusionStage: "마무리 단계에서는 구체적인 행동 계획과 다음 단계에 대한 합의가 도출되었습니다.",
            overallDynamics: "전체적으로 탐색에서 문제 정의, 해결책 제시, 실행 계획으로 자연스럽게 발전하는 효과적인 대화 흐름을 보였습니다."
        },
        keyThemes: [
            {
                theme: "전문 지식과 가이드",
                frequency: "high",
                significance: "페르소나의 전문성이 사용자의 신뢰를 구축하고 문제 해결에 직접적으로 기여했습니다.",
                relatedInsights: ["전문성 기반 콘텐츠 마케팅 기회", "사용자 교육 프로그램 개발 가능성"]
            },
            {
                theme: "맞춤형 문제 해결",
                frequency: "high",
                significance: "사용자의 특정 상황에 맞는 맞춤형 해결책이 높은 가치를 제공했습니다.",
                relatedInsights: ["맞춤형 서비스 패키지 개발", "사용자 세그먼트별 접근 방식 차별화"]
            }
        ],
        userProfile: {
            attitudePattern: "정보를 적극적으로 추구하며 구체적인 질문을 통해 필요한 지식을 획득하는 목표 지향적 태도",
            informationSeekingStyle: "체계적이고 논리적인 접근 방식으로 단계적으로 정보를 수집하고 검증하는 스타일",
            decisionMakingFactors: ["전문성과 신뢰성", "실제 적용 가능성", "효율성과 ROI", "구현 용이성"],
            painPoints: ["복잡한 정보 처리의 어려움", "시간 제약", "의사결정의 불확실성"],
            potentialSegment: "실용적이고 효율적인 해결책을 찾는 비즈니스 의사결정자"
        },
        detailedUserNeeds: [
            {
                need: "전문적인 조언과 가이드",
                context: "복잡한 문제 상황에서 신뢰할 수 있는 전문 지식 요구",
                priorityLevel: "high",
                fulfillmentStrategy: "검증된 전문 지식과 실제 사례를 활용한 명확한 가이드 제공",
                businessOpportunity: "전문 컨설팅 서비스 및 교육 프로그램 개발"
            },
            {
                need: "맞춤형 해결책",
                context: "일반적인 접근이 아닌 특정 상황에 최적화된 솔루션 요구",
                priorityLevel: "high",
                fulfillmentStrategy: "사용자 상황 분석을 통한 맞춤형 접근 방식 개발",
                businessOpportunity: "고부가가치 맞춤형 서비스 패키지 구성"
            }
        ],
        personaPerformanceAnalysis: {
            overallEffectiveness: "high",
            keyStrengths: ["전문 지식 전달력", "공감적 커뮤니케이션", "문제 해결 접근법", "신뢰 구축 능력"],
            developmentAreas: ["더 구체적인 실행 단계 안내", "산업별 특화 지식 강화"],
            authenticityRating: "high",
            engagementSuccessRate: "high",
            optimizationRecommendations: ["산업별 사례 라이브러리 확장", "시각적 자료 활용 강화", "후속 질문 전략 개발"]
        },
        strategicInsights: [
            {
                insight: "단계별 의사결정 지원 프레임워크 개발",
                evidenceFromConversation: "사용자가 체계적인 접근 방식과 단계별 가이드에 높은 가치를 부여함",
                businessImplications: "제품/서비스의 사용성과 가치 인식 향상, 의사결정 지원 도구로서의 포지셔닝 강화",
                applicationAreas: ["제품 개발", "사용자 경험", "콘텐츠 마케팅"],
                recommendedActions: ["의사결정 단계별 지원 도구 개발", "단계별 체크리스트 및 가이드 제작"]
            }
        ],
        productDevelopmentOpportunities: [
            {
                opportunity: "의사결정 지원 대시보드 개발",
                userNeedAddressed: "복잡한 정보의 체계적 분석 및 의사결정 지원",
                marketPotential: "high",
                developmentComplexity: "medium",
                suggestedFeatures: ["데이터 시각화 도구", "시나리오 분석 기능", "단계별 의사결정 가이드", "맞춤형 추천 시스템"]
            }
        ],
        marketingRecommendations: [
            {
                recommendation: "전문성 기반 콘텐츠 마케팅 전략",
                targetAudience: "정보 기반 의사결정을 하는 전문가 및 관리자",
                valueProposition: "복잡한 문제를 명확하게 이해하고 효과적으로 해결하는 전문 지식과 도구",
                messageFraming: "문제 해결 여정에서의 신뢰할 수 있는 파트너",
                channelStrategy: "전문 포럼, 산업 컨퍼런스, 소셜 미디어 전문가 그룹",
                expectedImpact: "브랜드 신뢰도 향상 및 리드 품질 개선"
            }
        ],
        conversationQualityMetrics: {
            relevanceScore: 8,
            engagementLevel: "high",
            informationValue: "high",
            emotionalConnection: "medium",
            problemResolutionRate: "high"
        }
    };
}
