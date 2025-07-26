import { describe, it, expect, vi } from 'vitest';
import { parseJsonWithComments, validateJsonFormat, parseRuleGroup, countActiveRules } from '../../entrypoints/utils/json';
import { testRuleConfigs, invalidConfigs } from '../fixtures/configs';

/**
 * JSON 处理工具单元测试
 */
describe('JSON Utils', () => {
  describe('parseJsonWithComments', () => {
    it('应该正确解析标准 JSON', () => {
      const validJson = JSON.stringify({ test: 'value' });
      const result = parseJsonWithComments(validJson);
      
      expect(result).toEqual({ test: 'value' });
    });

    it('应该正确解析带注释的 JSON5', () => {
      const json5WithComments = `{
        // 这是一个注释
        "proxy": [
          {
            "id": "test",
            "name": "测试规则", // 行内注释
            "enabled": true,
            "source": "api.example.com",
            "target": "localhost:3000",
            "type": "string"
          }
        ],
        /* 多行注释
           可以跨越多行 */
        "cors": []
      }`;
      
      const result = parseJsonWithComments(json5WithComments);
      
      expect(result).toHaveProperty('proxy');
      expect(result).toHaveProperty('cors');
      expect(result.proxy).toHaveLength(1);
      expect(result.proxy[0].name).toBe('测试规则');
    });

    it('应该正确处理尾随逗号', () => {
      const jsonWithTrailingCommas = `{
        "proxy": [
          {
            "id": "test",
            "name": "测试",
            "enabled": true,
          }
        ],
        "cors": [],
      }`;
      
      const result = parseJsonWithComments(jsonWithTrailingCommas);
      
      expect(result.proxy).toHaveLength(1);
      expect(result.proxy[0].id).toBe('test');
    });

    it('应该正确处理空字符串', () => {
      const result = parseJsonWithComments('   ');
      expect(result).toBeUndefined();
    });

    it('应该抛出无效 JSON 的错误', () => {
      expect(() => {
        parseJsonWithComments('{ invalid json }');
      }).toThrow();
    });

    it('应该正确处理嵌套对象', () => {
      const nestedJson = `{
        "proxy": [
          {
            "id": "test",
            "config": {
              "timeout": 5000,
              "retries": 3
            }
          }
        ]
      }`;
      
      const result = parseJsonWithComments(nestedJson);
      
      expect(result.proxy[0].config.timeout).toBe(5000);
      expect(result.proxy[0].config.retries).toBe(3);
    });
  });

  describe('validateJsonFormat', () => {
    it('应该验证有效的 JSON 格式', () => {
      const validJson = JSON.stringify(testRuleConfigs.basic);
      const result = validateJsonFormat(validJson);
      
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('应该验证有效的 JSON5 格式', () => {
      const json5 = `{
        // 注释
        "proxy": [],
        "cors": []
      }`;
      
      const result = validateJsonFormat(json5);
      
      expect(result.isValid).toBe(true);
    });

    it('应该检测无效的 JSON 格式', () => {
      const result = validateJsonFormat(invalidConfigs.malformedJson);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
    });

    it('应该将空字符串视为有效', () => {
      const result = validateJsonFormat('   ');
      
      expect(result.isValid).toBe(true);
    });

    it('应该处理特殊字符', () => {
      const jsonWithSpecialChars = JSON.stringify({
        proxy: [{
          name: '测试规则 🚀',
          source: 'api.example.com/path?param=测试',
          target: 'localhost:3000'
        }],
        cors: []
      });
      
      const result = validateJsonFormat(jsonWithSpecialChars);
      
      expect(result.isValid).toBe(true);
    });
  });

  describe('parseRuleGroup', () => {
    it('应该正确解析基本规则组', () => {
      const ruleText = JSON.stringify(testRuleConfigs.basic);
      const result = parseRuleGroup(ruleText);
      
      expect(result).toHaveProperty('proxy');
      expect(result).toHaveProperty('cors');
      expect(result.proxy).toHaveLength(1);
      expect(result.cors).toHaveLength(1);
    });

    it('应该正确解析复杂规则组', () => {
      const ruleText = JSON.stringify(testRuleConfigs.complex);
      const result = parseRuleGroup(ruleText);
      
      expect(result.proxy).toHaveLength(2);
      expect(result.cors).toHaveLength(2);
      expect(result.proxy[0].type).toBe('string');
      expect(result.proxy[1].type).toBe('regex');
    });

    it('应该处理空的规则文本', () => {
      const result = parseRuleGroup('');
      
      expect(result).toEqual({});
    });

    it('应该处理无效的 JSON', () => {
      const result = parseRuleGroup('{ invalid json }');
      
      expect(result).toEqual({});
    });

    it('应该返回默认空数组', () => {
      const ruleText = JSON.stringify({ other: 'data' });
      const result = parseRuleGroup(ruleText);
      
      expect(result.proxy).toEqual([]);
      expect(result.cors).toEqual([]);
    });

    it('应该正确处理 JSON5 格式', () => {
      const json5RuleText = `{
        // 代理规则
        proxy: [
          {
            id: "test",
            name: "测试规则",
            enabled: true,
            source: "api.example.com",
            target: "localhost:3000",
            type: "string"
          }
        ],
        // CORS 规则
        cors: []
      }`;
      
      const result = parseRuleGroup(json5RuleText);
      
      expect(result.proxy).toHaveLength(1);
      expect(result.proxy[0].name).toBe('测试规则');
    });
  });

  describe('countActiveRules', () => {
    it('应该正确计算基本规则数量', () => {
      const ruleText = JSON.stringify(testRuleConfigs.basic);
      const count = countActiveRules(ruleText);
      
      expect(count).toBe(2); // 1 proxy + 1 cors
    });

    it('应该正确计算复杂规则数量', () => {
      const ruleText = JSON.stringify(testRuleConfigs.complex);
      const count = countActiveRules(ruleText);
      
      expect(count).toBe(4); // 2 proxy + 2 cors
    });

    it('应该处理空规则文本', () => {
      const count = countActiveRules('');
      expect(count).toBe(0);
    });

    it('应该处理只有代理规则的情况', () => {
      const ruleText = JSON.stringify({
        proxy: testRuleConfigs.basic.proxy,
        cors: []
      });
      const count = countActiveRules(ruleText);
      
      expect(count).toBe(1);
    });

    it('应该处理只有 CORS 规则的情况', () => {
      const ruleText = JSON.stringify({
        proxy: [],
        cors: testRuleConfigs.basic.cors
      });
      const count = countActiveRules(ruleText);
      
      expect(count).toBe(1);
    });

    it('应该处理无效 JSON', () => {
      const count = countActiveRules('{ invalid json }');
      expect(count).toBe(0);
    });

    it('应该处理大量规则', () => {
      const largeConfig = {
        proxy: Array.from({ length: 100 }, (_, i) => ({
          id: `proxy-${i}`,
          name: `规则 ${i}`,
          enabled: true,
          source: `api${i}.example.com`,
          target: `localhost:${3000 + i}`,
          type: 'string'
        })),
        cors: Array.from({ length: 50 }, (_, i) => ({
          id: `cors-${i}`,
          pattern: `api${i}.example.com`,
          enabled: true
        }))
      };
      
      const ruleText = JSON.stringify(largeConfig);
      const count = countActiveRules(ruleText);
      
      expect(count).toBe(150); // 100 proxy + 50 cors
    });

    it('应该正确处理 JSON5 格式', () => {
      const json5RuleText = `{
        // 代理规则
        proxy: [
          { id: "1", name: "规则1", enabled: true, source: "a", target: "b", type: "string" },
          { id: "2", name: "规则2", enabled: true, source: "c", target: "d", type: "string" }
        ],
        // CORS 规则
        cors: [
          { id: "1", pattern: "example.com", enabled: true }
        ]
      }`;
      
      const count = countActiveRules(json5RuleText);
      expect(count).toBe(3); // 2 proxy + 1 cors
    });
  });

  describe('性能测试', () => {
    it('JSON 解析性能应该在可接受范围内', () => {
      const largeJson = JSON.stringify({
        proxy: Array.from({ length: 1000 }, (_, i) => ({
          id: `proxy-${i}`,
          name: `规则 ${i}`,
          enabled: true,
          source: `api${i}.example.com`,
          target: `localhost:${3000 + i}`,
          type: 'string'
        })),
        cors: Array.from({ length: 500 }, (_, i) => ({
          id: `cors-${i}`,
          pattern: `api${i}.example.com`,
          enabled: true
        }))
      });

      const startTime = performance.now();
      parseRuleGroup(largeJson);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // 应该在100ms内完成
    });

    it('重复解析应该保持性能', () => {
      const ruleText = JSON.stringify(testRuleConfigs.complex);
      
      const startTime = performance.now();
      for (let i = 0; i < 1000; i++) {
        parseRuleGroup(ruleText);
      }
      const endTime = performance.now();
      
      const averageTime = (endTime - startTime) / 1000;
      expect(averageTime).toBeLessThan(1); // 平均每次应该在1ms内
    });
  });

  describe('错误处理', () => {
    it('应该正确处理 JSON 解析错误', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      // 这应该触发 JSON5 解析
      const result = parseJsonWithComments('{ // comment\n"test": true }');
      
      expect(result).toEqual({ test: true });
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('应该优雅处理极端情况', () => {
      const extremeCases = [
        '',
        '   ',
        'null',
        'undefined',
        '{}',
        '[]',
        '{ "proxy": null, "cors": null }'
      ];
      
      extremeCases.forEach(testCase => {
        expect(() => {
          const result = parseRuleGroup(testCase);
          expect(typeof result).toBe('object');
        }).not.toThrow();
      });
    });
  });
});