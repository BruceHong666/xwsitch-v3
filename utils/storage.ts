import { GroupRuleVo } from '../types';

const STORAGE_KEY = 'xswitch_groups';
const GLOBAL_ENABLED_KEY = 'xswitch_global_enabled';

/**
 * 操作结果类型
 */
export interface OperationResult {
  success: boolean;
  message?: string;
}

/**
 * 存储API抽象层
 */
interface StorageAPI {
  get(keys: string[]): Promise<Record<string, any>>;
  set(data: Record<string, any>): Promise<void>;
  remove(keys: string[]): Promise<void>;
  clear(): Promise<void>;
  onChanged?: {
    addListener(callback: (changes: Record<string, { oldValue?: unknown; newValue?: unknown }>, namespace: string) => void): void;
  };
}

/**
 * 检测当前运行环境
 */
const isServiceWorker = () => {
  return typeof importScripts === 'function' || typeof window === 'undefined';
};

/**
 * 获取可用的存储API - 更好的错误处理和类型支持
 */
const getStorageAPI = (): StorageAPI | null => {
  console.log('🔍 Detecting storage API... Environment:', JSON.stringify({
    isServiceWorker: isServiceWorker(),
    hasBrowser: typeof browser !== 'undefined',
    hasChrome: false,
    hasLocalStorage: typeof localStorage !== 'undefined'
  }));

  // 优先使用 browser API (WebExtensions标准)
  if (typeof browser !== 'undefined' && browser.storage && browser.storage.local) {
    console.log('✅ Using browser.storage.local API');
    return {
      get: (keys) => browser.storage.local.get(keys),
      set: (data) => browser.storage.local.set(data),
      remove: (keys) => browser.storage.local.remove(keys),
      clear: () => browser.storage.local.clear(),
      onChanged: browser.storage.onChanged,
    };
  }
  
  console.log('❌ No extension storage API available');
  return null;
};

/**
 * localStorage fallback implementation with change notification
 */
const createLocalStorageFallback = (): StorageAPI => {
  const listeners: Array<(changes: any, namespace: string) => void> = [];
  
  const notifyChanges = (key: string, oldValue: any, newValue: any) => {
    const changes = {
      [key]: {
        oldValue,
        newValue
      }
    };
    console.log(`🔔 Notifying ${listeners.length} listeners of change:`, JSON.stringify(changes));
    listeners.forEach((listener, index) => {
      try {
        console.log(`🔔 Calling listener ${index + 1}/${listeners.length}`);
        listener(changes, 'local');
      } catch (error) {
        console.error(`❌ Error in storage change listener ${index + 1}:`, error);
      }
    });
  };

  return {
    async get(keys: string[]): Promise<Record<string, any>> {
      const result: Record<string, any> = {};
      for (const key of keys) {
        const item = localStorage.getItem(key);
        if (item !== null) {
          try {
            result[key] = JSON.parse(item);
          } catch {
            result[key] = item;
          }
        }
      }
      return result;
    },
    
    async set(data: Record<string, any>): Promise<void> {
      console.log('📝 localStorage.set() called:', JSON.stringify(data));
      for (const [key, value] of Object.entries(data)) {
        const oldItem = localStorage.getItem(key);
        const oldValue = oldItem ? JSON.parse(oldItem) : undefined;
        
        console.log(`📝 Setting localStorage[${key}]:`, JSON.stringify({ oldValue, newValue: value }));
        localStorage.setItem(key, JSON.stringify(value));
        
        // 通知变化
        console.log(`📡 Notifying change for key: ${key}`);
        notifyChanges(key, oldValue, value);
      }
    },
    
    async remove(keys: string[]): Promise<void> {
      for (const key of keys) {
        const oldItem = localStorage.getItem(key);
        const oldValue = oldItem ? JSON.parse(oldItem) : undefined;
        
        localStorage.removeItem(key);
        
        // 通知变化
        notifyChanges(key, oldValue, undefined);
      }
    },
    
    async clear(): Promise<void> {
      localStorage.clear();
    },
    
    onChanged: {
      addListener(callback: (changes: any, namespace: string) => void) {
        console.log(`👂 Adding storage change listener (total: ${listeners.length + 1})`);
        listeners.push(callback);
      }
    }
  };
};

/**
 * 增强的存储管理器 - 基于原生 Extension APIs 但提供更好的类型支持
 */
export class EnhancedStorageManager {
  private static instance: EnhancedStorageManager;
  private storageAPI: StorageAPI;
  
  private constructor() {
    const extensionStorageAPI = getStorageAPI();
    
    if (extensionStorageAPI) {
      this.storageAPI = extensionStorageAPI;
    } else if (!isServiceWorker()) {
      // 只在非service worker环境中使用localStorage fallback
      console.log('⚠️ Using localStorage fallback (not in service worker)');
      this.storageAPI = createLocalStorageFallback();
    } else {
      // 在service worker中，如果没有扩展API，抛出错误
      throw new Error('Extension storage API not available in service worker environment');
    }
  }
  
  static getInstance(): EnhancedStorageManager {
    if (!EnhancedStorageManager.instance) {
      EnhancedStorageManager.instance = new EnhancedStorageManager();
    }
    return EnhancedStorageManager.instance;
  }

  /**
   * 保存规则组列表
   */
  async saveGroups(groups: GroupRuleVo[]): Promise<void> {
    await this.storageAPI.set({ [STORAGE_KEY]: groups });
  }

  /**
   * 加载规则组列表
   */
  async loadGroups(): Promise<GroupRuleVo[]> {
    const result = await this.storageAPI.get([STORAGE_KEY]);
    return result[STORAGE_KEY] || [];
  }

  /**
   * 保存全局启用状态
   */
  async saveGlobalEnabled(enabled: boolean): Promise<void> {
    await this.storageAPI.set({ [GLOBAL_ENABLED_KEY]: enabled });
  }

  /**
   * 加载全局启用状态
   */
  async loadGlobalEnabled(): Promise<boolean> {
    const result = await this.storageAPI.get([GLOBAL_ENABLED_KEY]);
    return result[GLOBAL_ENABLED_KEY] ?? true;
  }

  /**
   * 获取指定规则组
   */
  async getGroup(groupId: string): Promise<GroupRuleVo | null> {
    const groups = await this.loadGroups();
    return groups.find(group => group.id === groupId) || null;
  }

  /**
   * 保存单个规则组
   */
  async saveGroup(group: GroupRuleVo): Promise<void> {
    const groups = await this.loadGroups();
    const index = groups.findIndex(g => g.id === group.id);
    
    if (index >= 0) {
      groups[index] = group;
    } else {
      groups.push(group);
    }
    
    await this.saveGroups(groups);
  }

  /**
   * 删除规则组
   */
  async deleteGroup(groupId: string): Promise<void> {
    const groups = await this.loadGroups();
    const filteredGroups = groups.filter(group => group.id !== groupId);
    await this.saveGroups(filteredGroups);
  }

  /**
   * 创建新规则组
   */
  async createGroup(groupName: string, ruleText: string = '{}'): Promise<GroupRuleVo> {
    const newGroup: GroupRuleVo = {
      id: Date.now().toString(),
      groupName,
      enabled: true,
      ruleText,
      createTime: new Date().toISOString(),
      updateTime: new Date().toISOString(),
    };
    
    await this.saveGroup(newGroup);
    return newGroup;
  }

  /**
   * 切换规则组启用状态
   */
  async toggleGroupEnabled(groupId: string): Promise<boolean> {
    const groups = await this.loadGroups();
    const group = groups.find(g => g.id === groupId);
    
    if (!group) {
      throw new Error('Group not found');
    }
    
    group.enabled = !group.enabled;
    await this.saveGroups(groups);
    return group.enabled;
  }

  /**
   * 导出配置数据
   */
  async exportData(): Promise<string> {
    const groups = await this.loadGroups();
    const globalEnabled = await this.loadGlobalEnabled();
    
    return JSON.stringify(
      {
        groups,
        globalEnabled,
        exportedAt: new Date().toISOString(),
      },
      null,
      2
    );
  }

  /**
   * 导入配置数据
   */
  async importData(jsonData: string): Promise<void> {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.groups && Array.isArray(data.groups)) {
        await this.saveGroups(data.groups);
      }
      
      if (typeof data.globalEnabled === 'boolean') {
        await this.saveGlobalEnabled(data.globalEnabled);
      }
    } catch (error) {
      console.error('Failed to import data:', error);
      throw new Error('Invalid import data format');
    }
  }

  /**
   * 清除所有存储数据
   */
  async clearAll(): Promise<void> {
    await this.storageAPI.remove([STORAGE_KEY, GLOBAL_ENABLED_KEY]);
  }

  /**
   * 监听存储变化
   */
  onStorageChanged(callback: (changes: any) => void): void {
    if (this.storageAPI.onChanged) {
      this.storageAPI.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local') {
          callback(changes);
        }
      });
    }
  }
}

// 导出单例实例
export const enhancedStorage = EnhancedStorageManager.getInstance();

/**
 * 兼容层 - 保持与原有代码的兼容性
 * 提供 Promise<OperationResult> 接口
 */
export const compatStorage = {
  async saveGroups(groups: GroupRuleVo[]): Promise<OperationResult> {
    try {
      await enhancedStorage.saveGroups(groups);
      return { success: true };
    } catch (error) {
      console.error('Failed to save groups:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : '保存失败' 
      };
    }
  },

  async loadGroups(): Promise<GroupRuleVo[]> {
    try {
      return await enhancedStorage.loadGroups();
    } catch (error) {
      console.error('Failed to load groups:', error);
      return [];
    }
  },

  async saveGlobalEnabled(enabled: boolean): Promise<OperationResult> {
    try {
      await enhancedStorage.saveGlobalEnabled(enabled);
      return { success: true };
    } catch (error) {
      console.error('Failed to save global enabled state:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : '保存失败' 
      };
    }
  },

  async loadGlobalEnabled(): Promise<boolean> {
    try {
      return await enhancedStorage.loadGlobalEnabled();
    } catch (error) {
      console.error('Failed to load global enabled state:', error);
      return true;
    }
  },

  async exportData(): Promise<string> {
    return enhancedStorage.exportData();
  },

  async importData(jsonData: string): Promise<OperationResult> {
    try {
      await enhancedStorage.importData(jsonData);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : '导入失败' 
      };
    }
  },

  // 监听存储变化 (简化版)
  onStorageChanged(callback: (changes: any) => void): void {
    enhancedStorage.onStorageChanged(callback);
  },
};