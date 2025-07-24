import {
  CodeOutlined,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import {
  Badge,
  Button,
  Checkbox,
  Input,
  Layout,
  List,
  Modal,
  Space,
  Switch,
  Tooltip,
  Typography,
  message,
} from 'antd';
import { useEffect, useState } from 'react';
import { GroupRuleVo } from '../../../types';
import { DEFAULT_NEW_RULE } from '../../../utils/const';
import { validateJsonFormat } from '../../../utils/json';
import CodeMirrorEditor from '../code-mirror-editor';
import './index.css';

const { Header, Content, Sider } = Layout;
const { Text } = Typography;
/**
 * 操作结果类型
 */
interface OperationResult {
  success: boolean;
  message?: string;
}

/**
 * Rule组件属性接口
 */
interface RuleProps {
  /** 规则组列表 */
  value: GroupRuleVo[];
  /** 规则组变更回调，返回操作结果 */
  onChange: (value: GroupRuleVo[]) => Promise<OperationResult>;
  /** 全局启用状态 */
  enabled: boolean;
  /** 全局启用状态变更回调，返回操作结果 */
  onChangeEnabled: (value: boolean) => Promise<OperationResult>;
}
/**
 * 规则管理组件 - 纯组件，不处理数据持久化
 */
export function Rule({
  value: groups,
  onChange,
  enabled: globalEnabled,
  onChangeEnabled,
}: RuleProps) {
  // 当前选中的规则组ID
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  // 编辑器当前值
  const [editorValue, setEditorValue] = useState('');
  // 新建规则组名称
  const [newGroupName, setNewGroupName] = useState('');
  // 正在编辑名称的规则组ID
  const [editingGroupId, setEditingGroupId] = useState<string>('');
  // 编辑中的规则组名称
  const [editingGroupName, setEditingGroupName] = useState('');
  // 操作loading状态
  const [loading, setLoading] = useState(false);
  // JSON验证错误映射
  const [jsonErrors, setJsonErrors] = useState<Record<string, string>>({});

  // 初始化选中第一个规则组
  useEffect(() => {
    if (groups.length > 0 && !selectedGroupId) {
      setSelectedGroupId(groups[0].id);
    }
  }, [groups, selectedGroupId]);

  // 验证所有规则组的JSON格式
  useEffect(() => {
    const errors: Record<string, string> = {};
    groups.forEach(group => {
      const validation = validateJsonFormat(group.ruleText);
      if (!validation.isValid && validation.error) {
        errors[group.id] = validation.error;
      }
    });
    setJsonErrors(errors);
  }, [groups]);

  // 同步编辑器内容
  useEffect(() => {
    const selectedGroup = groups.find(g => g.id === selectedGroupId);
    if (selectedGroup) {
      setEditorValue(selectedGroup.ruleText);
    }
  }, [selectedGroupId, groups]);

  /**
   * 保存规则配置
   */
  const handleSaveConfig = async () => {
    const targetGroup = groups.find(g => g.id === selectedGroupId);
    if (!targetGroup) return;

    try {
      setLoading(true);
      const updatedGroups = groups.map(g =>
        g.id === selectedGroupId ? { ...g, ruleText: editorValue } : g
      );

      const result = await onChange(updatedGroups);
      if (result.success) {
        message.success(result.message || '规则配置保存成功！');
      } else {
        message.error(result.message || '保存失败');
      }
    } catch (e) {
      message.error('保存失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 创建新规则组
   */
  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      message.warning('请输入规则组名称');
      return;
    }

    try {
      setLoading(true);
      const newGroup: GroupRuleVo = {
        id: Date.now().toString(),
        name: newGroupName.trim(),
        enabled: true,
        ruleText: DEFAULT_NEW_RULE,
      };
      const updatedGroups = [...groups, newGroup];

      const result = await onChange(updatedGroups);
      if (result.success) {
        setNewGroupName('');
        setSelectedGroupId(newGroup.id);
        message.success(result.message || '规则组创建成功！');
      } else {
        message.error(result.message || '创建失败');
      }
    } catch (e) {
      message.error('创建失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 删除规则组
   */
  const handleDeleteGroup = (groupId: string, groupName: string) => {
    if (groups.length <= 1) {
      message.warning('至少需要保留一个规则组');
      return;
    }
    Modal.confirm({
      title: '删除规则组',
      content: `确定要删除规则组 "${groupName}" 吗？`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          setLoading(true);
          const updatedGroups = groups.filter(g => g.id !== groupId);

          const result = await onChange(updatedGroups);
          if (result.success) {
            if (selectedGroupId === groupId) {
              setSelectedGroupId(updatedGroups[0]?.id || '');
            }
            message.success(result.message || '规则组删除成功！');
          } else {
            message.error(result.message || '删除失败');
          }
        } catch (e) {
          message.error('删除失败');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  /**
   * 复制规则组
   */
  const handleCopyGroup = async (group: GroupRuleVo) => {
    try {
      setLoading(true);
      const newGroup: GroupRuleVo = {
        id: Date.now().toString(),
        name: `${group.name} - 副本`,
        enabled: group.enabled,
        ruleText: group.ruleText,
      };
      const updatedGroups = [...groups, newGroup];

      const result = await onChange(updatedGroups);
      if (result.success) {
        message.success(result.message || '规则组复制成功！');
      } else {
        message.error(result.message || '复制失败');
      }
    } catch (e) {
      message.error('复制失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 开始编辑规则组名称
   */
  const handleEditGroupName = (groupId: string, currentName: string) => {
    setEditingGroupId(groupId);
    setEditingGroupName(currentName);
  };

  /**
   * 保存规则组名称
   */
  const handleSaveGroupName = async (groupId: string) => {
    if (!editingGroupName.trim()) {
      message.warning('规则组名称不能为空');
      return;
    }

    try {
      setLoading(true);
      const updatedGroups = groups.map(g =>
        g.id === groupId ? { ...g, name: editingGroupName.trim() } : g
      );

      const result = await onChange(updatedGroups);
      if (result.success) {
        setEditingGroupId('');
        setEditingGroupName('');
        message.success(result.message || '规则组名称修改成功！');
      } else {
        message.error(result.message || '修改失败');
      }
    } catch (e) {
      message.error('修改失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 切换规则组启用状态
   */
  const toggleGroupEnabled = async (groupId: string) => {
    try {
      setLoading(true);
      const updatedGroups = groups.map(g =>
        g.id === groupId ? { ...g, enabled: !g.enabled } : g
      );

      const result = await onChange(updatedGroups);
      if (!result.success) {
        message.error(result.message || '操作失败');
      }
    } catch (e) {
      message.error('操作失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 处理全局启用状态变更
   */
  const handleGlobalEnabledChange = async (enabled: boolean) => {
    try {
      setLoading(true);
      const result = await onChangeEnabled(enabled);
      if (!result.success) {
        message.error(result.message || '操作失败');
      }
    } catch (e) {
      message.error('操作失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 打开选项页面
   */
  const openOptionsPage = () => {
    try {
      if (typeof browser !== 'undefined' && browser.runtime) {
        browser.runtime.openOptionsPage();
      } else if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.openOptionsPage();
      }
    } catch (error) {
      console.error('Failed to open options page:', error);
    }
  };

  /**
   * 打开GitHub README页面
   */
  const openGitHubReadme = () => {
    try {
      if (typeof browser !== 'undefined' && browser.tabs) {
        browser.tabs.create({
          url: 'https://github.com/BruceHong666/xswitch-v3',
        });
      } else if (typeof chrome !== 'undefined' && chrome.tabs) {
        chrome.tabs.create({
          url: 'https://github.com/BruceHong666/xswitch-v3',
        });
      } else {
        window.open('https://github.com/BruceHong666/xswitch-v3', '_blank');
      }
    } catch (error) {
      console.error('Failed to open GitHub page:', error);
      window.open('https://github.com/BruceHong666/xswitch-v3', '_blank');
    }
  };

  /**
   * 在新标签页中打开控制台
   */
  const openConsole = () => {
    try {
      if (typeof browser !== 'undefined' && browser.tabs && browser.runtime) {
        browser.tabs.create({
          url: browser.runtime.getURL('popup.html'),
        });
      } else if (
        typeof chrome !== 'undefined' &&
        chrome.tabs &&
        chrome.runtime
      ) {
        chrome.tabs.create({
          url: chrome.runtime.getURL('popup.html'),
        });
      }
    } catch (error) {
      console.error('Failed to open console:', error);
    }
  };

  const selectedGroup = groups.find(g => g.id === selectedGroupId);
  const isChanged = selectedGroup && editorValue !== selectedGroup.ruleText;
  const isInTab = window.location.href.includes('popup.html');

  return (
    <div
      className="main-container"
      style={{ height: isInTab ? '100vh' : '600px' }}
    >
      <Header className="main-header">
        <div className="main-header-content">
          <Space.Compact size="small">
            <Input
              placeholder="输入规则组名称"
              value={newGroupName}
              onChange={e => setNewGroupName(e.target.value)}
              onPressEnter={handleCreateGroup}
              size="small"
              className="name-input"
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreateGroup}
              size="small"
              disabled={!newGroupName.trim() || loading}
              loading={loading}
            />
          </Space.Compact>

          <Space size="small">
            <Tooltip
              title={`代理全局开关 - ${globalEnabled ? '已启用' : '已禁用'}`}
            >
              <Switch
                onChange={handleGlobalEnabledChange}
                checked={globalEnabled}
                disabled={loading}
              />
            </Tooltip>

            <Tooltip title="GitHub README">
              <Button
                type="text"
                icon={<QuestionCircleOutlined />}
                onClick={openGitHubReadme}
                size="small"
              />
            </Tooltip>

            <Tooltip title="打开控制台">
              <Button
                type="text"
                icon={<CodeOutlined />}
                onClick={openConsole}
                size="small"
              />
            </Tooltip>

            <Button
              type="text"
              icon={<SettingOutlined />}
              onClick={openOptionsPage}
              size="small"
              title="设置"
            />
          </Space>
        </div>
      </Header>

      <Layout className="main-layout">
        <Sider width={200} className="main-sider">
          <div className="main-sider-content">
            <List
              size="small"
              dataSource={groups}
              renderItem={(group: GroupRuleVo) => {
                const isSelected = group.id === selectedGroupId;
                const isEditing = editingGroupId === group.id;

                return (
                  <List.Item
                    className={`group-item ${isSelected ? 'group-item-selected' : ''}`}
                    onClick={() => !isEditing && setSelectedGroupId(group.id)}
                  >
                    <div className="group-item-content">
                      <div className="group-item-row">
                        <Space size="small">
                          <Checkbox
                            checked={group.enabled}
                            onChange={e => {
                              e.stopPropagation();
                              toggleGroupEnabled(group.id);
                            }}
                          />

                          {isEditing ? (
                            <Input
                              size="small"
                              value={editingGroupName}
                              onChange={e =>
                                setEditingGroupName(e.target.value)
                              }
                              onPressEnter={() => handleSaveGroupName(group.id)}
                              onBlur={() => handleSaveGroupName(group.id)}
                              autoFocus
                              className="edit-name-input"
                              style={{ width: '100%' }}
                            />
                          ) : (
                            <Badge
                              dot={isChanged && isSelected}
                              status="processing"
                            >
                              {jsonErrors[group.id] ? (
                                <Tooltip
                                  title={`JSON格式错误: ${jsonErrors[group.id]}`}
                                  color="red"
                                >
                                  <Text
                                    strong={isSelected}
                                    className={`group-name-text ${isSelected ? 'group-name-text-selected' : ''} ${!group.enabled ? 'group-name-text-disabled' : ''}`}
                                    style={{ color: '#ff4d4f' }}
                                  >
                                    {group.name}
                                  </Text>
                                </Tooltip>
                              ) : (
                                <Text
                                  strong={isSelected}
                                  className={`group-name-text ${isSelected ? 'group-name-text-selected' : ''} ${!group.enabled ? 'group-name-text-disabled' : ''}`}
                                >
                                  {group.name}
                                </Text>
                              )}
                            </Badge>
                          )}
                        </Space>

                        {!isEditing && (
                          <Space size="small" className="group-item-action">
                            <Button
                              type="text"
                              size="small"
                              icon={<EditOutlined />}
                              onClick={e => {
                                e.stopPropagation();
                                handleEditGroupName(group.id, group.name);
                              }}
                              className="group-action-btn"
                            />

                            <Button
                              type="text"
                              size="small"
                              icon={<CopyOutlined />}
                              onClick={e => {
                                e.stopPropagation();
                                handleCopyGroup(group);
                              }}
                              className="group-action-btn"
                            />

                            {groups.length > 1 && (
                              <Button
                                type="text"
                                size="small"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={e => {
                                  e.stopPropagation();
                                  handleDeleteGroup(group.id, group.name);
                                }}
                                className="group-action-btn"
                              />
                            )}
                          </Space>
                        )}
                      </div>
                    </div>
                  </List.Item>
                );
              }}
            />
          </div>
        </Sider>

        <Content className="main-content">
          <div
            style={{
              padding: '8px 16px',
              borderBottom: '1px solid #f0f0f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Text type="secondary">
                {selectedGroup?.name ?? '未选择规则组'}
              </Text>
              {selectedGroup && jsonErrors[selectedGroup.id] && (
                <Tooltip
                  title={`JSON格式错误: ${jsonErrors[selectedGroup.id]}`}
                  color="red"
                >
                  <Text style={{ color: '#ff4d4f', fontSize: '12px' }}>
                    ⚠ 格式错误
                  </Text>
                </Tooltip>
              )}
            </div>
            <Button
              type="primary"
              size="small"
              onClick={handleSaveConfig}
              disabled={!isChanged || loading}
              loading={loading}
            >
              保存
            </Button>
          </div>
          <div
            style={{
              height: isInTab ? 'calc(100vh - 97px)' : 'calc(100% - 49px)',
              padding: '16px',
            }}
          >
            {selectedGroup ? (
              <CodeMirrorEditor value={editorValue} onChange={setEditorValue} />
            ) : (
              <div className="main-placeholder">
                <div>请从左侧选择一个规则组来编辑规则</div>
              </div>
            )}
          </div>
        </Content>
      </Layout>
    </div>
  );
}
