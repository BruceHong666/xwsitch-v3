import { describe, it, expect, beforeEach, vi } from 'vitest';
import { compatStorage, EnhancedStorageManager } from '../../utils/storage';
import { setupTestEnvironment, cleanupTestEnvironment, createTestGroup } from '../utils/testUtils';
import { mockGroups } from '../fixtures/configs';

/**
 * 存储服务单元测试
 */
describe('Storage Service', () => {
  let mockChrome: any;

  beforeEach(() => {
    mockChrome = setupTestEnvironment();
  });

  afterEach(() => {
    cleanupTestEnvironment();
  });

  describe('EnhancedStorageManager', () => {
    it('应该创建单例实例', () => {
      const instance1 = EnhancedStorageManager.getInstance();
      const instance2 = EnhancedStorageManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('应该正确保存和加载规则组', async () => {
      const storage = EnhancedStorageManager.getInstance();
      const testGroups = [createTestGroup()];

      await storage.saveGroups(testGroups);
      const loadedGroups = await storage.loadGroups();

      expect(loadedGroups).toEqual(testGroups);
    });

    it('应该正确处理空的规则组列表', async () => {
      const storage = EnhancedStorageManager.getInstance();
      
      const emptyGroups = await storage.loadGroups();
      expect(emptyGroups).toEqual([]);
    });

    it('应该正确保存和加载全局启用状态', async () => {
      const storage = EnhancedStorageManager.getInstance();

      await storage.saveGlobalEnabled(true);
      let enabled = await storage.loadGlobalEnabled();
      expect(enabled).toBe(true);

      await storage.saveGlobalEnabled(false);
      enabled = await storage.loadGlobalEnabled();
      expect(enabled).toBe(false);
    });

    it('应该返回默认的全局启用状态', async () => {
      const storage = EnhancedStorageManager.getInstance();
      const enabled = await storage.loadGlobalEnabled();
      expect(enabled).toBe(false); // 默认值应该是 false
    });

    it('应该正确获取指定规则组', async () => {
      const storage = EnhancedStorageManager.getInstance();
      const testGroup = createTestGroup({ id: 'test-group-123' });
      
      await storage.saveGroups([testGroup]);
      const group = await storage.getGroup('test-group-123');
      
      expect(group).toEqual(testGroup);
    });

    it('获取不存在的规则组应该返回 null', async () => {
      const storage = EnhancedStorageManager.getInstance();
      const group = await storage.getGroup('non-existent');
      expect(group).toBeNull();
    });

    it('应该正确保存单个规则组', async () => {
      const storage = EnhancedStorageManager.getInstance();
      const testGroup = createTestGroup();
      
      await storage.saveGroup(testGroup);
      const groups = await storage.loadGroups();
      
      expect(groups).toHaveLength(1);
      expect(groups[0]).toEqual(testGroup);
    });

    it('应该正确更新现有规则组', async () => {
      const storage = EnhancedStorageManager.getInstance();
      const testGroup = createTestGroup({ id: 'update-test' });
      
      await storage.saveGroup(testGroup);
      
      const updatedGroup = { ...testGroup, groupName: '更新后的名称' };
      await storage.saveGroup(updatedGroup);
      
      const groups = await storage.loadGroups();
      expect(groups).toHaveLength(1);
      expect(groups[0].groupName).toBe('更新后的名称');
    });

    it('应该正确删除规则组', async () => {
      const storage = EnhancedStorageManager.getInstance();
      const testGroup = createTestGroup({ id: 'delete-test' });
      
      await storage.saveGroup(testGroup);
      await storage.deleteGroup('delete-test');
      
      const groups = await storage.loadGroups();
      expect(groups).toHaveLength(0);
    });

    it('应该正确创建新规则组', async () => {
      const storage = EnhancedStorageManager.getInstance();
      
      const newGroup = await storage.createGroup('新建分组', '{"proxy":[],"cors":[]}');
      
      expect(newGroup.groupName).toBe('新建分组');
      expect(newGroup.ruleText).toBe('{"proxy":[],"cors":[]}');
      expect(newGroup.enabled).toBe(true);
      expect(newGroup.id).toBeDefined();
      expect(newGroup.createTime).toBeDefined();
      expect(newGroup.updateTime).toBeDefined();
    });

    it('应该正确切换规则组启用状态', async () => {
      const storage = EnhancedStorageManager.getInstance();
      const testGroup = createTestGroup({ id: 'toggle-test', enabled: true });
      
      await storage.saveGroup(testGroup);
      
      const newState = await storage.toggleGroupEnabled('toggle-test');
      expect(newState).toBe(false);
      
      const groups = await storage.loadGroups();
      expect(groups[0].enabled).toBe(false);
    });

    it('切换不存在规则组状态应该抛出错误', async () => {
      const storage = EnhancedStorageManager.getInstance();
      
      await expect(storage.toggleGroupEnabled('non-existent')).rejects.toThrow('Group not found');
    });

    it('应该正确导出数据', async () => {
      const storage = EnhancedStorageManager.getInstance();
      const testGroups = [createTestGroup()];
      
      await storage.saveGroups(testGroups);
      await storage.saveGlobalEnabled(true);
      
      const exportedData = await storage.exportData();
      const parsedData = JSON.parse(exportedData);
      
      expect(parsedData.groups).toEqual(testGroups);
      expect(parsedData.globalEnabled).toBe(true);
      expect(parsedData.exportedAt).toBeDefined();
    });

    it('应该正确导入数据', async () => {
      const storage = EnhancedStorageManager.getInstance();
      const testGroups = [createTestGroup()];
      
      const importData = JSON.stringify({
        groups: testGroups,
        globalEnabled: true
      });
      
      await storage.importData(importData);
      
      const groups = await storage.loadGroups();
      const enabled = await storage.loadGlobalEnabled();
      
      expect(groups).toEqual(testGroups);
      expect(enabled).toBe(true);
    });

    it('导入无效数据应该抛出错误', async () => {
      const storage = EnhancedStorageManager.getInstance();
      
      await expect(storage.importData('invalid json')).rejects.toThrow('Invalid import data format');
    });

    it('应该正确清除所有数据', async () => {
      const storage = EnhancedStorageManager.getInstance();
      const testGroups = [createTestGroup()];
      
      await storage.saveGroups(testGroups);
      await storage.saveGlobalEnabled(true);
      await storage.clearAll();
      
      const groups = await storage.loadGroups();
      const enabled = await storage.loadGlobalEnabled();
      
      expect(groups).toEqual([]);
      expect(enabled).toBe(false); // 默认值
    });

    it('应该正确设置存储变化监听器', () => {
      const storage = EnhancedStorageManager.getInstance();
      const callback = vi.fn();
      
      storage.onStorageChanged(callback);
      
      expect(mockChrome.storage.onChanged.addListener).toHaveBeenCalled();
    });
  });

  describe('compatStorage (兼容层)', () => {
    it('应该成功保存规则组', async () => {
      const testGroups = [createTestGroup()];
      const result = await compatStorage.saveGroups(testGroups);
      
      expect(result.success).toBe(true);
    });

    it('保存规则组失败时应该返回错误信息', async () => {
      // 模拟存储失败
      mockChrome.storage.local.set.mockRejectedValue(new Error('Storage error'));
      
      const testGroups = [createTestGroup()];
      const result = await compatStorage.saveGroups(testGroups);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Storage error');
    });

    it('应该成功加载规则组', async () => {
      const testGroups = [createTestGroup()];
      await compatStorage.saveGroups(testGroups);
      
      const groups = await compatStorage.loadGroups();
      expect(groups).toEqual(testGroups);
    });

    it('加载规则组失败时应该返回空数组', async () => {
      mockChrome.storage.local.get.mockRejectedValue(new Error('Load error'));
      
      const groups = await compatStorage.loadGroups();
      expect(groups).toEqual([]);
    });

    it('应该成功保存全局启用状态', async () => {
      const result = await compatStorage.saveGlobalEnabled(true);
      expect(result.success).toBe(true);
    });

    it('应该成功加载全局启用状态', async () => {
      await compatStorage.saveGlobalEnabled(true);
      const enabled = await compatStorage.loadGlobalEnabled();
      expect(enabled).toBe(true);
    });

    it('应该成功导出数据', async () => {
      const testGroups = [createTestGroup()];
      await compatStorage.saveGroups(testGroups);
      
      const exportedData = await compatStorage.exportData();
      expect(typeof exportedData).toBe('string');
      
      const parsedData = JSON.parse(exportedData);
      expect(parsedData.groups).toEqual(testGroups);
    });

    it('应该成功导入数据', async () => {
      const testGroups = [createTestGroup()];
      const importData = JSON.stringify({
        groups: testGroups,
        globalEnabled: true
      });
      
      const result = await compatStorage.importData(importData);
      expect(result.success).toBe(true);
    });

    it('导入无效数据应该返回错误', async () => {
      const result = await compatStorage.importData('invalid json');
      expect(result.success).toBe(false);
      expect(result.message).toContain('导入失败');
    });

    it('应该正确设置存储变化监听器', () => {
      const callback = vi.fn();
      compatStorage.onStorageChanged(callback);
      
      // 触发存储变化事件测试
      const changes = {
        'xswitch_groups': {
          oldValue: [],
          newValue: [createTestGroup()]
        }
      };
      
      // 模拟触发监听器
      const listener = mockChrome.storage.onChanged.addListener.mock.calls[0][0];
      listener(changes, 'local');
      
      expect(callback).toHaveBeenCalledWith(changes);
    });
  });

  describe('Chrome Storage API 集成', () => {
    it('应该正确调用 Chrome storage API', async () => {
      const testGroups = [createTestGroup()];
      await compatStorage.saveGroups(testGroups);
      
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        'xswitch_groups': testGroups
      });
    });

    it('应该正确处理 Chrome storage 错误', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockChrome.storage.local.get.mockRejectedValue(new Error('Chrome API error'));
      
      const groups = await compatStorage.loadGroups();
      
      expect(groups).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load groups'),
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('数据完整性', () => {
    it('应该保持数据类型正确性', async () => {
      const testGroup = createTestGroup({
        enabled: true,
        createTime: new Date().toISOString()
      });
      
      await compatStorage.saveGroups([testGroup]);
      const groups = await compatStorage.loadGroups();
      
      expect(typeof groups[0].enabled).toBe('boolean');
      expect(typeof groups[0].createTime).toBe('string');
      expect(typeof groups[0].id).toBe('string');
    });

    it('应该正确处理特殊字符', async () => {
      const testGroup = createTestGroup({
        groupName: '测试分组 🚀 with special chars & symbols',
        ruleText: JSON.stringify({
          proxy: [{
            source: 'https://api.example.com/path?param=value&other=测试',
            target: 'http://localhost:3000/新路径'
          }],
          cors: []
        })
      });
      
      await compatStorage.saveGroups([testGroup]);
      const groups = await compatStorage.loadGroups();
      
      expect(groups[0].groupName).toBe(testGroup.groupName);
      expect(groups[0].ruleText).toBe(testGroup.ruleText);
    });
  });
});