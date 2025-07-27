import { GroupRuleVo } from '../../../types';
import { 
  ApiRequestType,
  CreateGroupRequest,
  UpdateGroupRequest,
  DeleteGroupRequest,
  ToggleGroupRequest
} from '../../background/types/api';
import { Request, RequestResult } from '../utils/Request';

/**
 * 规则API - 专门处理规则组相关的业务接口
 * 基于Request工具，提供no-reject模式的API调用
 */
export class RuleApi {
  private static instance: RuleApi;
  private request: Request;

  private constructor() {
    this.request = Request.getInstance();
  }

  static getInstance(): RuleApi {
    if (!RuleApi.instance) {
      RuleApi.instance = new RuleApi();
    }
    return RuleApi.instance;
  }

  /**
   * 加载所有规则组
   */
  async loadGroups(): Promise<RequestResult<GroupRuleVo[]>> {
    console.log('🔄 RuleApi.loadGroups');
    
    const result = await this.request.send<GroupRuleVo[]>({
      type: ApiRequestType.LOAD_GROUPS
    });
    
    if (result.success) {
      console.log('✅ RuleApi.loadGroups success:', result.data?.length);
    } else {
      console.error('❌ RuleApi.loadGroups failed:', result.error);
    }
    
    return result;
  }

  /**
   * 保存所有规则组
   */
  async saveGroups(groups: GroupRuleVo[]): Promise<RequestResult<void>> {
    console.log('🔄 RuleApi.saveGroups:', groups.length);
    
    const result = await this.request.send<void>({
      type: ApiRequestType.SAVE_GROUPS,
      data: groups
    });
    
    if (result.success) {
      console.log('✅ RuleApi.saveGroups success');
    } else {
      console.error('❌ RuleApi.saveGroups failed:', result.error);
    }
    
    return result;
  }

  /**
   * 保存单个规则组
   */
  async saveGroup(group: GroupRuleVo): Promise<RequestResult<void>> {
    console.log('🔄 RuleApi.saveGroup:', group.id);
    
    const result = await this.request.send<void>({
      type: ApiRequestType.SAVE_GROUP,
      data: group
    });
    
    if (result.success) {
      console.log('✅ RuleApi.saveGroup success');
    } else {
      console.error('❌ RuleApi.saveGroup failed:', result.error);
    }
    
    return result;
  }

  /**
   * 创建新规则组
   */
  async createGroup(groupName: string, ruleText?: string): Promise<RequestResult<GroupRuleVo>> {
    console.log('🔄 RuleApi.createGroup:', groupName);
    
    if (!groupName.trim()) {
      return {
        success: false,
        error: '规则组名称不能为空',
        code: 'VALIDATION_ERROR'
      };
    }
    
    const request: CreateGroupRequest = { groupName: groupName.trim(), ruleText };
    
    const result = await this.request.send<GroupRuleVo>({
      type: ApiRequestType.CREATE_GROUP,
      data: request
    });
    
    if (result.success) {
      console.log('✅ RuleApi.createGroup success:', result.data?.id);
    } else {
      console.error('❌ RuleApi.createGroup failed:', result.error);
    }
    
    return result;
  }

  /**
   * 更新规则组
   */
  async updateGroup(groupId: string, updates: Partial<GroupRuleVo>): Promise<RequestResult<void>> {
    console.log('🔄 RuleApi.updateGroup:', groupId, Object.keys(updates));
    
    if (!groupId) {
      return {
        success: false,
        error: '规则组ID不能为空',
        code: 'VALIDATION_ERROR'
      };
    }
    
    if (!updates || Object.keys(updates).length === 0) {
      return {
        success: false,
        error: '更新数据不能为空',
        code: 'VALIDATION_ERROR'
      };
    }
    
    const request: UpdateGroupRequest = { groupId, updates };
    
    const result = await this.request.send<void>({
      type: ApiRequestType.UPDATE_GROUP,
      data: request
    });
    
    if (result.success) {
      console.log('✅ RuleApi.updateGroup success');
    } else {
      console.error('❌ RuleApi.updateGroup failed:', result.error);
    }
    
    return result;
  }

  /**
   * 删除规则组
   */
  async deleteGroup(groupId: string): Promise<RequestResult<void>> {
    console.log('🔄 RuleApi.deleteGroup:', groupId);
    
    if (!groupId) {
      return {
        success: false,
        error: '规则组ID不能为空',
        code: 'VALIDATION_ERROR'
      };
    }
    
    const request: DeleteGroupRequest = { groupId };
    
    const result = await this.request.send<void>({
      type: ApiRequestType.DELETE_GROUP,
      data: request
    });
    
    if (result.success) {
      console.log('✅ RuleApi.deleteGroup success');
    } else {
      console.error('❌ RuleApi.deleteGroup failed:', result.error);
    }
    
    return result;
  }

  /**
   * 切换规则组启用状态
   */
  async toggleGroup(groupId: string): Promise<RequestResult<boolean>> {
    console.log('🔄 RuleApi.toggleGroup:', groupId);
    
    if (!groupId) {
      return {
        success: false,
        error: '规则组ID不能为空',
        code: 'VALIDATION_ERROR'
      };
    }
    
    const request: ToggleGroupRequest = { groupId };
    
    const result = await this.request.send<{ enabled: boolean }>({
      type: ApiRequestType.TOGGLE_GROUP,
      data: request
    });
    
    if (result.success) {
      console.log('✅ RuleApi.toggleGroup success:', result.data?.enabled);
      return {
        success: true,
        data: result.data!.enabled
      };
    } else {
      console.error('❌ RuleApi.toggleGroup failed:', result.error);
      return {
        success: false,
        error: result.error,
        code: result.code
      };
    }
  }


  /**
   * 清除所有数据
   */
  async clearAllData(): Promise<RequestResult<void>> {
    console.log('🔄 RuleApi.clearAllData');
    
    const result = await this.request.send<void>({
      type: ApiRequestType.CLEAR_ALL_DATA
    });
    
    if (result.success) {
      console.log('✅ RuleApi.clearAllData success');
    } else {
      console.error('❌ RuleApi.clearAllData failed:', result.error);
    }
    
    return result;
  }
}