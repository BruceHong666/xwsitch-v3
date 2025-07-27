import {
  ApiRequestType,
  SaveGlobalEnabledRequest,
} from '../../background/types/api';
import { Request, RequestResult } from '../utils/Request';

/**
 * 系统API - 专门处理系统级功能的业务接口
 * 包括全局设置、徽章更新等功能
 */
export class SystemApi {
  private static instance: SystemApi;
  private request: Request;

  private constructor() {
    this.request = Request.getInstance();
  }

  static getInstance(): SystemApi {
    if (!SystemApi.instance) {
      SystemApi.instance = new SystemApi();
    }
    return SystemApi.instance;
  }

  /**
   * 加载全局启用状态
   */
  async loadGlobalEnabled(): Promise<RequestResult<boolean>> {
    console.log('🔄 SystemApi.loadGlobalEnabled');

    const result = await this.request.send<boolean>({
      type: ApiRequestType.LOAD_GLOBAL_ENABLED,
    });

    if (result.success) {
      console.log('✅ SystemApi.loadGlobalEnabled success:', result.data);
    } else {
      console.error('❌ SystemApi.loadGlobalEnabled failed:', result.error);
    }

    return result;
  }

  /**
   * 保存全局启用状态
   */
  async saveGlobalEnabled(enabled: boolean): Promise<RequestResult<void>> {
    console.log('🔄 SystemApi.saveGlobalEnabled:', enabled);

    if (typeof enabled !== 'boolean') {
      return {
        success: false,
        error: '启用状态必须是布尔值',
        code: 'VALIDATION_ERROR',
      };
    }

    const request: SaveGlobalEnabledRequest = { enabled };

    const result = await this.request.send<void>({
      type: ApiRequestType.SAVE_GLOBAL_ENABLED,
      data: request,
    });

    if (result.success) {
      console.log('✅ SystemApi.saveGlobalEnabled success');
    } else {
      console.error('❌ SystemApi.saveGlobalEnabled failed:', result.error);
    }

    return result;
  }

  /**
   * 更新徽章
   */
  async updateBadge(): Promise<RequestResult<void>> {
    console.log('🔄 SystemApi.updateBadge');

    const result = await this.request.send<void>({
      type: ApiRequestType.UPDATE_BADGE,
    });

    if (result.success) {
      console.log('✅ SystemApi.updateBadge success');
    } else {
      console.error('❌ SystemApi.updateBadge failed:', result.error);
    }

    return result;
  }

  /**
   * 初始化默认数据
   */
  async initializeDefaultData(): Promise<RequestResult<void>> {
    console.log('🔄 SystemApi.initializeDefaultData');

    const result = await this.request.send<void>({
      type: ApiRequestType.INITIALIZE_DEFAULT_DATA,
    });

    if (result.success) {
      console.log('✅ SystemApi.initializeDefaultData success');
    } else {
      console.error('❌ SystemApi.initializeDefaultData failed:', result.error);
    }

    return result;
  }

  /**
   * 检查系统状态 - 批量获取系统信息
   */
  async getSystemStatus(): Promise<
    RequestResult<{
      globalEnabled: boolean;
      groupsCount: number;
    }>
  > {
    console.log('🔄 SystemApi.getSystemStatus');

    try {
      // 并行请求多个API
      const [globalEnabledResult] = await this.request.sendBatch([
        { type: ApiRequestType.LOAD_GLOBAL_ENABLED },
      ]);

      if (!globalEnabledResult.success) {
        return {
          success: false,
          error: '获取系统状态失败',
          code: 'SYSTEM_STATUS_ERROR',
        };
      }

      return {
        success: true,
        data: {
          globalEnabled: globalEnabledResult.data as boolean,
          groupsCount: 0, // 这里可以通过其他API获取
        },
      };
    } catch (error) {
      console.error('❌ SystemApi.getSystemStatus failed:', error);
      return {
        success: false,
        error: '获取系统状态异常',
        code: 'SYSTEM_STATUS_EXCEPTION',
      };
    }
  }

  /**
   * 系统健康检查
   */
  async healthCheck(): Promise<
    RequestResult<{
      connectionOk: boolean;
      apiResponsive: boolean;
    }>
  > {
    console.log('🔄 SystemApi.healthCheck');

    try {
      // 检查连接状态
      const connectionResult = await this.request.checkConnection();

      if (!connectionResult.success) {
        return {
          success: false,
          error: '连接检查失败',
          code: 'CONNECTION_FAILED',
        };
      }

      // 测试API响应
      const apiResult = await this.request.sendWithRetry(
        {
          type: ApiRequestType.LOAD_GLOBAL_ENABLED,
        },
        1,
        500
      ); // 只重试1次，500ms延迟

      return {
        success: true,
        data: {
          connectionOk: connectionResult.success,
          apiResponsive: apiResult.success,
        },
      };
    } catch (error) {
      console.error('❌ SystemApi.healthCheck failed:', error);
      return {
        success: false,
        error: '健康检查异常',
        code: 'HEALTH_CHECK_EXCEPTION',
      };
    }
  }
}
