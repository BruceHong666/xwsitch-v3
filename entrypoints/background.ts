import { compatStorage } from '../utils/storage';
import { countActiveRules, validateJsonFormat } from './utils/json';
import { networkService } from './utils/network';
import { GroupRuleVo } from '../types';

export default defineBackground(() => {
  console.log('🚀 XSwitch V3 background script started', JSON.stringify({ id: browser.runtime.id }));

  // 初始化徽章状态
  initializeBadge();

  // 监听存储变化
  compatStorage.onStorageChanged((changes) => {
    console.log('📦 Storage changed, updating badge and network rules:', JSON.stringify(changes));
    updateBadge();
    updateNetworkRules();
  });

  // 监听来自popup的消息，立即更新徽章
  if (typeof browser !== 'undefined' && browser.runtime) {
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'UPDATE_BADGE') {
        console.log('📨 Received UPDATE_BADGE message from popup:', JSON.stringify(message));
        updateBadge();
        sendResponse({ success: true });
      }
    });
  }

  // 插件启动时初始化徽章和网络规则
  async function initializeBadge() {
    await updateBadge();
    await updateNetworkRules();
  }

  // 更新网络规则
  async function updateNetworkRules() {
    try {
      console.log('🔄 Network rules update started...');
      const [groups, globalEnabled] = await Promise.all([
        compatStorage.loadGroups(),
        compatStorage.loadGlobalEnabled(),
      ]);

      console.log('📊 Network rules update data:', JSON.stringify({ 
        groups: groups.length, 
        globalEnabled,
        enabledGroups: groups.filter(g => g.enabled).length 
      }));

      // 更新网络规则
      await networkService.updateRules(groups, globalEnabled);
      
      // 设置网络请求日志监听
      networkService.setupNetworkLogging(globalEnabled, groups);
      
      console.log('✅ Network rules updated successfully');
    } catch (error) {
      console.error('❌ Failed to update network rules:', error);
    }
  }

  // 更新插件徽章
  async function updateBadge() {
    try {
      console.log('🔄 Badge update started...');
      const [groups, globalEnabled] = await Promise.all([
        compatStorage.loadGroups(),
        compatStorage.loadGlobalEnabled(),
      ]);

      console.log('📊 Badge update data:', JSON.stringify({ 
        groups: groups.length, 
        globalEnabled,
        enabledGroups: groups.filter(g => g.enabled).length 
      }));

      if (!globalEnabled) {
        // 全局关闭时显示 OFF
        console.log('🔴 Setting badge to OFF (global disabled)');
        setBadge('OFF', '#ff4d4f');
        return;
      }

      // 计算活跃规则数量
      const totalActiveRules = calculateTotalActiveRules(groups);
      console.log('Total active rules:', totalActiveRules);

      if (totalActiveRules > 0) {
        // 有活跃规则时显示数量（绿色）
        console.log(`🟢 Setting badge to ${totalActiveRules} (active rules)`);
        setBadge(totalActiveRules.toString(), '#52c41a');
      } else {
        // 无活跃规则时显示 0（橙色）
        console.log('🟡 Setting badge to 0 (no active rules)');
        setBadge('0', '#faad14');
      }
    } catch (error) {
      console.error('Failed to update badge:', error);
      setBadge('ERR', '#ff4d4f');
    }
  }

  // 计算总的活跃规则数量
  function calculateTotalActiveRules(groups: GroupRuleVo[]): number {
    let totalRules = 0;

    groups.forEach(group => {
      // 只计算启用的规则组
      if (!group.enabled) return;

      // 验证 JSON 格式
      const validation = validateJsonFormat(group.ruleText);
      if (!validation.isValid) return;

      // 计算该规则组中的规则数量
      totalRules += countActiveRules(group.ruleText);
    });

    return totalRules;
  }

  // 设置徽章文本和颜色
  function setBadge(text: string, color: string) {
    console.log(`🎯 setBadge called:`, JSON.stringify({ text, color }));
    try {
      if (typeof browser !== 'undefined' && browser.action) {
        console.log('🌐 Using browser.action API');
        browser.action.setBadgeText({ text });
        browser.action.setBadgeBackgroundColor({ color });
        console.log('✅ Badge set successfully via browser.action');
      } else {
        console.warn('⚠️ No badge API available');
      }
    } catch (error) {
      console.error('❌ Failed to set badge:', error);
    }
  }
});