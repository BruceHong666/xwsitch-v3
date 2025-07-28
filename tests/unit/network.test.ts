import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NetworkService } from '../../entrypoints/utils/network';
import { setupTestEnvironment, cleanupTestEnvironment, generateUrlTestCases, createTestGroup } from '../utils/testUtils';
import { mockGroups, testRuleConfigs } from '../fixtures/configs';

/**
 * 网络服务单元测试
 */
describe('NetworkService', () => {
  let networkService: NetworkService;
  let mockChrome: any;

  beforeEach(() => {
    mockChrome = setupTestEnvironment();
    networkService = new NetworkService();
  });

  afterEach(() => {
    cleanupTestEnvironment();
  });

  describe('URL 匹配功能', () => {
    const urlTestCases = generateUrlTestCases();

    it.each(urlTestCases)(
      '$description: $url 应该 $shouldMatch ? "匹配" : "不匹配" $pattern',
      ({ url, pattern, shouldMatch }) => {
        // @ts-ignore - 访问私有方法进行测试
        const result = networkService.isUrlMatched(url, pattern);
        expect(result).toBe(shouldMatch);
      }
    );

    it('应该正确处理正则表达式匹配', () => {
      const testCases = [
        {
          url: 'https://api.staging.example.com/data',
          pattern: '(.*).staging.example.com',
          expected: true
        },
        {
          url: 'https://service.prod.company.com/api',
          pattern: '(.*).prod.company.com',
          expected: true
        },
        {
          url: 'https://api.example.com/v1/users',
          pattern: '/v([0-9]+)/',
          expected: true
        },
        {
          url: 'https://nomatch.com',
          pattern: '(.*).example.com',
          expected: false
        }
      ];

      testCases.forEach(({ url, pattern, expected }) => {
        // @ts-ignore
        const result = networkService.isUrlMatched(url, pattern);
        expect(result).toBe(expected);
      });
    });

    it('应该处理特殊字符和编码', () => {
      const specialCases = [
        {
          url: 'https://api.example.com/search?q=test%20query&sort=asc',
          pattern: 'api.example.com',
          expected: true
        },
        {
          url: 'https://api.example.com:8080/data',
          pattern: 'api.example.com:8080',
          expected: true
        },
        {
          url: 'https://api.example.com/path/with-dashes_and_underscores',
          pattern: 'api.example.com',
          expected: true
        }
      ];

      specialCases.forEach(({ url, pattern, expected }) => {
        // @ts-ignore
        const result = networkService.isUrlMatched(url, pattern);
        expect(result).toBe(expected);
      });
    });
  });

  describe('URL 替换功能', () => {
    it('应该正确执行字符串替换', () => {
      const testCases = [
        {
          url: 'https://api.example.com/users',
          source: 'api.example.com',
          target: 'localhost:3000',
          expected: 'https://localhost:3000/users'
        },
        {
          url: 'https://api.production.com/v1/data',
          source: 'api.production.com',
          target: 'api.staging.com',
          expected: 'https://api.staging.com/v1/data'
        }
      ];

      testCases.forEach(({ url, source, target, expected }) => {
        // @ts-ignore
        const result = networkService.getTargetUrl(url, source, target);
        expect(result).toBe(expected);
      });
    });

    it('应该正确执行正则表达式替换', () => {
      const testCases = [
        {
          url: 'https://api.staging.example.com/data',
          source: '(.*).staging.example.com',
          target: '$1.dev.example.com',
          expected: 'https://api.dev.example.com/data'
        },
        {
          url: 'https://service.prod.company.com/api',
          source: '(.*).prod.company.com',
          target: '$1.test.company.com',
          expected: 'https://service.test.company.com/api'
        }
      ];

      testCases.forEach(({ url, source, target, expected }) => {
        // @ts-ignore
        const result = networkService.getTargetUrl(url, source, target);
        expect(result).toBe(expected);
      });
    });

    it('应该处理无匹配的情况', () => {
      const url = 'https://nomatch.example.com/data';
      const source = 'different.com';
      const target = 'localhost:3000';
      
      // @ts-ignore
      const result = networkService.getTargetUrl(url, source, target);
      expect(result).toBe(url); // 应该返回原 URL
    });
  });

  describe('regexSubstitution 转换', () => {
    it('应该正确转换 $1, $2 为 Chrome 格式', () => {
      const testCases = [
        {
          source: 'https://g.alicdn.com/m2c-fe/1688-print-order/([0-9.]*)/(.*)',
          target: 'https://g.alicdn.com/m2c-fe/1688-print-order/1.2.0/$2',
          expectedSubstitution: 'https://g.alicdn.com/m2c-fe/1688-print-order/1.2.0/\\2'
        },
        {
          source: 'https://example.com/(.*)/old/(.*)',
          target: 'https://example.com/$1/new/$2',
          expectedSubstitution: 'https://example.com/\\1/new/\\2'
        },
        {
          source: 'https://cdn.example.com/v([0-9.]+)/(.*)',
          target: 'https://cdn.example.com/v2.0.0/$2',
          expectedSubstitution: 'https://cdn.example.com/v2.0.0/\\2'
        },
        {
          source: '(.*).staging.example.com',
          target: '$1.prod.example.com',
          expectedSubstitution: '\\1.prod.example.com'
        }
      ];

      testCases.forEach(({ source, target, expectedSubstitution }) => {
        // @ts-ignore - 访问私有方法
        const redirect = networkService.convertToRedirect(source, target);
        
        expect(redirect).toBeDefined();
        expect(redirect?.regexSubstitution).toBe(expectedSubstitution);
      });
    });

    it('应该为没有捕获组的目标返回直接 URL', () => {
      const source = 'https://example.com/path';
      const target = 'https://newdomain.com/path';
      
      // @ts-ignore
      const redirect = networkService.convertToRedirect(source, target);
      
      expect(redirect).toBeDefined();
      expect(redirect?.url).toBe(target);
      expect(redirect?.regexSubstitution).toBeUndefined();
    });

    it('应该正确处理用户实际案例', () => {
      // 用户的实际配置
      const source = 'https://g.alicdn.com/m2c-fe/1688-print-order/([0-9.]*)/(.*)';
      const target = 'https://g.alicdn.com/m2c-fe/1688-print-order/1.2.0/$2';
      
      // @ts-ignore
      const redirect = networkService.convertToRedirect(source, target);
      
      expect(redirect).toBeDefined();
      expect(redirect?.regexSubstitution).toBe('https://g.alicdn.com/m2c-fe/1688-print-order/1.2.0/\\2');
      
      // 验证生成的规则格式
      const expectedRule = {
        regexSubstitution: 'https://g.alicdn.com/m2c-fe/1688-print-order/1.2.0/\\2'
      };
      
      expect(redirect).toEqual(expectedRule);
    });

    it('应该正确生成 regexFilter', () => {
      const testCases = [
        {
          source: 'https://g.alicdn.com/m2c-fe/1688-print-order/([0-9.]*)/(.*)',
          expectedFilter: '^https://g.alicdn.com/m2c-fe/1688-print-order/([0-9.]*)/(.*?)$'
        },
        {
          source: 'https://example.com/(.*)/old/(.*)',
          expectedFilter: '^https://example.com/(.*?)/old/(.*?)$'
        },
        {
          source: '(.*).staging.example.com',
          expectedFilter: '^(.*?).staging.example.com$'
        }
      ];

      testCases.forEach(({ source, expectedFilter }) => {
        // @ts-ignore - 访问私有方法
        const regexFilter = networkService.convertToRegexFilter(source);
        
        expect(regexFilter).toBe(expectedFilter);
      });
    });

    it('应该生成正确的 declarativeNetRequest 规则', () => {
      // 用户实际案例的规则
      const proxyRule = {
        id: 'test-regex',
        name: '版本号替换测试',
        enabled: true,
        source: 'https://g.alicdn.com/m2c-fe/1688-print-order/([0-9.]*)/(.*)',
        target: 'https://g.alicdn.com/m2c-fe/1688-print-order/1.2.0/$2',
        type: 'regex' as const
      };

      // @ts-ignore - 访问私有方法
      const rules = networkService.generateProxyRules([proxyRule]);
      
      expect(rules).toHaveLength(1);
      
      const rule = rules[0];
      expect(rule.action.type).toBe('redirect');
      expect(rule.action.redirect?.regexSubstitution).toBe('https://g.alicdn.com/m2c-fe/1688-print-order/1.2.0/\\2');
      expect(rule.condition.regexFilter).toBe('^https://g.alicdn.com/m2c-fe/1688-print-order/([0-9.]*)/(.*?)$');
      expect(rule.condition.urlFilter).toBeUndefined(); // 使用 regexFilter 时不应有 urlFilter
    });

    it('应该区分 regexFilter 和 urlFilter 的使用场景', () => {
      const testCases = [
        {
          name: '有捕获组和$替换的规则应该使用regexFilter',
          rule: {
            id: 'regex-rule',
            name: 'Regex Rule',
            enabled: true,
            source: 'https://example.com/(.*)/(.*)',
            target: 'https://newdomain.com/$1/$2',
            type: 'regex' as const
          },
          expectedRegexFilter: '^https://example.com/(.*?)/(.*?)$',
          expectedRegexSubstitution: 'https://newdomain.com/\\1/\\2',
          shouldHaveUrlFilter: false
        },
        {
          name: '无捕获组的规则应该使用urlFilter',
          rule: {
            id: 'url-rule',
            name: 'URL Rule',
            enabled: true,
            source: 'https://example.com/api',
            target: 'https://newdomain.com/api',
            type: 'string' as const
          },
          expectedUrl: 'https://newdomain.com/api',
          shouldHaveRegexFilter: false
        }
      ];

      testCases.forEach(({ name, rule, expectedRegexFilter, expectedRegexSubstitution, expectedUrl, shouldHaveUrlFilter, shouldHaveRegexFilter }) => {
        // @ts-ignore
        const rules = networkService.generateProxyRules([rule]);
        
        expect(rules).toHaveLength(1);
        
        const generatedRule = rules[0];
        
        if (expectedRegexFilter) {
          expect(generatedRule.condition.regexFilter).toBe(expectedRegexFilter);
          expect(generatedRule.action.redirect?.regexSubstitution).toBe(expectedRegexSubstitution);
          if (shouldHaveUrlFilter === false) {
            expect(generatedRule.condition.urlFilter).toBeUndefined();
          }
        }
        
        if (expectedUrl) {
          expect(generatedRule.action.redirect?.url).toBe(expectedUrl);
          if (shouldHaveRegexFilter === false) {
            expect(generatedRule.condition.regexFilter).toBeUndefined();
          }
        }
      });
    });
  });

  describe('代理规则生成', () => {
    it('应该正确生成代理规则', () => {
      const proxyRules = testRuleConfigs.basic.proxy;
      
      // @ts-ignore
      const result = networkService.generateProxyRules(proxyRules);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('priority', 1);
      expect(result[0]).toHaveProperty('action');
      expect(result[0]).toHaveProperty('condition');
      expect(result[0].action.type).toBe('redirect');
    });

    it('应该跳过禁用的规则', () => {
      const proxyRules = [
        {
          id: 'enabled',
          name: '启用规则',
          enabled: true,
          source: 'api.example.com',
          target: 'localhost:3000',
          type: 'string'
        },
        {
          id: 'disabled',
          name: '禁用规则',
          enabled: false,
          source: 'disabled.example.com',
          target: 'localhost:4000',
          type: 'string'
        }
      ];
      
      // @ts-ignore
      const result = networkService.generateProxyRules(proxyRules);
      
      expect(result).toHaveLength(1);
      expect(result[0].condition.urlFilter).toContain('api.example.com');
    });

    it('应该处理复杂的规则配置', () => {
      const proxyRules = testRuleConfigs.complex.proxy;
      
      // @ts-ignore
      const result = networkService.generateProxyRules(proxyRules);
      
      expect(result).toHaveLength(2);
      result.forEach(rule => {
        expect(rule).toHaveProperty('id');
        expect(rule).toHaveProperty('action');
        expect(rule).toHaveProperty('condition');
      });
    });
  });

  describe('CORS 规则生成', () => {
    it('应该正确生成 CORS 规则', () => {
      const corsRules = testRuleConfigs.basic.cors;
      
      // @ts-ignore
      const result = networkService.generateCorsRules(corsRules);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('priority', 2);
      expect(result[0].action.type).toBe('modifyHeaders');
      expect(result[0].action.responseHeaders).toHaveLength(4);
    });

    it('应该设置正确的 CORS 头', () => {
      const corsRules = [{ id: 'test', pattern: 'api.example.com', enabled: true }];
      
      // @ts-ignore
      const result = networkService.generateCorsRules(corsRules);
      
      const headers = result[0].action.responseHeaders;
      const headerNames = headers.map((h: any) => h.header);
      
      expect(headerNames).toContain('Access-Control-Allow-Origin');
      expect(headerNames).toContain('Access-Control-Allow-Credentials');
      expect(headerNames).toContain('Access-Control-Allow-Methods');
      expect(headerNames).toContain('Access-Control-Allow-Headers');
    });
  });

  describe('declarativeNetRequest 集成', () => {
    it('应该正确调用 Chrome API', async () => {
      const groups = [createTestGroup()];
      
      await networkService.updateRules(groups, true);
      
      expect(mockChrome.declarativeNetRequest.getDynamicRules).toHaveBeenCalled();
      expect(mockChrome.declarativeNetRequest.updateDynamicRules).toHaveBeenCalled();
    });

    it('应该在全局禁用时清空规则', async () => {
      const groups = [createTestGroup()];
      
      await networkService.updateRules(groups, false);
      
      expect(mockChrome.declarativeNetRequest.updateDynamicRules).toHaveBeenCalledWith({
        removeRuleIds: [],
        addRules: []
      });
    });

    it('应该处理空分组列表', async () => {
      await networkService.updateRules([], true);
      
      expect(mockChrome.declarativeNetRequest.updateDynamicRules).toHaveBeenCalledWith({
        removeRuleIds: [],
        addRules: []
      });
    });

    it('应该处理 API 错误', async () => {
      mockChrome.declarativeNetRequest.updateDynamicRules.mockRejectedValue(
        new Error('API Error')
      );
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const groups = [createTestGroup()];
      await networkService.updateRules(groups, true);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to apply declarative rules'),
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('网络请求日志', () => {
    it('应该设置网络请求监听器', () => {
      const groups = [createTestGroup()];
      
      networkService.setupNetworkLogging(true, groups);
      
      expect(mockChrome.webRequest.onBeforeRequest.addListener).toHaveBeenCalled();
      expect(mockChrome.webRequest.onCompleted.addListener).toHaveBeenCalled();
    });

    it('应该记录匹配的代理请求', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const groups = [createTestGroup()];
      
      const requestDetails = {
        url: 'https://api.example.com/data',
        type: 'xmlhttprequest',
        method: 'GET',
        tabId: 1
      };
      
      // @ts-ignore
      networkService.logProxyHit(requestDetails, true, groups);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[XSwitch V3] Checking')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('性能测试', () => {
    it('规则匹配性能应该在可接受范围内', () => {
      const testUrls = Array.from({ length: 1000 }, (_, i) => 
        `https://api${i}.example.com/data`
      );
      const pattern = '(.*).example.com';

      const startTime = performance.now();
      testUrls.forEach(url => {
        // @ts-ignore
        networkService.isUrlMatched(url, pattern);
      });
      const endTime = performance.now();

      const averageTime = (endTime - startTime) / testUrls.length;
      expect(averageTime).toBeLessThan(1); // 每次匹配应小于1ms
    });

    it('大量规则处理性能应该在可接受范围内', async () => {
      const largeGroup = createTestGroup({
        ruleText: JSON.stringify({
          proxy: Array.from({ length: 200 }, (_, i) => ({
            id: `rule-${i}`,
            name: `规则 ${i}`,
            enabled: true,
            source: `api${i}.example.com`,
            target: `localhost:${3000 + i}`,
            type: 'string'
          })),
          cors: []
        })
      });

      const startTime = performance.now();
      await networkService.updateRules([largeGroup], true);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(1000); // 应该在1秒内完成
    });
  });
});