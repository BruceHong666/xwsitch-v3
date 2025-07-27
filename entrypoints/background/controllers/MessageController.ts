import { RuleService } from '../services/RuleService';
import { SystemService } from '../services/SystemService';
import {
  ApiRequest,
  ApiRequestType,
  ApiResponse,
  CreateGroupRequest,
  DeleteGroupRequest,
  MessageHandler,
  SaveGlobalEnabledRequest,
  ToggleGroupRequest,
  UpdateGroupRequest,
} from '../types/api';

/**
 * 消息控制器 - 负责处理来自popup的所有消息请求
 * 类似于传统后端的REST API Controller
 */
export class MessageController implements MessageHandler {
  private static instance: MessageController;
  private ruleService: RuleService;
  private systemService: SystemService;

  private constructor() {
    this.ruleService = RuleService.getInstance();
    this.systemService = SystemService.getInstance();
  }

  static getInstance(): MessageController {
    if (!MessageController.instance) {
      MessageController.instance = new MessageController();
    }
    return MessageController.instance;
  }

  /**
   * 处理消息请求的主入口
   */
  async handleMessage(request: ApiRequest, _sender: any): Promise<ApiResponse> {
    console.log('📨 MessageController received:', request.type, request.data);

    try {
      let result: any;

      switch (request.type) {
        // 规则组管理
        case ApiRequestType.LOAD_GROUPS:
          result = await this.handleLoadGroups();
          break;

        case ApiRequestType.SAVE_GROUP:
          result = await this.handleSaveGroup(request.data);
          break;

        case ApiRequestType.CREATE_GROUP:
          result = await this.handleCreateGroup(request.data);
          break;

        case ApiRequestType.UPDATE_GROUP:
          result = await this.handleUpdateGroup(request.data);
          break;

        case ApiRequestType.DELETE_GROUP:
          result = await this.handleDeleteGroup(request.data);
          break;

        case ApiRequestType.TOGGLE_GROUP:
          result = await this.handleToggleGroup(request.data);
          break;

        // 全局设置
        case ApiRequestType.LOAD_GLOBAL_ENABLED:
          result = await this.handleLoadGlobalEnabled();
          break;

        case ApiRequestType.SAVE_GLOBAL_ENABLED:
          result = await this.handleSaveGlobalEnabled(request.data);
          break;

        // 系统操作
        case ApiRequestType.UPDATE_BADGE:
          result = await this.handleUpdateBadge();
          break;

        case ApiRequestType.CLEAR_ALL_DATA:
          result = await this.handleClearAllData();
          break;

        case ApiRequestType.INITIALIZE_DEFAULT_DATA:
          result = await this.handleInitializeDefaultData();
          break;

        default:
          console.warn('⚠️ Unknown request type:', request.type);
          throw new Error(`未知的请求类型: ${request.type}`);
      }

      const response: ApiResponse = {
        success: true,
        data: result,
      };

      console.log('✅ MessageController response:', request.type, 'success');
      return response;
    } catch (error) {
      console.error('❌ MessageController error:', request.type, error);

      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      };

      return response;
    }
  }

  /**
   * 处理加载规则组请求
   */
  private async handleLoadGroups() {
    return await this.ruleService.loadGroups();
  }

  /**
   * 处理保存单个规则组请求
   */
  private async handleSaveGroup(data: any) {
    if (!data || !data.id) {
      throw new Error('规则组数据和ID不能为空');
    }
    await this.ruleService.saveGroup(data);
    return { success: true };
  }

  /**
   * 处理创建规则组请求
   */
  private async handleCreateGroup(data: CreateGroupRequest) {
    if (!data.groupName) {
      throw new Error('规则组名称不能为空');
    }
    return await this.ruleService.createGroup(data.groupName, data.ruleText);
  }

  /**
   * 处理更新规则组请求
   */
  private async handleUpdateGroup(data: UpdateGroupRequest) {
    if (!data.groupId) {
      throw new Error('规则组ID不能为空');
    }
    if (!data.updates) {
      throw new Error('更新数据不能为空');
    }
    await this.ruleService.updateGroup(data.groupId, data.updates);
    return { success: true };
  }

  /**
   * 处理删除规则组请求
   */
  private async handleDeleteGroup(data: DeleteGroupRequest) {
    if (!data.groupId) {
      throw new Error('规则组ID不能为空');
    }
    await this.ruleService.deleteGroup(data.groupId);
    return { success: true };
  }

  /**
   * 处理切换规则组状态请求
   */
  private async handleToggleGroup(data: ToggleGroupRequest) {
    if (!data.groupId) {
      throw new Error('规则组ID不能为空');
    }
    const enabled = await this.ruleService.toggleGroup(data.groupId);
    return { enabled };
  }

  /**
   * 处理加载全局启用状态请求
   */
  private async handleLoadGlobalEnabled() {
    return await this.systemService.loadGlobalEnabled();
  }

  /**
   * 处理保存全局启用状态请求
   */
  private async handleSaveGlobalEnabled(data: SaveGlobalEnabledRequest) {
    if (typeof data.enabled !== 'boolean') {
      throw new Error('启用状态必须是布尔值');
    }
    await this.systemService.saveGlobalEnabled(data.enabled);
    return { success: true };
  }

  /**
   * 处理更新徽章请求
   */
  private async handleUpdateBadge() {
    await this.systemService.updateBadge();
    return { success: true };
  }

  /**
   * 处理清除所有数据请求
   */
  private async handleClearAllData() {
    await this.ruleService.clearAllData();
    return { success: true };
  }

  /**
   * 处理初始化默认数据请求
   */
  private async handleInitializeDefaultData() {
    console.log('🔄 MessageController.handleInitializeDefaultData');
    await this.ruleService.initializeDefaultData();
    console.log('✅ MessageController.handleInitializeDefaultData completed');
    return { success: true };
  }
}
