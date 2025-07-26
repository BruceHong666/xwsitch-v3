import { GroupRuleVo } from '../../types';
import { mockChrome, setupChromeEnvironment, cleanupChromeEnvironment } from '../mocks/chrome';

/**
 * 测试工具函数
 */

// 等待指定时间
export const wait = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// 创建测试用的规则组
export const createTestGroup = (overrides: Partial<GroupRuleVo> = {}): GroupRuleVo => {
  return {
    id: `test-group-${Date.now()}`,
    groupName: '测试分组',
    enabled: true,
    ruleText: JSON.stringify({
      proxy: [
        {
          id: 'test-proxy',
          name: '测试代理',
          enabled: true,
          source: 'api.example.com',
          target: 'localhost:3000',
          type: 'string'
        }
      ],
      cors: [
        {
          id: 'test-cors',
          pattern: 'api.example.com',
          enabled: true
        }
      ]
    }, null, 2),
    createTime: new Date().toISOString(),
    updateTime: new Date().toISOString(),
    ...overrides
  };
};

// 验证 JSON 字符串
export const isValidJson = (str: string): boolean => {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
};

// 验证规则格式
export const validateRuleFormat = (ruleText: string): { isValid: boolean; error?: string } => {
  if (!ruleText.trim()) {
    return { isValid: true };
  }
  
  try {
    const config = JSON.parse(ruleText);
    
    // 检查必需字段
    if (!config.proxy || !Array.isArray(config.proxy)) {
      return { isValid: false, error: 'proxy 字段必须是数组' };
    }
    
    if (!config.cors || !Array.isArray(config.cors)) {
      return { isValid: false, error: 'cors 字段必须是数组' };
    }
    
    // 验证代理规则
    for (const rule of config.proxy) {
      if (!rule.id || !rule.source || !rule.target) {
        return { isValid: false, error: '代理规则缺少必需字段' };
      }
    }
    
    // 验证 CORS 规则
    for (const rule of config.cors) {
      if (!rule.id || !rule.pattern) {
        return { isValid: false, error: 'CORS 规则缺少必需字段' };
      }
    }
    
    return { isValid: true };
  } catch (error) {
    return { 
      isValid: false, 
      error: error instanceof Error ? error.message : '未知错误' 
    };
  }
};

// 模拟网络请求
export const mockNetworkRequest = (url: string, options: RequestInit = {}) => {
  return {
    url,
    method: options.method || 'GET',
    headers: options.headers || {},
    type: 'xmlhttprequest',
    tabId: 1,
    timestamp: Date.now()
  };
};

// 模拟存储变化事件
export const triggerStorageChange = (changes: Record<string, { oldValue?: any; newValue?: any }>) => {
  const listeners = mockChrome.storage.onChanged.addListener.mock.calls;
  listeners.forEach(([callback]) => {
    if (typeof callback === 'function') {
      callback(changes, 'local');
    }
  });
};

// 性能测试辅助函数
export const measurePerformance = async (fn: () => Promise<void> | void): Promise<number> => {
  const start = performance.now();
  await fn();
  const end = performance.now();
  return end - start;
};

// 批量创建测试规则
export const createTestRules = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `rule-${i}`,
    name: `测试规则 ${i}`,
    enabled: true,
    source: `https://api${i}.example.com`,
    target: `http://localhost:${3000 + i}`,
    type: 'string' as const
  }));
};

// 测试环境设置
export const setupTestEnvironment = () => {
  const chrome = setupChromeEnvironment();
  
  // 设置默认存储
  chrome.storage._setStorage({
    xswitch_groups: [],
    xswitch_global_enabled: true
  });
  
  return chrome;
};

// 测试环境清理
export const cleanupTestEnvironment = () => {
  cleanupChromeEnvironment();
};

// URL 测试用例生成器
export const generateUrlTestCases = () => {
  return [
    {
      description: '基本域名匹配',
      url: 'https://api.example.com/users',
      pattern: 'api.example.com',
      shouldMatch: true
    },
    {
      description: '子域名正则匹配',
      url: 'https://api.staging.example.com/data',
      pattern: '(.*).example.com',
      shouldMatch: true
    },
    {
      description: '路径匹配',
      url: 'https://example.com/api/v1/users',
      pattern: '/api/v1',
      shouldMatch: true
    },
    {
      description: '不匹配的域名',
      url: 'https://different.com/api',
      pattern: 'example.com',
      shouldMatch: false
    },
    {
      description: '协议切换',
      url: 'http://api.example.com/data',
      pattern: 'api.example.com',
      shouldMatch: true
    }
  ];
};

// 生成测试数据
export const generateTestData = {
  groups: (count: number = 3) => Array.from({ length: count }, (_, i) => createTestGroup({
    id: `group-${i}`,
    groupName: `测试分组 ${i}`,
    enabled: i % 2 === 0 // 交替启用/禁用
  })),
  
  rules: (count: number = 5) => createTestRules(count),
  
  corsRules: (count: number = 3) => Array.from({ length: count }, (_, i) => ({
    id: `cors-${i}`,
    pattern: `api${i}.example.com`,
    enabled: true
  }))
};