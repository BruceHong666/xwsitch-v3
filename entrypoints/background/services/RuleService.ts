import { GroupRuleVo } from '../../../types';
import { DEFAULT_NEW_RULE, DEFAULT_RULE } from '../../utils/const';
import { StorageDao } from '../dao/StorageDao';
import { networkService } from '../../utils/network';

/**
 * 规则服务 - 负责规则组的业务逻辑处理
 */
export class RuleService {
  private static instance: RuleService;
  private storageDao: StorageDao;

  private constructor() {
    this.storageDao = StorageDao.getInstance();
  }

  static getInstance(): RuleService {
    if (!RuleService.instance) {
      RuleService.instance = new RuleService();
    }
    return RuleService.instance;
  }

  /**
   * 加载所有规则组
   */
  async loadGroups(): Promise<GroupRuleVo[]> {
    try {
      const groups = await this.storageDao.loadGroups();
      return groups;
    } catch (error) {
      console.error(
        '❌ RuleService.loadGroups failed:',
        'Error:',
        error instanceof Error ? error.message : String(error),
        'Code: RULE_SERVICE_ERROR'
      );
      throw error;
    }
  }

  /**
   * 保存所有规则组
   */
  async saveGroups(groups: GroupRuleVo[]): Promise<void> {
    try {
      // 验证规则组数据
      this.validateGroups(groups);
      await this.storageDao.saveGroups(groups);
    } catch (error) {
      console.error(
        '❌ RuleService.saveGroups failed:',
        'Groups count:',
        groups.length,
        'Error:',
        error instanceof Error ? error.message : String(error),
        'Code: RULE_SERVICE_ERROR'
      );
      throw error;
    }
  }

  /**
   * 保存单个规则组
   */
  async saveGroup(group: GroupRuleVo): Promise<void> {
    try {
      // 验证单个规则组数据
      this.validateGroup(group);
      await this.storageDao.saveGroup(group);
    } catch (error) {
      console.error(
        '❌ RuleService.saveGroup failed:',
        'Group ID:',
        group.id,
        'Error:',
        error instanceof Error ? error.message : String(error),
        'Code: RULE_SERVICE_ERROR'
      );
      throw error;
    }
  }

  /**
   * 创建新规则组
   */
  async createGroup(
    groupName: string,
    ruleText: string = DEFAULT_NEW_RULE
  ): Promise<GroupRuleVo> {
    try {
      // 验证输入参数
      if (!groupName.trim()) {
        throw new Error('规则组名称不能为空');
      }

      // 检查名称是否重复
      const existingGroups = await this.loadGroups();
      if (existingGroups.some(group => group.groupName === groupName)) {
        throw new Error('规则组名称已存在');
      }

      const newGroup: GroupRuleVo = {
        id: Date.now().toString(),
        groupName: groupName.trim(),
        enabled: true,
        ruleText,
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString(),
      };

      const updatedGroups = [...existingGroups, newGroup];
      await this.saveGroups(updatedGroups);

      return newGroup;
    } catch (error) {
      console.error(
        '❌ RuleService.createGroup failed:',
        'Group name:',
        groupName,
        'Error:',
        error instanceof Error ? error.message : String(error),
        'Code: RULE_SERVICE_ERROR'
      );
      throw error;
    }
  }

  /**
   * 更新规则组
   */
  async updateGroup(
    groupId: string,
    updates: Partial<GroupRuleVo>
  ): Promise<void> {
    try {
      const groups = await this.loadGroups();
      const groupIndex = groups.findIndex(group => group.id === groupId);

      if (groupIndex === -1) {
        throw new Error('规则组不存在');
      }

      // 如果更新名称，检查是否重复
      if (
        updates.groupName &&
        updates.groupName !== groups[groupIndex].groupName
      ) {
        if (
          groups.some(
            group =>
              group.id !== groupId && group.groupName === updates.groupName
          )
        ) {
          throw new Error('规则组名称已存在');
        }
      }

      // 更新规则组
      const updatedGroup = {
        ...groups[groupIndex],
        ...updates,
        updateTime: new Date().toISOString(),
      };

      await this.saveGroup(updatedGroup);
    } catch (error) {
      console.error(
        '❌ RuleService.updateGroup failed:',
        'Group ID:',
        groupId,
        'Updates:',
        Object.keys(updates),
        'Error:',
        error instanceof Error ? error.message : String(error),
        'Code: RULE_SERVICE_ERROR'
      );
      throw error;
    }
  }

  /**
   * 删除规则组
   */
  async deleteGroup(groupId: string): Promise<void> {
    try {
      const groups = await this.loadGroups();
      const filteredGroups = groups.filter(group => group.id !== groupId);

      if (filteredGroups.length === groups.length) {
        throw new Error('规则组不存在');
      }

      await this.saveGroups(filteredGroups);
    } catch (error) {
      console.error(
        '❌ RuleService.deleteGroup failed:',
        'Group ID:',
        groupId,
        'Error:',
        error instanceof Error ? error.message : String(error),
        'Code: RULE_SERVICE_ERROR'
      );
      throw error;
    }
  }

  /**
   * 切换规则组启用状态
   */
  async toggleGroup(groupId: string): Promise<boolean> {
    try {
      const groups = await this.loadGroups();
      const group = groups.find(g => g.id === groupId);

      if (!group) {
        throw new Error('规则组不存在');
      }

      const newEnabled = !group.enabled;
      await this.updateGroup(groupId, { enabled: newEnabled });

      return newEnabled;
    } catch (error) {
      console.error(
        '❌ RuleService.toggleGroup failed:',
        'Group ID:',
        groupId,
        'Error:',
        error instanceof Error ? error.message : String(error),
        'Code: RULE_SERVICE_ERROR'
      );
      throw error;
    }
  }

  /**
   * 获取指定规则组
   */
  async getGroup(groupId: string): Promise<GroupRuleVo | null> {
    try {
      const groups = await this.loadGroups();
      const group = groups.find(group => group.id === groupId) || null;
      return group;
    } catch (error) {
      console.error(
        '❌ RuleService.getGroup failed:',
        'Group ID:',
        groupId,
        'Error:',
        error instanceof Error ? error.message : String(error),
        'Code: RULE_SERVICE_ERROR'
      );
      throw error;
    }
  }

  /**
   * 清除所有数据
   */
  async clearAllData(): Promise<void> {
    try {
      await this.storageDao.clearAll();
    } catch (error) {
      console.error(
        '❌ RuleService.clearAllData failed:',
        'Error:',
        error instanceof Error ? error.message : String(error),
        'Code: RULE_SERVICE_ERROR'
      );
      throw error;
    }
  }

  /**
   * 初始化默认数据
   */
  async initializeDefaultData(): Promise<void> {
    try {
      // 检查是否已有全局启用状态设置
      const hasGlobalEnabled = await this.storageDao.hasGlobalEnabled();
      if (!hasGlobalEnabled) {
        await this.storageDao.saveGlobalEnabled(true);
      }

      // 检查是否已有规则组
      const groups = await this.loadGroups();
      if (groups.length === 0) {
        await this.createGroup('默认规则组', DEFAULT_RULE);
      }
    } catch (error) {
      console.error(
        '❌ RuleService.initializeDefaultData failed:',
        'Error:',
        error instanceof Error ? error.message : String(error),
        'Code: RULE_SERVICE_ERROR'
      );
      throw error;
    }
  }

  /**
   * 验证单个规则组数据
   */
  private validateGroup(group: GroupRuleVo): void {
    if (!group.id || !group.groupName) {
      throw new Error('规则组数据格式不正确：缺少必要字段');
    }

    if (typeof group.enabled !== 'boolean') {
      throw new Error('规则组启用状态必须是布尔值');
    }

    if (typeof group.ruleText !== 'string') {
      throw new Error('规则组内容必须是字符串');
    }
  }

  /**
   * 验证规则组数据
   */
  private validateGroups(groups: GroupRuleVo[]): void {
    if (!Array.isArray(groups)) {
      throw new Error('规则组数据必须是数组格式');
    }

    for (const group of groups) {
      this.validateGroup(group);
    }

    // 检查ID重复
    const ids = groups.map(group => group.id);
    const uniqueIds = new Set(ids);
    if (ids.length !== uniqueIds.size) {
      throw new Error('规则组ID不能重复');
    }

    // 检查名称重复
    const names = groups.map(group => group.groupName);
    const uniqueNames = new Set(names);
    if (names.length !== uniqueNames.size) {
      throw new Error('规则组名称不能重复');
    }
  }
}
