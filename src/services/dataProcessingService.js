// src/services/dataProcessingService.js
import Papa from "papaparse";
import * as XLSX from "xlsx";

/**
 * Process uploaded CSV or Excel file
 * @param {File} file - The uploaded file
 * @returns {Promise<Object>} - Processed data object
 */
export const processDataFile = async (file) => {
    try {
        const fileType = getFileType(file);

        if (fileType === "csv") {
            return processCsvFile(file);
        } else if (fileType === "excel") {
            return processExcelFile(file);
        } else {
            throw new Error("지원되지 않는 파일 형식입니다.");
        }
    } catch (error) {
        console.error("파일 처리 중 오류:", error);
        throw error;
    }
};

/**
 * Determine the file type based on extension
 * @param {File} file - The file to check
 * @returns {string} - 'csv', 'excel', or 'unknown'
 */
const getFileType = (file) => {
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith(".csv")) {
        return "csv";
    } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
        return "excel";
    } else {
        return "unknown";
    }
};

/**
 * Process CSV file using PapaParse
 * @param {File} file - The CSV file
 * @returns {Promise<Object>} - Processed data
 */
const processCsvFile = (file) => {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (results) => {
                try {
                    const processedData = analyzeData(
                        results.data,
                        results.meta
                    );
                    resolve(processedData);
                } catch (err) {
                    reject(err);
                }
            },
            error: (error) => {
                reject(error);
            },
        });
    });
};

/**
 * Process Excel file using SheetJS
 * @param {File} file - The Excel file
 * @returns {Promise<Object>} - Processed data
 */
const processExcelFile = async (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, {
                    type: "array",
                    cellDates: true,
                });

                // Get the first sheet
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                // Convert to JSON
                const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                    header: 1,
                });

                // Process the data (assuming first row is headers)
                const headers = jsonData[0];
                const rows = jsonData.slice(1);

                // Convert to array of objects
                const formattedData = rows.map((row) => {
                    const obj = {};
                    headers.forEach((header, index) => {
                        obj[header] = row[index];
                    });
                    return obj;
                });

                // Analyze and structure the data
                const processedData = analyzeData(formattedData, {
                    fields: headers,
                });
                resolve(processedData);
            } catch (err) {
                reject(err);
            }
        };

        reader.onerror = () => {
            reject(new Error("파일을 읽는 중 오류가 발생했습니다."));
        };

        reader.readAsArrayBuffer(file);
    });
};

/**
 * Analyze survey data and identify question types
 * @param {Array} data - The raw data array
 * @param {Object} meta - Metadata from parsing
 * @returns {Object} - Structured data with question types and stats
 */
const analyzeData = (data, meta) => {
    if (!data || data.length === 0) {
        throw new Error("파일에 데이터가 없습니다.");
    }

    const questions = [];
    const fields = meta.fields || Object.keys(data[0]);

    // Analyze each field/column (question)
    fields.forEach((field) => {
        // Skip fields that appear to be IDs or timestamps
        if (
            field.toLowerCase().includes("id") ||
            field.toLowerCase().includes("timestamp") ||
            field.toLowerCase().includes("time_stamp")
        ) {
            return;
        }

        // Get all non-null values for this field
        const values = data
            .map((row) => row[field])
            .filter((val) => val !== null && val !== undefined && val !== "");

        if (values.length === 0) return; // Skip empty columns

        // Determine question type and structure question data
        const questionType = determineQuestionType(values);
        const questionData = {
            id: generateQuestionId(field),
            field: field,
            text: formatQuestionText(field),
            type: questionType,
            valueType: getValueType(values),
            uniqueValues: getUniqueValues(values),
            responseCount: values.length,
            summary: summarizeValues(values, questionType),
        };

        questions.push(questionData);
    });

    return {
        totalRows: data.length,
        questions: questions,
        rawData: data,
    };
};

/**
 * Generate a unique ID for a question based on its field name
 * @param {string} field - The field/column name
 * @returns {string} - A unique ID
 */
const generateQuestionId = (field) => {
    // Replace spaces and special characters, convert to lowercase
    return (
        "q_" +
        field
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "_")
            .replace(/_+/g, "_")
            .replace(/^_|_$/g, "")
    );
};

/**
 * Format the question field as readable text
 * @param {string} field - The field/column name
 * @returns {string} - Formatted question text
 */
const formatQuestionText = (field) => {
    // Remove common prefixes like "Q1." or "Question 1:"
    let text = field.replace(/^(q|question)\s*\d+[.:]\s*/i, "");

    // Capitalize first letter
    return text.charAt(0).toUpperCase() + text.slice(1);
};

/**
 * Determine the type of question based on values
 * @param {Array} values - Array of response values
 * @returns {string} - Question type: 'multiple_choice', 'numeric', 'text', etc.
 */
const determineQuestionType = (values) => {
    // Check if all values are numbers
    const allNumbers = values.every(
        (val) =>
            typeof val === "number" ||
            (typeof val === "string" && !isNaN(Number(val)))
    );

    if (allNumbers) {
        return "numeric";
    }

    // Get unique values
    const uniqueValues = [...new Set(values.map((v) => String(v).trim()))];

    // Check if it's likely a multiple choice (few unique values)
    if (
        uniqueValues.length <= 10 &&
        uniqueValues.length < values.length * 0.2
    ) {
        // If values are short (like "Yes", "No", "Maybe")
        const areValuesShort = uniqueValues.every(
            (val) => String(val).length < 30
        );

        if (areValuesShort) {
            return "multiple_choice";
        }
    }

    // Check if it might be a rating scale
    const possibleRatings = ["1", "2", "3", "4", "5", "1-5", "1-10"];
    const lowerValues = uniqueValues.map((v) => String(v).toLowerCase());
    const isRatingScale = possibleRatings.some(
        (rating) =>
            lowerValues.includes(rating) ||
            lowerValues.some((v) => v.includes(`rating: ${rating}`))
    );

    if (isRatingScale) {
        return "rating";
    }

    // Check if values are long text (answers)
    const longTextThreshold = 60;
    const hasLongText = values.some(
        (val) => String(val).length > longTextThreshold
    );

    if (hasLongText) {
        return "text";
    }

    // Default to categorical
    return "categorical";
};

/**
 * Get the data type of values (string, number, date, etc.)
 * @param {Array} values - Array of values
 * @returns {string} - Data type
 */
const getValueType = (values) => {
    if (values.length === 0) return "unknown";

    const sample = values[0];

    if (typeof sample === "number") {
        return "number";
    } else if (sample instanceof Date) {
        return "date";
    } else {
        return "string";
    }
};

/**
 * Get all unique values in an array
 * @param {Array} values - Array of values
 * @returns {Array} - Unique values
 */
const getUniqueValues = (values) => {
    // Convert all values to strings for consistent comparison
    return [...new Set(values.map((v) => String(v).trim()))];
};

/**
 * Create a summary of values based on question type
 * @param {Array} values - Array of values
 * @param {string} questionType - The type of question
 * @returns {Object} - Summary statistics
 */
const summarizeValues = (values, questionType) => {
    const summary = {};

    // Count frequencies
    const frequencies = {};
    values.forEach((val) => {
        const strVal = String(val).trim();
        frequencies[strVal] = (frequencies[strVal] || 0) + 1;
    });

    summary.frequencies = Object.entries(frequencies)
        .map(([value, count]) => ({
            value,
            count,
            percentage: (count / values.length) * 100,
        }))
        .sort((a, b) => b.count - a.count);

    // For numeric data, calculate statistics
    if (questionType === "numeric") {
        const numericValues = values
            .map((v) => (typeof v === "number" ? v : Number(v)))
            .filter((v) => !isNaN(v));

        if (numericValues.length > 0) {
            numericValues.sort((a, b) => a - b);

            summary.min = Math.min(...numericValues);
            summary.max = Math.max(...numericValues);
            summary.mean =
                numericValues.reduce((sum, val) => sum + val, 0) /
                numericValues.length;
            summary.median = calculateMedian(numericValues);
            summary.standardDeviation = calculateStandardDeviation(
                numericValues,
                summary.mean
            );
        }
    }

    return summary;
};

/**
 * Calculate the median of a sorted array of numbers
 * @param {Array} sortedArr - Sorted array of numbers
 * @returns {number} - Median value
 */
const calculateMedian = (sortedArr) => {
    const mid = Math.floor(sortedArr.length / 2);

    if (sortedArr.length % 2 === 0) {
        return (sortedArr[mid - 1] + sortedArr[mid]) / 2;
    } else {
        return sortedArr[mid];
    }
};

/**
 * Calculate standard deviation
 * @param {Array} values - Array of numbers
 * @param {number} mean - Mean value
 * @returns {number} - Standard deviation
 */
const calculateStandardDeviation = (values, mean) => {
    const squareDiffs = values.map((value) => {
        const diff = value - mean;
        return diff * diff;
    });

    const avgSquareDiff =
        squareDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    return Math.sqrt(avgSquareDiff);
};

export default {
    processDataFile,
};
