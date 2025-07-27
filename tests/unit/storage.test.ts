import { StorageDao } from '../../entrypoints/background/dao/StorageDao';
import { GroupRuleVo } from '../../types';

// 创建兼容的存储接口
const compatStorage = {
  async loadGroups(): Promise<GroupRuleVo[]> {
    const storage = StorageDao.getInstance();
    return await storage.loadGroups();
  },

  async saveGroup(group: GroupRuleVo) {
    const storage = StorageDao.getInstance();
    await storage.saveGroup(group);
    return { success: true };
  },

  async saveGlobalEnabled(enabled: boolean) {
    const storage = StorageDao.getInstance();
    await storage.saveGlobalEnabled(enabled);
    return { success: true };
  },

  async loadGlobalEnabled(): Promise<boolean> {
    const storage = StorageDao.getInstance();
    return await storage.loadGlobalEnabled();
  },

  async hasGlobalEnabled(): Promise<boolean> {
    const storage = StorageDao.getInstance();
    return await storage.hasGlobalEnabled();
  },

  onStorageChanged(callback: (changes: any) => void): void {
    const storage = StorageDao.getInstance();
    storage.onStorageChanged(callback);
  },
};
