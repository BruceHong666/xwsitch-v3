import { GroupRuleVo } from '../../../types';

const STORAGE_KEY = 'xswitch_groups';
const GLOBAL_ENABLED_KEY = 'xswitch_global_enabled';

/**
 * 存储API抽象层
 */
interface StorageAPI {
  get(keys: string[]): Promise<Record<string, any>>;
  set(data: Record<string, any>): Promise<void>;
  remove(keys: string[]): Promise<void>;
  clear(): Promise<void>;
  onChanged?: {
    addListener(
      callback: (
        changes: Record<string, { oldValue?: unknown; newValue?: unknown }>,
        namespace: string
      ) => void
    ): void;
  };
}

/**
 * 检测当前运行环境
 */
const isServiceWorker = () => {
  return typeof importScripts === 'function' || typeof window === 'undefined';
};

/**
 * 获取可用的存储API
 */
const getStorageAPI = (): StorageAPI | null => {
  console.log(
    '🔍 Detecting storage API... Environment:',
    JSON.stringify({
      isServiceWorker: isServiceWorker(),
      hasBrowser: typeof browser !== 'undefined',
      hasLocalStorage: typeof localStorage !== 'undefined',
    })
  );

  if (
    typeof browser !== 'undefined' &&
    browser.storage &&
    browser.storage.local
  ) {
    console.log('✅ Using browser.storage.local API');
    return {
      get: keys => browser.storage.local.get(keys),
      set: data => browser.storage.local.set(data),
      remove: keys => browser.storage.local.remove(keys),
      clear: () => browser.storage.local.clear(),
      onChanged: browser.storage.onChanged,
    };
  }

  console.log('❌ No extension storage API available');
  return null;
};

/**
 * localStorage fallback implementation
 */
const createLocalStorageFallback = (): StorageAPI => {
  const listeners: Array<(changes: any, namespace: string) => void> = [];

  const notifyChanges = (key: string, oldValue: any, newValue: any) => {
    const changes = {
      [key]: {
        oldValue,
        newValue,
      },
    };
    listeners.forEach(listener => {
      try {
        listener(changes, 'local');
      } catch (error) {
        console.error('Error in storage change listener:', error);
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
      for (const [key, value] of Object.entries(data)) {
        const oldItem = localStorage.getItem(key);
        const oldValue = oldItem ? JSON.parse(oldItem) : undefined;

        localStorage.setItem(key, JSON.stringify(value));
        notifyChanges(key, oldValue, value);
      }
    },

    async remove(keys: string[]): Promise<void> {
      for (const key of keys) {
        const oldItem = localStorage.getItem(key);
        const oldValue = oldItem ? JSON.parse(oldItem) : undefined;

        localStorage.removeItem(key);
        notifyChanges(key, oldValue, undefined);
      }
    },

    async clear(): Promise<void> {
      localStorage.clear();
    },

    onChanged: {
      addListener(callback: (changes: any, namespace: string) => void) {
        listeners.push(callback);
      },
    },
  };
};

/**
 * 存储数据访问对象 - 负责底层数据持久化
 */
export class StorageDao {
  private static instance: StorageDao;
  private storageAPI: StorageAPI;

  private constructor() {
    const extensionStorageAPI = getStorageAPI();

    if (extensionStorageAPI) {
      this.storageAPI = extensionStorageAPI;
    } else if (!isServiceWorker()) {
      console.log('⚠️ Using localStorage fallback (not in service worker)');
      this.storageAPI = createLocalStorageFallback();
    } else {
      throw new Error(
        'Extension storage API not available in service worker environment'
      );
    }
  }

  static getInstance(): StorageDao {
    if (!StorageDao.instance) {
      StorageDao.instance = new StorageDao();
    }
    return StorageDao.instance;
  }

  /**
   * 保存规则组列表
   */
  async saveGroups(groups: GroupRuleVo[]): Promise<void> {
    console.log('💾 StorageDao.saveGroups:', groups.length);
    await this.storageAPI.set({ [STORAGE_KEY]: groups });
  }

  /**
   * 保存单个规则组
   */
  async saveGroup(group: GroupRuleVo): Promise<void> {
    console.log('💾 StorageDao.saveGroup:', group.id);
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
   * 加载规则组列表
   */
  async loadGroups(): Promise<GroupRuleVo[]> {
    console.log('📖 StorageDao.loadGroups');
    const result = await this.storageAPI.get([STORAGE_KEY]);
    const groups = result[STORAGE_KEY] || [];
    console.log('📖 StorageDao.loadGroups result:', groups.length);
    return groups;
  }

  /**
   * 保存全局启用状态
   */
  async saveGlobalEnabled(enabled: boolean): Promise<void> {
    console.log('💾 StorageDao.saveGlobalEnabled:', enabled);
    await this.storageAPI.set({ [GLOBAL_ENABLED_KEY]: enabled });
  }

  /**
   * 加载全局启用状态
   */
  async loadGlobalEnabled(): Promise<boolean> {
    console.log('📖 StorageDao.loadGlobalEnabled');
    const result = await this.storageAPI.get([GLOBAL_ENABLED_KEY]);
    const enabled = result[GLOBAL_ENABLED_KEY] ?? true;
    console.log('📖 StorageDao.loadGlobalEnabled result:', enabled);
    return enabled;
  }

  /**
   * 检查全局启用状态是否已存在
   */
  async hasGlobalEnabled(): Promise<boolean> {
    const result = await this.storageAPI.get([GLOBAL_ENABLED_KEY]);
    return GLOBAL_ENABLED_KEY in result;
  }

  /**
   * 清除所有存储数据
   */
  async clearAll(): Promise<void> {
    console.log('🗑️ StorageDao.clearAll');
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
