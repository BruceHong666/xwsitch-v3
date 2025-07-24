import { GroupRuleVo } from '../types';

const STORAGE_KEY = 'xswitch_groups';
const GLOBAL_ENABLED_KEY = 'xswitch_global_enabled';

// WXT 最佳实践: 使用 storage API
export const storage = {
  async saveGroups(groups: GroupRuleVo[]): Promise<void> {
    try {
      await browser.storage.local.set({ [STORAGE_KEY]: groups });
    } catch (error) {
      console.error('Failed to save groups:', error);
      throw error;
    }
  },

  async loadGroups(): Promise<GroupRuleVo[]> {
    try {
      const result = await browser.storage.local.get([STORAGE_KEY]);
      return result[STORAGE_KEY] || [];
    } catch (error) {
      console.error('Failed to load groups:', error);
      return [];
    }
  },

  async saveGlobalEnabled(enabled: boolean): Promise<void> {
    try {
      await browser.storage.local.set({ [GLOBAL_ENABLED_KEY]: enabled });
    } catch (error) {
      console.error('Failed to save global enabled state:', error);
      throw error;
    }
  },

  async loadGlobalEnabled(): Promise<boolean> {
    try {
      const result = await browser.storage.local.get([GLOBAL_ENABLED_KEY]);
      return result[GLOBAL_ENABLED_KEY] ?? true;
    } catch (error) {
      console.error('Failed to load global enabled state:', error);
      return true;
    }
  },

  async exportData(): Promise<string> {
    const groups = await this.loadGroups();
    const globalEnabled = await this.loadGlobalEnabled();
    return JSON.stringify({
      groups,
      globalEnabled,
      exportedAt: new Date().toISOString(),
    }, null, 2);
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
  onStorageChanged(callback: (changes: any) => void): void {
    browser.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local') {
        callback(changes);
      }
    });
  }
};