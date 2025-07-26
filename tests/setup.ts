import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { setupChromeEnvironment, cleanupChromeEnvironment } from './mocks/chrome';

// 全局测试设置
beforeAll(() => {
  // 设置全局测试环境
  console.log('🧪 Setting up test environment...');
  
  // 模拟浏览器环境
  Object.defineProperty(window, 'location', {
    value: {
      href: 'https://test.example.com',
      origin: 'https://test.example.com',
      protocol: 'https:',
      host: 'test.example.com',
      pathname: '/',
      search: '',
      hash: ''
    },
    writable: true
  });

  // 模拟性能 API
  if (!global.performance) {
    global.performance = {
      now: () => Date.now(),
      mark: () => {},
      measure: () => {},
      getEntriesByType: () => [],
      getEntriesByName: () => [],
      clearMarks: () => {},
      clearMeasures: () => {}
    } as any;
  }

  // 设置默认的 Chrome 环境
  setupChromeEnvironment();
});

afterAll(() => {
  console.log('🧹 Cleaning up test environment...');
  cleanupChromeEnvironment();
});

// 每个测试前的设置
beforeEach(() => {
  // 重置 console 方法的模拟
  vi.clearAllMocks();
  
  // 重置 localStorage 模拟
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => store[key] = value,
      removeItem: (key: string) => delete store[key],
      clear: () => store = {},
      length: Object.keys(store).length,
      key: (index: number) => Object.keys(store)[index] || null
    };
  })();

  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true
  });
});

// 每个测试后的清理
afterEach(() => {
  // 清理可能的定时器
  vi.clearAllTimers();
  
  // 清理模拟的网络请求
  vi.restoreAllMocks();
});

// 扩展 expect 匹配器
expect.extend({
  toBeValidRule(received: any) {
    const pass = received && 
                 typeof received.id === 'string' && 
                 typeof received.name === 'string' && 
                 typeof received.enabled === 'boolean' &&
                 typeof received.source === 'string' &&
                 typeof received.target === 'string';

    return {
      pass,
      message: () => 
        pass 
          ? `Expected ${received} not to be a valid rule`
          : `Expected ${received} to be a valid rule with id, name, enabled, source, and target properties`
    };
  },

  toBeValidGroupRuleVo(received: any) {
    const pass = received &&
                 typeof received.id === 'string' &&
                 typeof received.groupName === 'string' &&
                 typeof received.enabled === 'boolean' &&
                 typeof received.ruleText === 'string' &&
                 typeof received.createTime === 'string' &&
                 typeof received.updateTime === 'string';

    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received} not to be a valid GroupRuleVo`
          : `Expected ${received} to be a valid GroupRuleVo with all required properties`
    };
  },

  toHaveValidRuleFormat(received: string) {
    try {
      const parsed = JSON.parse(received);
      const hasProxy = Array.isArray(parsed.proxy);
      const hasCors = Array.isArray(parsed.cors);
      const pass = hasProxy && hasCors;

      return {
        pass,
        message: () =>
          pass
            ? `Expected ${received} not to have valid rule format`
            : `Expected ${received} to have valid rule format with proxy and cors arrays`
      };
    } catch {
      return {
        pass: false,
        message: () => `Expected ${received} to be valid JSON with rule format`
      };
    }
  }
});

// 测试工具函数
export const testUtils = {
  // 等待异步操作
  waitFor: async (condition: () => boolean, timeout = 5000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (condition()) return;
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    throw new Error(`Condition not met within ${timeout}ms`);
  },

  // 模拟用户操作延迟
  simulateUserDelay: () => new Promise(resolve => setTimeout(resolve, 10)),

  // 生成随机测试数据
  generateRandomString: (length = 10) => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  // 验证 URL 格式
  isValidUrl: (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
};

// 全局类型声明
declare global {
  namespace Vi {
    interface JestAssertion<T = any> {
      toBeValidRule(): T;
      toBeValidGroupRuleVo(): T;
      toHaveValidRuleFormat(): T;
    }
  }
}

// 导出测试配置
export const testConfig = {
  timeout: 10000,
  retries: 2,
  verbose: process.env.NODE_ENV === 'development'
};