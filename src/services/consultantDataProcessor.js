// src/services/consultantDataProcessor.js

/**
 * 경영 컨설턴트 문서를 처리하고 준비하는 서비스
 * 다양한 형식의 문서를 처리하여 구조화된 데이터로 변환합니다.
 */

/**
 * 텍스트 파일에서 제목과 설명을 추출
 * @param {String} content - 파일 내용
 * @returns {Object} - 제목과 설명 객체
 */
export const extractTitleAndDescription = (content) => {
    if (!content) return { title: "제목 없음", description: "" };

    const lines = content.split("\n").filter((line) => line.trim().length > 0);

    // 첫 번째 줄을 제목으로 간주
    let title = lines[0] || "제목 없음";

    // 제목에서 숫자와 마침표 제거 (1. 비즈니스 전략 => 비즈니스 전략)
    title = title.replace(/^\d+\.\s*/, "").trim();

    // 다음 몇 줄을 설명으로 사용
    const description = lines.slice(1, 4).join(" ");

    return { title, description };
};

/**
 * 문서 내용에서 섹션과 서브섹션 추출
 * @param {String} content - 문서 내용
 * @returns {Array} - 섹션 객체 배열
 */
export const extractSections = (content) => {
    if (!content) return [];

    const lines = content
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
    const sections = [];
    let currentSection = null;
    let currentSubsection = null;
    let currentContent = [];

    // 섹션 제목 패턴 (예: "1. 제목" 또는 "제목:")
    const sectionPattern = /^(\d+\.\s+)?([\w\s가-힣]+):?$/;
    // 서브섹션 패턴 (예: "1.1 제목" 또는 "- 제목")
    const subsectionPattern = /^(\d+\.\d+\s+|-\s+)([\w\s가-힣]+):?$/;

    lines.forEach((line) => {
        // 섹션 매칭 확인
        const sectionMatch = line.match(sectionPattern);
        if (sectionMatch && line.length < 50) {
            // 긴 문장은 제목으로 간주하지 않음
            // 이전 섹션 저장
            if (currentSection) {
                // 마지막 서브섹션 저장
                if (currentSubsection && currentContent.length > 0) {
                    currentSection.subsections.push({
                        title: currentSubsection,
                        content: currentContent.join("\n"),
                    });
                }
                sections.push(currentSection);
            }

            // 새 섹션 시작
            currentSection = {
                title: sectionMatch[2].trim(),
                subsections: [],
            };
            currentSubsection = null;
            currentContent = [];
            return;
        }

        // 서브섹션 매칭 확인
        const subsectionMatch = line.match(subsectionPattern);
        if (subsectionMatch && currentSection) {
            // 이전 서브섹션 저장
            if (currentSubsection && currentContent.length > 0) {
                currentSection.subsections.push({
                    title: currentSubsection,
                    content: currentContent.join("\n"),
                });
            }

            // 새 서브섹션 시작
            currentSubsection = subsectionMatch[2].trim();
            currentContent = [];
            return;
        }

        // 내용 추가
        if (currentSection) {
            currentContent.push(line);
        }
    });

    // 마지막 섹션/서브섹션 저장
    if (currentSection) {
        if (currentSubsection && currentContent.length > 0) {
            currentSection.subsections.push({
                title: currentSubsection,
                content: currentContent.join("\n"),
            });
        } else if (currentContent.length > 0) {
            // 서브섹션이 없는 경우 기본 서브섹션 추가
            currentSection.subsections.push({
                title: "개요",
                content: currentContent.join("\n"),
            });
        }
        sections.push(currentSection);
    }

    return sections;
};

/**
 * 문서 전체를 처리하여 구조화된 데이터로 변환
 * @param {String} content - 문서 내용
 * @param {String} fileName - 파일 이름
 * @returns {Object} - 구조화된 문서 객체
 */
export const processConsultantDocument = (content, fileName) => {
    if (!content) return null;

    // 기본 메타데이터 추출
    const { title, description } = extractTitleAndDescription(content);

    // 문서 ID 생성 (파일 이름 기반)
    const id = fileName
        .replace(/\.[^/.]+$/, "")
        .replace(/\s+/g, "-")
        .toLowerCase();

    // 섹션 추출
    const sections = extractSections(content);

    // 키워드 추출 (단순히 빈도수가 높은 단어 기준)
    const keywords = extractKeywords(content);

    return {
        id,
        fileName,
        title,
        description,
        content,
        sections,
        keywords,
        type: fileName.endsWith(".txt") ? "텍스트" : "문서",
    };
};

/**
 * 텍스트에서 주요 키워드 추출
 * @param {String} text - 분석할 텍스트
 * @param {Number} limit - 반환할 키워드 수
 * @returns {Array} - 키워드 배열
 */
const extractKeywords = (text, limit = 5) => {
    if (!text) return [];

    // 불용어 정의 (한글 + 영어)
    const stopwords = [
        "이",
        "그",
        "저",
        "것",
        "이것",
        "그것",
        "저것",
        "이는",
        "그는",
        "저는",
        "나",
        "너",
        "우리",
        "당신",
        "그들",
        "그녀",
        "그리고",
        "그래서",
        "하지만",
        "또는",
        "및",
        "또한",
        "따라서",
        "그러나",
        "그런데",
        "하며",
        "한다",
        "있다",
        "없다",
        "한다",
        "the",
        "and",
        "a",
        "to",
        "of",
        "in",
        "is",
        "that",
        "for",
        "on",
        "with",
        "as",
        "by",
        "at",
        "from",
        "be",
        "this",
        "it",
        "an",
        "are",
        "not",
        "or",
    ];

    // 텍스트 정규화 (소문자 변환, 숫자/특수문자 제거)
    const normalizedText = text.toLowerCase().replace(/[^\w\s가-힣]/g, " ");

    // 단어 분리
    const words = normalizedText
        .split(/\s+/)
        .filter((word) => word.length > 1 && !stopwords.includes(word));

    // 단어 빈도 계산
    const wordFrequency = {};
    words.forEach((word) => {
        wordFrequency[word] = (wordFrequency[word] || 0) + 1;
    });

    // 빈도 기준 정렬 및 상위 키워드 반환
    return Object.entries(wordFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map((entry) => entry[0]);
};

/**
 * 여러 문서에서 관련 문서 찾기
 * @param {String} query - 검색 쿼리
 * @param {Array} documents - 문서 객체 배열
 * @param {Number} limit - 반환할 최대 문서 수
 * @returns {Array} - 관련 문서 객체 배열
 */
export const findRelevantDocuments = (query, documents, limit = 3) => {
    if (!query || !documents || documents.length === 0) return [];

    // 쿼리 키워드 추출
    const keywords = query
        .toLowerCase()
        .split(/\s+/)
        .filter((word) => word.length > 1);

    // 각 문서의 관련성 점수 계산
    const scoredDocuments = documents.map((doc) => {
        let score = 0;

        // 제목 일치 (더 높은 가중치)
        keywords.forEach((keyword) => {
            if (doc.title.toLowerCase().includes(keyword)) {
                score += 3;
            }
        });

        // 키워드 일치
        keywords.forEach((keyword) => {
            if (doc.keywords.includes(keyword)) {
                score += 2;
            }
        });

        // 내용 일치
        keywords.forEach((keyword) => {
            if (doc.content.toLowerCase().includes(keyword)) {
                score += 1;
            }
        });

        return { document: doc, score };
    });

    // 점수 기준 정렬 및 상위 문서 반환
    return scoredDocuments
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map((item) => item.document);
};

export default {
    extractTitleAndDescription,
    extractSections,
    processConsultantDocument,
    extractKeywords,
    findRelevantDocuments,
};
