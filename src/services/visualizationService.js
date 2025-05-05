// src/services/visualizationService.js
import * as d3 from "d3";

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

        // Generate visualizations for each question
        for (const question of processedData.questions) {
            // Skip questions with too few responses
            if (question.responseCount < 3) continue;

            // Determine the best visualization type for this question
            const vizType = determineVisualizationType(question);

            if (vizType) {
                const visualization = await createVisualization(
                    question,
                    processedData.rawData,
                    vizType
                );

                visualizations.push(visualization);
            }
        }

        // Add relationship visualizations if there are multiple appropriate questions
        const relationshipViz = await generateRelationshipVisualizations(
            processedData.questions,
            processedData.rawData
        );

        return [...visualizations, ...relationshipViz];
    } catch (error) {
        console.error("시각화 생성 중 오류:", error);
        throw error;
    }
};

/**
 * Determine the most appropriate visualization type for a question
 * @param {Object} question - The question object
 * @returns {string|null} - Visualization type or null if not visualizable
 */
const determineVisualizationType = (question) => {
    const { type, uniqueValues, responseCount } = question;

    switch (type) {
        case "multiple_choice":
            // For multiple choice with few options, use pie chart or bar chart
            if (uniqueValues.length <= 5) {
                return "pie";
            } else if (uniqueValues.length <= 15) {
                return "bar";
            } else {
                return "treemap";
            }

        case "rating":
            // For rating scales, use bar charts or histograms
            return "bar";

        case "numeric":
            // For numeric data, use histograms or box plots
            return "histogram";

        case "categorical":
            // For categorical with many values, use bar charts
            if (uniqueValues.length <= 15) {
                return "bar";
            } else if (uniqueValues.length <= 30) {
                return "treemap";
            } else {
                return "wordcloud";
            }

        case "text":
            // Text data is difficult to visualize directly
            return "wordcloud";

        default:
            return null;
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

            default:
                svgContent = createBarChart(question); // Default to bar chart
                chartType = "막대 차트";
                dataSummary = getBarChartSummary(question);
        }

        return {
            id: `viz_${question.id}`,
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
            id: `viz_${question.id}`,
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
            return `${label} (${d.data.percentage.toFixed(1)}%)`;
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

    if (numericValues.length === 0) {
        return createBarChart(question); // Fall back to bar chart if no numeric values
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

    // Add title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", 30)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text(shortenText(question.text, 60));

    // Get frequencies (limit to top 25)
    const data = question.summary.frequencies.slice(0, 25).map((d) => ({
        text: d.value,
        size: Math.sqrt(d.count) * 10 + 10, // Scale font size based on count
        count: d.count,
    }));

    // Basic positioning (random placement)
    // In a real app, use a proper word cloud layout algorithm to avoid overlaps
    const positions = [];
    const centerX = width / 2;
    const centerY = height / 2;

    // Create a color scale
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    // Add the words
    const wordGroup = svg
        .append("g")
        .attr("transform", `translate(${centerX}, ${centerY})`);

    data.forEach((d, i) => {
        // Simple spiral layout (not collision-free)
        const angle = (i / data.length) * 2 * Math.PI;
        const radius = 100 * (1 - Math.pow(0.9, i)); // Spiral radius
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);

        wordGroup
            .append("text")
            .attr("x", x)
            .attr("y", y)
            .attr("text-anchor", "middle")
            .style("font-size", `${d.size}px`)
            .style("font-family", "Arial")
            .style("font-weight", "bold")
            .style("fill", color(i))
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
 * @returns {Promise<Array>} - Array of relationship visualization objects
 */
const generateRelationshipVisualizations = async (questions, rawData) => {
    const visualizations = [];

    // Filter questions that are suitable for correlation analysis
    const quantitativeQuestions = questions.filter(
        (q) =>
            (q.type === "numeric" || q.type === "rating") && q.responseCount > 5
    );

    const categoricalQuestions = questions.filter(
        (q) =>
            (q.type === "multiple_choice" || q.type === "categorical") &&
            q.uniqueValues.length <= 10 &&
            q.responseCount > 5
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

        if (dataPoints.length < 5) {
            throw new Error("Not enough valid data points for scatter plot");
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
                .text(`상관계수: ${correlation.toFixed(3)}`);
        }

        // Create data summary for the visualization
        const correlationStrength = calculateCorrelationStrength(dataPoints);

        const dataSummary = [
            `데이터 포인트 수: ${dataPoints.length}`,
            `상관관계: ${correlationStrength.description}`,
            `${question1.text}의 범위: ${question1.summary.min.toFixed(
                2
            )}~${question1.summary.max.toFixed(2)}`,
            `${question2.text}의 범위: ${question2.summary.min.toFixed(
                2
            )}~${question2.summary.max.toFixed(2)}`,
        ];

        return {
            id: `viz_scatter_${question1.id}_${question2.id}`,
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
            id: `viz_scatter_${question1.id}_${question2.id}`,
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

        // Collect all unique values for both questions
        const uniqueValues1 = question1.uniqueValues;
        const uniqueValues2 = question2.uniqueValues;

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
            id: `viz_stacked_${question1.id}_${question2.id}`,
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
            id: `viz_stacked_${question1.id}_${question2.id}`,
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
            throw new Error("Not enough valid data for box plot");
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
                `${shortenText(box.category, 15)}: 중앙값=${box.median.toFixed(
                    2
                )}, 평균=${box.mean.toFixed(2)}`
        );

        // Find category with highest median
        const highestMedian = boxData.reduce((prev, curr) =>
            prev.median > curr.median ? prev : curr
        );

        dataSummary.push(
            `가장 높은 중앙값: ${shortenText(
                highestMedian.category,
                15
            )} (${highestMedian.median.toFixed(2)})`
        );

        return {
            id: `viz_boxplot_${catQuestion.id}_${numQuestion.id}`,
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
            id: `viz_boxplot_${catQuestion.id}_${numQuestion.id}`,
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
        }명, ${topCategory.percentage.toFixed(1)}%)`,
        secondCategory
            ? `두 번째 응답: ${shortenText(secondCategory.value, 20)} (${
                  secondCategory.count
              }명, ${secondCategory.percentage.toFixed(1)}%)`
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
        `최소값: ${stats.min.toFixed(2)}`,
        `최대값: ${stats.max.toFixed(2)}`,
        `평균: ${stats.mean.toFixed(2)}`,
        `중앙값: ${stats.median.toFixed(2)}`,
        `표준편차: ${stats.standardDeviation.toFixed(2)}`,
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

export default {
    generateVisualizations,
};
