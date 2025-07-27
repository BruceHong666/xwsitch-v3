import { describe, it, expect, beforeEach, vi } from 'vitest';
import { compatStorage } from '../../utils/storage';
import { NetworkService } from '../../entrypoints/utils/network';
import { parseRuleGroup, countActiveRules } from '../../entrypoints/utils/json';
import { setupTestEnvironment, cleanupTestEnvironment, createTestGroup, triggerStorageChange } from '../utils/testUtils';
import { testRuleConfigs } from '../fixtures/configs';

/**
 * 端到端集成测试
 * 测试完整的工作流程和组件之间的集成
 */
describe('End-to-End Integration Tests', () => {
  let mockChrome: any;
  let networkService: NetworkService;

  beforeEach(() => {
    mockChrome = setupTestEnvironment();
    networkService = new NetworkService();
  });

  afterEach(() => {
    cleanupTestEnvironment();
  });

  describe('完整的代理流程', () => {
    it('应该完成从配置到代理的完整流程', async () => {
      // 1. 创建规则组
      const ruleGroup = createTestGroup({
        ruleText: JSON.stringify({
          proxy: [
            {
              id: 'e2e-proxy',
              name: 'E2E 代理测试',
              enabled: true,
              source: 'api.example.com',
              target: 'localhost:3000',
              type: 'string'
            }
          ],
          cors: [
            {
              id: 'e2e-cors',
              pattern: 'api.example.com',
              enabled: true
            }
          ]
        })
      });

      // 2. 保存到存储
      const saveResult = await compatStorage.saveGroups([ruleGroup]);
      expect(saveResult.success).toBe(true);

      // 3. 从存储加载
      const loadedGroups = await compatStorage.loadGroups();
      expect(loadedGroups).toHaveLength(1);
      expect(loadedGroups[0].id).toBe(ruleGroup.id);

      // 4. 解析规则
      const parsedRules = parseRuleGroup(loadedGroups[0].ruleText);
      expect(parsedRules.proxy).toHaveLength(1);
      expect(parsedRules.cors).toHaveLength(1);

      // 5. 更新网络规则
      await networkService.updateRules(loadedGroups, true);
      
      // 6. 验证 Chrome API 调用
      expect(mockChrome.declarativeNetRequest.updateDynamicRules).toHaveBeenCalled();
      
      const updateCall = mockChrome.declarativeNetRequest.updateDynamicRules.mock.calls[0][0];
      expect(updateCall.addRules).toHaveLength(2); // 1 proxy + 1 cors
    });

    it('应该正确处理规则禁用和启用', async () => {
      // 创建启用的规则组
      const enabledGroup = createTestGroup({ enabled: true });
      await compatStorage.saveGroups([enabledGroup]);
      
      // 更新网络规则（启用状态）
      await networkService.updateRules([enabledGroup], true);
      expect(mockChrome.declarativeNetRequest.updateDynamicRules).toHaveBeenCalledWith(
        expect.objectContaining({
          addRules: expect.arrayContaining([expect.any(Object)])
        })
      );

      // 禁用规则组
      const disabledGroup = { ...enabledGroup, enabled: false };
      await compatStorage.saveGroups([disabledGroup]);
      
      // 更新网络规则（禁用状态）
      await networkService.updateRules([disabledGroup], true);
      expect(mockChrome.declarativeNetRequest.updateDynamicRules).toHaveBeenLastCalledWith(
        expect.objectContaining({
          addRules: []
        })
      );
    });

    it('应该正确处理全局开关', async () => {
      const ruleGroup = createTestGroup();
      await compatStorage.saveGroups([ruleGroup]);

      // 全局启用
      await compatStorage.saveGlobalEnabled(true);
      await networkService.updateRules([ruleGroup], true);
      
      let updateCall = mockChrome.declarativeNetRequest.updateDynamicRules.mock.calls.slice(-1)[0][0];
      expect(updateCall.addRules.length).toBeGreaterThan(0);

      // 全局禁用
      await compatStorage.saveGlobalEnabled(false);
      await networkService.updateRules([ruleGroup], false);
      
      updateCall = mockChrome.declarativeNetRequest.updateDynamicRules.mock.calls.slice(-1)[0][0];
      expect(updateCall.addRules).toHaveLength(0);
    });
  });

  describe('存储变化监听', () => {
    it('应该响应存储变化事件', async () => {
      const callback = vi.fn();
      compatStorage.onStorageChanged(callback);

      // 保存新的规则组
      const newGroup = createTestGroup();
      await compatStorage.saveGroups([newGroup]);

      // 手动触发存储变化事件
      triggerStorageChange({
        'xswitch_groups': {
          oldValue: [],
          newValue: [newGroup]
        }
      });

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          'xswitch_groups': expect.any(Object)
        })
      );
    });

    it('应该正确处理全局状态变化', async () => {
      const callback = vi.fn();
      compatStorage.onStorageChanged(callback);

      await compatStorage.saveGlobalEnabled(false);

      triggerStorageChange({
        'xswitch_global_enabled': {
          oldValue: true,
          newValue: false
        }
      });

      expect(callback).toHaveBeenCalled();
    });
  });

  describe('规则验证和计数', () => {
    it('应该正确计算复杂配置的规则数量', async () => {
      const complexGroup = createTestGroup({
        ruleText: JSON.stringify(testRuleConfigs.complex)
      });

      const count = countActiveRules(complexGroup.ruleText);
      expect(count).toBe(4); // 2 proxy + 2 cors

      await compatStorage.saveGroups([complexGroup]);
      await networkService.updateRules([complexGroup], true);

      const updateCall = mockChrome.declarativeNetRequest.updateDynamicRules.mock.calls.slice(-1)[0][0];
      expect(updateCall.addRules).toHaveLength(4);
    });

    it('应该正确处理混合启用/禁用规则', async () => {
      const mixedRulesConfig = {
        proxy: [
          {
            id: 'enabled-proxy',
            name: '启用代理',
            enabled: true,
            source: 'enabled.example.com',
            target: 'localhost:3000',
            type: 'string'
          },
          {
            id: 'disabled-proxy',
            name: '禁用代理',
            enabled: false,
            source: 'disabled.example.com',
            target: 'localhost:4000',
            type: 'string'
          }
        ],
        cors: [
          {
            id: 'enabled-cors',
            pattern: 'enabled.example.com',
            enabled: true
          },
          {
            id: 'disabled-cors',
            pattern: 'disabled.example.com',
            enabled: false
          }
        ]
      };

      const group = createTestGroup({
        ruleText: JSON.stringify(mixedRulesConfig)
      });

      await networkService.updateRules([group], true);

      const updateCall = mockChrome.declarativeNetRequest.updateDynamicRules.mock.calls.slice(-1)[0][0];
      expect(updateCall.addRules).toHaveLength(2); // 只有启用的规则
    });
  });

  describe('错误处理和容错性', () => {
    it('应该优雅处理存储错误', async () => {
      mockChrome.storage.local.get.mockRejectedValue(new Error('Storage error'));
      
      const groups = await compatStorage.loadGroups();
      expect(groups).toEqual([]); // 应该返回空数组而不是抛出错误
    });

    it('应该优雅处理网络 API 错误', async () => {
      mockChrome.declarativeNetRequest.updateDynamicRules.mockRejectedValue(
        new Error('Network API error')
      );

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const group = createTestGroup();
      await networkService.updateRules([group], true);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('应该处理无效的规则配置', async () => {
      const invalidGroup = createTestGroup({
        ruleText: '{ "proxy": [invalid], "cors": [] }'
      });

      // 应该不抛出错误
      await expect(networkService.updateRules([invalidGroup], true)).resolves.not.toThrow();
    });

    it('应该处理空的规则组列表', async () => {
      await networkService.updateRules([], true);
      
      const updateCall = mockChrome.declarativeNetRequest.updateDynamicRules.mock.calls.slice(-1)[0][0];
      expect(updateCall.addRules).toHaveLength(0);
    });
  });

  describe('性能和扩展性', () => {
    it('应该处理大量规则组', async () => {
      const largeGroupList = Array.from({ length: 50 }, (_, i) => 
        createTestGroup({ id: `group-${i}` })
      );

      const startTime = performance.now();
      await compatStorage.saveGroups(largeGroupList);
      const loadedGroups = await compatStorage.loadGroups();
      await networkService.updateRules(loadedGroups, true);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(2000); // 应该在2秒内完成
      expect(loadedGroups).toHaveLength(50);
    });

    it('应该处理复杂的正则表达式规则', async () => {
      const regexGroup = createTestGroup({
        ruleText: JSON.stringify({
          proxy: [
            {
              id: 'complex-regex',
              name: '复杂正则',
              enabled: true,
              source: '^https://([a-z]+)\\.([a-z]+)\\.example\\.com/api/v([0-9]+)/(.*)$',
              target: 'http://localhost:3000/v$3/$1/$2/$4',
              type: 'regex'
            }
          ],
          cors: []
        })
      });

      await networkService.updateRules([regexGroup], true);

      const updateCall = mockChrome.declarativeNetRequest.updateDynamicRules.mock.calls.slice(-1)[0][0];
      expect(updateCall.addRules).toHaveLength(1);
      expect(updateCall.addRules[0].action.redirect).toBeDefined();
    });
  });


  describe('用户场景模拟', () => {
    it('应该模拟用户创建和管理规则的完整流程', async () => {
      // 1. 用户创建新的规则组
      const storage = await import('../../utils/storage').then(m => m.enhancedStorage);
      const newGroup = await storage.createGroup('用户测试组', JSON.stringify({
        proxy: [
          {
            id: 'user-rule-1',
            name: '用户规则1',
            enabled: true,
            source: 'api.user-test.com',
            target: 'localhost:3000',
            type: 'string'
          }
        ],
        cors: []
      }));

      expect(newGroup.groupName).toBe('用户测试组');
      expect(newGroup.enabled).toBe(true);

      // 2. 用户修改规则组
      const updatedGroup = {
        ...newGroup,
        groupName: '修改后的组名',
        ruleText: JSON.stringify({
          proxy: [
            {
              id: 'user-rule-1',
              name: '修改后的规则',
              enabled: true,
              source: 'api.modified.com',
              target: 'localhost:4000',
              type: 'string'
            }
          ],
          cors: [
            {
              id: 'user-cors-1',
              pattern: 'api.modified.com',
              enabled: true
            }
          ]
        })
      };

      await storage.saveGroup(updatedGroup);

      // 3. 验证修改结果
      const savedGroup = await storage.getGroup(newGroup.id);
      expect(savedGroup?.groupName).toBe('修改后的组名');

      const parsedRules = parseRuleGroup(savedGroup!.ruleText);
      expect(parsedRules.proxy[0].name).toBe('修改后的规则');
      expect(parsedRules.cors).toHaveLength(1);

      // 4. 用户启用/禁用规则组
      const toggleResult = await storage.toggleGroupEnabled(newGroup.id);
      expect(toggleResult).toBe(false); // 应该变为禁用

      // 5. 用户删除规则组
      await storage.deleteGroup(newGroup.id);
      const deletedGroup = await storage.getGroup(newGroup.id);
      expect(deletedGroup).toBeNull();
    });

    it('应该模拟多用户环境下的数据隔离', async () => {
      // 创建不同"用户"的数据
      const user1Groups = [
        createTestGroup({ id: 'user1-group1', groupName: '用户1-组1' }),
        createTestGroup({ id: 'user1-group2', groupName: '用户1-组2' })
      ];

      const user2Groups = [  
        createTestGroup({ id: 'user2-group1', groupName: '用户2-组1' })
      ];

      // 保存用户1数据
      await compatStorage.saveGroups(user1Groups);
      const loadedUser1 = await compatStorage.loadGroups();
      expect(loadedUser1).toHaveLength(2);

      // "切换"到用户2（模拟清空重新加载）
      await compatStorage.saveGroups(user2Groups);
      const loadedUser2 = await compatStorage.loadGroups();
      expect(loadedUser2).toHaveLength(1);
      expect(loadedUser2[0].groupName).toBe('用户2-组1');
    });
  });
});