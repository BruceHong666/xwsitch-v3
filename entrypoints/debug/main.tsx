import { Button, Card, Space, Typography, Timeline, Tag } from 'antd';
import { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { GroupRuleVo } from '../../types';
import { compatStorage } from '../../utils/storage';
import { countActiveRules, validateJsonFormat } from '../utils/json';

const { Title, Text, Paragraph } = Typography;

interface LogEntry {
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  source: 'popup' | 'background' | 'storage';
  message: string;
  data?: any;
}

function DebugConsole() {
  const [groups, setGroups] = useState<GroupRuleVo[]>([]);
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [badgeInfo, setBadgeInfo] = useState<{
    text: string;
    color: string;
    activeRules: number;
  }>({ text: 'N/A', color: '#ccc', activeRules: 0 });

  const addLog = (type: LogEntry['type'], source: LogEntry['source'], message: string, data?: any) => {
    const newLog: LogEntry = {
      timestamp: new Date().toLocaleTimeString(),
      type,
      source,
      message,
      data: data ? JSON.stringify(data, null, 2) : undefined
    };
    setLogs(prev => [newLog, ...prev].slice(0, 50)); // 保留最近50条日志
  };

  // 加载数据
  const loadData = async () => {
    addLog('info', 'popup', '开始加载数据...');
    try {
      const [loadedGroups, loadedGlobalEnabled] = await Promise.all([
        compatStorage.loadGroups(),
        compatStorage.loadGlobalEnabled(),
      ]);
      
      setGroups(loadedGroups);
      setGlobalEnabled(loadedGlobalEnabled);
      
      addLog('success', 'storage', '数据加载成功', {
        groups: loadedGroups.length,
        globalEnabled: loadedGlobalEnabled
      });

      updateBadgeInfo(loadedGroups, loadedGlobalEnabled);
    } catch (error) {
      addLog('error', 'storage', '数据加载失败', error);
    }
  };

  // 更新徽章信息
  const updateBadgeInfo = (currentGroups: GroupRuleVo[], currentGlobalEnabled: boolean) => {
    if (!currentGlobalEnabled) {
      setBadgeInfo({ text: 'OFF', color: '#ff4d4f', activeRules: 0 });
      addLog('info', 'popup', '徽章应显示: OFF (全局关闭)');
      return;
    }

    let totalActiveRules = 0;
    currentGroups.forEach(group => {
      if (!group.enabled) return;
      
      const validation = validateJsonFormat(group.ruleText);
      if (!validation.isValid) return;
      
      totalActiveRules += countActiveRules(group.ruleText);
    });

    if (totalActiveRules > 0) {
      setBadgeInfo({ text: totalActiveRules.toString(), color: '#52c41a', activeRules: totalActiveRules });
      addLog('info', 'popup', `徽章应显示: ${totalActiveRules} (活跃规则)`);
    } else {
      setBadgeInfo({ text: '0', color: '#faad14', activeRules: 0 });
      addLog('info', 'popup', '徽章应显示: 0 (无活跃规则)');
    }
  };

  // 测试全局开关
  const testGlobalToggle = async () => {
    const newEnabled = !globalEnabled;
    addLog('info', 'popup', `🔄 测试全局开关: ${globalEnabled} -> ${newEnabled}`);
    
    try {
      const result = await compatStorage.saveGlobalEnabled(newEnabled);
      addLog('info', 'storage', '📝 全局状态保存结果', result);
      
      if (result.success) {
        setGlobalEnabled(newEnabled);
        updateBadgeInfo(groups, newEnabled);
        
        // 发送消息给后台脚本
        notifyBackground('全局开关切换');
      }
    } catch (error) {
      addLog('error', 'storage', '❌ 全局状态保存失败', error);
    }
  };

  // 测试规则组切换
  const testGroupToggle = async () => {
    if (groups.length === 0) return;
    
    const firstGroup = groups[0];
    const newEnabled = !firstGroup.enabled;
    
    addLog('info', 'popup', `🔄 测试规则组切换: ${firstGroup.groupName} ${firstGroup.enabled} -> ${newEnabled}`);
    
    const updatedGroups = groups.map(g => 
      g.id === firstGroup.id ? { ...g, enabled: newEnabled } : g
    );
    
    try {
      const result = await compatStorage.saveGroups(updatedGroups);
      addLog('info', 'storage', '📝 规则组保存结果', result);
      
      if (result.success) {
        setGroups(updatedGroups);
        updateBadgeInfo(updatedGroups, globalEnabled);
        
        // 发送消息给后台脚本
        notifyBackground('规则组状态切换');
      }
    } catch (error) {
      addLog('error', 'storage', '❌ 规则组保存失败', error);
    }
  };

  // 通知后台脚本
  const notifyBackground = (action: string) => {
    addLog('info', 'popup', `📨 发送消息给后台脚本: ${action}`);
    
    try {
      if (typeof browser !== 'undefined' && browser.runtime) {
        browser.runtime.sendMessage({ type: 'UPDATE_BADGE', action })
          .then(() => addLog('success', 'popup', '✅ 消息发送成功 (browser API)'))
          .catch(error => addLog('error', 'popup', '❌ 消息发送失败 (browser API)', error));
      } else {
        addLog('warning', 'popup', '⚠️ 无可用的运行时API发送消息');
      }
    } catch (error) {
      addLog('error', 'popup', '❌ 发送消息异常', error);
    }
  };

  // 清空日志
  const clearLogs = () => {
    setLogs([]);
    addLog('info', 'popup', '🧹 日志已清空');
  };

  // 监听存储变化
  useEffect(() => {
    addLog('info', 'popup', '👂 设置存储变化监听器');
    
    compatStorage.onStorageChanged((changes) => {
      addLog('info', 'storage', '📦 检测到存储变化', changes);
      loadData(); // 重新加载数据
    });

    loadData(); // 初始加载
  }, []);

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return 'green';
      case 'warning': return 'orange';
      case 'error': return 'red';
      default: return 'blue';
    }
  };

  const getSourceColor = (source: LogEntry['source']) => {
    switch (source) {
      case 'popup': return 'purple';
      case 'background': return 'cyan';
      case 'storage': return 'geekblue';
      default: return 'default';
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <Title level={2}>🔍 XSwitch V3 调试控制台</Title>
      
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 当前状态 */}
        <Card title="📊 当前状态" size="small">
          <Space direction="vertical">
            <div>
              <Text strong>全局启用: </Text>
              <Tag color={globalEnabled ? 'green' : 'red'}>
                {globalEnabled ? '启用' : '禁用'}
              </Tag>
            </div>
            <div>
              <Text strong>规则组数量: </Text>
              <Tag color="blue">{groups.length}</Tag>
            </div>
            <div>
              <Text strong>启用的规则组: </Text>
              <Tag color="cyan">{groups.filter(g => g.enabled).length}</Tag>
            </div>
            <div>
              <Text strong>预期徽章: </Text>
              <Tag 
                style={{ 
                  backgroundColor: badgeInfo.color,
                  color: 'white',
                  fontWeight: '500',
                  border: 'none'
                }}
              >
                {badgeInfo.text}
              </Tag>
              <Text type="secondary"> (活跃规则: {badgeInfo.activeRules})</Text>
            </div>
          </Space>
        </Card>

        {/* 测试操作 */}
        <Card title="🧪 测试操作" size="small">
          <Space wrap>
            <Button type="primary" onClick={testGlobalToggle}>
              🔄 测试全局开关切换
            </Button>
            <Button onClick={testGroupToggle} disabled={groups.length === 0}>
              🔄 测试规则组切换
            </Button>
            <Button onClick={() => notifyBackground('手动触发')}>
              📨 手动通知后台
            </Button>
            <Button onClick={loadData}>
              🔄 重新加载数据
            </Button>
            <Button danger onClick={clearLogs}>
              🧹 清空日志
            </Button>
          </Space>
        </Card>

        {/* 规则组详情 */}
        <Card title="📋 规则组详情" size="small">
          {groups.length === 0 ? (
            <Text type="secondary">无规则组</Text>
          ) : (
            <Space direction="vertical" style={{ width: '100%' }}>
              {groups.map(group => {
                const validation = validateJsonFormat(group.ruleText);
                const ruleCount = validation.isValid ? countActiveRules(group.ruleText) : 0;
                
                return (
                  <Card key={group.id} size="small" style={{ marginBottom: '8px' }}>
                    <Space>
                      <Tag color={group.enabled ? 'green' : 'red'}>
                        {group.enabled ? '✅ 启用' : '❌ 禁用'}
                      </Tag>
                      <Text strong>{group.groupName}</Text>
                      <Tag color={validation.isValid ? 'blue' : 'red'}>
                        {validation.isValid ? `📊 ${ruleCount} 条规则` : '❌ JSON错误'}
                      </Tag>
                      {!validation.isValid && (
                        <Text type="danger" style={{ fontSize: '12px' }}>
                          {validation.error}
                        </Text>
                      )}
                    </Space>
                  </Card>
                );
              })}
            </Space>
          )}
        </Card>

        {/* 实时日志 */}
        <Card title="📝 实时日志" size="small">
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <Timeline
              mode="left"
              items={logs.map(log => ({
                color: getLogColor(log.type),
                children: (
                  <div>
                    <div>
                      <Tag color={getSourceColor(log.source)}>{log.source}</Tag>
                      <Tag color={getLogColor(log.type)}>{log.type}</Tag>
                      <Text code style={{ fontSize: '12px' }}>{log.timestamp}</Text>
                    </div>
                    <Paragraph style={{ marginBottom: '4px', marginTop: '4px' }}>
                      {log.message}
                    </Paragraph>
                    {log.data && (
                      <pre style={{ 
                        fontSize: '12px', 
                        backgroundColor: '#f5f5f5', 
                        padding: '8px', 
                        borderRadius: '4px',
                        maxHeight: '100px',
                        overflow: 'auto'
                      }}>
                        {log.data}
                      </pre>
                    )}
                  </div>
                )
              }))}
            />
          </div>
        </Card>

        {/* 说明 */}
        <Card title="💡 使用说明" size="small">
          <Space direction="vertical">
            <Text>1. 点击&ldquo;测试全局开关切换&rdquo;或&ldquo;测试规则组切换&rdquo;来模拟用户操作</Text>
            <Text>2. 观察日志中的存储变化和消息发送情况</Text>
            <Text>3. 检查浏览器开发者工具的控制台，查看后台脚本的日志</Text>
            <Text>4. 观察Chrome插件图标上的徽章是否正确更新</Text>
            <Text strong type="warning">
              ⚠️ 请在Chrome浏览器的插件页面加载此调试页面，并同时打开开发者工具查看控制台输出
            </Text>
          </Space>
        </Card>
      </Space>
    </div>
  );
}

// 渲染应用
const container = document.getElementById('root');
if (container) {
  const root = ReactDOM.createRoot(container);
  root.render(<DebugConsole />);
}