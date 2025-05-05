// src/services/textVisualizationService.js
import * as d3 from "d3";

/**
 * Analyzes text data to determine the appropriate visualization type
 * and generates visualization data
 */
export class TextAnalyzer {
  /**
   * Analyzes text content to determine appropriate visualization type
   * @param {string} text - The text content to analyze
   * @returns {Object} Analysis result with visualization type and extracted data
   */
  static analyzeText(text) {
    // Check if text contains data that looks like a list of metrics or statistics
    if (this.containsMetrics(text)) {
      return this.extractMetricsData(text);
    }
    
    // Check if text contains comparison data that could be visualized as a bar chart
    if (this.containsComparisons(text)) {
      return this.extractComparisonData(text);
    }
    
    // Check if text contains time-based data that could be visualized as a line chart
    if (this.containsTimeSeriesData(text)) {
      return this.extractTimeSeriesData(text);
    }
    
    // Check if text contains categorical data with frequencies
    if (this.containsCategoricalData(text)) {
      return this.extractCategoricalData(text);
    }
    
    // Check if text contains ranking data
    if (this.containsRankingData(text)) {
      return this.extractRankingData(text);
    }
    
    // Default to word cloud/text analysis for general text
    return {
      type: "wordcloud",
      data: this.extractWordFrequencies(text)
    };
  }
  
  /**
   * Checks if text contains metrics or statistics patterns
   * @param {string} text - The text to analyze
   * @returns {boolean} True if metrics patterns are found
   */
  static containsMetrics(text) {
    // Look for patterns like "X: Y%" or "X is Y%" or "X% of Y"
    const metricsPattern = /(\d+(\.\d+)?%)|(\w+\s*:\s*\d+(\.\d+)?%?)|(is\s+\d+(\.\d+)?%)/gi;
    const matches = text.match(metricsPattern) || [];
    return matches.length >= 3; // Need at least 3 metrics to make a chart worthwhile
  }
  
  /**
   * Extracts metrics data from text for visualization
   * @param {string} text - The text containing metrics
   * @returns {Object} Visualization data and type
   */
  static extractMetricsData(text) {
    // Split text into lines or sentences
    const lines = text.split(/[.;\n]+/).filter(line => line.trim().length > 0);
    
    const metrics = [];
    
    // Extract metrics from each line/sentence
    lines.forEach(line => {
      // Look for "Category: X%" or "Category is X%" patterns
      const metricMatch = line.match(/([^:]+):\s*(\d+(\.\d+)?%?)/i) || 
                          line.match(/([^.]+)\s+is\s+(\d+(\.\d+)?%?)/i) ||
                          line.match(/(\d+(\.\d+)?%)\s+of\s+([^.]+)/i);
      
      if (metricMatch) {
        let label, value;
        
        if (metricMatch[3] && metricMatch[1].includes("%")) {
          // Handle "X% of Y" format
          label = metricMatch[3].trim();
          value = parseFloat(metricMatch[1]);
        } else {
          // Handle "X: Y%" or "X is Y%" format
          label = metricMatch[1].trim();
          value = metricMatch[2].trim();
          
          // Convert percentage string to number if needed
          if (value.includes("%")) {
            value = parseFloat(value);
          } else {
            value = parseFloat(value);
          }
        }
        
        // Only add valid metrics with labels and values
        if (label && !isNaN(value)) {
          metrics.push({
            label: label,
            value: value
          });
        }
      }
    });
    
    // If we found metrics, determine best visualization
    if (metrics.length >= 2) {
      // If there are <= 5 categories, a pie chart might work well
      if (metrics.length <= 5) {
        return {
          type: "pieChart",
          data: metrics
        };
      } else {
        // Otherwise a bar chart is better for many categories
        return {
          type: "barChart",
          data: metrics.sort((a, b) => b.value - a.value) // Sort by value descending
        };
      }
    }
    
    // Fallback to word cloud if not enough metrics found
    return {
      type: "wordcloud",
      data: this.extractWordFrequencies(text)
    };
  }
  
  /**
   * Checks if text contains comparison data
   * @param {string} text - The text to analyze
   * @returns {boolean} True if comparison patterns are found
   */
  static containsComparisons(text) {
    // Look for comparison patterns like "X compared to Y" or "X vs Y"
    const comparisonPattern = /compared to|versus|vs\.?|higher than|lower than|more than|less than|greater than|better than|worse than/gi;
    const matches = text.match(comparisonPattern) || [];
    
    // Also check for bullet points with numbers
    const bulletPointPattern = /[•\-*]\s*.*?\d+/g;
    const bulletMatches = text.match(bulletPointPattern) || [];
    
    return matches.length >= 2 || bulletMatches.length >= 3;
  }
  
  /**
   * Extracts comparison data from text for visualization
   * @param {string} text - The text containing comparisons
   * @returns {Object} Visualization data and type
   */
  static extractComparisonData(text) {
    // Split text into lines or sentences
    const lines = text.split(/[.;\n]+/).filter(line => line.trim().length > 0);
    
    const comparisons = [];
    
    // Look for structured lists with bullets
    const bulletPattern = /[•\-*]\s*(.*?):\s*(\d+(\.\d+)?)/g;
    let bulletMatch;
    
    let hasBulletData = false;
    const bulletText = text.toString(); // Ensure it's a string
    
    while ((bulletMatch = bulletPattern.exec(bulletText)) !== null) {
      const label = bulletMatch[1].trim();
      const value = parseFloat(bulletMatch[2]);
      
      if (label && !isNaN(value)) {
        comparisons.push({
          label: label,
          value: value
        });
        hasBulletData = true;
      }
    }
    
    // If we didn't find bullet point data, try other comparison patterns
    if (!hasBulletData) {
      lines.forEach(line => {
        // Look for "X is Y% higher than Z" patterns
        const comparisonMatch = line.match(/([^.]+)\s+is\s+(\d+(\.\d+)?%?)\s+(higher|lower|more|less|greater|better|worse)\s+than\s+([^.]+)/i);
        
        if (comparisonMatch) {
          const item1 = comparisonMatch[1].trim();
          const item2 = comparisonMatch[5].trim();
          let value = parseFloat(comparisonMatch[2]);
          
          // Assume a relative comparison and set values accordingly
          if (comparisonMatch[4].match(/higher|more|greater|better/i)) {
            comparisons.push({ label: item1, value: 100 + value });
            comparisons.push({ label: item2, value: 100 });
          } else {
            comparisons.push({ label: item1, value: 100 - value });
            comparisons.push({ label: item2, value: 100 });
          }
        }
      });
    }
    
    // If we found comparison data, return a bar chart
    if (comparisons.length >= 2) {
      return {
        type: "barChart",
        data: comparisons.sort((a, b) => b.value - a.value) // Sort by value descending
      };
    }
    
    // Fallback to word cloud
    return {
      type: "wordcloud",
      data: this.extractWordFrequencies(text)
    };
  }
  
  /**
   * Checks if text contains time series data
   * @param {string} text - The text to analyze
   * @returns {boolean} True if time series patterns are found
   */
  static containsTimeSeriesData(text) {
    // Look for date/time patterns followed by numbers
    const timeSeriesPattern = /(in|during|by|from|since|year|month|quarter|week|day)s?\s+\d{4}|\d{4}\s*-\s*\d{4}|(\d{1,2}\/\d{1,2}\/\d{2,4})/gi;
    const matches = text.match(timeSeriesPattern) || [];
    
    // Also look for growth/trend language
    const trendPattern = /increase|decrease|growth|decline|trend|grew|rate|rose|fell|dropped/gi;
    const trendMatches = text.match(trendPattern) || [];
    
    return matches.length >= 2 || (matches.length >= 1 && trendMatches.length >= 2);
  }
  
  /**
   * Extracts time series data from text for visualization
   * @param {string} text - The text containing time series data
   * @returns {Object} Visualization data and type
   */
  static extractTimeSeriesData(text) {
    // Split text into lines or sentences
    const lines = text.split(/[.;\n]+/).filter(line => line.trim().length > 0);
    
    const timeData = [];
    
    // Look for year + value patterns
    const yearValuePattern = /(\d{4}).*?(\d+(\.\d+)?%?)/g;
    let yearMatch;
    
    const content = text.toString(); // Ensure it's a string
    
    while ((yearMatch = yearValuePattern.exec(content)) !== null) {
      const year = yearMatch[1].trim();
      let value = yearMatch[2].trim();
      
      // Convert percentage string to number if needed
      if (value.includes("%")) {
        value = parseFloat(value);
      } else {
        value = parseFloat(value);
      }
      
      if (year && !isNaN(value)) {
        timeData.push({
          label: year,
          value: value
        });
      }
    }
    
    // If we found time series data, return a line chart
    if (timeData.length >= 2) {
      // Sort by year/time ascending
      return {
        type: "lineChart",
        data: timeData.sort((a, b) => a.label.localeCompare(b.label))
      };
    }
    
    // Fallback to word cloud
    return {
      type: "wordcloud",
      data: this.extractWordFrequencies(text)
    };
  }
  
  /**
   * Checks if text contains categorical data with frequencies
   * @param {string} text - The text to analyze
   * @returns {boolean} True if categorical patterns are found
   */
  static containsCategoricalData(text) {
    // Look for patterns like "X% of respondents" or "X% said" or "X% selected"
    const categoryPattern = /(\d+(\.\d+)?%)\s+of\s+(respondents|participants|users|customers|people)|(selected|chose|reported|identified|said|mentioned|preferred)/gi;
    const matches = text.match(categoryPattern) || [];
    
    return matches.length >= 2;
  }
  
  /**
   * Extracts categorical data from text for visualization
   * @param {string} text - The text containing categorical data
   * @returns {Object} Visualization data and type
   */
  static extractCategoricalData(text) {
    // Split text into lines or sentences
    const lines = text.split(/[.;\n]+/).filter(line => line.trim().length > 0);
    
    const categories = [];
    
    lines.forEach(line => {
      // Look for "X% of respondents chose/said Y" patterns
      const percentPattern = /(\d+(\.\d+)?%)\s+of\s+(?:respondents|participants|users|customers|people)\s+(?:selected|chose|reported|identified|said|mentioned|preferred)\s+["']?([^"'.]+)["']?/i;
      const percentMatch = line.match(percentPattern);
      
      if (percentMatch) {
        const percent = parseFloat(percentMatch[1]);
        const category = percentMatch[3].trim();
        
        if (category && !isNaN(percent)) {
          categories.push({
            label: category,
            value: percent
          });
        }
      }
    });
    
    // If we found categorical data, determine best visualization
    if (categories.length >= 2) {
      // If there are <= 5 categories, a pie chart might work well
      if (categories.length <= 5) {
        return {
          type: "pieChart",
          data: categories
        };
      } else {
        // Otherwise a bar chart is better for many categories
        return {
          type: "barChart",
          data: categories.sort((a, b) => b.value - a.value) // Sort by value descending
        };
      }
    }
    
    // Fallback to word cloud
    return {
      type: "wordcloud",
      data: this.extractWordFrequencies(text)
    };
  }
  
  /**
   * Checks if text contains ranking data
   * @param {string} text - The text to analyze
   * @returns {boolean} True if ranking patterns are found
   */
  static containsRankingData(text) {
    // Look for ranking language
    const rankingPattern = /\b(top|ranked|ranking|score|rating|most|highest|first|second|third|fourth|fifth)\b/gi;
    const matches = text.match(rankingPattern) || [];
    
    // Look for numbered lists
    const numberedListPattern = /\b(\d+)\.\s+([^.0-9]+)/g;
    const numberedMatches = text.match(numberedListPattern) || [];
    
    return matches.length >= 3 || numberedMatches.length >= 3;
  }
  
  /**
   * Extracts ranking data from text for visualization
   * @param {string} text - The text containing ranking data
   * @returns {Object} Visualization data and type
   */
  static extractRankingData(text) {
    // Try to extract numbered lists like "1. Item", "2. Item"
    const numberedListPattern = /(\d+)\.\s+([^.0-9]+)/g;
    let match;
    const rankings = [];
    
    const content = text.toString(); // Ensure it's a string
    
    while ((match = numberedListPattern.exec(content)) !== null) {
      const rank = parseInt(match[1]);
      const item = match[2].trim();
      
      if (item && !isNaN(rank)) {
        rankings.push({
          label: item,
          value: 100 - (rank * 10) // Convert rank to a score (higher is better)
        });
      }
    }
    
    // If we didn't find a numbered list, look for "top X" type language
    if (rankings.length < 2) {
      // Split text into lines or sentences
      const lines = text.split(/[.;\n]+/).filter(line => line.trim().length > 0);
      
      lines.forEach(line => {
        // Look for "X is the top/highest/most..." patterns
        const topPattern = /([^.]+)\s+is\s+(?:the\s+)?(top|highest|most|best|leading|primary|key|major|significant|important)/i;
        const topMatch = line.match(topPattern);
        
        if (topMatch) {
          const item = topMatch[1].trim();
          // Assign an arbitrary high value to "top" items
          rankings.push({
            label: item,
            value: 90 + (Math.random() * 10) // Add some randomness to differentiate items
          });
        }
      });
    }
    
    // If we found ranking data, create a bar chart
    if (rankings.length >= 2) {
      return {
        type: "horizontalBarChart", // Horizontal bar chart is good for rankings
        data: rankings.sort((a, b) => b.value - a.value) // Sort by value descending
      };
    }
    
    // Fallback to word cloud
    return {
      type: "wordcloud",
      data: this.extractWordFrequencies(text)
    };
  }
  
  /**
   * Extracts word frequencies from text for word cloud visualization
   * @param {string} text - The text to analyze
   * @returns {Array} Word frequency data
   */
  static extractWordFrequencies(text) {
    // Remove common stop words
    const stopWords = new Set([
      "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", 
      "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being", 
      "below", "between", "both", "but", "by", "can't", "cannot", "could", "couldn't", 
      "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during", 
      "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't", "have", 
      "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here", "here's", 
      "hers", "herself", "him", "himself", "his", "how", "how's", "i", "i'd", "i'll", 
      "i'm", "i've", "if", "in", "into", "is", "isn't", "it", "it's", "its", "itself", 
      "let's", "me", "more", "most", "mustn't", "my", "myself", "no", "nor", "not", 
      "of", "off", "on", "once", "only", "or", "other", "ought", "our", "ours", 
      "ourselves", "out", "over", "own", "same", "shan't", "she", "she'd", "she'll", 
      "she's", "should", "shouldn't", "so", "some", "such", "than", "that", "that's", 
      "the", "their", "theirs", "them", "themselves", "then", "there", "there's", 
      "these", "they", "they'd", "they'll", "they're", "they've", "this", "those", 
      "through", "to", "too", "under", "until", "up", "very", "was", "wasn't", "we", 
      "we'd", "we'll", "we're", "we've", "were", "weren't", "what", "what's", "when", 
      "when's", "where", "where's", "which", "while", "who", "who's", "whom", "why", 
      "why's", "with", "won't", "would", "wouldn't", "you", "you'd", "you'll", "you're", 
      "you've", "your", "yours", "yourself", "yourselves"
    ]);
    
    // Extract words and count frequencies
    const words = text.toLowerCase()
                     .replace(/[^\w\s]/g, '') // Remove punctuation
                     .split(/\s+/) // Split on whitespace
                     .filter(word => word.length > 3 && !stopWords.has(word)); // Filter stop words and short words
    
    const wordFreq = {};
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });
    
    // Convert to array of {text, value} objects and sort by frequency
    return Object.keys(wordFreq)
      .map(word => ({
        text: word,
        value: wordFreq[word]
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 50); // Limit to top 50 words
  }
}

/**
 * Generates SVG visualizations from text analysis results
 */
export class VisualizationGenerator {
  /**
   * Generate a visualization SVG based on text analysis
   * @param {Object} analysisResult - The text analysis result
   * @param {number} width - The width of the SVG
   * @param {number} height - The height of the SVG
   * @returns {string} The SVG markup as a string
   */
  static generateVisualization(analysisResult, width = 500, height = 400) {
    switch (analysisResult.type) {
      case "pieChart":
        return this.generatePieChart(analysisResult.data, width, height);
      case "barChart":
        return this.generateBarChart(analysisResult.data, width, height);
      case "horizontalBarChart":
        return this.generateHorizontalBarChart(analysisResult.data, width, height);
      case "lineChart":
        return this.generateLineChart(analysisResult.data, width, height);
      case "wordcloud":
        return this.generateWordCloud(analysisResult.data, width, height);
      default:
        return this.generateWordCloud(analysisResult.data, width, height);
    }
  }
  
  /**
   * Generate a pie chart SVG
   * @param {Array} data - The data for the pie chart
   * @param {number} width - The width of the SVG
   * @param {number} height - The height of the SVG
   * @returns {string} The SVG markup as a string
   */
  static generatePieChart(data, width, height) {
    // Set up dimensions
    const radius = Math.min(width, height) / 2 - 40;
    
    // Create SVG
    const svg = d3.create("svg")
                  .attr("width", width)
                  .attr("height", height)
                  .attr("viewBox", `0 0 ${width} ${height}`)
                  .attr("style", "max-width: 100%; height: auto;");
    
    // Add background
    svg.append("rect")
       .attr("width", width)
       .attr("height", height)
       .attr("fill", "#f8f9fa");
    
    // Create color scale
    const color = d3.scaleOrdinal(d3.schemeCategory10);
    
    // Create pie layout
    const pie = d3.pie()
                  .value(d => d.value)
                  .sort(null);
    
    // Create arc generator
    const arc = d3.arc()
                  .innerRadius(0)
                  .outerRadius(radius);
    
    // Create outer arc for labels
    const outerArc = d3.arc()
                       .innerRadius(radius * 0.9)
                       .outerRadius(radius * 0.9);
    
    // Create group element and translate to center
    const g = svg.append("g")
                 .attr("transform", `translate(${width / 2}, ${height / 2})`);
    
    // Generate pie slices
    const arcs = g.selectAll(".arc")
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
    arcs.append("text")
        .attr("transform", d => {
          const pos = outerArc.centroid(d);
          const midAngle = d.startAngle + (d.endAngle - d.startAngle) / 2;
          pos[0] = radius * 0.99 * (midAngle < Math.PI ? 1 : -1);
          return `translate(${pos})`;
        })
        .attr("dy", ".35em")
        .style("text-anchor", d => {
          const midAngle = d.startAngle + (d.endAngle - d.startAngle) / 2;
          return midAngle < Math.PI ? "start" : "end";
        })
        .text(d => {
          // Truncate long labels
          const label = d.data.label.length > 15 
                      ? d.data.label.substring(0, 13) + "..."
                      : d.data.label;
          return `${label} (${typeof d.data.value === 'number' && d.data.value.toString().includes('.') 
                             ? d.data.value.toFixed(1) 
                             : d.data.value}${d.data.value.toString().includes('%') ? '' : '%'})`;
        })
        .style("font-size", "12px")
        .style("fill", "#333");
    
    // Add polylines between arcs and labels
    arcs.append("polyline")
        .attr("points", d => {
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
       .text("텍스트 분석 결과");
    
    return svg.node().outerHTML;
  }
  
  /**
   * Generate a bar chart SVG
   * @param {Array} data - The data for the bar chart
   * @param {number} width - The width of the SVG
   * @param {number} height - The height of the SVG
   * @returns {string} The SVG markup as a string
   */
  static generateBarChart(data, width, height) {
    // Set up margins
    const margin = { top: 40, right: 30, bottom: 90, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Create SVG
    const svg = d3.create("svg")
                  .attr("width", width)
                  .attr("height", height)
                  .attr("viewBox", `0 0 ${width} ${height}`)
                  .attr("style", "max-width: 100%; height: auto;");
    
    // Add background
    svg.append("rect")
       .attr("width", width)
       .attr("height", height)
       .attr("fill", "#f8f9fa");
    
    // Create scales
    const x = d3.scaleBand()
                .domain(data.map(d => d.label))
                .range([0, innerWidth])
                .padding(0.1);
    
    const y = d3.scaleLinear()
                .domain([0, d3.max(data, d => d.value) * 1.1])
                .nice()
                .range([innerHeight, 0]);
    
    // Create container group and translate to respect margins
    const g = svg.append("g")
                 .attr("transform", `translate(${margin.left}, ${margin.top})`);
    
    // Add x-axis
    g.append("g")
     .attr("transform", `translate(0, ${innerHeight})`)
     .call(d3.axisBottom(x))
     .selectAll("text")
     .attr("transform", "rotate(-45)")
     .style("text-anchor", "end")
     .attr("dx", "-.8em")
     .attr("dy", ".15em")
     .text(d => d.length > 15 ? d.substring(0, 13) + "..." : d);
    
    // Add y-axis
    g.append("g")
     .call(d3.axisLeft(y).ticks(5));
    
    // Add y-axis label
    g.append("text")
     .attr("transform", "rotate(-90)")
     .attr("y", -margin.left + 15)
     .attr("x", -innerHeight / 2)
     .attr("dy", "1em")
     .style("text-anchor", "middle")
     .text("값");
    
    // Add bars
    g.selectAll(".bar")
     .data(data)
     .enter()
     .append("rect")
     .attr("class", "bar")
     .attr("x", d => x(d.label))
     .attr("y", d => y(d.value))
     .attr("width", x.bandwidth())
     .attr("height", d => innerHeight - y(d.value))
     .attr("fill", "#4C86AF");
    
    // Add value labels on top of bars
    g.selectAll(".bar-label")
     .data(data)
     .enter()
     .append("text")
     .attr("class", "bar-label")
     .attr("x", d => x(d.label) + x.bandwidth() / 2)
     .attr("y", d => y(d.value) - 5)
     .attr("text-anchor", "middle")
     .text(d => d.value.toString().includes('.') ? d.value.toFixed(1) : d.value)
     .style("font-size", "12px");
    
    // Add title
    svg.append("text")
       .attr("x", width / 2)
       .attr("y", margin.top / 2)
       .attr("text-anchor", "middle")
       .style("font-size", "16px")
       .style("font-weight", "bold")
       .text("텍스트 분석 결과");
    
    return svg.node().outerHTML;
  }
  
  /**
   * Generate a horizontal bar chart SVG (good for rankings)
   * @param {Array} data - The data for the horizontal bar chart
   * @param {number} width - The width of the SVG
   * @param {number} height - The height of the SVG
   * @returns {string} The SVG markup as a string
   */
  static generateHorizontalBarChart(data, width, height) {
    // Set up margins
    const margin = { top: 40, right: 30, bottom: 40, left: 150 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Limit to top 8 items for readability
    const limitedData = data.slice(0, 8);
    
    // Create SVG
    const svg = d3.create("svg")
                  .attr("width", width)
                  .attr("height", height)
                  .attr("viewBox", `0 0 ${width} ${height}`)
                  .attr("style", "max-width: 100%; height: auto;");
    
    // Add background
    svg.append("rect")
       .attr("width", width)
       .attr("height", height)
       .attr("fill", "#f8f9fa");
    
    // Create scales
    const y = d3.scaleBand()
                .domain(limitedData.map(d => d.label))
                .range([0, innerHeight])
                .padding(0.1);
    
    const x = d3.scaleLinear()
                .domain([0, d3.max(limitedData, d => d.value) * 1.1])
                .nice()
                .range([0, innerWidth]);
    
    // Create container group and translate to respect margins
    const g = svg.append("g")
                 .attr("transform", `translate(${margin.left}, ${margin.top})`);
    
    // Add y-axis (categories)
    g.append("g")
     .call(d3.axisLeft(y))
     .selectAll("text")
     .text(d => d.length > 20 ? d.substring(0, 18) + "..." : d);
    
    // Add x-axis (values)
    g.append("g")
     .attr("transform", `translate(0, ${innerHeight})`)
     .call(d3.axisBottom(x).ticks(5));
    
    // Add x-axis label
    g.append("text")
     .attr("x", innerWidth / 2)
     .attr("y", innerHeight + 35)
     .attr("text-anchor", "middle")
     .text("점수");
    
    // Add bars
    g.selectAll(".bar")
     .data(limitedData)
     .enter()
     .append("rect")
     .attr("class", "bar")
     .attr("y", d => y(d.label))
     .attr("x", 0)
     .attr("height", y.bandwidth())
     .attr("width", d => x(d.value))
     .attr("fill", "#6A89CC");
    
    // Add value labels at the end of bars
    g.selectAll(".bar-label")
     .data(limitedData)
     .enter()
     .append("text")
     .attr("class", "bar-label")
     .attr("y", d => y(d.label) + y.bandwidth() / 2)
     .attr("x", d => x(d.value) + 5)
     .attr("dominant-baseline", "middle")
     .attr("text-anchor", "start")
     .text(d => d.value.toString().includes('.') ? d.value.toFixed(1) : d.value)
     .style("font-size", "12px");
    
    // Add title
    svg.append("text")
       .attr("x", width / 2)
       .attr("y", margin.top / 2)
       .attr("text-anchor", "middle")
       .style("font-size", "16px")
       .style("font-weight", "bold")
       .text("순위 분석 결과");
    
    return svg.node().outerHTML;
  }
  
  /**
   * Generate a line chart SVG
   * @param {Array} data - The data for the line chart
   * @param {number} width - The width of the SVG
   * @param {number} height - The height of the SVG
   * @returns {string} The SVG markup as a string
   */
  static generateLineChart(data, width, height) {
    // Set up margins
    const margin = { top: 40, right: 30, bottom: 50, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Create SVG
    const svg = d3.create("svg")
                  .attr("width", width)
                  .attr("height", height)
                  .attr("viewBox", `0 0 ${width} ${height}`)
                  .attr("style", "max-width: 100%; height: auto;");
    
    // Add background
    svg.append("rect")
       .attr("width", width)
       .attr("height", height)
       .attr("fill", "#f8f9fa");
    
    // Create scales
    const x = d3.scaleBand()
                .domain(data.map(d => d.label))
                .range([0, innerWidth])
                .padding(0.1);
    
    const y = d3.scaleLinear()
                .domain([0, d3.max(data, d => d.value) * 1.1])
                .nice()
                .range([innerHeight, 0]);
    
    // Create container group and translate to respect margins
    const g = svg.append("g")
                 .attr("transform", `translate(${margin.left}, ${margin.top})`);
    
    // Add x-axis
    g.append("g")
     .attr("transform", `translate(0, ${innerHeight})`)
     .call(d3.axisBottom(x))
     .selectAll("text")
     .style("text-anchor", "middle");
    
    // Add x-axis label
    g.append("text")
     .attr("x", innerWidth / 2)
     .attr("y", innerHeight + margin.bottom - 10)
     .attr("text-anchor", "middle")
     .text("시간");
    
    // Add y-axis
    g.append("g")
     .call(d3.axisLeft(y).ticks(5));
    
    // Add y-axis label
    g.append("text")
     .attr("transform", "rotate(-90)")
     .attr("y", -margin.left + 15)
     .attr("x", -innerHeight / 2)
     .attr("dy", "1em")
     .style("text-anchor", "middle")
     .text("값");
    
    // Add line
    const line = d3.line()
                   .x(d => x(d.label) + x.bandwidth() / 2)
                   .y(d => y(d.value));
    
    g.append("path")
     .datum(data)
     .attr("fill", "none")
     .attr("stroke", "#E63946")
     .attr("stroke-width", 2)
     .attr("d", line);
    
    // Add data points
    g.selectAll(".data-point")
     .data(data)
     .enter()
     .append("circle")
     .attr("class", "data-point")
     .attr("cx", d => x(d.label) + x.bandwidth() / 2)
     .attr("cy", d => y(d.value))
     .attr("r", 5)
     .attr("fill", "#E63946");
    
    // Add data labels
    g.selectAll(".data-label")
     .data(data)
     .enter()
     .append("text")
     .attr("class", "data-label")
     .attr("x", d => x(d.label) + x.bandwidth() / 2)
     .attr("y", d => y(d.value) - 10)
     .attr("text-anchor", "middle")
     .text(d => d.value.toString().includes('.') ? d.value.toFixed(1) : d.value)
     .style("font-size", "12px");
    
    // Add title
    svg.append("text")
       .attr("x", width / 2)
       .attr("y", margin.top / 2)
       .attr("text-anchor", "middle")
       .style("font-size", "16px")
       .style("font-weight", "bold")
       .text("시간별 추이 분석");
    
    return svg.node().outerHTML;
  }
  
  /**
   * Generate a word cloud SVG
   * @param {Array} data - The data for the word cloud
   * @param {number} width - The width of the SVG
   * @param {number} height - The height of the SVG
   * @returns {string} The SVG markup as a string
   */
  static generateWordCloud(data, width, height) {
    // Create SVG
    const svg = d3.create("svg")
                  .attr("width", width)
                  .attr("height", height)
                  .attr("viewBox", `0 0 ${width} ${height}`)
                  .attr("style", "max-width: 100%; height: auto;");
    
    // Add background
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
       .text("텍스트 키워드 분석");
    
    // Limit to top 25 words
    const limitedData = data.slice(0, 25);
    
    // Create color scale
    const color = d3.scaleOrdinal(d3.schemeCategory10);
    
    // Create simple grid layout
    const gridSize = Math.ceil(Math.sqrt(limitedData.length));
    const cellWidth = width / (gridSize + 1);
    const cellHeight = (height - 60) / (gridSize + 1);
    
    // Center coordinates
    const startX = cellWidth / 2;
    const startY = 60 + cellHeight / 2;
    
    // Create positions grid
    const positions = [];
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        positions.push({
          x: startX + j * cellWidth,
          y: startY + i * cellHeight
        });
      }
    }
    
    // Shuffle positions for more natural appearance
    const shuffledPositions = this.shuffleArray([...positions]);
    
    // Add words
    limitedData.forEach((d, i) => {
      if (i >= shuffledPositions.length) return;
      
      const position = shuffledPositions[i];
      
      // Add small jitter for more natural appearance
      const jitterX = (Math.random() - 0.5) * (cellWidth * 0.3);
      const jitterY = (Math.random() - 0.5) * (cellHeight * 0.3);
      
      // Scale font size based on word frequency
      const fontSize = Math.max(12, Math.min(30, 12 + Math.sqrt(d.value) * 2));
      
      svg.append("text")
         .attr("x", position.x + jitterX)
         .attr("y", position.y + jitterY)
         .attr("text-anchor", "middle")
         .attr("dominant-baseline", "middle")
         .style("font-size", `${fontSize}px`)
         .style("font-weight", i < 5 ? "bold" : "normal")
         .style("fill", color(i % 10))
         .text(d.text);
    });
    
    return svg.node().outerHTML;
  }
  
  /**
   * Shuffle an array using Fisher-Yates algorithm
   * @param {Array} array - The array to shuffle
   * @returns {Array} - Shuffled array
   */
  static shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}

/**
 * Main service function to generate visualizations from text
 * @param {string} text - The text to analyze and visualize
 * @param {number} width - The width of the SVG
 * @param {number} height - The height of the SVG
 * @returns {Object} - Visualization result with SVG and metadata
 */
export const generateVisualizationFromText = (text, width = 500, height = 400) => {
  try {
    // Analyze the text to determine visualization type and extract data
    const analysisResult = TextAnalyzer.analyzeText(text);
    
    // Generate the SVG visualization
    const svgContent = VisualizationGenerator.generateVisualization(
      analysisResult,
      width,
      height
    );
    
    return {
      success: true,
      type: analysisResult.type,
      svgContent: svgContent,
      data: analysisResult.data
    };
  } catch (error) {
    console.error("텍스트 시각화 생성 오류:", error);
    
    return {
      success: false,
      error: error.message
    };
  }
};

export default {
  TextAnalyzer,
  VisualizationGenerator,
  generateVisualizationFromText
};