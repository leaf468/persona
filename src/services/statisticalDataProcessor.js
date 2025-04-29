/**
 * 통계 데이터 파일을 처리하고 분석하는 서비스
 * 업로드된 통계 데이터 파일을 구조화된 형태로 변환합니다.
 */

/**
 * 통계 데이터에서 상관관계 분석 결과를 추출하는 함수
 * @param {String} fileContent - 통계 데이터 파일 내용
 * @returns {Array} - 추출된 상관관계 분석 결과 배열
 */
const extractCorrelations = (fileContent) => {
    // 상관관계 분석 섹션 추출
    const correlationSectionMatch = fileContent.match(
        /1\.\s*소비자\s*행동\s*특성과\s*인구통계학적\s*특성\s*간\s*상관관계\s*분석([\s\S]*?)(?=2\.|$)/
    );

    if (!correlationSectionMatch) return [];

    const correlationSection = correlationSectionMatch[1];

    // 개별 상관관계 항목 추출
    const correlationItems = correlationSection.match(
        /\d+\.\s*'[^']+'와\s*'[^']+'의\s*상관관계\s*\(상관계수:\s*[\d\.]+\)[\s\S]*?(?=\d+\.|결론:|$)/g
    );

    if (!correlationItems) return [];

    return correlationItems
        .map((item) => {
            // 요소 추출 (요인1, 요인2, 상관계수, 해석)
            const factorsMatch = item.match(
                /'([^']+)'와\s*'([^']+)'의\s*상관관계/
            );
            const coefficientMatch = item.match(/상관계수:\s*([\d\.]+)/);
            const interpretationMatch = item.match(
                /\)\s*([\s\S]*?)(?=\d+\.|결론:|$)/
            );

            if (factorsMatch && coefficientMatch) {
                return {
                    factors: [factorsMatch[1].trim(), factorsMatch[2].trim()],
                    coefficient: parseFloat(coefficientMatch[1]),
                    interpretation: interpretationMatch
                        ? interpretationMatch[1].trim()
                        : "",
                };
            }
            return null;
        })
        .filter(Boolean);
};

/**
 * 통계 데이터에서 클러스터 분석 결과를 추출하는 함수
 * @param {String} fileContent - 통계 데이터 파일 내용
 * @returns {Array} - 추출된 클러스터 분석 결과 배열
 */
const extractClusters = (fileContent) => {
    // 클러스터 분석 섹션 추출
    const clusterSectionMatch = fileContent.match(
        /3\.\s*클러스터\s*분석\s*결과([\s\S]*?)(?=4\.|$)/
    );

    if (!clusterSectionMatch) return [];

    const clusterSection = clusterSectionMatch[1];

    // 개별 클러스터 추출
    const clusterItems = clusterSection.match(
        /클러스터\s*\d+\(크기:\s*\d+명\)[\s\S]*?(?=클러스터|종합\s*결론:|$)/g
    );

    if (!clusterItems) return [];

    return clusterItems
        .map((item) => {
            // 클러스터 ID와 크기 추출
            const idMatch = item.match(/클러스터\s*(\d+)\(크기:\s*(\d+)명\)/);

            // 행동 특성 추출
            const behaviorMatch = item.match(
                /지배적인\s*행동:([\s\S]*?)(?=전형적인|$)/
            );
            const behaviors = behaviorMatch
                ? behaviorMatch[1]
                      .split(",")
                      .map((b) => {
                          // 'Consume Style' = 1 형태에서 괄호와 숫자 제거
                          const clean = b
                              .replace(/\(.*?\)/, "")
                              .replace(/\s*=\s*\d+/, "")
                              .trim();
                          // 콜론 앞부분만 추출
                          const parts = clean.split(":");
                          return parts[0].trim();
                      })
                      .filter(Boolean)
                : [];

            // 인구통계학적 특성 추출
            const demographicMatch = item.match(
                /전형적인\s*인구통계학적\s*특성:([\s\S]*?)(?=해석:|$)/
            );
            const demographics = demographicMatch
                ? demographicMatch[1]
                      .split(",")
                      .map((d) => {
                          // 괄호와 숫자 제거
                          const clean = d
                              .replace(/\(.*?\)/, "")
                              .replace(/\s*=\s*\d+/, "")
                              .trim();
                          // 콜론 앞부분만 추출
                          const parts = clean.split(":");
                          return parts[0].trim();
                      })
                      .filter(Boolean)
                : [];

            // 해석 추출
            const interpretationMatch = item.match(
                /해석:([\s\S]*?)(?=클러스터|종합\s*결론:|$)/
            );
            const interpretation = interpretationMatch
                ? interpretationMatch[1].trim()
                : "";

            if (idMatch) {
                return {
                    id: parseInt(idMatch[1]),
                    size: parseInt(idMatch[2]),
                    behaviors,
                    demographics,
                    interpretation,
                };
            }
            return null;
        })
        .filter(Boolean);
};

/**
 * 통계 데이터에서 T-Test 및 ANOVA 결과를 추출하는 함수
 * @param {String} fileContent - 통계 데이터 파일 내용
 * @returns {Array} - 추출된 분석 결과 배열
 */
const extractStatisticalTests = (fileContent) => {
    // T-Test 및 ANOVA 섹션 추출
    const testSectionMatch = fileContent.match(
        /4\.\s*T-Test\s*및\s*ANOVA([\s\S]*?)(?=종합적인\s*해석:|$)/
    );

    if (!testSectionMatch) return [];

    const testSection = testSectionMatch[1];

    // 개별 분석 항목 추출
    const testItems = testSection.match(
        /\d+\.\s*[^\n]+\([^)]+\)[\s\S]*?(?=\d+\.|종합적인\s*해석:|$)/g
    );

    if (!testItems) return [];

    return testItems
        .map((item) => {
            // 분석 제목 추출 (예: 성별과 가격 비교)
            const titleMatch = item.match(/\d+\.\s*([^\(]+)\(([^\)]+)\)/);

            // 통계값 추출
            const statisticMatch = item.match(
                /(t|F)-statistic\s*=\s*([\d\.]+)/
            );
            const pValueMatch = item.match(/p-value\s*=\s*([\d\.e\-]+)/);

            // 해석 추출
            const interpretationMatch = item.match(
                /해석:([\s\S]*?)(?=세부\s*내용:|$)/
            );
            const detailMatch = item.match(
                /세부\s*내용:([\s\S]*?)(?=\d+\.|종합적인\s*해석:|$)/
            );

            if (titleMatch) {
                return {
                    variables: [titleMatch[1].trim(), titleMatch[2].trim()],
                    statistic: statisticMatch
                        ? {
                              type: statisticMatch[1], // t 또는 F
                              value: parseFloat(statisticMatch[2]),
                          }
                        : null,
                    pValue: pValueMatch ? parseFloat(pValueMatch[1]) : null,
                    interpretation: interpretationMatch
                        ? interpretationMatch[1].trim()
                        : "",
                    detail: detailMatch ? detailMatch[1].trim() : "",
                };
            }
            return null;
        })
        .filter(Boolean);
};

/**
 * 행동 예측 변수의 중요도 분석 결과를 추출하는 함수
 * @param {String} fileContent - 통계 데이터 파일 내용
 * @returns {Object} - 추출된 분석 결과 객체
 */
const extractPredictors = (fileContent) => {
    // 행동 예측 변수 섹션 추출
    const predictorSectionMatch = fileContent.match(
        /2\.\s*행동\s*예측\s*변수의\s*중요도\s*분석([\s\S]*?)(?=3\.|$)/
    );

    if (!predictorSectionMatch) return {};

    const predictorSection = predictorSectionMatch[1];

    // 개별 행동 변수 추출
    const predictorItems = predictorSection.match(
        /\d+\.\s*'[^']+'[^:]*:([\s\S]*?)(?=\d+\.|:|결론:|$)/g
    );

    if (!predictorItems) return {};

    const predictors = {};

    predictorItems.forEach((item) => {
        // 행동 변수 이름 추출
        const nameMatch = item.match(/\d+\.\s*'([^']+)'/);
        if (!nameMatch) return;

        const name = nameMatch[1].trim();

        // 예측 변수와 중요도 추출
        const importanceMatches = item.match(
            /([A-Za-z]+)\s*\([^)]+\):\s*중요도\s*([\d\.]+)%/g
        );

        if (importanceMatches) {
            const factors = importanceMatches
                .map((match) => {
                    const factorMatch = match.match(
                        /([A-Za-z]+)\s*\([^)]+\):\s*중요도\s*([\d\.]+)%/
                    );
                    if (factorMatch) {
                        return {
                            factor: factorMatch[1].trim(),
                            importance: parseFloat(factorMatch[2]),
                        };
                    }
                    return null;
                })
                .filter(Boolean);

            predictors[name] = factors;
        }
    });

    return predictors;
};

/**
 * 통계 데이터 파일의 전체 내용을 분석하여 구조화된 데이터로 변환하는 함수
 * @param {String} fileContent - 통계 데이터 파일 내용
 * @returns {Object} - 구조화된 통계 데이터 객체
 */
export const parseStatisticalData = (fileContent) => {
    try {
        // 각 섹션별 데이터 추출
        const correlations = extractCorrelations(fileContent);
        const predictors = extractPredictors(fileContent);
        const clusters = extractClusters(fileContent);
        const statisticalTests = extractStatisticalTests(fileContent);

        // 종합적인 해석 추출
        const conclusionMatch = fileContent.match(
            /종합적인\s*해석:([\s\S]*?)$/
        );
        const conclusion = conclusionMatch ? conclusionMatch[1].trim() : "";

        return {
            correlations,
            predictors,
            clusters,
            statisticalTests,
            conclusion,
        };
    } catch (error) {
        console.error("통계 데이터 파싱 중 오류 발생:", error);
        return {
            correlations: [],
            predictors: {},
            clusters: [],
            statisticalTests: [],
            conclusion: "",
        };
    }
};

export default {
    parseStatisticalData,
    extractCorrelations,
    extractClusters,
    extractStatisticalTests,
    extractPredictors,
};
