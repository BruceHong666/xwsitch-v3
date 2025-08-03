import JSON5 from 'json5';

/**
 * JSON注释处理函数 - 使用 JSON5 库支持注释和更宽松的语法
 */
export const parseJsonWithComments = (jsonString: string) => {
  const originalJson = jsonString.trim();

  // 处理空字符串
  if (!originalJson) {
    return undefined;
  }

  // 首先尝试直接解析标准JSON（最常见的情况）
  try {
    const result = JSON.parse(originalJson);
    return result;
  } catch {
    // 如果标准JSON解析失败，使用JSON5解析（支持注释、尾随逗号等）
    const json = JSON5.parse(originalJson);
    return json;
  }
};

/**
 * 验证JSON格式并返回详细的错误信息
 */
export const validateJsonFormat = (
  jsonString: string
): { isValid: boolean; error?: string } => {
  if (!jsonString.trim()) {
    return { isValid: true }; // 空字符串视为有效
  }

  try {
    parseJsonWithComments(jsonString);
    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : '未知的JSON格式错误',
    };
  }
};

interface ProxyRule {
  id: string;
  name: string;
  enabled: boolean;
  source: string;
  target: string;
  type: 'string' | 'regex';
}

interface CorsRule {
  id: string;
  pattern: string;
  enabled: boolean;
}

/**
 * 解析规则组配置 - 支持xswitch的数组格式和标准对象格式
 */
export const parseRuleGroup = (
  ruleText: string
): { proxy?: ProxyRule[]; cors?: CorsRule[] } => {
  if (!ruleText.trim()) {
    return {};
  }

  try {
    const config = parseJsonWithComments(ruleText);

    // 处理proxy规则
    let proxyRules: ProxyRule[] = [];
    if (config.proxy && Array.isArray(config.proxy)) {
      proxyRules = config.proxy.map(
        (rule: unknown, index: number): ProxyRule => {
          // 兼容xswitch的数组格式 [source, target]
          if (Array.isArray(rule) && rule.length >= 2) {
            return {
              id: `proxy_${index}`,
              name: `Rule ${index + 1}`,
              enabled: true,
              source: rule[0],
              target: rule[1],
              type: 'string' as const,
            };
          }
          // 标准对象格式
          if (
            typeof rule === 'object' &&
            rule &&
            'source' in rule &&
            'target' in rule
          ) {
            const ruleObj = rule as {
              id?: string;
              name?: string;
              enabled?: boolean;
              source: string;
              target: string;
              type?: 'string' | 'regex';
            };
            return {
              id: ruleObj.id || `proxy_${index}`,
              name: ruleObj.name || `Rule ${index + 1}`,
              enabled: ruleObj.enabled !== false,
              source: ruleObj.source,
              target: ruleObj.target,
              type: ruleObj.type || 'string',
            };
          }
          // 兼容其他格式，返回默认规则
          return {
            id: `proxy_${index}`,
            name: `Rule ${index + 1}`,
            enabled: false,
            source: '',
            target: '',
            type: 'string' as const,
          };
        }
      );
    }

    // 处理cors规则
    let corsRules: CorsRule[] = [];
    if (config.cors && Array.isArray(config.cors)) {
      corsRules = config.cors.map((rule: unknown, index: number): CorsRule => {
        // 如果是字符串，转换为对象格式
        if (typeof rule === 'string') {
          return {
            id: `cors_${index}`,
            pattern: rule,
            enabled: true,
          };
        }
        // 标准对象格式
        if (typeof rule === 'object' && rule && 'pattern' in rule) {
          const ruleObj = rule as {
            id?: string;
            pattern: string;
            enabled?: boolean;
          };
          return {
            id: ruleObj.id || `cors_${index}`,
            pattern: ruleObj.pattern,
            enabled: ruleObj.enabled !== false,
          };
        }
        // 默认格式
        return {
          id: `cors_${index}`,
          pattern: '',
          enabled: false,
        };
      });
    }

    return {
      proxy: proxyRules,
      cors: corsRules,
    };
  } catch {
    return {};
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
    const parsedRules = parseRuleGroup(ruleText);
    let count = 0;

    // 计算 proxy 规则数量
    if (parsedRules.proxy && Array.isArray(parsedRules.proxy)) {
      count += parsedRules.proxy.length;
    }

    // 计算 cors 规则数量
    if (parsedRules.cors && Array.isArray(parsedRules.cors)) {
      count += parsedRules.cors.length;
    }

    return count;
  } catch {
    // JSON 解析失败，返回 0
    return 0;
  }
};
