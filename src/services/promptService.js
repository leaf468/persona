// src/services/promptService.js

/**
 * 프롬프트 파일을 로드하고 관리하는 서비스
 */

// 프롬프트 캐시 (파일 내용을 메모리에 캐싱)
const promptCache = {};

/**
 * 프롬프트 파일 로드 함수
 * @param {string} promptName - 프롬프트 파일 이름 (확장자 제외)
 * @returns {Promise<string>} - 로드된 프롬프트 내용
 */
export const loadPrompt = async (promptName) => {
  try {
    // 캐시에 있으면 캐시에서 반환
    if (promptCache[promptName]) {
      return promptCache[promptName];
    }
    
    // 캐시에 없으면 파일에서 로드
    const response = await fetch(`/prompts/${promptName}.txt`);
    
    if (!response.ok) {
      throw new Error(`프롬프트 파일 로드 실패: ${promptName}.txt`);
    }
    
    const promptText = await response.text();
    
    // 캐시에 저장
    promptCache[promptName] = promptText;
    
    return promptText;
  } catch (error) {
    console.error(`프롬프트 로드 오류 (${promptName}):`, error);
    throw error;
  }
};

/**
 * 프롬프트 템플릿에 변수 값 적용 함수
 * @param {string} promptTemplate - 프롬프트 템플릿 문자열
 * @param {Object} variables - 변수 이름과 값을 담은 객체
 * @returns {string} - 변수가 적용된 프롬프트
 */
export const applyPromptTemplate = (promptTemplate, variables) => {
  if (!promptTemplate) return '';
  
  let filledPrompt = promptTemplate;
  
  // 모든 변수를 순회하며 치환
  Object.entries(variables).forEach(([key, value]) => {
    // 템플릿에서 {variableName} 형태의 모든 변수를 찾아 치환
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    
    // undefined나 null인 경우 빈 문자열로 치환
    const safeValue = (value !== undefined && value !== null) ? value : '';
    
    filledPrompt = filledPrompt.replace(regex, safeValue);
  });
  
  return filledPrompt;
};

/**
 * 프롬프트 로드 및 변수 적용을 한번에 처리하는 함수
 * @param {string} promptName - 프롬프트 파일 이름 (확장자 제외)
 * @param {Object} variables - 변수 이름과 값을 담은 객체
 * @returns {Promise<string>} - 변수가 적용된 프롬프트
 */
export const getFilledPrompt = async (promptName, variables = {}) => {
  try {
    const promptTemplate = await loadPrompt(promptName);
    return applyPromptTemplate(promptTemplate, variables);
  } catch (error) {
    console.error(`프롬프트 처리 오류 (${promptName}):`, error);
    throw error;
  }
};

export default {
  loadPrompt,
  applyPromptTemplate,
  getFilledPrompt
};