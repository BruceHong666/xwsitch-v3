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
  }, []);

  /**
   * 初始化应用数据
   */
  const initializeData = async () => {
    try {
      setLoading(true);
      const [savedGroups, savedGlobalEnabled] = await Promise.all([
        storage.loadGroups(),
        storage.loadGlobalEnabled(),
      ]);

      if (savedGroups.length === 0) {
        // 创建默认规则组
        const defaultGroup: GroupRuleVo = {
          id: '1',
          groupName: 'Default Group',
          enabled: true,
          ruleText: DEFAULT_RULE,
          createTime: new Date().toISOString(),
          updateTime: new Date().toISOString(),
        };
        setGroups([defaultGroup]);
        const saveResult = await storage.saveGroups([defaultGroup]);
        if (!saveResult.success) {
          console.error('Failed to save default group:', saveResult.message);
        }
      } else {
        setGroups(savedGroups);
      }

      setGlobalEnabled(savedGlobalEnabled);
    } catch (error) {
      console.error('Failed to initialize data:', error);
      message.error('加载数据失败');
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
