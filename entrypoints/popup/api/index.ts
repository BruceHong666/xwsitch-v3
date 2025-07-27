/**
 * API模块统一导出
 * 提供popup端所有的API接口
 */

import { RuleApi } from './RuleApi';
import { SystemApi } from './SystemApi';
import { Request } from '../utils/Request';

/**
 * API工厂类 - 提供统一的API实例获取
 */
export class ApiFactory {
  private static ruleApi: RuleApi | null = null;
  private static systemApi: SystemApi | null = null;

  /**
   * 获取规则API实例
   */
  static getRuleApi(): RuleApi {
    if (!ApiFactory.ruleApi) {
      ApiFactory.ruleApi = RuleApi.getInstance();
    }
    return ApiFactory.ruleApi;
  }

  /**
   * 获取系统API实例
   */
  static getSystemApi(): SystemApi {
    if (!ApiFactory.systemApi) {
      ApiFactory.systemApi = SystemApi.getInstance();
    }
    return ApiFactory.systemApi;
  }

  /**
   * 获取请求工具实例
   */
  static getRequest(): Request {
    return Request.getInstance();
  }

  /**
   * 重置所有API实例（主要用于测试）
   */
  static reset(): void {
    ApiFactory.ruleApi = null;
    ApiFactory.systemApi = null;
  }
}
