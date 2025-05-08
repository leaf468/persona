// src/services/visualizationService.js
import * as d3 from "d3";
import { generateVisualizationFromText } from './textVisualizationService';

/**
 * Generate visualizations based on the processed data
 * @param {Object} processedData - The processed survey data
 * @returns {Promise<Array>} - Array of visualization objects
 */
export const generateVisualizations = async (processedData) => {
    try {
        if (!processedData || !processedData.questions) {
            throw new Error("Invalid data format");
        }

        const visualizations = [];

        // Analyze the overall data context before creating individual visualizations
        const dataContext = analyzeDataContext(processedData);

        // Generate visualizations for each question
        for (const question of processedData.questions) {
            // Skip questions with too few responses
            if (question.responseCount < 3) continue;

            // Determine the best visualization type based on question content and data context
            const vizType = determineVisualizationType(question, dataContext);

            if (vizType) {
                const visualization = await createVisualization(
                    question,
                    processedData.rawData,
                    vizType
                );

                visualizations.push(visualization);
            }
        }

        // Generate content-based relationship visualizations
        const relationshipViz = await generateRelationshipVisualizations(
            processedData.questions,
            processedData.rawData,
            dataContext
        ) || [];

        // Generate thematic visualizations based on content patterns
        const thematicViz = await generateThematicVisualizations(
            processedData,
            dataContext
        ) || [];

        return [...visualizations, ...relationshipViz, ...thematicViz];
    } catch (error) {
        console.error("시각화 생성 중 오류:", error);
        throw error;
    }
};

/**
 * Analyze the overall data context to inform visualization decisions
 * @param {Object} processedData - The processed survey data
 * @returns {Object} - Data context information
 */
const analyzeDataContext = (processedData) => {
    const dataContext = {
        questionsByType: {},
        repeatedTerms: {},
        questionGroups: [],
        contentPatterns: {},
        overallDistribution: {},
        textResponsePatterns: {}
    };
    
    // Count questions by type
    processedData.questions.forEach(question => {
        dataContext.questionsByType[question.type] = 
            (dataContext.questionsByType[question.type] || 0) + 1;
    });
    
    // Identify common terms across questions for thematic grouping
    const allQuestionTexts = processedData.questions.map(q => q.text.toLowerCase());
    const termFrequency = {};
    
    allQuestionTexts.forEach(text => {
        // Split into words and remove common words
        const words = text.split(/\s+/).filter(word => 
            word.length > 3 && 
            !["what", "when", "where", "which", "this", "that", "these", "those", "with", "your"].includes(word)
        );
        
        words.forEach(word => {
            termFrequency[word] = (termFrequency[word] || 0) + 1;
        });
    });
    
    // Keep terms that appear in multiple questions
    Object.keys(termFrequency).forEach(term => {
        if (termFrequency[term] >= 2) {
            dataContext.repeatedTerms[term] = termFrequency[term];
        }
    });
    
    // Group related questions based on content similarity
    for (let i = 0; i < processedData.questions.length; i++) {
        const q1 = processedData.questions[i];
        const relatedQuestions = [];
        
        for (let j = 0; j < processedData.questions.length; j++) {
            if (i === j) continue;
            
            const q2 = processedData.questions[j];
            const commonTermCount = countCommonTerms(q1.text, q2.text);
            
            if (commonTermCount >= 2) {
                relatedQuestions.push({
                    id: q2.id,
                    text: q2.text,
                    commonTermCount
                });
            }
        }
        
        if (relatedQuestions.length > 0) {
            dataContext.questionGroups.push({
                baseQuestion: {
                    id: q1.id,
                    text: q1.text
                },
                relatedQuestions
            });
        }
    }
    
    // Analyze text responses for patterns
    const textQuestions = processedData.questions.filter(q => q.type === "text");
    
    textQuestions.forEach(question => {
        const responses = [];
        const field = question.field;
        
        processedData.rawData.forEach(row => {
            if (row[field] && typeof row[field] === 'string' && row[field].trim()) {
                responses.push(row[field]);
            }
        });
        
        if (responses.length > 0) {
            // Check for numeric patterns in text responses
            const containsNumbers = responses.some(text => /\d+(\.\d+)?%?/.test(text));
            
            // Check for list-like responses
            const containsLists = responses.some(text => 
                /(\d+[\.\)]\s|\-\s|•\s)/.test(text) || 
                /first.*second.*third/i.test(text)
            );
            
            // Calculate average response length
            const avgLength = responses.reduce((sum, text) => sum + text.length, 0) / responses.length;
            
            dataContext.textResponsePatterns[question.id] = {
                containsNumbers,
                containsLists,
                avgResponseLength: avgLength,
                totalResponses: responses.length
            };
        }
    });
    
    return dataContext;
};

/**
 * Count common terms between two text strings
 * @param {string} text1 - First text
 * @param {string} text2 - Second text
 * @returns {number} - Count of common meaningful terms
 */
const countCommonTerms = (text1, text2) => {
    const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    
    // Find intersection
    return [...words1].filter(word => words2.has(word)).length;
};

/**
 * Determine the most appropriate visualization type for a question
 * @param {Object} question - The question object
 * @param {Object} dataContext - Overall data context
 * @returns {string|null} - Visualization type or null if not visualizable
 */
const determineVisualizationType = (question, dataContext) => {
    const { type, uniqueValues, responseCount, text } = question;
    
    // Check for specific content patterns that might override standard visualization rules
    
    // For text questions, check pattern of responses
    if (type === "text" && dataContext.textResponsePatterns && dataContext.textResponsePatterns[question.id]) {
        const patterns = dataContext.textResponsePatterns[question.id];
        
        // If text responses contain numbers and they're likely percentages or metrics
        if (patterns.containsNumbers) {
            // For time series data, use line chart
            if (text.toLowerCase().match(/시간|연도|년도|월별|분기별|weekly|monthly|yearly|quarter|trend|추세|추이/)) {
                return "lineChart";
            }
            
            // For percentage data, use pie chart if few categories
            if (patterns.totalResponses <= 5 && text.toLowerCase().includes("%")) {
                return "pie";
            }
            
            return "bar"; // Use bar chart for other numerical text data
        }
        
        // If text responses look like lists or contain multiple bullet points
        if (patterns.containsLists) {
            // If it seems like a hierarchy or categorization, use treemap
            if (text.toLowerCase().match(/카테고리|분류|그룹|category|classification|group|segment/)) {
                return "treemap";
            }
            
            return "bar"; // Use bar chart for list-like responses
        }
        
        // For very short text responses that behave more like categories
        if (patterns.avgResponseLength < 20) {
            // If few categories, use pie chart
            if (patterns.totalResponses <= 5) {
                return "pie";
            }
            
            return "bar"; // Use bar chart for short categorical responses
        }

        // For longer text with keyword focus
        if (patterns.avgResponseLength > 50) {
            return "wordcloud"; // Use word cloud for longer text responses
        }

        // Even for longer text responses, if there are clear categories, use a graphical representation
        if (patterns.totalResponses > 0) {
            // Analyze for term frequencies and return appropriate chart type
            return "bar";
        }
    }
    
    // See if the question text indicates ranking or preference
    const questionTextLower = text.toLowerCase();
    if (questionTextLower.includes("rank") || 
        questionTextLower.includes("order") || 
        questionTextLower.includes("preference") ||
        questionTextLower.includes("importance") ||
        questionTextLower.includes("순위") ||
        questionTextLower.includes("선호도") ||
        questionTextLower.includes("중요도")) {
        
        return "horizontalBar"; // Better for showing rankings regardless of type
    }
    
    // Check for comparison-focused questions
    if (questionTextLower.includes("compare") || 
        questionTextLower.includes("difference") || 
        questionTextLower.includes("versus") || 
        questionTextLower.includes("vs") ||
        questionTextLower.includes("비교")) {
        
        return "groupedBar"; // Better for showing comparisons regardless of type
    }
    
    // Check for time-based questions - use line charts
    if (questionTextLower.match(/trend|시간|연도|년도|월별|분기별|시계열|추세|추이|over time|timeline|weekly|monthly|yearly|quarter/)) {
        return "lineChart";
    }
    
    // If the question appears to be about distribution or spread
    if (questionTextLower.includes("distribution") || 
        questionTextLower.includes("spread") || 
        questionTextLower.includes("range") ||
        questionTextLower.includes("분포")) {
        
        return "histogram"; // Use histogram for distribution questions
    }
    
    // Check for keyword or text analysis questions
    if (questionTextLower.match(/keyword|키워드|term|용어|word|단어|topic|토픽|주제/)) {
        return "wordcloud";
    }
    
    // Check for proportion or composition questions
    if (questionTextLower.match(/proportion|비율|composition|구성|percentage|퍼센트|percent/)) {
        if (uniqueValues && uniqueValues.length <= 6) {
            return "pie"; // Use pie chart for proportion with few categories
        }
        return "treemap"; // Use treemap for proportions with many categories
    }
    
    // Check for very low data counts - use simpler visualizations
    if (responseCount <= 3) {
        return "bar"; // Bar chart is best for very small data sets
    }
    
    // Standard visualization selection based on question type
    switch (type) {
        case "multiple_choice":
            // For multiple choice with few options, use pie chart or bar chart
            if (uniqueValues && uniqueValues.length <= 5) {
                return "pie";
            } else {
                // Check if this question is about importance or preference ranking
                if (questionTextLower.match(/importance|중요도|rank|순위|preference|선호도/)) {
                    return "horizontalBar"; // Use horizontal bar chart for rankings
                }
                return "bar";
            }

        case "rating":
            // For rating scales, use bar charts or histograms
            if (questionTextLower.match(/satisfaction|만족도|opinion|의견|sentiment|감정/)) {
                return "bar"; // Bar chart for opinion/sentiment ratings
            }
            return "histogram"; // Histogram for other ratings

        case "numeric":
            // For numeric data with time component, use line chart
            if (questionTextLower.match(/time|시간|period|기간|date|날짜|year|month|day|연도|월|일/)) {
                return "lineChart";
            }
            // Otherwise use histograms or box plots
            return "histogram";

        case "categorical":
            // For categorical with few categories, use pie chart
            if (uniqueValues && uniqueValues.length <= 5) {
                return "pie";
            } 
            // For categorical with many categories, use treemap if it's hierarchical
            else if (uniqueValues && uniqueValues.length > 10 && 
                    questionTextLower.match(/category|카테고리|classify|분류|group|그룹/)) {
                return "treemap";
            }
            // Default to bar chart for better readability
            return "bar";

        case "text":
            // For text with key terms or topics, use word cloud
            if (questionTextLower.match(/keyword|키워드|term|용어|word|단어|topic|토픽|주제/)) {
                return "wordcloud";
            }
            // For short text responses, extract topics
            if (question.summary && question.summary.avgResponseLength < 50) {
                return "bar";
            }
            // For longer text, use word cloud
            return "wordcloud";

        default:
            // Default visualization type if nothing else matches
            return "bar";
    }
};

/**
 * Create a visualization for a specific question
 * @param {Object} question - The question object
 * @param {Array} rawData - The raw survey data
 * @param {string} vizType - The type of visualization to create
 * @returns {Object} - Visualization object
 */
const createVisualization = async (question, rawData, vizType) => {
    try {
        let svgContent = "";
        let chartType = "";
        let dataSummary = [];

        // Check if this is text data and should use text visualization analysis
        if (question.type === "text" && 
            (vizType === "wordcloud" || 
             vizType === "keywordMetrics" || 
             vizType === "structuredList" || 
             vizType === "categorizedResponses")) {
            
            // Extract all text responses for this question
            const textResponses = [];
            const field = question.field;
            
            rawData.forEach(row => {
                if (row[field] && typeof row[field] === 'string' && row[field].trim()) {
                    textResponses.push(row[field]);
                }
            });
            
            // Combine into a single text for analysis
            const combinedText = textResponses.join("\n\n");
            
            // Use text visualization analysis to generate the appropriate chart
            if (combinedText.length > 0) {
                const textVizResult = generateVisualizationFromText(combinedText);
                
                if (textVizResult.success) {
                    svgContent = textVizResult.svgContent;
                    chartType = getKoreanChartTypeName(textVizResult.type);
                    dataSummary = [`텍스트 응답 ${textResponses.length}개가 분석되었습니다.`];
                    
                    // Return visualization with detected type
                    return {
                        id: `viz_q_${question.id}`,
                        title: `${question.text} 분석`,
                        description: `이 시각화는 "${question.text}"에 대한 텍스트 응답을 분석하여 ${chartType}로 표현한 것입니다.`,
                        questionText: question.text,
                        chartType: chartType,
                        responseCount: question.responseCount,
                        svgContent: svgContent,
                        dataSummary: dataSummary,
                        textAnalysisType: textVizResult.type
                    };
                }
            }
        }

        // Generate the visualization based on the type
        switch (vizType) {
            case "pie":
                svgContent = createPieChart(question);
                chartType = "파이 차트";
                dataSummary = getPieChartSummary(question);
                break;

            case "bar":
                svgContent = createBarChart(question);
                chartType = "막대 차트";
                dataSummary = getBarChartSummary(question);
                break;

            case "histogram":
                svgContent = createHistogram(question);
                chartType = "히스토그램";
                dataSummary = getHistogramSummary(question);
                break;

            case "treemap":
                svgContent = createTreemap(question);
                chartType = "트리맵";
                dataSummary = getTreemapSummary(question);
                break;

            case "wordcloud":
                svgContent = createWordCloud(question);
                chartType = "워드 클라우드";
                dataSummary = getWordCloudSummary(question);
                break;
                
            case "horizontalBar":
                // Use horizontal bar chart if function exists, otherwise fallback to text visualization's version
                try {
                    svgContent = createHorizontalBarChart(question);
                    chartType = "가로 막대 차트";
                } catch (e) {
                    // Fallback to textVisualizationService's version
                    const data = question.summary.frequencies.map(f => ({
                        label: f.value,
                        value: f.count
                    }));
                    const { VisualizationGenerator } = require('./textVisualizationService');
                    svgContent = VisualizationGenerator.generateHorizontalBarChart(data, 500, 400);
                    chartType = "가로 막대 차트";
                }
                dataSummary = getBarChartSummary(question);
                break;
                
            case "groupedBar":
                // Fallback to standard bar chart until grouped implementation is complete
                svgContent = createBarChart(question);
                chartType = "막대 차트";
                dataSummary = getBarChartSummary(question);
                break;
                
            case "densityPlot":
                // Fallback to histogram until density plot implementation is complete
                svgContent = createHistogram(question);
                chartType = "히스토그램";
                dataSummary = getHistogramSummary(question);
                break;

            default:
                svgContent = createBarChart(question); // Default to bar chart
                chartType = "막대 차트";
                dataSummary = getBarChartSummary(question);
        }

        return {
            id: `viz_q_${question.id}`,
            title: `${question.text} 분석`,
            description: generateDescription(question, vizType),
            questionText: question.text,
            chartType: chartType,
            responseCount: question.responseCount,
            svgContent: svgContent,
            dataSummary: dataSummary,
        };
    } catch (error) {
        console.error(`${question.id} 시각화 생성 오류:`, error);
        // Return a placeholder visualization
        return {
            id: `viz_q_${question.id}`,
            title: `${question.text} 분석 (오류)`,
            description:
                "이 질문에 대한 시각화를 생성하는 중 오류가 발생했습니다.",
            questionText: question.text,
            chartType: "오류",
            responseCount: question.responseCount,
            svgContent: createErrorSvg(),
            dataSummary: ["시각화를 생성할 수 없습니다."],
        };
    }
};

/**
 * Get Korean name for chart type
 * @param {string} chartType - English chart type
 * @returns {string} - Korean chart type name
 */
const getKoreanChartTypeName = (chartType) => {
    const chartTypeMap = {
        'pieChart': '파이 차트',
        'barChart': '막대 차트',
        'horizontalBarChart': '가로 막대 차트',
        'lineChart': '선 그래프',
        'histogram': '히스토그램',
        'treemap': '트리맵',
        'wordcloud': '워드 클라우드',
        'keywordMetrics': '키워드 지표 분석',
        'structuredList': '구조화된 목록',
        'categorizedResponses': '범주화된 응답',
        'groupedBar': '그룹화된 막대 차트',
        'densityPlot': '밀도 플롯'
    };
    
    return chartTypeMap[chartType] || '차트';
};

/**
 * Generate a description for the visualization
 * @param {Object} question - The question object
 * @param {string} vizType - The visualization type
 * @returns {string} - Description text
 */
const generateDescription = (question, vizType) => {
    switch (vizType) {
        case "pie":
            return `이 파이 차트는 "${question.text}"에 대한 ${question.responseCount}개의 응답 분포를 보여줍니다. 각 섹션은 다른 응답 옵션을 나타내며, 크기는 해당 응답의 빈도를 나타냅니다.`;

        case "bar":
            return `이 막대 차트는 "${question.text}"에 대한 ${question.responseCount}개의 응답 분포를 보여줍니다. 각 막대는 다른 응답 옵션을 나타내며, 높이는 해당 응답의 빈도를 나타냅니다.`;

        case "histogram":
            return `이 히스토그램은 "${question.text}"에 대한 ${question.responseCount}개의 수치 응답의 분포를 보여줍니다. 각 막대는 값의 범위를 나타내며, 높이는 해당 범위 내의 응답 빈도를 나타냅니다.`;

        case "treemap":
            return `이 트리맵은 "${question.text}"에 대한 ${question.responseCount}개의 응답을 표시합니다. 각 직사각형의 크기는 해당 응답의 빈도에 비례합니다.`;

        case "wordcloud":
            return `이 워드 클라우드는 "${question.text}"에 대한 응답에서 자주 사용된 단어나 구문을 시각적으로 표현합니다. 단어의 크기는 해당 단어가 응답에서 등장한 빈도를 나타냅니다.`;

        default:
            return `이 차트는 "${question.text}"에 대한 ${question.responseCount}개의 응답을 분석한 결과를 보여줍니다.`;
    }
};

/**
 * Create a pie chart SVG for a multiple choice question
 * @param {Object} question - The question object
 * @returns {string} - SVG content
 */
const createPieChart = (question) => {
    // Make sure we have frequencies to work with
    if (!question.summary || !question.summary.frequencies || question.summary.frequencies.length === 0) {
        // Create default data if none exists
        const defaultData = [
            { value: "응답 1", count: 1, percentage: 50 },
            { value: "응답 2", count: 1, percentage: 50 }
        ];
        
        // Modify the question object to include this data for future reference
        if (!question.summary) question.summary = {};
        question.summary.frequencies = defaultData;
    }
    
    // Frequencies from the question summary
    const data = question.summary.frequencies.slice(0, 8); // Limit to top 8 for clarity

    // Set up dimensions
    const width = 400;
    const height = 300;
    const radius = Math.min(width, height) / 2 - 40;

    // Create color scale
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    // Initialize SVG
    const svg = d3
        .create("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("style", "max-width: 100%; height: auto;");

    // Create group element
    const g = svg
        .append("g")
        .attr("transform", `translate(${width / 2}, ${height / 2})`);

    // Generate the pie
    const pie = d3
        .pie()
        .value((d) => d.count)
        .sort(null); // Don't sort, preserve original order

    // Generate the arcs
    const arc = d3.arc().innerRadius(0).outerRadius(radius);

    // Generate groups
    const arcs = g
        .selectAll(".arc")
        .data(pie(data))
        .enter()
        .append("g")
        .attr("class", "arc");

    // Draw arc paths
    arcs.append("path")
        .attr("d", arc)
        .attr("fill", (d, i) => color(i))
        .attr("stroke", "white")
        .style("stroke-width", "2px");

    // Add labels with lines
    const outerArc = d3
        .arc()
        .innerRadius(radius * 0.9)
        .outerRadius(radius * 0.9);

    arcs.append("text")
        .attr("transform", (d) => {
            const pos = outerArc.centroid(d);
            const midAngle = d.startAngle + (d.endAngle - d.startAngle) / 2;
            pos[0] = radius * 0.99 * (midAngle < Math.PI ? 1 : -1);
            return `translate(${pos})`;
        })
        .attr("dy", ".35em")
        .style("text-anchor", (d) => {
            const midAngle = d.startAngle + (d.endAngle - d.startAngle) / 2;
            return midAngle < Math.PI ? "start" : "end";
        })
        .text((d) => {
            // Truncate long labels
            const label =
                d.data.value.length > 15
                    ? d.data.value.substring(0, 13) + "..."
                    : d.data.value;
            return `${label} (${d.data.percentage !== undefined ? d.data.percentage.toFixed(1) : '0'}%)`;
        })
        .style("font-size", "12px")
        .style("fill", "#333");

    // Add polylines between arcs and labels
    arcs.append("polyline")
        .attr("points", (d) => {
            const pos = outerArc.centroid(d);
            const midAngle = d.startAngle + (d.endAngle - d.startAngle) / 2;
            pos[0] = radius * 0.99 * (midAngle < Math.PI ? 1 : -1);
            return [arc.centroid(d), outerArc.centroid(d), pos];
        })
        .style("fill", "none")
        .style("stroke", "#999")
        .style("stroke-width", "1px");

    // Add title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", 20)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text(shortenText(question.text, 50));

    return svg.node().outerHTML;
};

/**
 * Create a bar chart SVG for a question
 * @param {Object} question - The question object
 * @returns {string} - SVG content
 */
const createBarChart = (question) => {
    // Make sure we have frequencies to work with
    if (!question.summary || !question.summary.frequencies || question.summary.frequencies.length === 0) {
        // For text data, try to extract some frequencies
        let defaultData = [];
        
        if (question.type === 'text' && question.rawResponses && question.rawResponses.length > 0) {
            // Extract words from raw text responses
            const words = {};
            question.rawResponses.forEach(response => {
                if (typeof response === 'string') {
                    response.split(/\s+/).forEach(word => {
                        if (word.length > 3) {
                            words[word] = (words[word] || 0) + 1;
                        }
                    });
                }
            });
            
            // Convert to frequencies
            defaultData = Object.entries(words)
                .map(([value, count]) => ({
                    value,
                    count,
                    percentage: 0
                }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 5);
        }
        
        // If we still have no data, create dummy data
        if (defaultData.length === 0) {
            defaultData = [
                { value: "응답 1", count: 3, percentage: 60 },
                { value: "응답 2", count: 2, percentage: 40 }
            ];
        }
        
        // Modify the question object to include this data for future reference
        if (!question.summary) question.summary = {};
        question.summary.frequencies = defaultData;
    }
    
    // Frequencies from the question summary
    const data = question.summary.frequencies.slice(0, 12); // Limit to top 12 for clarity

    // Set up dimensions
    const margin = { top: 40, right: 30, bottom: 90, left: 60 };
    const width = 500 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    // Create scales
    const x = d3
        .scaleBand()
        .domain(data.map((d) => d.value))
        .range([0, width])
        .padding(0.1);

    const y = d3
        .scaleLinear()
        .domain([0, d3.max(data, (d) => d.count) * 1.1]) // Add 10% padding at the top
        .nice()
        .range([height, 0]);

    // Create SVG
    const svg = d3
        .create("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .attr(
            "viewBox",
            `0 0 ${width + margin.left + margin.right} ${
                height + margin.top + margin.bottom
            }`
        )
        .attr("style", "max-width: 100%; height: auto;");

    // Create container group and translate to respect margins
    const g = svg
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Add the x-axis
    g.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .text((d) => shortenText(d, 15));

    // Add the y-axis
    g.append("g").call(d3.axisLeft(y).ticks(5));

    // Add y-axis label
    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 15)
        .attr("x", -height / 2)
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text("응답 수");

    // Add bars
    g.selectAll(".bar")
        .data(data)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", (d) => x(d.value))
        .attr("y", (d) => y(d.count))
        .attr("width", x.bandwidth())
        .attr("height", (d) => height - y(d.count))
        .attr("fill", "#4C86AF");

    // Add value labels on top of bars
    g.selectAll(".bar-label")
        .data(data)
        .enter()
        .append("text")
        .attr("class", "bar-label")
        .attr("x", (d) => x(d.value) + x.bandwidth() / 2)
        .attr("y", (d) => y(d.count) - 5)
        .attr("text-anchor", "middle")
        .text((d) => d.count)
        .style("font-size", "12px");

    // Add title
    svg.append("text")
        .attr("x", (width + margin.left + margin.right) / 2)
        .attr("y", margin.top / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text(shortenText(question.text, 60));

    return svg.node().outerHTML;
};

/**
 * Create a histogram for numeric data
 * @param {Object} question - The question object
 * @returns {string} - SVG content
 */
const createHistogram = (question) => {
    // Make sure we have frequencies to work with
    if (!question.summary || !question.summary.frequencies || question.summary.frequencies.length === 0) {
        // Create default data if none exists
        const defaultData = [
            { value: "1", count: 2 },
            { value: "2", count: 5 },
            { value: "3", count: 3 },
            { value: "4", count: 1 }
        ];
        
        // Modify the question object to include this data for future reference
        if (!question.summary) question.summary = {};
        question.summary.frequencies = defaultData;
    }
    
    // Get numeric values from raw data
    const numericValues = [];

    // Extract frequencies and convert values to numbers
    for (const { value, count } of question.summary.frequencies) {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
            // Add this value to the array 'count' times
            for (let i = 0; i < count; i++) {
                numericValues.push(numValue);
            }
        }
    }

    // If we have no numeric values but may have text data that could be visualized
    if (numericValues.length === 0) {
        // Try to extract numeric values from text responses if available
        if (question.rawResponses && question.rawResponses.length > 0) {
            question.rawResponses.forEach(response => {
                if (typeof response === 'string') {
                    // Look for numbers in the text
                    const matches = response.match(/\d+(\.\d+)?/g);
                    if (matches) {
                        matches.forEach(match => {
                            const numValue = parseFloat(match);
                            if (!isNaN(numValue)) {
                                numericValues.push(numValue);
                            }
                        });
                    }
                }
            });
        }
        
        // If still no numeric values, fall back to bar chart
        if (numericValues.length === 0) {
            return createBarChart(question);
        }
    }

    // Set up dimensions
    const margin = { top: 40, right: 30, bottom: 50, left: 60 };
    const width = 500 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    // Determine the number of bins
    const binCount = Math.min(10, Math.ceil(Math.sqrt(numericValues.length)));

    // Create histogram generator
    const histogram = d3
        .histogram()
        .domain([d3.min(numericValues), d3.max(numericValues)])
        .thresholds(d3.thresholdScott(numericValues, binCount));

    // Generate bins from data
    const bins = histogram(numericValues);

    // Create scales
    const x = d3
        .scaleLinear()
        .domain([bins[0].x0, bins[bins.length - 1].x1])
        .range([0, width]);

    const y = d3
        .scaleLinear()
        .domain([0, d3.max(bins, (d) => d.length) * 1.1]) // Add 10% padding
        .nice()
        .range([height, 0]);

    // Create SVG
    const svg = d3
        .create("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .attr(
            "viewBox",
            `0 0 ${width + margin.left + margin.right} ${
                height + margin.top + margin.bottom
            }`
        )
        .attr("style", "max-width: 100%; height: auto;");

    // Create container group and translate to respect margins
    const g = svg
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Add the x-axis
    g.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x).ticks(bins.length))
        .selectAll("text")
        .style("text-anchor", "middle");

    // Add x-axis label
    g.append("text")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 10)
        .attr("text-anchor", "middle")
        .text("값");

    // Add the y-axis
    g.append("g").call(d3.axisLeft(y).ticks(5));

    // Add y-axis label
    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 15)
        .attr("x", -height / 2)
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text("빈도");

    // Add the bars
    g.selectAll(".bar")
        .data(bins)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", (d) => x(d.x0))
        .attr("y", (d) => y(d.length))
        .attr("width", (d) => Math.max(0, x(d.x1) - x(d.x0) - 1))
        .attr("height", (d) => height - y(d.length))
        .attr("fill", "#6A89CC");

    // Add value labels on top of bars
    g.selectAll(".bar-label")
        .data(bins)
        .enter()
        .append("text")
        .attr("class", "bar-label")
        .attr("x", (d) => x(d.x0) + (x(d.x1) - x(d.x0)) / 2)
        .attr("y", (d) => y(d.length) - 5)
        .attr("text-anchor", "middle")
        .text((d) => (d.length > 0 ? d.length : ""))
        .style("font-size", "12px");

    // Add title
    svg.append("text")
        .attr("x", (width + margin.left + margin.right) / 2)
        .attr("y", margin.top / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text(shortenText(question.text, 60));

    return svg.node().outerHTML;
};

/**
 * Create a treemap visualization
 * @param {Object} question - The question object
 * @returns {string} - SVG content
 */
const createTreemap = (question) => {
    // Frequencies from the question summary
    const data = {
        name: "root",
        children: question.summary.frequencies
            .slice(0, 20) // Limit to top 20 for clarity
            .map((d) => ({ name: d.value, value: d.count })),
    };

    // Set up dimensions
    const width = 500;
    const height = 400;

    // Create SVG
    const svg = d3
        .create("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("style", "max-width: 100%; height: auto;");

    // Add title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", 20)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text(shortenText(question.text, 60));

    // Create treemap layout
    const treemap = d3
        .treemap()
        .size([width, height - 40])
        .padding(1)
        .round(true);

    // Create hierarchy
    const root = d3
        .hierarchy(data)
        .sum((d) => d.value)
        .sort((a, b) => b.value - a.value);

    // Generate the treemap layout
    treemap(root);

    // Create a color scale
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    // Add the treemap cells
    const cell = svg
        .selectAll("g")
        .data(root.leaves())
        .enter()
        .append("g")
        .attr("transform", (d) => `translate(${d.x0},${d.y0 + 40})`);

    // Add rectangles for each cell
    cell.append("rect")
        .attr("width", (d) => d.x1 - d.x0)
        .attr("height", (d) => d.y1 - d.y0)
        .attr("fill", (d, i) => color(i))
        .attr("stroke", "white");

    // Add text labels
    cell.append("text")
        .attr("x", (d) => (d.x1 - d.x0) / 2)
        .attr("y", (d) => (d.y1 - d.y0) / 2)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .style("font-size", (d) => {
            // Adjust font size based on cell size
            const size = Math.min(d.x1 - d.x0, d.y1 - d.y0) / 5;
            return `${Math.min(size, 12)}px`;
        })
        .style("fill", "white")
        .text((d) => {
            // Only show text if there's enough space
            if (d.x1 - d.x0 < 30 || d.y1 - d.y0 < 20) return "";
            return shortenText(d.data.name, 10);
        });

    return svg.node().outerHTML;
};

/**
 * Create a word cloud visualization
 * @param {Object} question - The question object
 * @returns {string} - SVG content
 */
const createWordCloud = (question) => {
    // This is a simplified word cloud since D3 doesn't have built-in word cloud layout
    // In a real app, use a library like d3-cloud or create a more sophisticated implementation

    const width = 500;
    const height = 400;

    // Create SVG
    const svg = d3
        .create("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("style", "max-width: 100%; height: auto;");

    // Add background for better visibility
    svg.append("rect")
        .attr("width", width)
        .attr("height", height)
        .attr("fill", "#f8f9fa");

    // Add title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", 30)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text(shortenText(question.text, 60));

    // Get frequencies (limit to top 20 for better readability)
    const data = question.summary.frequencies.slice(0, 20).map((d) => ({
        text: d.value,
        size: Math.log(d.count + 1) * 8 + 10, // Better size scaling using logarithm
        count: d.count,
    }));

    // Create a color scale with softer colors
    const color = d3.scaleOrdinal(d3.schemeCategory10);
    
    // Create layout grid for more organized placement
    const gridSize = Math.ceil(Math.sqrt(data.length)); // Square grid
    const cellWidth = width / (gridSize + 1);
    const cellHeight = (height - 60) / (gridSize + 1);
    
    // Center coordinates
    const startX = cellWidth / 2;
    const startY = 60 + cellHeight / 2;

    // Sort data by size (largest first) to place the most important words first
    const sortedData = [...data].sort((a, b) => b.size - a.size);
    
    // Create positions grid
    const positions = [];
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            positions.push({
                x: startX + j * cellWidth,
                y: startY + i * cellHeight,
            });
        }
    }
    
    // Shuffle positions for more natural, less grid-like appearance
    // but maintain some structure to avoid overlaps
    const shuffledPositions = shuffleArray([...positions]);
    
    // Add the words with proper spacing
    sortedData.forEach((d, i) => {
        if (i >= shuffledPositions.length) return; // Skip if no more positions
        
        const position = shuffledPositions[i];
        
        // Add small jitter for more natural appearance
        const jitterX = (Math.random() - 0.5) * (cellWidth * 0.3);
        const jitterY = (Math.random() - 0.5) * (cellHeight * 0.3);
        
        svg.append("text")
            .attr("x", position.x + jitterX)
            .attr("y", position.y + jitterY)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .style("font-size", `${d.size}px`)
            .style("font-family", "Arial")
            .style("font-weight", i < 5 ? "bold" : "normal") // Bold only top words
            .style("fill", color(i % 10))
            .text(shortenText(d.text, 15));
    });

    // Add note
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height - 10)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("font-style", "italic")
        .text("단어 크기는 빈도를 나타냅니다");

    return svg.node().outerHTML;
};

/**
 * Fisher-Yates shuffle algorithm for arrays
 * @param {Array} array - The array to shuffle
 * @returns {Array} - Shuffled array
 */
const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

/**
 * Create an error visualization to show when generation fails
 * @returns {string} - SVG content
 */
const createErrorSvg = () => {
    const width = 400;
    const height = 300;

    // Create SVG
    const svg = d3
        .create("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("style", "max-width: 100%; height: auto;");

    // Add error icon
    svg.append("circle")
        .attr("cx", width / 2)
        .attr("cy", height / 2 - 30)
        .attr("r", 50)
        .attr("fill", "#f8d7da")
        .attr("stroke", "#dc3545")
        .attr("stroke-width", 2);

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height / 2 - 30)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("font-size", "40px")
        .attr("font-weight", "bold")
        .attr("fill", "#dc3545")
        .text("!");

    // Add error message
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height / 2 + 50)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("fill", "#333")
        .text("시각화를 생성할 수 없습니다");

    return svg.node().outerHTML;
};

/**
 * Generate visualizations showing relationships between questions
 * @param {Array} questions - Array of question objects
 * @param {Array} rawData - The raw survey data
 * @param {Object} dataContext - Data context for content-aware visualization
 * @returns {Promise<Array>} - Array of relationship visualization objects
 */
const generateRelationshipVisualizations = async (questions, rawData, dataContext = {}) => {
    const visualizations = [];

    // Filter questions for analysis with relaxed criteria
    const quantitativeQuestions = questions.filter(
        (q) =>
            (q.type === "numeric" || q.type === "rating" || q.type === "text") && q.responseCount > 0
    );

    const categoricalQuestions = questions.filter(
        (q) =>
            (q.type === "multiple_choice" || q.type === "categorical" || q.type === "text") &&
            (q.uniqueValues ? q.uniqueValues.length : 0) <= 20 &&
            q.responseCount > 0
    );

    // Generate scatter plots for pairs of quantitative questions
    if (quantitativeQuestions.length >= 2) {
        // Choose the first 2 numeric questions for simplicity
        // In a real app, you might want to analyze all pairs or select the most promising ones
        const q1 = quantitativeQuestions[0];
        const q2 = quantitativeQuestions[1];

        const scatterViz = await createScatterPlot(q1, q2, rawData);
        visualizations.push(scatterViz);
    }

    // Generate stacked bar charts for categorical vs categorical
    if (categoricalQuestions.length >= 2) {
        const q1 = categoricalQuestions[0];
        const q2 = categoricalQuestions[1];

        const stackedBarViz = await createStackedBarChart(q1, q2, rawData);
        visualizations.push(stackedBarViz);
    }

    // Generate box plots for categorical vs numeric
    if (categoricalQuestions.length >= 1 && quantitativeQuestions.length >= 1) {
        const catQ = categoricalQuestions[0];
        const numQ = quantitativeQuestions[0];

        const boxPlotViz = await createBoxPlot(catQ, numQ, rawData);
        visualizations.push(boxPlotViz);
    }

    return visualizations;
};

/**
 * Create a scatter plot for two numeric questions
 * @param {Object} question1 - First question object
 * @param {Object} question2 - Second question object
 * @param {Array} rawData - The raw survey data
 * @returns {Object} - Scatter plot visualization object
 */
const createScatterPlot = async (question1, question2, rawData) => {
    try {
        // Extract data points where both questions have valid numeric values
        const dataPoints = [];

        for (const row of rawData) {
            const x = parseFloat(row[question1.field]);
            const y = parseFloat(row[question2.field]);

            if (!isNaN(x) && !isNaN(y)) {
                dataPoints.push({ x, y });
            }
        }

        // Even with 1 data point, we'll create a visualization
        if (dataPoints.length < 1) {
            // Instead of throwing an error, return a single point visualization
            dataPoints.push({ x: 0, y: 0 }); // Add default point if none exists
        }

        // Set up dimensions
        const margin = { top: 50, right: 50, bottom: 70, left: 70 };
        const width = 500 - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;

        // Create scales
        const x = d3
            .scaleLinear()
            .domain([
                d3.min(dataPoints, (d) => d.x) * 0.9,
                d3.max(dataPoints, (d) => d.x) * 1.1,
            ])
            .nice()
            .range([0, width]);

        const y = d3
            .scaleLinear()
            .domain([
                d3.min(dataPoints, (d) => d.y) * 0.9,
                d3.max(dataPoints, (d) => d.y) * 1.1,
            ])
            .nice()
            .range([height, 0]);

        // Create SVG
        const svg = d3
            .create("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .attr(
                "viewBox",
                `0 0 ${width + margin.left + margin.right} ${
                    height + margin.top + margin.bottom
                }`
            )
            .attr("style", "max-width: 100%; height: auto;");

        // Add title
        svg.append("text")
            .attr("x", (width + margin.left + margin.right) / 2)
            .attr("y", margin.top / 2)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("font-weight", "bold")
            .text(
                `${shortenText(question1.text, 30)} vs ${shortenText(
                    question2.text,
                    30
                )}`
            );

        // Create container group
        const g = svg
            .append("g")
            .attr("transform", `translate(${margin.left}, ${margin.top})`);

        // Add x-axis
        g.append("g")
            .attr("transform", `translate(0, ${height})`)
            .call(d3.axisBottom(x));

        // Add x-axis label
        g.append("text")
            .attr("x", width / 2)
            .attr("y", height + margin.bottom - 20)
            .attr("text-anchor", "middle")
            .text(shortenText(question1.text, 40));

        // Add y-axis
        g.append("g").call(d3.axisLeft(y));

        // Add y-axis label
        g.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", -margin.left + 20)
            .attr("x", -height / 2)
            .attr("text-anchor", "middle")
            .text(shortenText(question2.text, 40));

        // Add scatter points
        g.selectAll(".dot")
            .data(dataPoints)
            .enter()
            .append("circle")
            .attr("class", "dot")
            .attr("cx", (d) => x(d.x))
            .attr("cy", (d) => y(d.y))
            .attr("r", 5)
            .attr("fill", "#4C86AF")
            .attr("opacity", 0.7);

        // Calculate and add trend line
        if (dataPoints.length > 1) {
            // Simple linear regression
            const xValues = dataPoints.map((d) => d.x);
            const yValues = dataPoints.map((d) => d.y);

            const xMean = d3.mean(xValues);
            const yMean = d3.mean(yValues);

            let numerator = 0;
            let denominator = 0;

            for (let i = 0; i < dataPoints.length; i++) {
                numerator += (xValues[i] - xMean) * (yValues[i] - yMean);
                denominator += Math.pow(xValues[i] - xMean, 2);
            }

            const slope = denominator ? numerator / denominator : 0;
            const intercept = yMean - slope * xMean;

            // Calculate correlation coefficient
            let correlation = 0;
            if (dataPoints.length > 1) {
                const xSD = d3.deviation(xValues);
                const ySD = d3.deviation(yValues);

                if (xSD && ySD) {
                    correlation = numerator / (dataPoints.length * xSD * ySD);
                }
            }

            // Draw the trend line
            const line = d3
                .line()
                .x((d) => d)
                .y((d) => slope * d + intercept);

            g.append("path")
                .datum([x.domain()[0], x.domain()[1]])
                .attr("fill", "none")
                .attr("stroke", "#E63946")
                .attr("stroke-width", 2)
                .attr("d", line);

            // Add correlation info
            g.append("text")
                .attr("x", width - 10)
                .attr("y", 20)
                .attr("text-anchor", "end")
                .style("font-size", "12px")
                .text(`상관계수: ${correlation !== undefined && !isNaN(correlation) ? correlation.toFixed(3) : '0.000'}`);
        }

        // Create data summary for the visualization
        const correlationStrength = calculateCorrelationStrength(dataPoints);

        const dataSummary = [
            `데이터 포인트 수: ${dataPoints.length}`,
            `상관관계: ${correlationStrength.description}`,
            `${question1.text}의 범위: ${question1.summary && question1.summary.min !== undefined ? question1.summary.min.toFixed(2) : '0.00'}~${question1.summary && question1.summary.max !== undefined ? question1.summary.max.toFixed(2) : '0.00'}`,
            `${question2.text}의 범위: ${question2.summary && question2.summary.min !== undefined ? question2.summary.min.toFixed(2) : '0.00'}~${question2.summary && question2.summary.max !== undefined ? question2.summary.max.toFixed(2) : '0.00'}`,
        ];

        return {
            id: `viz_q_scatter_${question1.id}_${question2.id}`,
            title: `${shortenText(question1.text, 20)} vs ${shortenText(
                question2.text,
                20
            )} 관계`,
            description: `이 산점도는 ${question1.text}와(과) ${question2.text} 사이의 관계를 보여줍니다. ${correlationStrength.explanation}`,
            questionText: `${question1.text} / ${question2.text}`,
            chartType: "산점도",
            responseCount: dataPoints.length,
            svgContent: svg.node().outerHTML,
            dataSummary: dataSummary,
        };
    } catch (error) {
        console.error("산점도 생성 오류:", error);

        return {
            id: `viz_q_scatter_${question1.id}_${question2.id}`,
            title: `${shortenText(question1.text, 20)} vs ${shortenText(
                question2.text,
                20
            )} 관계 (오류)`,
            description: "산점도를 생성하는 중 오류가 발생했습니다.",
            questionText: `${question1.text} / ${question2.text}`,
            chartType: "산점도 (오류)",
            responseCount: 0,
            svgContent: createErrorSvg(),
            dataSummary: ["시각화를 생성할 수 없습니다."],
        };
    }
};

/**
 * Calculate correlation strength and description
 * @param {Array} dataPoints - Array of {x, y} data points
 * @returns {Object} - Correlation strength information
 */
const calculateCorrelationStrength = (dataPoints) => {
    // Simple correlation calculation
    const xValues = dataPoints.map((d) => d.x);
    const yValues = dataPoints.map((d) => d.y);

    const xMean = d3.mean(xValues);
    const yMean = d3.mean(yValues);

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < dataPoints.length; i++) {
        numerator += (xValues[i] - xMean) * (yValues[i] - yMean);
        denominator += Math.pow(xValues[i] - xMean, 2);
    }

    const xSD = d3.deviation(xValues);
    const ySD = d3.deviation(yValues);

    let correlation = 0;
    if (dataPoints.length > 1 && xSD && ySD) {
        correlation = numerator / (dataPoints.length * xSD * ySD);
    }

    // Interpret correlation
    const absCorrelation = Math.abs(correlation);
    let description = "";
    let explanation = "";

    if (absCorrelation < 0.1) {
        description = "상관관계 없음";
        explanation =
            "두 변수 사이에 유의미한 상관관계가 없는 것으로 보입니다.";
    } else if (absCorrelation < 0.3) {
        description = "약한 상관관계";
        explanation = "두 변수 사이에 약한 상관관계가 있습니다.";
    } else if (absCorrelation < 0.5) {
        description = "중간 정도의 상관관계";
        explanation = "두 변수 사이에 중간 정도의 상관관계가 있습니다.";
    } else if (absCorrelation < 0.7) {
        description = "상당한 상관관계";
        explanation = "두 변수 사이에 상당한 상관관계가 있습니다.";
    } else {
        description = "강한 상관관계";
        explanation = "두 변수 사이에 강한 상관관계가 있습니다.";
    }

    if (correlation > 0) {
        explanation +=
            " 양의 상관관계로, 하나의 값이 증가하면 다른 값도 증가하는 경향이 있습니다.";
    } else if (correlation < 0) {
        explanation +=
            " 음의 상관관계로, 하나의 값이 증가하면 다른 값은 감소하는 경향이 있습니다.";
    }

    return {
        value: correlation,
        description,
        explanation,
    };
};

/**
 * Create a stacked bar chart for two categorical questions
 * @param {Object} question1 - First question object
 * @param {Object} question2 - Second question object
 * @param {Array} rawData - The raw survey data
 * @returns {Object} - Stacked bar chart visualization object
 */
const createStackedBarChart = async (question1, question2, rawData) => {
    try {
        // Create a cross-tabulation of the two questions
        const crosstab = {};

        // Ensure we have unique values to work with
        const uniqueValues1 = question1.uniqueValues && question1.uniqueValues.length > 0 
            ? question1.uniqueValues 
            : ["응답 1"];
        
        const uniqueValues2 = question2.uniqueValues && question2.uniqueValues.length > 0 
            ? question2.uniqueValues 
            : ["응답 2"];

        // Initialize crosstab
        uniqueValues1.forEach((val1) => {
            crosstab[val1] = {};
            uniqueValues2.forEach((val2) => {
                crosstab[val1][val2] = 0;
            });
        });

        // Count co-occurrences
        rawData.forEach((row) => {
            const val1 = String(row[question1.field]);
            const val2 = String(row[question2.field]);

            if (val1 && val2 && crosstab[val1]) {
                crosstab[val1][val2] = (crosstab[val1][val2] || 0) + 1;
            }
        });

        // Convert to array format for D3
        const data = [];
        Object.keys(crosstab).forEach((val1) => {
            const entry = { category: val1 };
            Object.keys(crosstab[val1]).forEach((val2) => {
                entry[val2] = crosstab[val1][val2];
            });
            data.push(entry);
        });

        // Set up dimensions
        const margin = { top: 50, right: 130, bottom: 70, left: 70 };
        const width = 600 - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;

        // Create scales
        const x = d3
            .scaleBand()
            .domain(data.map((d) => d.category))
            .range([0, width])
            .padding(0.1);

        const y = d3
            .scaleLinear()
            .domain([
                0,
                d3.max(data, (d) => {
                    return d3.sum(uniqueValues2, (val2) => d[val2] || 0);
                }),
            ])
            .nice()
            .range([height, 0]);

        const color = d3
            .scaleOrdinal()
            .domain(uniqueValues2)
            .range(d3.schemeCategory10);

        // Create svg
        const svg = d3
            .create("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .attr(
                "viewBox",
                `0 0 ${width + margin.left + margin.right} ${
                    height + margin.top + margin.bottom
                }`
            )
            .attr("style", "max-width: 100%; height: auto;");

        // Add title
        svg.append("text")
            .attr("x", (width + margin.left + margin.right) / 2)
            .attr("y", margin.top / 2)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("font-weight", "bold")
            .text(
                `${shortenText(question1.text, 30)} vs ${shortenText(
                    question2.text,
                    30
                )}`
            );

        // Create container group
        const g = svg
            .append("g")
            .attr("transform", `translate(${margin.left}, ${margin.top})`);

        // Add legend
        const legend = g
            .append("g")
            .attr("transform", `translate(${width + 10}, 0)`);

        uniqueValues2.forEach((value, i) => {
            const legendRow = legend
                .append("g")
                .attr("transform", `translate(0, ${i * 20})`);

            legendRow
                .append("rect")
                .attr("width", 10)
                .attr("height", 10)
                .attr("fill", color(value));

            legendRow
                .append("text")
                .attr("x", 15)
                .attr("y", 9)
                .attr("dy", "0.01em")
                .style("font-size", "12px")
                .text(shortenText(value, 15));
        });

        // Add x-axis
        g.append("g")
            .attr("transform", `translate(0, ${height})`)
            .call(d3.axisBottom(x))
            .selectAll("text")
            .attr("transform", "rotate(-45)")
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", ".15em")
            .text((d) => shortenText(d, 10));

        // Add x-axis label
        g.append("text")
            .attr("x", width / 2)
            .attr("y", height + margin.bottom - 10)
            .attr("text-anchor", "middle")
            .text(shortenText(question1.text, 40));

        // Add y-axis
        g.append("g").call(d3.axisLeft(y).ticks(5));

        // Add y-axis label
        g.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", -margin.left + 20)
            .attr("x", -height / 2)
            .attr("text-anchor", "middle")
            .text("응답 수");

        // Create stack generator
        const stack = d3.stack().keys(uniqueValues2);

        // Get stack data
        const stackedData = stack(data);

        // Add bars
        g.selectAll(".series")
            .data(stackedData)
            .enter()
            .append("g")
            .attr("class", "series")
            .attr("fill", (d) => color(d.key))
            .selectAll("rect")
            .data((d) => d)
            .enter()
            .append("rect")
            .attr("x", (d) => x(d.data.category))
            .attr("y", (d) => y(d[1]))
            .attr("height", (d) => y(d[0]) - y(d[1]))
            .attr("width", x.bandwidth());

        // Create data summary
        const dataSummary = [
            `${question1.text}의 카테고리 수: ${uniqueValues1.length}`,
            `${question2.text}의 카테고리 수: ${uniqueValues2.length}`,
            `가장 많은 조합: ${findMostCommonCombination(
                crosstab,
                uniqueValues1,
                uniqueValues2
            )}`,
        ];

        return {
            id: `viz_q_stacked_${question1.id}_${question2.id}`,
            title: `${shortenText(question1.text, 20)} vs ${shortenText(
                question2.text,
                20
            )} 교차분석`,
            description: `이 누적 막대 차트는 ${question1.text}와(과) ${question2.text} 간의 관계를 보여줍니다. 각 막대는 ${question1.text}의 카테고리를 나타내며, 색상은 ${question2.text}의 카테고리를 나타냅니다.`,
            questionText: `${question1.text} / ${question2.text}`,
            chartType: "누적 막대 차트",
            responseCount: rawData.length,
            svgContent: svg.node().outerHTML,
            dataSummary: dataSummary,
        };
    } catch (error) {
        console.error("누적 막대 차트 생성 오류:", error);

        return {
            id: `viz_q_stacked_${question1.id}_${question2.id}`,
            title: `${shortenText(question1.text, 20)} vs ${shortenText(
                question2.text,
                20
            )} 교차분석 (오류)`,
            description: "누적 막대 차트를 생성하는 중 오류가 발생했습니다.",
            questionText: `${question1.text} / ${question2.text}`,
            chartType: "누적 막대 차트 (오류)",
            responseCount: 0,
            svgContent: createErrorSvg(),
            dataSummary: ["시각화를 생성할 수 없습니다."],
        };
    }
};

/**
 * Find the most common combination in a crosstab
 * @param {Object} crosstab - Crosstab object
 * @param {Array} values1 - Unique values for first variable
 * @param {Array} values2 - Unique values for second variable
 * @returns {string} - Description of most common combination
 */
const findMostCommonCombination = (crosstab, values1, values2) => {
    let maxCount = 0;
    let maxVal1 = "";
    let maxVal2 = "";

    values1.forEach((val1) => {
        values2.forEach((val2) => {
            const count = crosstab[val1]?.[val2] || 0;
            if (count > maxCount) {
                maxCount = count;
                maxVal1 = val1;
                maxVal2 = val2;
            }
        });
    });

    return `${shortenText(maxVal1, 15)} + ${shortenText(
        maxVal2,
        15
    )} (${maxCount}명)`;
};

/**
 * Create a box plot for categorical vs. numeric questions
 * @param {Object} catQuestion - Categorical question object
 * @param {Object} numQuestion - Numeric question object
 * @param {Array} rawData - The raw survey data
 * @returns {Object} - Box plot visualization object
 */
const createBoxPlot = async (catQuestion, numQuestion, rawData) => {
    try {
        // Group numeric values by categorical values
        const groups = {};

        // Use only top categories if there are too many
        const topCategories = catQuestion.summary.frequencies
            .slice(0, 8) // Limit to top 8 categories
            .map((freq) => freq.value);

        // Collect data by category
        rawData.forEach((row) => {
            const category = String(row[catQuestion.field]);
            const value = parseFloat(row[numQuestion.field]);

            if (topCategories.includes(category) && !isNaN(value)) {
                if (!groups[category]) {
                    groups[category] = [];
                }
                groups[category].push(value);
            }
        });

        // Compute statistics for each group
        const boxData = [];
        for (const category in groups) {
            const values = groups[category].sort((a, b) => a - b);

            if (values.length >= 5) {
                // Need enough data points for a meaningful box plot
                const q1 = d3.quantile(values, 0.25);
                const median = d3.quantile(values, 0.5);
                const q3 = d3.quantile(values, 0.75);
                const iqr = q3 - q1;
                const min = Math.max(d3.min(values), q1 - 1.5 * iqr);
                const max = Math.min(d3.max(values), q3 + 1.5 * iqr);

                // Find outliers (points outside the whiskers)
                const outliers = values.filter((v) => v < min || v > max);

                boxData.push({
                    category,
                    min,
                    q1,
                    median,
                    q3,
                    max,
                    outliers,
                    mean: d3.mean(values),
                });
            }
        }

        if (boxData.length === 0) {
            // Instead of throwing an error, create a fallback bar chart
            return createBarChart(catQuestion);
        }

        // Set up dimensions
        const margin = { top: 50, right: 50, bottom: 70, left: 70 };
        const width = 500 - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;

        // Create scales
        const x = d3
            .scaleBand()
            .domain(boxData.map((d) => d.category))
            .range([0, width])
            .padding(0.2);

        const y = d3
            .scaleLinear()
            .domain([
                d3.min(boxData, (d) => d.min) * 0.9,
                d3.max(boxData, (d) => d.max) * 1.1,
            ])
            .nice()
            .range([height, 0]);

        // Create SVG
        const svg = d3
            .create("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .attr(
                "viewBox",
                `0 0 ${width + margin.left + margin.right} ${
                    height + margin.top + margin.bottom
                }`
            )
            .attr("style", "max-width: 100%; height: auto;");

        // Add title
        svg.append("text")
            .attr("x", (width + margin.left + margin.right) / 2)
            .attr("y", margin.top / 2)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("font-weight", "bold")
            .text(
                `${shortenText(catQuestion.text, 30)} vs ${shortenText(
                    numQuestion.text,
                    30
                )}`
            );

        // Create container group
        const g = svg
            .append("g")
            .attr("transform", `translate(${margin.left}, ${margin.top})`);

        // Add x-axis
        g.append("g")
            .attr("transform", `translate(0, ${height})`)
            .call(d3.axisBottom(x))
            .selectAll("text")
            .attr("transform", "rotate(-45)")
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", ".15em")
            .text((d) => shortenText(d, 10));

        // Add x-axis label
        g.append("text")
            .attr("x", width / 2)
            .attr("y", height + margin.bottom - 10)
            .attr("text-anchor", "middle")
            .text(shortenText(catQuestion.text, 40));

        // Add y-axis
        g.append("g").call(d3.axisLeft(y));

        // Add y-axis label
        g.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", -margin.left + 20)
            .attr("x", -height / 2)
            .attr("text-anchor", "middle")
            .text(shortenText(numQuestion.text, 40));

        // Create box plot for each category
        boxData.forEach((box) => {
            const boxWidth = x.bandwidth();

            // Vertical line from min to max
            g.append("line")
                .attr("x1", x(box.category) + boxWidth / 2)
                .attr("x2", x(box.category) + boxWidth / 2)
                .attr("y1", y(box.min))
                .attr("y2", y(box.max))
                .attr("stroke", "#000")
                .attr("stroke-width", 1);

            // Box from Q1 to Q3
            g.append("rect")
                .attr("x", x(box.category))
                .attr("y", y(box.q3))
                .attr("width", boxWidth)
                .attr("height", y(box.q1) - y(box.q3))
                .attr("fill", "#69b3a2")
                .attr("stroke", "#000");

            // Median line
            g.append("line")
                .attr("x1", x(box.category))
                .attr("x2", x(box.category) + boxWidth)
                .attr("y1", y(box.median))
                .attr("y2", y(box.median))
                .attr("stroke", "#000")
                .attr("stroke-width", 2);

            // Top whisker
            g.append("line")
                .attr("x1", x(box.category) + boxWidth * 0.25)
                .attr("x2", x(box.category) + boxWidth * 0.75)
                .attr("y1", y(box.max))
                .attr("y2", y(box.max))
                .attr("stroke", "#000")
                .attr("stroke-width", 1);

            // Bottom whisker
            g.append("line")
                .attr("x1", x(box.category) + boxWidth * 0.25)
                .attr("x2", x(box.category) + boxWidth * 0.75)
                .attr("y1", y(box.min))
                .attr("y2", y(box.min))
                .attr("stroke", "#000")
                .attr("stroke-width", 1);

            // Outliers
            box.outliers.forEach((o) => {
                g.append("circle")
                    .attr(
                        "cx",
                        x(box.category) +
                            boxWidth / 2 +
                            (Math.random() - 0.5) * boxWidth * 0.5
                    )
                    .attr("cy", y(o))
                    .attr("r", 3)
                    .attr("fill", "red")
                    .attr("opacity", 0.7);
            });
        });

        // Create data summary
        const dataSummary = boxData.map(
            (box) =>
                `${shortenText(box.category, 15)}: 중앙값=${box.median !== undefined ? box.median.toFixed(2) : '0.00'}, 평균=${box.mean !== undefined ? box.mean.toFixed(2) : '0.00'}`
        );

        // Find category with highest median
        const highestMedian = boxData.reduce((prev, curr) =>
            prev.median > curr.median ? prev : curr
        );

        dataSummary.push(
            `가장 높은 중앙값: ${shortenText(
                highestMedian.category,
                15
            )} (${highestMedian && highestMedian.median !== undefined ? highestMedian.median.toFixed(2) : '0.00'})`
        );

        return {
            id: `viz_q_boxplot_${catQuestion.id}_${numQuestion.id}`,
            title: `${shortenText(catQuestion.text, 20)}에 따른 ${shortenText(
                numQuestion.text,
                20
            )} 분포`,
            description: `이 박스플롯은 ${catQuestion.text}의 각 카테고리에 따른 ${numQuestion.text}의 분포를 보여줍니다. 박스는 사분위수(25%, 50%, 75%)를 나타내며, 세로 선은 최소값과 최대값을 연결합니다.`,
            questionText: `${catQuestion.text} / ${numQuestion.text}`,
            chartType: "박스플롯",
            responseCount: rawData.length,
            svgContent: svg.node().outerHTML,
            dataSummary: dataSummary,
        };
    } catch (error) {
        console.error("박스플롯 생성 오류:", error);

        return {
            id: `viz_q_boxplot_${catQuestion.id}_${numQuestion.id}`,
            title: `${shortenText(catQuestion.text, 20)}에 따른 ${shortenText(
                numQuestion.text,
                20
            )} 분포 (오류)`,
            description: "박스플롯을 생성하는 중 오류가 발생했습니다.",
            questionText: `${catQuestion.text} / ${numQuestion.text}`,
            chartType: "박스플롯 (오류)",
            responseCount: 0,
            svgContent: createErrorSvg(),
            dataSummary: ["시각화를 생성할 수 없습니다."],
        };
    }
};

/**
 * Generate data summaries for different chart types
 */
const getPieChartSummary = (question) => {
    const data = question.summary.frequencies;

    // Find top categories
    const topCategory = data[0];
    const secondCategory = data[1];

    const total = data.reduce((sum, item) => sum + item.count, 0);

    return [
        `전체 응답 수: ${total}명`,
        `최다 응답: ${shortenText(topCategory.value, 20)} (${
            topCategory.count
        }명, ${topCategory && topCategory.percentage !== undefined ? topCategory.percentage.toFixed(1) : '0'}%)`,
        secondCategory
            ? `두 번째 응답: ${shortenText(secondCategory.value, 20)} (${
                  secondCategory.count
              }명, ${secondCategory && secondCategory.percentage !== undefined ? secondCategory.percentage.toFixed(1) : '0'}%)`
            : "",
        `총 카테고리 수: ${data.length}개`,
    ].filter(Boolean);
};

const getBarChartSummary = (question) => {
    return getPieChartSummary(question); // Same summary for bar charts
};

const getHistogramSummary = (question) => {
    const stats = question.summary;

    return [
        `최소값: ${stats && stats.min !== undefined ? stats.min.toFixed(2) : '0.00'}`,
        `최대값: ${stats && stats.max !== undefined ? stats.max.toFixed(2) : '0.00'}`,
        `평균: ${stats && stats.mean !== undefined ? stats.mean.toFixed(2) : '0.00'}`,
        `중앙값: ${stats && stats.median !== undefined ? stats.median.toFixed(2) : '0.00'}`,
        `표준편차: ${stats && stats.standardDeviation !== undefined ? stats.standardDeviation.toFixed(2) : '0.00'}`,
    ];
};

const getTreemapSummary = (question) => {
    return getPieChartSummary(question); // Similar to pie chart summary
};

const getWordCloudSummary = (question) => {
    const data = question.summary.frequencies.slice(0, 5);

    return [
        `가장 빈번한 응답: ${data
            .map((d) => shortenText(d.value, 15))
            .join(", ")}`,
        `고유 응답 수: ${question.uniqueValues.length}개`,
    ];
};

/**
 * Shorten text to a maximum length
 * @param {string} text - The text to shorten
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} - Shortened text
 */
const shortenText = (text, maxLength) => {
    if (!text) return "";
    text = String(text);
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + "...";
};

/**
 * Generate thematic visualizations based on content patterns
 * @param {Object} processedData - The processed survey data
 * @param {Object} dataContext - Data context information
 * @returns {Promise<Array>} - Array of thematic visualizations
 */
const generateThematicVisualizations = async (processedData, dataContext) => {
    try {
        const thematicVisualizations = [];
        
        // Create group-based visualizations based on related questions
        if (dataContext.questionGroups && dataContext.questionGroups.length > 0) {
            for (const group of dataContext.questionGroups) {
                if (group.relatedQuestions.length >= 2) {
                    // Find the questions in the processedData
                    const baseQuestion = processedData.questions.find(q => q.id === group.baseQuestion.id);
                    
                    if (baseQuestion) {
                        // Create a composite visualization that shows related questions together
                        const thematicViz = {
                            id: `viz_q_thematic_${baseQuestion.id}`,
                            title: `"${shortenText(baseQuestion.text, 30)}" 관련 통합 분석`,
                            description: `이 시각화는 "${baseQuestion.text}"와 관련된 ${group.relatedQuestions.length}개 질문의 응답 패턴을 통합하여 보여줍니다.`,
                            questionText: baseQuestion.text,
                            chartType: "주제별 통합 차트",
                            responseCount: baseQuestion.responseCount,
                            // For now, we'll use a placeholder SVG until we implement the actual thematic visualization
                            svgContent: createThematicPlaceholderSvg(baseQuestion, group),
                            dataSummary: [`${group.relatedQuestions.length}개의 관련 질문이 통합되었습니다.`]
                        };
                        
                        thematicVisualizations.push(thematicViz);
                    }
                }
            }
        }
        
        // Add visualizations for repeated terms across multiple questions
        if (dataContext.repeatedTerms && Object.keys(dataContext.repeatedTerms).length > 0) {
            // Get the top repeated terms (max 3)
            const topTerms = Object.entries(dataContext.repeatedTerms)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3);
                
            if (topTerms.length > 0) {
                // Create a term-based visualization
                const termViz = {
                    id: "viz_q_thematic_terms",
                    title: "주요 주제 통합 분석",
                    description: "이 시각화는 여러 질문에서 공통적으로 등장하는 주요 주제어를 중심으로 응답 패턴을 분석합니다.",
                    questionText: "여러 질문 통합",
                    chartType: "주제어 중심 분석",
                    responseCount: processedData.totalRows,
                    // Placeholder SVG until the actual implementation
                    svgContent: createTermBasedPlaceholderSvg(topTerms),
                    dataSummary: [`상위 ${topTerms.length}개 주제어가 분석되었습니다.`]
                };
                
                thematicVisualizations.push(termViz);
            }
        }
        
        return thematicVisualizations;
    } catch (error) {
        console.error("주제별 시각화 생성 중 오류:", error);
        return [];
    }
};

/**
 * Create a placeholder SVG for thematic visualization
 * @param {Object} baseQuestion - The base question
 * @param {Object} group - Group of related questions
 * @returns {string} - SVG content
 */
const createThematicPlaceholderSvg = (baseQuestion, group) => {
    const width = 500;
    const height = 400;
    
    // Create SVG
    const svg = d3
        .create("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("style", "max-width: 100%; height: auto;");
    
    // Add background for better visibility
    svg.append("rect")
        .attr("width", width)
        .attr("height", height)
        .attr("fill", "#f5f7fa");
    
    // Add title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", 30)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text(`${shortenText(baseQuestion.text, 40)} - 관련 질문 통합 분석`);
    
    // Add description
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", 60)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .text(`${group.relatedQuestions.length}개의 관련 질문이 함께 분석되었습니다.`);
    
    // List related questions
    const startY = 100;
    const lineHeight = 25;
    
    svg.append("text")
        .attr("x", 50)
        .attr("y", startY - lineHeight)
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .text("관련 질문 목록:");
    
    group.relatedQuestions.forEach((relQ, index) => {
        svg.append("text")
            .attr("x", 50)
            .attr("y", startY + index * lineHeight)
            .style("font-size", "12px")
            .text(`${index + 1}. ${shortenText(relQ.text || "관련 질문", 50)}`);
    });
    
    // Add note
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height - 30)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("font-style", "italic")
        .text("질문의 의미적 관계를 기반으로 한 통합 분석입니다.");
    
    return svg.node().outerHTML;
};

/**
 * Create a placeholder SVG for term-based visualization
 * @param {Array} topTerms - Array of top repeated terms
 * @returns {string} - SVG content
 */
const createTermBasedPlaceholderSvg = (topTerms) => {
    const width = 500;
    const height = 400;
    
    // Create SVG
    const svg = d3
        .create("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("style", "max-width: 100%; height: auto;");
    
    // Add background for better visibility
    svg.append("rect")
        .attr("width", width)
        .attr("height", height)
        .attr("fill", "#f0f5ff");
    
    // Add title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", 30)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text("주요 주제어 중심 통합 분석");
    
    // Add description
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", 60)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .text(`${topTerms.length}개의 주요 주제어를 중심으로 응답을 분석합니다.`);
    
    // Create circles for each term
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = 100;
    
    topTerms.forEach((term, i) => {
        const angle = (i / topTerms.length) * 2 * Math.PI;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        
        // Draw circle
        svg.append("circle")
            .attr("cx", x)
            .attr("cy", y)
            .attr("r", 30 + term[1] * 5) // Size based on frequency
            .attr("fill", d3.schemeCategory10[i % 10])
            .attr("opacity", 0.7);
        
        // Add term text
        svg.append("text")
            .attr("x", x)
            .attr("y", y)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .style("font-size", "12px")
            .style("font-weight", "bold")
            .style("fill", "white")
            .text(term[0]);
    });
    
    // Add connecting lines
    topTerms.forEach((term1, i) => {
        const angle1 = (i / topTerms.length) * 2 * Math.PI;
        const x1 = centerX + radius * Math.cos(angle1);
        const y1 = centerY + radius * Math.sin(angle1);
        
        topTerms.forEach((term2, j) => {
            if (i < j) {
                const angle2 = (j / topTerms.length) * 2 * Math.PI;
                const x2 = centerX + radius * Math.cos(angle2);
                const y2 = centerY + radius * Math.sin(angle2);
                
                svg.append("line")
                    .attr("x1", x1)
                    .attr("y1", y1)
                    .attr("x2", x2)
                    .attr("y2", y2)
                    .attr("stroke", "#999")
                    .attr("stroke-width", 1)
                    .attr("stroke-dasharray", "3,3")
                    .attr("opacity", 0.5);
            }
        });
    });
    
    // Add note
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height - 30)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("font-style", "italic")
        .text("여러 질문에서 반복되는 주제어를 기반으로 한 통합 분석입니다.");
    
    return svg.node().outerHTML;
};

export default {
    generateVisualizations,
};
