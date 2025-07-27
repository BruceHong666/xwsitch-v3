import { MessageController } from './background/controllers/MessageController';
import { SystemService } from './background/services/SystemService';
import { ApiRequest } from './background/types/api';

export default defineBackground(() => {
  console.log(
    '🚀 XSwitch V3 background script started',
    JSON.stringify({ id: browser.runtime.id })
  );

  // 初始化服务
  const messageController = MessageController.getInstance();
  const systemService = SystemService.getInstance();

  // 启动系统初始化
  initializeSystem();

  // 设置存储监听器
  systemService.setupStorageListener();

  // 监听来自popup的消息
  if (typeof browser !== 'undefined' && browser.runtime) {
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('📨 Received message:', message.type);
      
      // 异步处理消息
      (async () => {
        try {
          // 处理API请求
          const response = await messageController.handleMessage(message as ApiRequest, sender);
          
          console.log('✅ Message handled successfully:', message.type, response);
          
          // 发送响应
          sendResponse(response);
        } catch (error) {
          console.error('❌ Message handling failed:', error);
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : '未知错误'
          });
        }
      })();
      
      // 返回true表示将异步发送响应
      return true;
    });
  }

  /**
   * 系统初始化
   */
  async function initializeSystem() {
    try {
      console.log('🔧 Initializing system...');
      await systemService.initialize();
      console.log('✅ System initialization completed');
    } catch (error) {
      console.error('❌ System initialization failed:', error);
    }
  }
});
