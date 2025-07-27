import { GroupRuleVo } from '../../../types';

/**
 * API请求类型枚举
 */
export enum ApiRequestType {
  // 规则组管理
  LOAD_GROUPS = 'LOAD_GROUPS',
  SAVE_GROUP = 'SAVE_GROUP',
  CREATE_GROUP = 'CREATE_GROUP',
  UPDATE_GROUP = 'UPDATE_GROUP',
  DELETE_GROUP = 'DELETE_GROUP',
  TOGGLE_GROUP = 'TOGGLE_GROUP',

  // 全局设置
  LOAD_GLOBAL_ENABLED = 'LOAD_GLOBAL_ENABLED',
  SAVE_GLOBAL_ENABLED = 'SAVE_GLOBAL_ENABLED',

  // 系统操作
  UPDATE_BADGE = 'UPDATE_BADGE',
  CLEAR_ALL_DATA = 'CLEAR_ALL_DATA',
  INITIALIZE_DEFAULT_DATA = 'INITIALIZE_DEFAULT_DATA',
}

/**
 * API响应基础类型
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

/**
 * API请求基础类型
 */
export interface ApiRequest<T = any> {
  type: ApiRequestType;
  data?: T;
  requestId?: string;
}

/**
 * 创建规则组请求参数
 */
export interface CreateGroupRequest {
  groupName: string;
  ruleText?: string;
}

/**
 * 更新规则组请求参数
 */
export interface UpdateGroupRequest {
  groupId: string;
  updates: Partial<GroupRuleVo>;
}

/**
 * 删除规则组请求参数
 */
export interface DeleteGroupRequest {
  groupId: string;
}

/**
 * 切换规则组状态请求参数
 */
export interface ToggleGroupRequest {
  groupId: string;
}

/**
 * 保存全局启用状态请求参数
 */
export interface SaveGlobalEnabledRequest {
  enabled: boolean;
}

/**
 * 消息发送器接口
 */
export interface MessageSender {
  sendMessage<T = any>(request: ApiRequest): Promise<ApiResponse<T>>;
}

/**
 * 消息处理器接口
 */
export interface MessageHandler {
  handleMessage(request: ApiRequest, sender: any): Promise<ApiResponse>;
}
