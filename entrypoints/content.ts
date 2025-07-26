interface ProxyHitData {
  originalUrl: string;
  targetUrl: string;
  ruleName: string;
  requestType: string;
  method: string;
  timestamp: number;
}

interface BackgroundMessage {
  type: 'PROXY_HIT';
  data: ProxyHitData;
}

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    console.log('🔄 XSwitch V3 content script loaded');

    // 监听来自 background script 的代理匹配消息
    if (typeof browser !== 'undefined' && browser.runtime) {
      browser.runtime.onMessage.addListener((message: BackgroundMessage) => {
        if (message.type === 'PROXY_HIT') {
          handleProxyHit(message.data);
        }
      });
    } else if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.onMessage.addListener((message: BackgroundMessage) => {
        if (message.type === 'PROXY_HIT') {
          handleProxyHit(message.data);
        }
      });
    }

    function handleProxyHit(data: ProxyHitData) {
      const time = new Date(data.timestamp).toLocaleTimeString();
      
      // 在页面控制台输出详细的代理日志
      console.group(`🔀 [XSwitch V3] 代理匹配 - ${time}`);
      console.log(`📍 当前页面: ${window.location.href}`);
      console.log(`📥 原始请求: ${data.originalUrl}`);
      console.log(`📤 代理目标: ${data.targetUrl}`);
      console.log(`📋 匹配规则: ${data.ruleName}`);
      console.log(`📊 请求类型: ${data.requestType}`);
      console.log(`🔧 请求方法: ${data.method}`);
      console.log(`⏰ 匹配时间: ${time}`);
      console.groupEnd();

      // 可选：在页面上显示简单的通知
      if (data.requestType === 'main_frame' || data.requestType === 'xmlhttprequest') {
        showProxyNotification(data);
      }
    }

    function showProxyNotification(data: ProxyHitData) {
      // 创建一个简单的页面通知
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 12px 16px;
        border-radius: 4px;
        font-family: Arial, sans-serif;
        font-size: 14px;
        z-index: 10000;
        max-width: 300px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        transition: opacity 0.3s ease;
      `;
      
      notification.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 4px;">🔀 XSwitch 代理匹配</div>
        <div style="font-size: 12px;">规则: ${data.ruleName}</div>
        <div style="font-size: 12px;">目标: ${data.targetUrl}</div>
      `;

      document.body.appendChild(notification);

      // 3秒后自动移除通知
      setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 300);
      }, 3000);
    }

    // 页面加载完成后输出基本信息
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        console.log(`🌐 [XSwitch V3] 监控页面: ${window.location.href}`);
      });
    } else {
      console.log(`🌐 [XSwitch V3] 监控页面: ${window.location.href}`);
    }
  },
});
