// src/services/imageGenerationService.js

/**
 * 페르소나 특성에 기반하여 이미지를 생성하는 서비스
 */

/**
 * OpenAI API를 사용하여 페르소나 이미지 생성
 * @param {Object} persona - 페르소나 정보
 * @returns {Promise<string>} - 생성된 이미지 URL
 */
export const generatePersonaImage = async (persona) => {
    try {
        // API 키 확인
        if (!import.meta.env.VITE_OPENAI_API_KEY) {
            console.log("OpenAI API 키가 없어 기본 이미지를 반환합니다.");
            return getDefaultPersonaImage(persona);
        }

        // 페르소나 정보에 기반한 프롬프트 생성
        const prompt = createImagePrompt(persona);

        // DALL-E API 호출
        const response = await fetch(
            "https://api.openai.com/v1/images/generations",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${
                        import.meta.env.VITE_OPENAI_API_KEY
                    }`,
                },
                body: JSON.stringify({
                    model: "dall-e-3", // 또는 사용 가능한 최신 모델
                    prompt: prompt,
                    n: 1,
                    size: "1024x1024", // 이미지 크기
                    response_format: "url",
                }),
            }
        );

        if (!response.ok) {
            throw new Error(`API 호출 실패: ${response.status}`);
        }

        const data = await response.json();
        return data.data[0].url; // 생성된 이미지 URL 반환
    } catch (error) {
        console.error("페르소나 이미지 생성 오류:", error);
        return getDefaultPersonaImage(persona);
    }
};

/**
 * 페르소나 특성에 맞는 이미지 생성 프롬프트 작성
 * @param {Object} persona - 페르소나 정보
 * @returns {string} - 이미지 생성 프롬프트
 */
const createImagePrompt = (persona) => {
    const { name, age, gender, occupation, personality } = persona;

    // 기본 설명 생성
    let description = `A professional profile photo of a ${age}-year-old ${
        gender === "여성" ? "Korean woman" : "Korean man"
    } who works as a ${occupation}. `;

    // 성격 특성 추가
    if (personality) {
        // 한글 성격 특성을 영어로 매핑
        const personalityTraits = mapPersonalityToEnglish(personality);
        description += `The person has ${personalityTraits} characteristics. `;
    }

    // 연령대별 스타일 조정
    if (age < 30) {
        description += "Modern, youthful style. ";
    } else if (age < 45) {
        description += "Professional, contemporary appearance. ";
    } else {
        description += "Mature, experienced look. ";
    }

    // 직업별 스타일 조정
    if (occupation.includes("마케팅") || occupation.includes("영업")) {
        description +=
            "Dressed in stylish business attire. Confident expression. ";
    } else if (
        occupation.includes("개발자") ||
        occupation.includes("엔지니어") ||
        occupation.includes("IT")
    ) {
        description +=
            "Smart casual attire. Thoughtful expression. Tech-oriented environment. ";
    } else if (
        occupation.includes("디자이너") ||
        occupation.includes("artist")
    ) {
        description +=
            "Creative attire with artistic elements. Expressive face in a creative environment. ";
    } else if (occupation.includes("학생")) {
        description += "Casual, academic style. Curious expression. ";
    } else {
        description += "Business casual attire. Professional setting. ";
    }

    // 마무리
    description +=
        "High-quality, professional headshot with soft lighting. Neutral background. The person looks confident and approachable.";

    return description;
};

/**
 * 한글 성격 특성을 영어로 변환
 * @param {string} personalityStr - 한글 성격 특성 문자열
 * @returns {string} - 영어로 변환된 성격 특성
 */
const mapPersonalityToEnglish = (personalityStr) => {
    const traits = personalityStr.split(",").map((t) => t.trim());
    const translationMap = {
        내향적: "introverted",
        외향적: "extroverted",
        사교적: "social",
        분석적: "analytical",
        직관적: "intuitive",
        논리적: "logical",
        감성적: "emotional",
        창의적: "creative",
        계획적: "organized",
        즉흥적: "spontaneous",
        신중한: "cautious",
        대담한: "bold",
        꼼꼼한: "meticulous",
        진취적: "progressive",
        // 필요에 따라 더 추가
    };

    // 매핑된 영어 특성 변환
    const englishTraits = traits.map((trait) => {
        return translationMap[trait] || trait;
    });

    // 1-2개만 선택하여 반환
    return englishTraits.slice(0, 2).join(" and ");
};

/**
 * 기본 페르소나 이미지 URL 반환 (API 사용 불가 시)
 * @param {Object} persona - 페르소나 정보
 * @returns {string} - 기본 이미지 URL
 */
const getDefaultPersonaImage = (persona) => {
    const { gender, age } = persona;
    const isFemale = gender === "여성";
    const isYoung = age < 35;

    // 성별과 연령별 기본 이미지 반환
    if (isFemale) {
        return isYoung
            ? "/personas/young-female.jpg"
            : "/personas/adult-female.jpg";
    } else {
        return isYoung
            ? "/personas/young-male.jpg"
            : "/personas/adult-male.jpg";
    }
};

export default {
    generatePersonaImage,
};
