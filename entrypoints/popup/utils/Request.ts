import { ApiRequest, ApiResponse } from '../../background/types/api';

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
 * 请求工具类 - 类似Ajax，提供no-reject模式的API调用
 * 所有请求都会返回成功的Promise，通过result.success判断实际结果
 */
export class Request {
  private static instance: Request;

  private constructor() {}

  static getInstance(): Request {
    if (!Request.instance) {
      Request.instance = new Request();
    }
    return Request.instance;
  }

  /**
   * 发送请求到background - no-reject模式
   * @param request API请求对象
   * @returns 永远resolve的Promise，通过success字段判断结果
   */
  async send<T>(request: ApiRequest): Promise<RequestResult<T>> {
    console.log('📤 Request.send:', request.type, request.data);

    try {
      // 检查运行环境
      if (typeof browser === 'undefined' || !browser.runtime) {
        return this.createErrorResult(
          '运行环境不支持browser.runtime',
          'ENV_ERROR'
        );
      }

      // 发送消息到background
      const response = (await browser.runtime.sendMessage(
        request
      )) as ApiResponse<T>;

      if (response && typeof response === 'object' && 'success' in response) {
        if (response.success) {
          console.log('✅ Request.send success:', request.type);
          return {
            success: true,
            data: response.data,
          };
        } else {
          console.error(
            '❌ Request.send API error:',
            request.type,
            response.error
          );
          return this.createErrorResult(
            response.error || 'API调用失败',
            'API_ERROR'
          );
        }
      } else {
        console.error(
          '❌ Request.send invalid response:',
          request.type,
          response
        );
        return this.createErrorResult('API响应格式错误', 'RESPONSE_ERROR');
      }
    } catch (error) {
      console.error('❌ Request.send network error:', request.type, error);

      // 处理不同类型的错误
      if (error instanceof Error) {
        if (error.message.includes('Could not establish connection')) {
          return this.createErrorResult(
            '无法连接到后台服务',
            'CONNECTION_ERROR'
          );
        } else if (error.message.includes('Extension context invalidated')) {
          return this.createErrorResult(
            '扩展上下文已失效，请刷新页面',
            'CONTEXT_ERROR'
          );
        } else {
          return this.createErrorResult(error.message, 'UNKNOWN_ERROR');
        }
      }

      return this.createErrorResult('网络请求失败', 'NETWORK_ERROR');
    }
  }

  /**
   * 批量发送请求 - 并行执行
   * @param requests 请求列表
   * @returns 所有请求的结果数组
   */
  async sendBatch<T = unknown>(
    requests: ApiRequest[]
  ): Promise<RequestResult<T>[]> {
    console.log('📤 Request.sendBatch:', requests.length, 'requests');

    try {
      const promises = requests.map(request => this.send<T>(request));
      const results = await Promise.all(promises);

      console.log('✅ Request.sendBatch completed:', results.length, 'results');
      return results;
    } catch (error) {
      // 这种情况理论上不会发生，因为send方法是no-reject的
      console.error('❌ Request.sendBatch unexpected error:', error);
      return requests.map(() =>
        this.createErrorResult('批量请求失败', 'BATCH_ERROR')
      );
    }
  }

  /**
   * 发送请求并重试 - 支持失败重试
   * @param request API请求对象
   * @param maxRetries 最大重试次数，默认3次
   * @param retryDelay 重试延迟(ms)，默认1000ms
   * @returns 请求结果
   */
  async sendWithRetry<T = unknown>(
    request: ApiRequest,
    maxRetries: number = 3,
    retryDelay: number = 1000
  ): Promise<RequestResult<T>> {
    console.log(
      '📤 Request.sendWithRetry:',
      request.type,
      'maxRetries:',
      maxRetries
    );

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      const result = await this.send<T>(request);

      if (result.success) {
        if (attempt > 1) {
          console.log('✅ Request.sendWithRetry success on attempt:', attempt);
        }
        return result;
      }

      // 如果不是最后一次尝试，则等待后重试
      if (attempt <= maxRetries) {
        console.log(
          `⏳ Request.sendWithRetry attempt ${attempt} failed, retrying in ${retryDelay}ms...`
        );
        await this.delay(retryDelay);
      }
    }

    console.error(
      '❌ Request.sendWithRetry failed after',
      maxRetries + 1,
      'attempts'
    );
    return this.createErrorResult('请求重试失败', 'RETRY_EXHAUSTED');
  }

  /**
   * 创建错误结果
   */
  private createErrorResult<T = unknown>(
    error: string,
    code?: string
  ): RequestResult<T> {
    return {
      success: false,
      error,
      code,
    };
  }

  /**
   * 延迟工具函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 检查连接状态
   */
  async checkConnection(): Promise<RequestResult<boolean>> {
    try {
      if (typeof browser === 'undefined' || !browser.runtime) {
        return this.createErrorResult('browser.runtime不可用', 'ENV_ERROR');
      }

      // 发送ping请求测试连接
      await browser.runtime.sendMessage({ type: 'PING' });

      return {
        success: true,
        data: true,
      };
    } catch {
      return this.createErrorResult('连接检查失败', 'CONNECTION_CHECK_FAILED');
    }
  }
}
