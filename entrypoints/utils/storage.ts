import { GroupRuleVo } from '../../types';

const STORAGE_KEY = 'xswitch_groups';
const GLOBAL_ENABLED_KEY = 'xswitch_global_enabled';

/**
 * 获取可用的存储API
 */
const getStorageAPI = () => {
  // 优先使用 browser API (WXT框架)
  if (typeof browser !== 'undefined' && browser.storage && browser.storage.local) {
    return browser.storage;
  }
  // 如果都不可用，返回null
  return null;
};

/**
 * 使用localStorage作为后备方案
 */
const fallbackStorage = {
  async set(data: Record<string, unknown>): Promise<void> {
    for (const [key, value] of Object.entries(data)) {
      localStorage.setItem(key, JSON.stringify(value));
    }
  },
  
  async get(keys: string[]): Promise<Record<string, any>> {
    const result: Record<string, any> = {};
    for (const key of keys) {
      const item = localStorage.getItem(key);
      if (item) {
        try {
          result[key] = JSON.parse(item);
        } catch {
          result[key] = item;
        }
      }
    }
    return result;
  }
};

// WXT 最佳实践: 使用 storage API 并提供兼容性
export const storage = {
  async saveGroups(groups: GroupRuleVo[]): Promise<void> {
    try {
      const storageAPI = getStorageAPI();
      if (storageAPI) {
        await storageAPI.local.set({ [STORAGE_KEY]: groups });
      } else {
        throw new Error('No storage API available');
      }
    } catch (error) {
      console.warn('Extension storage not available, using localStorage:', error);
      try {
        await fallbackStorage.set({ [STORAGE_KEY]: groups });
      } catch (fallbackError) {
        console.error('Failed to save groups:', fallbackError);
        throw fallbackError;
      }
    }
  },

  async loadGroups(): Promise<GroupRuleVo[]> {
    try {
      const storageAPI = getStorageAPI();
      if (storageAPI) {
        const result = await storageAPI.local.get([STORAGE_KEY]);
        return result[STORAGE_KEY] || [];
      } else {
        throw new Error('No storage API available');
      }
    } catch (error) {
      console.warn('Extension storage not available, using localStorage:', error);
      try {
        const result = await fallbackStorage.get([STORAGE_KEY]);
        return result[STORAGE_KEY] || [];
      } catch (fallbackError) {
        console.error('Failed to load groups:', fallbackError);
        return [];
      }
    }
  },

  async saveGlobalEnabled(enabled: boolean): Promise<void> {
    try {
      const storageAPI = getStorageAPI();
      if (storageAPI) {
        await storageAPI.local.set({ [GLOBAL_ENABLED_KEY]: enabled });
      } else {
        throw new Error('No storage API available');
      }
    } catch (error) {
      console.warn('Extension storage not available, using localStorage:', error);
      try {
        await fallbackStorage.set({ [GLOBAL_ENABLED_KEY]: enabled });
      } catch (fallbackError) {
        console.error('Failed to save global enabled state:', fallbackError);
        throw fallbackError;
      }
    }
  },

  async loadGlobalEnabled(): Promise<boolean> {
    try {
      const storageAPI = getStorageAPI();
      if (storageAPI) {
        const result = await storageAPI.local.get([GLOBAL_ENABLED_KEY]);
        return result[GLOBAL_ENABLED_KEY] ?? true;
      } else {
        throw new Error('No storage API available');
      }
    } catch (error) {
      console.warn('Extension storage not available, using localStorage:', error);
      try {
        const result = await fallbackStorage.get([GLOBAL_ENABLED_KEY]);
        return result[GLOBAL_ENABLED_KEY] ?? true;
      } catch (fallbackError) {
        console.error('Failed to load global enabled state:', fallbackError);
        return true;
      }
    }
  },

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
  },

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
  },

  // 监听存储变化
  onStorageChanged(callback: (changes: Record<string, { oldValue?: unknown; newValue?: unknown }>) => void): void {
    try {
      const storageAPI = getStorageAPI();
      storageAPI?.onChanged.addListener((changes: Record<string, { oldValue?: unknown; newValue?: unknown }>, namespace: string) => {
        if (namespace === 'local') {
          callback(changes);
        }
      });
    } catch (error) {
      console.warn('Storage change listener not available:', error);
    }
  },
};
