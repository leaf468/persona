// src/services/openAiService.js

import axios from "axios";
import { generatePersonaImage } from "./imageGenerationService";

// API 환경 설정 (Vite에서는 import.meta.env를 사용)
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const API_BASE_URL = "https://api.openai.com/v1/chat/completions";

// Axios 인스턴스 생성
const openaiApi = axios.create({
    baseURL: "https://api.openai.com/v1",
    headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
});

/**
 * 통계 데이터를 문자열로 포맷팅하는 함수
 * @param {Object} statsData - 통계 데이터 객체
 * @returns {String} - 포맷팅된 문자열
 */
const formatStatisticalData = (statsData) => {
    if (!statsData) return "";

    let formattedData = "통계 데이터 요약:\n\n";

    // 상관관계 분석 포맷팅
    if (statsData.correlations && statsData.correlations.length > 0) {
        formattedData += "1. 주요 상관관계:\n";
        statsData.correlations.forEach((corr, index) => {
            formattedData += `${index + 1}. ${corr.factors[0]}와(과) ${
                corr.factors[1]
            } 사이의 상관관계: ${corr.coefficient}\n`;
            formattedData += `   해석: ${corr.interpretation}\n\n`;
        });
    }

    // 클러스터 분석 포맷팅
    if (statsData.clusters && statsData.clusters.length > 0) {
        formattedData += "2. 소비자 클러스터 분석:\n";
        statsData.clusters.forEach((cluster, index) => {
            formattedData += `클러스터 ${cluster.id} (${cluster.size}명):\n`;
            formattedData += `- 주요 행동 특성: ${cluster.behaviors.join(
                ", "
            )}\n`;
            formattedData += `- 인구통계학적 특성: ${cluster.demographics.join(
                ", "
            )}\n\n`;
        });
    }

    // 통계 검정 결과 포맷팅 (T-Test 및 ANOVA)
    if (statsData.statisticalTests && statsData.statisticalTests.length > 0) {
        formattedData += "3. 통계 검정 결과:\n";
        statsData.statisticalTests.forEach((test, index) => {
            formattedData += `${index + 1}. ${test.variables[0]}와(과) ${
                test.variables[1]
            } 관계 분석:\n`;
            formattedData += `   - ${test.interpretation}\n`;
            if (test.detail) {
                formattedData += `   - ${test.detail}\n`;
            }
            formattedData += "\n";
        });
    }

    return formattedData;
};

/**
 * 여러 개의 페르소나를 생성하는 함수
 * @param {String} targetMarket - 목표 시장
 * @param {String} targetCustomer - 목표 고객
 * @param {String} problem - 문제
 * @param {String} solution - 솔루션
 * @param {Object} statsData - 통계 데이터
 * @param {Number} count - 생성할 페르소나 수 (기본값: 3)
 * @returns {Promise<Array>} - 생성된 페르소나 객체 배열
 */
export const generateMultiplePersonas = async (
    targetMarket,
    targetCustomer,
    problem,
    solution,
    statsData,
    count = 3
) => {
    try {
        // OpenAI API 키가 없는 경우 목업 데이터 사용
        if (!import.meta.env.VITE_OPENAI_API_KEY) {
            console.log(
                "OpenAI API 키가 설정되지 않아 목업 데이터를 사용합니다."
            );
            return generateMockMultiplePersonas(
                targetMarket,
                targetCustomer,
                problem,
                solution,
                statsData,
                count
            );
        }

        // 통계 데이터 포맷팅
        const formattedStats = formatStatisticalData(statsData);

        // 프롬프트 구성
        const prompt = `
당신은 마케팅 전문가로서 통계 데이터를 기반으로 정확한 페르소나를 생성하는 전문가입니다.
다음 정보를 바탕으로 다양한 특성을 가진 ${count}명의 페르소나를 생성해주세요:

목표 시장: ${targetMarket}
목표 고객: ${targetCustomer}
고객이 겪는 문제: ${problem}
제공하고자 하는 솔루션: ${solution}

${formattedStats}

위 정보를 바탕으로 다음 형식의 JSON 배열로 ${count}명의 페르소나를 생성해주세요:
[
  {
    "id": 1,
    "name": "이름 (한국어 이름)",
    "age": 나이 (숫자),
    "gender": "성별",
    "occupation": "직업",
    "education": "최종 학력",
    "personality": "성격 특성 (통계 데이터 기반)",
    "behaviors": "소비 행동 특성 (통계 데이터 기반)",
    "needs": "필요 사항 (문제와 연관)",
    "goals": "목표 (솔루션과 연관)",
    "frustrations": "불편함 (문제와 연관)",
    "marketFit": "시장 적합성 설명",
    "dayInLife": "일상 생활 묘사",
    "quotes": ["인용구1", "인용구2"]
  },
  {
    "id": 2,
    ... 두 번째 페르소나 ...
  },
  ...
]

각 페르소나는 다음 조건을 만족해야 합니다:
1. 서로 다른 특성을 가지되, 모두 목표 시장과 고객에 적합해야 함
2. 다양한 인구통계학적 특성 (성별, 연령대, 직업 등) 반영
3. 실제 사람처럼 구체적이고 현실적인 특성을 가짐
4. 통계 데이터의 주요 클러스터나 상관관계를 반영

오직 JSON 배열 형식으로만 응답해주세요.
`;

        // OpenAI API 호출
        const response = await openaiApi.post("/chat/completions", {
            model: "gpt-4", // 사용 가능한 모델로 변경 가능
            messages: [
                {
                    role: "system",
                    content:
                        "당신은 통계 데이터를 기반으로 정확한 페르소나를 생성하는 마케팅 전문 AI입니다.",
                },
                {
                    role: "user",
                    content: prompt,
                },
            ],
            temperature: 0.8,
            max_tokens: 2500,
        });

        // 응답에서 콘텐츠 추출
        const responseContent = response.data.choices[0].message.content;

        // JSON 추출 및 파싱
        const jsonMatch = responseContent.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            const personas = JSON.parse(jsonMatch[0]);

            // 각 페르소나에 이미지 URL 추가 (비동기 처리)
            const personasWithImages = await Promise.all(
                personas.map(async (persona, index) => {
                    try {
                        // 이미지 생성 API 호출
                        const imageUrl = await generatePersonaImage(persona);
                        return {
                            ...persona,
                            id: persona.id || index + 1,
                            photo: imageUrl,
                        };
                    } catch (imageError) {
                        console.error(
                            `페르소나 ${index + 1} 이미지 생성 오류:`,
                            imageError
                        );
                        return {
                            ...persona,
                            id: persona.id || index + 1,
                            photo: getPersonaPhotoUrl(
                                persona.gender,
                                persona.age
                            ), // 기본 이미지 사용
                        };
                    }
                })
            );

            return personasWithImages;
        }

        throw new Error("페르소나 생성 결과를 파싱할 수 없습니다.");
    } catch (error) {
        console.error("페르소나 생성 중 오류 발생:", error);

        // API 관련 에러 처리
        if (error.response) {
            // OpenAI API에서 에러 응답을 받은 경우
            const status = error.response.status;
            const message =
                error.response.data.error.message ||
                "알 수 없는 오류가 발생했습니다.";

            if (status === 401) {
                throw new Error("OpenAI API 인증 실패: API 키를 확인해주세요.");
            } else if (status === 429) {
                throw new Error(
                    "API 호출 한도 초과: 잠시 후 다시 시도해주세요."
                );
            } else {
                throw new Error(`OpenAI API 오류 (${status}): ${message}`);
            }
        } else if (error.request) {
            // 요청은 보냈지만 응답을 받지 못한 경우
            throw new Error(
                "OpenAI API 서버 응답 없음: 네트워크 연결을 확인해주세요."
            );
        } else {
            // 요청 설정 중 오류가 발생한 경우
            throw error;
        }
    }
};

/**
 * 성별과 나이에 따른 기본 이미지 URL을 반환하는 함수
 */
const getPersonaPhotoUrl = (gender, age) => {
    // 실제 구현에서는 적절한 이미지 URL을 반환
    // 여기서는 예시로 간단한 로직 사용
    const isFemale = gender && gender.includes("여성");
    const isYoung = age && age < 35;

    if (isFemale) {
        return isYoung
            ? "/personas/young-female.jpg"
            : "/personas/adult-female.jpg";
    } else {
        return isYoung
            ? "/personas/young-male.jpg"
            : "/personas/adult-male.jpg";
    }

    // 기본 이미지
    // return '/placeholder-persona.jpg';
};

/**
 * API 없이 여러 개의 목업 페르소나를 생성하는 함수
 */
const generateMockMultiplePersonas = async (
    targetMarket,
    targetCustomer,
    problem,
    solution,
    statsData,
    count = 3
) => {
    // 지연 시뮬레이션
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 통계 데이터에서 관련 정보 추출
    let dominantCluster = { demographics: [], behaviors: [] };
    let clusters = [];

    if (statsData) {
        // 클러스터 정보 가져오기
        if (statsData.clusters && statsData.clusters.length > 0) {
            clusters = statsData.clusters;
            dominantCluster = statsData.clusters.reduce(
                (prev, current) => (current.size > prev.size ? current : prev),
                { size: 0, demographics: [], behaviors: [] }
            );
        }
    }

    const personaTemplates = [
        {
            id: 1,
            name: "김지혜",
            age: 32,
            gender: "여성",
            occupation: "마케팅 전문가",
            education: "대학교 졸업",
            personality: "내향적, 분석적, 계획적",
            behaviors: "온라인 소비 중심, 가격 비교를 꼼꼼히 함",
            needs: `${problem}에 대한 효과적인 해결책 필요`,
            goals: `${solution}을 통해 업무 효율성 향상 희망`,
            frustrations: problem,
            marketFit: `${targetMarket} 시장의 핵심 고객층에 해당`,
            dayInLife:
                "아침에 일어나 SNS를 확인하고, 출근길에 모바일로 뉴스를 읽습니다. 업무 중에는 효율성을 중시하며, 퇴근 후에는 온라인 쇼핑을 즐깁니다.",
            quotes: [
                `"${problem}은 정말 큰 스트레스예요."`,
                `"${solution}이 있다면 정말 도움이 될 것 같아요."`,
                `"내가 활용할 수 있는 해택으로 가성비 높고 일상 하루를 보내고 싶어"`,
            ],
            brands: ["네이버", "카카오", "인스타그램", "유튜브"],
            devicePreference: ["아이폰15 Pro", "맥북", "애플워치"],
            photo: "/personas/young-female.jpg",
            characteristics: [
                "가성비",
                "카페/디저트",
                "편안스토어",
                "음악",
                "다꾸",
                "홈꾸",
            ],
        },
        {
            id: 2,
            name: "이준호",
            age: 41,
            gender: "남성",
            occupation: "IT 엔지니어",
            education: "대학원 졸업",
            personality: "논리적, 체계적, 신중함",
            behaviors: "온라인 커뮤니티 활동 많음, 리뷰 중시함",
            needs: `${problem}에 대한 기술적 해결책 필요`,
            goals: `${solution}을 통해 시간 절약 희망`,
            frustrations: problem,
            marketFit: `${targetMarket} 시장의 기술 얼리어답터층`,
            dayInLife:
                "아침 운동으로 하루를 시작하고, 출근길에 팟캐스트를 들습니다. 업무 중에는 최신 기술 트렌드를 확인하며, 퇴근 후에는 온라인 커뮤니티 활동을 합니다.",
            quotes: [
                `"${problem}은 업무 효율성을 크게 저하시킵니다."`,
                `"효과적인 ${solution}이 있다면 즉시 도입할 것입니다."`,
            ],
            brands: ["애플", "삼성", "마이크로소프트", "테슬라"],
            devicePreference: ["갤럭시 S23", "삼성 노트북", "갤럭시 워치"],
            photo: "/personas/adult-male.jpg",
            characteristics: ["효율성", "최신 기술", "데이터 기반", "자동화"],
        },
        {
            id: 3,
            name: "박소연",
            age: 23,
            gender: "여성",
            occupation: "대학생",
            education: "대학교 재학 중",
            personality: "호기심 많음, 적응력 높음, 창의적",
            behaviors: "새로운 제품 시도를 좋아함, SNS 활동 활발",
            needs: `${problem}에 대한 유연한 해결책 필요`,
            goals: `${solution}을 통해 학업과 연구 효율화 희망`,
            frustrations: problem,
            marketFit: `${targetMarket} 시장의 젊은 얼리어답터`,
            dayInLife:
                "아침에 커피를 마시며 SNS를 확인하고, 도서관이나 카페에서 공부합니다. 다양한 학술 활동과 교류에 참여하며, 저녁에는 친구들과 만나거나 온라인 강의를 듣습니다.",
            quotes: [
                `"${problem}에 대한 창의적인 접근이 필요해요."`,
                `"${solution}이 저의 연구와 학업에 큰 도움이 될 것 같아요."`,
                `"새로운 경험 선호"`,
            ],
            brands: ["인스타그램", "유튜브", "틱톡", "스포티파이", "넷플릭스"],
            devicePreference: ["아이폰", "맥북", "에어팟"],
            photo: "/personas/young-female.jpg",
            characteristics: ["트렌드", "새로운 경험", "소셜 미디어", "창의성"],
        },
    ];

    // 클러스터 정보가 있는 경우 페르소나 특성 일부 수정
    if (clusters.length > 0) {
        // 각 페르소나에 클러스터 특성 반영
        for (
            let i = 0;
            i < Math.min(count, personaTemplates.length, clusters.length);
            i++
        ) {
            if (clusters[i]) {
                personaTemplates[i].behaviors =
                    clusters[i].behaviors.join(", ");
                personaTemplates[i].personality =
                    clusters[i].demographics.join(", ");
            }
        }
    }

    // 각 페르소나에 이미지 추가 (가능한 경우)
    const personasWithImages = await Promise.all(
        personaTemplates.slice(0, count).map(async (persona, index) => {
            try {
                // API 키가 있고 실제 환경인 경우 이미지 생성 시도
                if (
                    import.meta.env.VITE_OPENAI_API_KEY &&
                    import.meta.env.MODE === "production"
                ) {
                    const imageUrl = await generatePersonaImage(persona);
                    return {
                        ...persona,
                        id: index + 1,
                        photo: imageUrl,
                    };
                }
            } catch (error) {
                console.error(
                    `목업 페르소나 ${index + 1} 이미지 생성 오류:`,
                    error
                );
            }

            // 기본 이미지 사용
            return {
                ...persona,
                id: index + 1,
            };
        })
    );

    return personasWithImages;
};

/**
 * OpenAI API를 통해 페르소나를 생성하는 함수 (단일 페르소나 생성용)
 * 기존 함수 유지
 */
export const generatePersonaWithOpenAI = async (
    targetMarket,
    targetCustomer,
    problem,
    solution,
    statsData
) => {
    // 이제 여러 페르소나 생성 후 첫 번째만 반환
    const personas = await generateMultiplePersonas(
        targetMarket,
        targetCustomer,
        problem,
        solution,
        statsData,
        1
    );
    return personas[0];
};

/**
 * 프론트엔드에서 직접 페르소나를 생성하는 함수 (개발 및 테스트용)
 * 기존 함수 유지
 */
export const generateMockPersona = async (
    targetMarket,
    targetCustomer,
    problem,
    solution,
    statsData
) => {
    // 이제 여러 목업 페르소나 생성 후 첫 번째만 반환
    const personas = await generateMockMultiplePersonas(
        targetMarket,
        targetCustomer,
        problem,
        solution,
        statsData,
        1
    );
    return personas[0];
};

export default {
    generatePersonaWithOpenAI,
    generateMockPersona,
    generateMultiplePersonas,
    formatStatisticalData,
};
