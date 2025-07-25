/**
 * JSON注释处理函数 - 改进版，优先尝试标准JSON解析
 */
export const parseJsonWithComments = (jsonString: string) => {
  const originalJson = jsonString.trim();
  
  // 首先尝试直接解析标准JSON（最常见的情况）
  try {
    const result = JSON.parse(originalJson);
    return result;
  } catch {
    // 如果标准JSON解析失败，则进行注释处理
  }
  
  // 如果标准JSON解析失败，则进行注释处理
  let cleanJson = originalJson;
  
  // 智能移除注释，避免破坏字符串内容
  cleanJson = removeJsonComments(cleanJson);
  
  // 清理格式问题
  cleanJson = cleanupJsonFormat(cleanJson);
  
  return JSON.parse(cleanJson);
};

/**
 * 智能移除JSON中的注释，保护字符串内容
 */
function removeJsonComments(jsonString: string): string {
  let result = '';
  let inString = false;
  let stringDelimiter = '';
  let i = 0;
  
  while (i < jsonString.length) {
    const char = jsonString[i];
    const nextChar = jsonString[i + 1] || '';
    const prevChar = i > 0 ? jsonString[i - 1] : '';
    
    // 检查字符串的开始和结束
    if (!inString && (char === '"' || char === "'")) {
      inString = true;
      stringDelimiter = char;
      result += char;
      i++;
      continue;
    }
    
    if (inString) {
      if (char === stringDelimiter && prevChar !== '\\') {
        // 字符串结束（不是转义的引号）
        inString = false;
        stringDelimiter = '';
      }
      result += char;
      i++;
      continue;
    }
    
    // 不在字符串内，检查注释
    if (char === '/' && nextChar === '/') {
      // 单行注释 - 跳过到行末
      while (i < jsonString.length && jsonString[i] !== '\n' && jsonString[i] !== '\r') {
        i++;
      }
      // 保留换行符
      if (i < jsonString.length && (jsonString[i] === '\n' || jsonString[i] === '\r')) {
        result += jsonString[i];
        i++;
      }
      continue;
    }
    
    if (char === '/' && nextChar === '*') {
      // 多行注释 - 跳过到 */
      i += 2;
      while (i < jsonString.length - 1) {
        if (jsonString[i] === '*' && jsonString[i + 1] === '/') {
          i += 2;
          break;
        }
        i++;
      }
      continue;
    }
    
    // 普通字符
    result += char;
    i++;
  }
  
  return result;
}

/**
 * 清理JSON格式问题
 */
function cleanupJsonFormat(jsonString: string): string {
  let cleanJson = jsonString;
  
  // 移除尾随逗号
  // eslint-disable-next-line no-useless-escape
  cleanJson = cleanJson.replace(/,(\s*[\]\}])/g, '$1');
  
  // 移除开头的多余逗号
  // eslint-disable-next-line no-useless-escape
  cleanJson = cleanJson.replace(/([\[\{]\s*),+/g, '$1');
  
  // 清理连续的逗号
  cleanJson = cleanJson.replace(/,+/g, ',');
  
  // 规范化空白字符
  cleanJson = cleanJson
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // 移除控制字符但保留\n和\t
    .trim();
  
  return cleanJson;
}

/**
 * 验证JSON格式并返回详细的错误信息
 */
export const validateJsonFormat = (jsonString: string): { isValid: boolean; error?: string } => {
  if (!jsonString.trim()) {
    return { isValid: true }; // 空字符串视为有效
  }
  
  try {
    parseJsonWithComments(jsonString);
    return { isValid: true };
  } catch (error) {
    return { 
      isValid: false, 
      error: error instanceof Error ? error.message : '未知的JSON格式错误' 
    };
  }
};

/**
 * 计算规则文本中的有效规则数量
 */
export const countActiveRules = (ruleText: string): number => {
  if (!ruleText.trim()) {
    return 0;
  }
  
  try {
    const config = parseJsonWithComments(ruleText);
    let count = 0;
    
    // 计算 proxy 规则数量
    if (config.proxy && Array.isArray(config.proxy)) {
      count += config.proxy.length;
    }
    
    // 计算 cors 规则数量
    if (config.cors && Array.isArray(config.cors)) {
      count += config.cors.length;
    }
    
    return count;
  } catch {
    // JSON 解析失败，返回 0
    return 0;
  }
};