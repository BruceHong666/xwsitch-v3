import {
  CodeOutlined,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import { useDebounceFn } from 'ahooks';
import {
  Alert,
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
import { useCallback, useEffect, useRef, useState } from 'react';
import { GroupRuleVo } from '../../types';
import { DEFAULT_NEW_RULE } from '../utils/const';
import { validateJsonFormat } from '../utils/json';
import { ApiFactory } from './api';
import './App.css';
import CodeMirrorEditor from './components/code-mirror-editor';

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
 * 主应用组件 - 集成规则管理功能
 */
function App() {
  // 数据状态
  const [groups, setGroups] = useState<GroupRuleVo[]>([]);
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  // UI状态
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [editorValue, setEditorValue] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroupId, setEditingGroupId] = useState<string>('');
  const [editingGroupName, setEditingGroupName] = useState('');
  const [operationLoading, setOperationLoading] = useState(false);
  const [jsonErrors, setJsonErrors] = useState<Record<string, string>>({});
  const [saveStatus, setSaveStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');

  // 引用
  const isSavingRef = useRef(false);

  // 初始化数据
  useEffect(() => {
    initializeData();
  }, []);

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

  // 当选中规则组变化时，更新编辑器内容
  useEffect(() => {
    const selectedGroup = groups.find(group => group.id === selectedGroupId);
    if (selectedGroup && !isSavingRef.current) {
      setEditorValue(selectedGroup.ruleText);
    }
  }, [selectedGroupId, groups]);

  /**
   * 初始化应用数据
   */
  const initializeData = async () => {
    try {
      setLoading(true);
      console.log('🚀 开始初始化应用数据...');

      const ruleApi = ApiFactory.getRuleApi();
      const systemApi = ApiFactory.getSystemApi();

      // 初始化默认数据
      const initResult = await systemApi.initializeDefaultData();
      if (!initResult.success) {
        console.warn('⚠️ 初始化默认数据失败:', initResult.error);
      }

      // 并行加载数据
      const [groupsResult, globalEnabledResult] = await Promise.all([
        ruleApi.loadGroups(),
        systemApi.loadGlobalEnabled(),
      ]);

      // 处理规则组加载结果
      if (groupsResult.success) {
        setGroups(groupsResult.data || []);
        console.log('✅ 规则组加载成功:', groupsResult.data?.length);
      } else {
        console.error('❌ 规则组加载失败:', groupsResult.error);
        message.error('加载规则组失败: ' + groupsResult.error);
        setGroups([]);
      }

      // 处理全局状态加载结果
      if (globalEnabledResult.success) {
        setGlobalEnabled(globalEnabledResult.data ?? true);
        console.log('✅ 全局状态加载成功:', globalEnabledResult.data);
      } else {
        console.error('❌ 全局状态加载失败:', globalEnabledResult.error);
        message.error('加载全局状态失败: ' + globalEnabledResult.error);
        setGlobalEnabled(true);
      }

      // 更新徽章
      const badgeResult = await systemApi.updateBadge();
      if (!badgeResult.success) {
        console.warn('⚠️ 更新徽章失败:', badgeResult.error);
      }

      console.log('✅ 应用数据初始化完成');
    } catch (error) {
      console.error('❌ 初始化数据异常:', error);
      message.error('初始化应用异常，请刷新重试');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 保存规则组数据 - 带防抖
   */
  const { run: debouncedSaveGroups } = useDebounceFn(
    async (newGroups: GroupRuleVo[]) => {
      console.log('🔄 防抖保存规则组:', newGroups.length);
      setSaveStatus('saving');
      isSavingRef.current = true;

      try {
        const ruleApi = ApiFactory.getRuleApi();
        const systemApi = ApiFactory.getSystemApi();

        const saveResult = await ruleApi.saveGroups(newGroups);
        if (!saveResult.success) {
          console.error('❌ 保存规则组失败:', saveResult.error);
          setSaveStatus('error');
          message.error('保存失败: ' + saveResult.error);
          return;
        }

        // 更新本地状态
        setGroups(newGroups);

        // 更新徽章
        const badgeResult = await systemApi.updateBadge();
        if (!badgeResult.success) {
          console.warn('⚠️ 更新徽章失败:', badgeResult.error);
        }

        setSaveStatus('saved');
        console.log('✅ 规则组保存成功');

        // 2秒后重置保存状态
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (error) {
        console.error('❌ 保存规则组异常:', error);
        setSaveStatus('error');
        message.error('保存异常');
      } finally {
        isSavingRef.current = false;
      }
    },
    { wait: 500 } // 500ms防抖延迟
  );

  /**
   * 处理全局启用状态变更
   */
  const handleGlobalEnabledChange = async (
    enabled: boolean
  ): Promise<OperationResult> => {
    console.log('🔄 处理全局启用状态变更:', enabled);

    const systemApi = ApiFactory.getSystemApi();

    const saveResult = await systemApi.saveGlobalEnabled(enabled);
    if (!saveResult.success) {
      console.error('❌ 保存全局状态失败:', saveResult.error);
      return {
        success: false,
        message: saveResult.error || '保存全局状态失败',
      };
    }

    setGlobalEnabled(enabled);

    // 更新徽章
    const badgeResult = await systemApi.updateBadge();
    if (!badgeResult.success) {
      console.warn('⚠️ 更新徽章失败:', badgeResult.error);
    }

    console.log('✅ 全局启用状态变更处理完成');
    return { success: true };
  };

  /**
   * 处理编辑器内容变化
   */
  const handleEditorChange = useCallback(
    (value: string) => {
      setEditorValue(value);

      const selectedGroup = groups.find(group => group.id === selectedGroupId);
      if (selectedGroup) {
        const updatedGroups = groups.map(group =>
          group.id === selectedGroupId
            ? {
                ...group,
                ruleText: value,
                updateTime: new Date().toISOString(),
              }
            : group
        );

        // 使用防抖保存
        debouncedSaveGroups(updatedGroups);
      }
    },
    [selectedGroupId, groups, debouncedSaveGroups]
  );

  /**
   * 创建新规则组
   */
  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      message.error('请输入规则组名称');
      return;
    }

    setOperationLoading(true);
    try {
      const ruleApi = ApiFactory.getRuleApi();
      const result = await ruleApi.createGroup(
        newGroupName.trim(),
        DEFAULT_NEW_RULE
      );

      if (result.success && result.data) {
        const updatedGroups = [...groups, result.data];
        setGroups(updatedGroups);
        setSelectedGroupId(result.data.id);
        setNewGroupName('');
        message.success('规则组创建成功');
      } else {
        message.error('创建失败: ' + result.error);
      }
    } catch (error) {
      console.error('❌ 创建规则组异常:', error);
      message.error('创建异常');
    } finally {
      setOperationLoading(false);
    }
  };

  /**
   * 删除规则组
   */
  const handleDeleteGroup = async (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    Modal.confirm({
      title: '确认删除',
      content: `确定要删除规则组"${group.groupName}"吗？此操作不可恢复。`,
      onOk: async () => {
        setOperationLoading(true);
        try {
          const ruleApi = ApiFactory.getRuleApi();
          const result = await ruleApi.deleteGroup(groupId);

          if (result.success) {
            const updatedGroups = groups.filter(g => g.id !== groupId);
            setGroups(updatedGroups);

            // 如果删除的是当前选中的规则组，选中第一个
            if (selectedGroupId === groupId && updatedGroups.length > 0) {
              setSelectedGroupId(updatedGroups[0].id);
            } else if (updatedGroups.length === 0) {
              setSelectedGroupId('');
              setEditorValue('');
            }

            message.success('规则组删除成功');
          } else {
            message.error('删除失败: ' + result.error);
          }
        } catch (error) {
          console.error('❌ 删除规则组异常:', error);
          message.error('删除异常');
        } finally {
          setOperationLoading(false);
        }
      },
    });
  };

  /**
   * 切换规则组启用状态
   */
  const handleToggleGroupEnabled = async (groupId: string) => {
    setOperationLoading(true);
    try {
      const ruleApi = ApiFactory.getRuleApi();
      const result = await ruleApi.toggleGroup(groupId);

      if (result.success) {
        const updatedGroups = groups.map(group =>
          group.id === groupId
            ? {
                ...group,
                enabled: result.data!,
                updateTime: new Date().toISOString(),
              }
            : group
        );
        debouncedSaveGroups(updatedGroups);
        message.success(result.data ? '规则组已启用' : '规则组已禁用');
      } else {
        message.error('操作失败: ' + result.error);
      }
    } catch (error) {
      console.error('❌ 切换规则组状态异常:', error);
      message.error('操作异常');
    } finally {
      setOperationLoading(false);
    }
  };

  /**
   * 开始编辑规则组名称
   */
  const startEditGroupName = (group: GroupRuleVo) => {
    setEditingGroupId(group.id);
    setEditingGroupName(group.groupName);
  };

  /**
   * 保存规则组名称
   */
  const saveGroupName = async () => {
    if (!editingGroupName.trim()) {
      message.error('规则组名称不能为空');
      return;
    }

    setOperationLoading(true);
    try {
      const ruleApi = ApiFactory.getRuleApi();
      const result = await ruleApi.updateGroup(editingGroupId, {
        groupName: editingGroupName.trim(),
      });

      if (result.success) {
        const updatedGroups = groups.map(group =>
          group.id === editingGroupId
            ? {
                ...group,
                groupName: editingGroupName.trim(),
                updateTime: new Date().toISOString(),
              }
            : group
        );
        setGroups(updatedGroups);
        setEditingGroupId('');
        setEditingGroupName('');
        message.success('规则组名称更新成功');
      } else {
        message.error('更新失败: ' + result.error);
      }
    } catch (error) {
      console.error('❌ 更新规则组名称异常:', error);
      message.error('更新异常');
    } finally {
      setOperationLoading(false);
    }
  };

  /**
   * 复制规则组内容
   */
  const copyGroupContent = (group: GroupRuleVo) => {
    if (typeof window !== 'undefined' && window.navigator?.clipboard) {
      window.navigator.clipboard
        .writeText(group.ruleText)
        .then(() => {
          message.success('规则内容已复制到剪贴板');
        })
        .catch(() => {
          message.error('复制失败');
        });
    } else {
      message.error('浏览器不支持剪贴板功能');
    }
  };

  // 获取当前选中的规则组
  const selectedGroup = groups.find(group => group.id === selectedGroupId);

  const isInTab = window.location.href.includes('popup.html');
  const containerClass = isInTab ? 'popup-container-tab' : 'popup-container';

  // 加载中状态
  if (loading) {
    return (
      <div className={containerClass}>
        <div className="loading-container">加载中...</div>
      </div>
    );
  }

  return (
    <div className={containerClass}>
      <div className="app-layout">
        {/* 顶部工具栏 */}
        <div className="app-header">
          <div className="header-left">
            <Space.Compact>
              <Input
                placeholder="输入规则组名称"
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                onPressEnter={handleCreateGroup}
                size="small"
              />
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleCreateGroup}
                size="small"
                loading={operationLoading}
              />
            </Space.Compact>
          </div>
          <div className="header-right">
            <Switch
              checked={globalEnabled}
              onChange={handleGlobalEnabledChange}
              unCheckedChildren="禁用"
              checkedChildren="启用"
            />
            <Tooltip title="标签页中打开">
              <Button
                type="link"
                icon={<CodeOutlined />}
                href="/popup.html"
                target="_blank"
              />
            </Tooltip>

            <Tooltip title="帮助文档">
              <Button
                type="link"
                icon={<QuestionCircleOutlined />}
                onClick={() =>
                  window.open('https://github.com/yize/xswitch', '_blank')
                }
              />
            </Tooltip>
          </div>
        </div>

        <div className="app-body">
          {/* 左侧规则组列表 */}
          <div className="app-body-sider">
            <List
              size="small"
              dataSource={groups}
              renderItem={group => (
                <List.Item
                  className={`group-item list-item ${
                    selectedGroupId === group.id ? 'selected' : ''
                  }`}
                  onClick={() => setSelectedGroupId(group.id)}
                  actions={[
                    <div className="group-item-action" key="group-item-action">
                      <Tooltip title="编辑规则组名称" key="edit">
                        <Button
                          type="text"
                          size="small"
                          icon={<EditOutlined />}
                          onClick={e => {
                            e.stopPropagation();
                            startEditGroupName(group);
                          }}
                          className="edit-button"
                        />
                      </Tooltip>
                      <Tooltip title="复制规则" key="copy">
                        <Button
                          type="text"
                          size="small"
                          icon={<CopyOutlined />}
                          onClick={e => {
                            e.stopPropagation();
                            copyGroupContent(group);
                          }}
                        />
                      </Tooltip>
                      <Tooltip title="删除规则组" key="delete">
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={e => {
                            e.stopPropagation();
                            handleDeleteGroup(group.id);
                          }}
                        />
                      </Tooltip>
                    </div>,
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <div className="group-title-container">
                        <Checkbox
                          checked={group.enabled}
                          onChange={e => {
                            e.stopPropagation();
                            handleToggleGroupEnabled(group.id);
                          }}
                        />
                        {editingGroupId === group.id ? (
                          <Space.Compact>
                            <Input
                              value={editingGroupName}
                              onChange={e =>
                                setEditingGroupName(e.target.value)
                              }
                              onPressEnter={saveGroupName}
                              onBlur={saveGroupName}
                              autoFocus
                              size="small"
                              className="edit-input"
                            />
                          </Space.Compact>
                        ) : (
                          <div className="group-title-edit-container">
                            <Text
                              className={`group-title-text ${
                                group.enabled ? 'enabled' : 'disabled'
                              }`}
                            >
                              {group.groupName}
                            </Text>
                          </div>
                        )}
                      </div>
                    }
                    description={
                      <div>
                        {jsonErrors[group.id] && (
                          <Text type="danger" className="error-text">
                            JSON格式错误
                          </Text>
                        )}
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </div>

          {/* 右侧编辑器 */}
          <div className="app-body-editor">
            {selectedGroup ? (
              <div className="editor-container">
                {/* JSON格式错误提示 */}
                {jsonErrors[selectedGroup.id] && (
                  <Alert
                    message="JSON格式错误"
                    description={jsonErrors[selectedGroup.id]}
                    type="error"
                    showIcon
                    className="error-alert"
                  />
                )}
                {/* 代码编辑器 */}
                <div className="editor-wrapper">
                  <CodeMirrorEditor
                    value={editorValue}
                    onChange={handleEditorChange}
                  />
                </div>
              </div>
            ) : (
              <div className="empty-state-container">
                <div className="empty-state-content">
                  <CodeOutlined className="empty-state-icon" />
                  <div>请选择或创建一个规则组</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
