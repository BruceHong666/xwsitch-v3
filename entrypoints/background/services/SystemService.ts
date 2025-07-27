import { GroupRuleVo } from '../../../types';
import { countActiveRules, validateJsonFormat } from '../../utils/json';
import { networkService } from '../../utils/network';
import { StorageDao } from '../dao/StorageDao';
import { RuleService } from './RuleService';

/**
 * 系统服务 - 负责全局设置、徽章管理等系统级功能
 */
export class SystemService {
  private static instance: SystemService;
  private storageDao: StorageDao;
  private ruleService: RuleService;

  private constructor() {
    this.storageDao = StorageDao.getInstance();
    this.ruleService = RuleService.getInstance();
  }

  static getInstance(): SystemService {
    if (!SystemService.instance) {
      SystemService.instance = new SystemService();
    }
    return SystemService.instance;
  }

  /**
   * 加载全局启用状态
   */
  async loadGlobalEnabled(): Promise<boolean> {
    console.log('🔄 SystemService.loadGlobalEnabled');
    try {
      const enabled = await this.storageDao.loadGlobalEnabled();
      console.log('✅ SystemService.loadGlobalEnabled success:', enabled);
      return enabled;
    } catch (error) {
      console.error('❌ SystemService.loadGlobalEnabled failed:', error);
      throw error;
    }
  }

  /**
   * 保存全局启用状态
   */
  async saveGlobalEnabled(enabled: boolean): Promise<void> {
    console.log('🔄 SystemService.saveGlobalEnabled:', enabled);
    try {
      await this.storageDao.saveGlobalEnabled(enabled);
      console.log('✅ SystemService.saveGlobalEnabled success');
    } catch (error) {
      console.error('❌ SystemService.saveGlobalEnabled failed:', error);
      throw error;
    }
  }

  /**
   * 更新徽章状态
   */
  async updateBadge(): Promise<void> {
    console.log('🔄 SystemService.updateBadge');
    try {
      const [groups, globalEnabled] = await Promise.all([
        this.ruleService.loadGroups(),
        this.loadGlobalEnabled(),
      ]);

      console.log(
        '📊 Badge update data:',
        JSON.stringify({
          groups: groups.length,
          globalEnabled,
          enabledGroups: groups.filter(g => g.enabled).length,
        })
      );

      if (!globalEnabled) {
        console.log('🔴 Setting badge to OFF (global disabled)');
        this.setBadge('OFF', '#ff4d4f');
        return;
      }

      const totalActiveRules = this.calculateTotalActiveRules(groups);
      console.log('Total active rules:', totalActiveRules);

      if (totalActiveRules > 0) {
        console.log(`🟢 Setting badge to ${totalActiveRules} (active rules)`);
        this.setBadge(totalActiveRules.toString(), '#52c41a');
      } else {
        console.log('🟡 Setting badge to 0 (no active rules)');
        this.setBadge('0', '#faad14');
      }

      console.log('✅ SystemService.updateBadge success');
    } catch (error) {
      console.error('❌ SystemService.updateBadge failed:', error);
      this.setBadge('ERR', '#ff4d4f');
    }
  }

  /**
   * 更新网络规则
   */
  async updateNetworkRules(): Promise<void> {
    console.log('🔄 SystemService.updateNetworkRules');
    try {
      const [groups, globalEnabled] = await Promise.all([
        this.ruleService.loadGroups(),
        this.loadGlobalEnabled(),
      ]);

      console.log(
        '📊 Network rules update data:',
        JSON.stringify({
          groups: groups.length,
          globalEnabled,
          enabledGroups: groups.filter(g => g.enabled).length,
        })
      );

      await networkService.updateRules(groups, globalEnabled);
      networkService.setupNetworkLogging(globalEnabled, groups);

      console.log('✅ SystemService.updateNetworkRules success');
    } catch (error) {
      console.error('❌ SystemService.updateNetworkRules failed:', error);
      throw error;
    }
  }

  /**
   * 初始化系统（启动时调用）
   */
  async initialize(): Promise<void> {
    console.log('🔄 SystemService.initialize');
    try {
      // 初始化默认数据
      await this.ruleService.initializeDefaultData();

      // 更新网络规则和徽章
      await Promise.all([this.updateNetworkRules(), this.updateBadge()]);

      console.log('✅ SystemService.initialize success');
    } catch (error) {
      console.error('❌ SystemService.initialize failed:', error);
      throw error;
    }
  }

  /**
   * 监听存储变化并更新相关状态
   */
  setupStorageListener(): void {
    console.log('👂 SystemService.setupStorageListener');
    this.storageDao.onStorageChanged(changes => {
      console.log(
        '📦 Storage changed, updating badge and network rules:',
        JSON.stringify(changes)
      );

      // 异步更新，避免阻塞
      Promise.all([this.updateBadge(), this.updateNetworkRules()]).catch(
        error => {
          console.error('❌ Error updating after storage change:', error);
        }
      );
    });
  }

  /**
   * 计算总的活跃规则数量
   */
  private calculateTotalActiveRules(groups: GroupRuleVo[]): number {
    let totalRules = 0;

    groups.forEach(group => {
      if (!group.enabled) return;

      const validation = validateJsonFormat(group.ruleText);
      if (!validation.isValid) return;

      totalRules += countActiveRules(group.ruleText);
    });

    return totalRules;
  }

  /**
   * 设置徽章文本和颜色
   */
  private setBadge(text: string, color: string): void {
    console.log(`🎯 setBadge called:`, JSON.stringify({ text, color }));
    try {
      if (typeof browser !== 'undefined' && browser.action) {
        console.log('🌐 Using browser.action API');
        browser.action.setBadgeText({ text });
        browser.action.setBadgeBackgroundColor({ color });
        console.log('✅ Badge set successfully via browser.action');
      } else {
        console.warn('⚠️ No badge API available');
      }
    } catch (error) {
      console.error('❌ Failed to set badge:', error);
    }
  }
}
