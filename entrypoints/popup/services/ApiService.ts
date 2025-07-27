import { GroupRuleVo } from '../../../types';
import { 
  ApiRequest, 
  ApiResponse, 
  ApiRequestType, 
  MessageSender,
  CreateGroupRequest,
  UpdateGroupRequest,
  DeleteGroupRequest,
  ToggleGroupRequest,
  SaveGlobalEnabledRequest
} from '../../background/types/api';

/**
 * API服务 - popup端与background通信的统一接口
 * 类似于前端的HTTP客户端
 */
export class ApiService implements MessageSender {
  private static instance: ApiService;

  private constructor() {}

  static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  /**
   * 发送消息到background
   */
  async sendMessage<T = any>(request: ApiRequest): Promise<ApiResponse<T>> {
    console.log('📤 ApiService.sendMessage:', request.type, request.data);
    
    try {
      const response = await browser.runtime.sendMessage(request) as ApiResponse<T>;
      
      if (response.success) {
        console.log('✅ ApiService.sendMessage success:', request.type);
      } else {
        console.error('❌ ApiService.sendMessage failed:', request.type, response.error);
      }
      
      return response;
    } catch (error) {
      console.error('❌ ApiService.sendMessage error:', request.type, error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : '通信失败'
      };
    }
  }

  // ==================== 规则组管理 API ====================

  /**
   * 加载所有规则组
   */
  async loadGroups(): Promise<GroupRuleVo[]> {
    const response = await this.sendMessage<GroupRuleVo[]>({
      type: ApiRequestType.LOAD_GROUPS
    });
    
    if (!response.success) {
      throw new Error(response.error || '加载规则组失败');
    }
    
    return response.data || [];
  }

  /**
   * 保存所有规则组
   */
  async saveGroups(groups: GroupRuleVo[]): Promise<void> {
    const response = await this.sendMessage({
      type: ApiRequestType.SAVE_GROUPS,
      data: groups
    });
    
    if (!response.success) {
      throw new Error(response.error || '保存规则组失败');
    }
  }

  /**
   * 创建新规则组
   */
  async createGroup(groupName: string, ruleText?: string): Promise<GroupRuleVo> {
    const request: CreateGroupRequest = { groupName, ruleText };
    
    const response = await this.sendMessage<GroupRuleVo>({
      type: ApiRequestType.CREATE_GROUP,
      data: request
    });
    
    if (!response.success) {
      throw new Error(response.error || '创建规则组失败');
    }
    
    return response.data!;
  }

  /**
   * 更新规则组
   */
  async updateGroup(groupId: string, updates: Partial<GroupRuleVo>): Promise<void> {
    const request: UpdateGroupRequest = { groupId, updates };
    
    const response = await this.sendMessage({
      type: ApiRequestType.UPDATE_GROUP,
      data: request
    });
    
    if (!response.success) {
      throw new Error(response.error || '更新规则组失败');
    }
  }

  /**
   * 删除规则组
   */
  async deleteGroup(groupId: string): Promise<void> {
    const request: DeleteGroupRequest = { groupId };
    
    const response = await this.sendMessage({
      type: ApiRequestType.DELETE_GROUP,
      data: request
    });
    
    if (!response.success) {
      throw new Error(response.error || '删除规则组失败');
    }
  }

  /**
   * 切换规则组启用状态
   */
  async toggleGroup(groupId: string): Promise<boolean> {
    const request: ToggleGroupRequest = { groupId };
    
    const response = await this.sendMessage<{ enabled: boolean }>({
      type: ApiRequestType.TOGGLE_GROUP,
      data: request
    });
    
    if (!response.success) {
      throw new Error(response.error || '切换规则组状态失败');
    }
    
    return response.data!.enabled;
  }

  // ==================== 全局设置 API ====================

  /**
   * 加载全局启用状态
   */
  async loadGlobalEnabled(): Promise<boolean> {
    const response = await this.sendMessage<boolean>({
      type: ApiRequestType.LOAD_GLOBAL_ENABLED
    });
    
    if (!response.success) {
      throw new Error(response.error || '加载全局状态失败');
    }
    
    return response.data!;
  }

  /**
   * 保存全局启用状态
   */
  async saveGlobalEnabled(enabled: boolean): Promise<void> {
    const request: SaveGlobalEnabledRequest = { enabled };
    
    const response = await this.sendMessage({
      type: ApiRequestType.SAVE_GLOBAL_ENABLED,
      data: request
    });
    
    if (!response.success) {
      throw new Error(response.error || '保存全局状态失败');
    }
  }


  // ==================== 系统操作 API ====================

  /**
   * 更新徽章
   */
  async updateBadge(): Promise<void> {
    const response = await this.sendMessage({
      type: ApiRequestType.UPDATE_BADGE
    });
    
    if (!response.success) {
      throw new Error(response.error || '更新徽章失败');
    }
  }

  /**
   * 清除所有数据
   */
  async clearAllData(): Promise<void> {
    const response = await this.sendMessage({
      type: ApiRequestType.CLEAR_ALL_DATA
    });
    
    if (!response.success) {
      throw new Error(response.error || '清除数据失败');
    }
  }

  /**
   * 初始化默认数据
   */
  async initializeDefaultData(): Promise<void> {
    const response = await this.sendMessage({
      type: ApiRequestType.INITIALIZE_DEFAULT_DATA
    });
    
    if (!response.success) {
      throw new Error(response.error || '初始化默认数据失败');
    }
  }
}