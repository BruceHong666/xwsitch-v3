import { GroupRuleVo } from '../../../types';
import {
  ApiRequest,
  ApiRequestType,
  ApiResponse,
  CreateGroupRequest,
  DeleteGroupRequest,
  SaveGlobalEnabledRequest,
  ToggleGroupRequest,
  UpdateGroupRequest,
} from '../../background/types/api';

/**
 * 请求结果类型 - no-reject模式，永远不抛出异常
 */
export interface RequestResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

/**
 * 核心请求方法 - 统一的API调用入口
 */
export async function request<T = unknown>(
  apiRequest: ApiRequest
): Promise<RequestResult<T>> {
  try {
    // 检查运行环境
    if (typeof browser === 'undefined' || !browser.runtime) {
      return {
        success: false,
        error: '运行环境不支持browser.runtime',
        code: 'ENV_ERROR',
      };
    }

    // 发送消息到background
    const response = (await browser.runtime.sendMessage(
      apiRequest
    )) as ApiResponse<T>;

    if (response && typeof response === 'object' && 'success' in response) {
      if (response.success) {
        return {
          success: true,
          data: response.data,
        };
      } else {
        return {
          success: false,
          error: response.error || 'API调用失败',
          code: 'API_ERROR',
        };
      }
    } else {
      return {
        success: false,
        error: 'API响应格式错误',
        code: 'RESPONSE_ERROR',
      };
    }
  } catch (error) {
    // 处理不同类型的错误
    if (error instanceof Error) {
      if (error.message.includes('Could not establish connection')) {
        return {
          success: false,
          error: '无法连接到后台服务',
          code: 'CONNECTION_ERROR',
        };
      } else if (error.message.includes('Extension context invalidated')) {
        return {
          success: false,
          error: '扩展上下文已失效，请刷新页面',
          code: 'CONTEXT_ERROR',
        };
      } else {
        return {
          success: false,
          error: error.message,
          code: 'UNKNOWN_ERROR',
        };
      }
    }

    return {
      success: false,
      error: '网络请求失败',
      code: 'NETWORK_ERROR',
    };
  }
}

// ==================== 规则组管理 API ====================

/**
 * 加载所有规则组
 */
export function loadGroupsRequest(): Promise<RequestResult<GroupRuleVo[]>> {
  return request<GroupRuleVo[]>({
    type: ApiRequestType.LOAD_GROUPS,
  });
}

/**
 * 保存单个规则组
 */
export function saveGroupRequest(
  group: GroupRuleVo
): Promise<RequestResult<void>> {
  return request<void>({
    type: ApiRequestType.SAVE_GROUP,
    data: group,
  });
}

/**
 * 创建新规则组
 */
export function createGroupRequest(
  groupName: string,
  ruleText?: string
): Promise<RequestResult<GroupRuleVo>> {
  const requestData: CreateGroupRequest = {
    groupName,
    ruleText,
  };

  return request<GroupRuleVo>({
    type: ApiRequestType.CREATE_GROUP,
    data: requestData,
  });
}

/**
 * 更新规则组
 */
export function updateGroupRequest(
  groupId: string,
  updates: Partial<GroupRuleVo>
): Promise<RequestResult<void>> {
  const requestData: UpdateGroupRequest = { groupId, updates };

  return request<void>({
    type: ApiRequestType.UPDATE_GROUP,
    data: requestData,
  });
}

/**
 * 删除规则组
 */
export function deleteGroupRequest(
  groupId: string
): Promise<RequestResult<void>> {
  const requestData: DeleteGroupRequest = { groupId };

  return request<void>({
    type: ApiRequestType.DELETE_GROUP,
    data: requestData,
  });
}

/**
 * 切换规则组启用状态
 */
export function toggleGroupRequest(
  groupId: string
): Promise<RequestResult<boolean>> {
  const requestData: ToggleGroupRequest = { groupId };

  return request<{ enabled: boolean }>({
    type: ApiRequestType.TOGGLE_GROUP,
    data: requestData,
  }).then(result => {
    if (result.success) {
      return {
        success: true,
        data: result.data!.enabled,
      };
    } else {
      return {
        success: false,
        error: result.error,
        code: result.code,
      };
    }
  });
}

/**
 * 清除所有数据
 */
export function clearAllDataRequest(): Promise<RequestResult<void>> {
  return request<void>({
    type: ApiRequestType.CLEAR_ALL_DATA,
  });
}

// ==================== 系统设置 API ====================

/**
 * 加载全局启用状态
 */
export function loadGlobalEnabledRequest(): Promise<RequestResult<boolean>> {
  return request<boolean>({
    type: ApiRequestType.LOAD_GLOBAL_ENABLED,
  });
}

/**
 * 保存全局启用状态
 */
export function saveGlobalEnabledRequest(
  enabled: boolean
): Promise<RequestResult<void>> {
  const requestData: SaveGlobalEnabledRequest = { enabled };

  return request<void>({
    type: ApiRequestType.SAVE_GLOBAL_ENABLED,
    data: requestData,
  });
}

/**
 * 更新徽章
 */
export function updateBadgeRequest(): Promise<RequestResult<void>> {
  return request<void>({
    type: ApiRequestType.UPDATE_BADGE,
  });
}

/**
 * 初始化默认数据
 */
export function initializeDefaultDataRequest(): Promise<RequestResult<void>> {
  return request<void>({
    type: ApiRequestType.INITIALIZE_DEFAULT_DATA,
  });
}

// ==================== 工具函数 ====================

/**
 * 批量发送请求 - 并行执行
 */
export async function batchRequest<T = unknown>(
  requests: ApiRequest[]
): Promise<RequestResult<T>[]> {
  try {
    const promises = requests.map(req => request<T>(req));
    const results = await Promise.all(promises);
    return results;
  } catch (error) {
    // 这种情况理论上不会发生，因为request方法是no-reject的
    return requests.map(() => ({
      success: false,
      error: '批量请求失败',
      code: 'BATCH_ERROR',
    }));
  }
}
