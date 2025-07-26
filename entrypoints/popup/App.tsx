import { message } from 'antd';
import { useEffect, useState } from 'react';
import { GroupRuleVo } from '../../types';
import { DEFAULT_RULE } from '../utils/const';
import { compatStorage as storage } from '../../utils/storage';
import './App.css';
import { Rule } from './components/rule';

/**
 * 操作结果类型
 */
interface OperationResult {
  success: boolean;
  message?: string;
}

/**
 * 主应用组件 - 负责数据管理和持久化
 */
function App() {
  const [groups, setGroups] = useState<GroupRuleVo[]>([]);
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  // 初始化数据
  useEffect(() => {
    initializeData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * 初始化应用数据 - 确保默认值和默认规则被持久化存储
   */
  const initializeData = async () => {
    try {
      setLoading(true);
      console.log('🚀 开始初始化应用数据...');

      // 先检查存储中是否已有数据
      const [savedGroups, hasGlobalEnabled] = await Promise.all([
        storage.loadGroups(),
        storage.hasGlobalEnabled(),
      ]);

      console.log('📊 初始化数据状态:', {
        savedGroupsCount: savedGroups.length,
        hasGlobalEnabled,
      });

      let needsDefaultGroup = savedGroups.length === 0;
      let needsDefaultGlobalEnabled = !hasGlobalEnabled;

      // 处理默认规则组
      if (needsDefaultGroup) {
        console.log('🔧 创建默认规则组...');
        const defaultGroup: GroupRuleVo = {
          id: '1',
          groupName: 'Default Group',
          enabled: true,
          ruleText: DEFAULT_RULE,
          createTime: new Date().toISOString(),
          updateTime: new Date().toISOString(),
        };
        
        const saveGroupResult = await storage.saveGroups([defaultGroup]);
        if (saveGroupResult.success) {
          console.log('✅ 默认规则组创建并保存成功');
          setGroups([defaultGroup]);
        } else {
          console.error('❌ 保存默认规则组失败:', saveGroupResult.message);
          message.error('创建默认规则组失败');
          setGroups([defaultGroup]); // 至少在内存中设置
        }
      } else {
        console.log('📋 使用现有规则组数据');
        setGroups(savedGroups);
      }

      // 处理全局启用状态默认值
      if (needsDefaultGlobalEnabled) {
        console.log('🔧 设置默认全局启用状态...');
        const defaultGlobalEnabled = true; // 默认启用
        const saveEnabledResult = await storage.saveGlobalEnabled(defaultGlobalEnabled);
        if (saveEnabledResult.success) {
          console.log('✅ 默认全局启用状态保存成功');
          setGlobalEnabled(defaultGlobalEnabled);
        } else {
          console.error('❌ 保存默认全局启用状态失败:', saveEnabledResult.message);
          setGlobalEnabled(defaultGlobalEnabled); // 至少在内存中设置
        }
      } else {
        const savedGlobalEnabled = await storage.loadGlobalEnabled();
        console.log('📋 使用现有全局启用状态:', savedGlobalEnabled);
        setGlobalEnabled(savedGlobalEnabled);
      }

      // 初始化完成后通知后台脚本更新
      console.log('📡 通知后台脚本更新徽章...');
      notifyBadgeUpdate();

      console.log('✅ 应用数据初始化完成');
    } catch (error) {
      console.error('❌ 初始化数据失败:', error);
      message.error('初始化应用失败，请刷新重试');
    } finally {
      setLoading(false);
    }
  };


  /**
   * 通知后台脚本更新徽章
   */
  const notifyBadgeUpdate = () => {
    try {
      if (typeof browser !== 'undefined' && browser.runtime) {
        browser.runtime.sendMessage({ type: 'UPDATE_BADGE' });
      }
    } catch (error) {
      console.log('Failed to notify badge update:', error);
    }
  };

  /**
   * 处理规则组数据变更
   */
  const handleGroupsChange = async (
    newGroups: GroupRuleVo[]
  ): Promise<OperationResult> => {
    const result = await storage.saveGroups(newGroups);
    if (result.success) {
      setGroups(newGroups);
      // 立即通知后台脚本更新徽章
      notifyBadgeUpdate();
    }
    return result;
  };

  /**
   * 处理全局启用状态变更
   */
  const handleGlobalEnabledChange = async (
    enabled: boolean
  ): Promise<OperationResult> => {
    const result = await storage.saveGlobalEnabled(enabled);
    if (result.success) {
      setGlobalEnabled(enabled);
      // 立即通知后台脚本更新徽章
      notifyBadgeUpdate();
    }
    return result;
  };

  const isInTab = window.location.href.includes('popup.html');
  const containerClass = isInTab ? 'popup-container-tab' : 'popup-container';

  // 加载中状态
  if (loading) {
    return (
      <div className={containerClass}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            fontSize: '14px',
            color: '#666',
          }}
        >
          加载中...
        </div>
      </div>
    );
  }

  return (
    <div className={containerClass}>
      <Rule
        value={groups}
        onChange={handleGroupsChange}
        enabled={globalEnabled}
        onChangeEnabled={handleGlobalEnabledChange}
      />
    </div>
  );
}

export default App;
