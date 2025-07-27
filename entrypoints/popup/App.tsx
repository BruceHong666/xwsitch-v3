import {
  CodeOutlined,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import { useDebounceFn, useMemoizedFn, useRequest } from 'ahooks';
import {
  Alert,
  Button,
  Checkbox,
  Input,
  List,
  Modal,
  Space,
  Switch,
  Tooltip,
  Typography,
} from 'antd';
import useMessage from 'antd/es/message/useMessage';
import { useEffect, useMemo, useState } from 'react';
import { GroupRuleVo } from '../../types';
import { DEFAULT_NEW_RULE } from '../utils/const';
import { validateJsonFormat } from '../utils/json';
import { ApiFactory } from './api';
import './App.css';
import CodeMirrorEditor from './components/code-mirror-editor';

const { Text } = Typography;

/**
 * 主应用组件 - 集成规则管理功能
 */
function App() {
  // 数据状态
  const loading = false;
  const [message, messageContextHolder] = useMessage();
  // UI状态
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [editorValue, setEditorValue] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroupId, setEditingGroupId] = useState<string>('');
  const [editingGroupName, setEditingGroupName] = useState('');

  // 加载规则组
  const { data: groups = [], runAsync: loadGroups } = useRequest(async () => {
    const ruleApi = ApiFactory.getRuleApi();
    const groupResult = await ruleApi.loadGroups();
    return groupResult.data || [];
  });

  // 获取当前选中的规则组
  const selectedGroup = useMemo(() => {
    return groups.find(group => group.id === selectedGroupId);
  }, [groups, selectedGroupId]);

  // 加载全局启用状态
  const { data: globalEnabled, runAsync: loadGlobalEnabled } = useRequest(
    async () => {
      const systemApi = ApiFactory.getSystemApi();
      const globalEnabledResult = await systemApi.loadGlobalEnabled();
      return globalEnabledResult.data ?? true;
    }
  );

  // 更新徽章
  const { runAsync: updateBadge } = useRequest(async () => {
    const systemApi = ApiFactory.getSystemApi();
    const badgeResult = await systemApi.updateBadge();
    if (!badgeResult.success) {
      console.warn('⚠️ 更新徽章失败:', badgeResult.error);
    }
  });

  // 初始化数据
  useRequest(async () => {
    const systemApi = ApiFactory.getSystemApi();
    const initResult = await systemApi.initializeDefaultData();
    if (!initResult.success) {
      message.error(`⚠️ 初始化默认数据失败:${initResult.error ?? ''}`);
      return;
    }
    // 并行加载数据
    await Promise.all([loadGroups(), loadGlobalEnabled()]);
    await updateBadge();
  });

  // 初始化选中第一个规则组
  useEffect(() => {
    if (!!groups?.length && !selectedGroupId) {
      setSelectedGroupId(groups[0].id);
    }
  }, [groups, selectedGroupId]);

  // 验证所有规则组的JSON格式
  const jsonErrors = useMemo(() => {
    const errors: Record<string, string> = {};

    groups?.forEach(group => {
      const validation = validateJsonFormat(group.ruleText);
      if (!validation.isValid && validation.error) {
        errors[group.id] = validation.error;
      }
    });

    return errors;
  }, [groups]);

  // 当选中规则组变化时，更新编辑器内容
  useEffect(() => {
    const selectedGroup = groups?.find(group => group.id === selectedGroupId);
    if (selectedGroup) {
      setEditorValue(selectedGroup.ruleText);
    }
  }, [selectedGroupId, groups]);

  /**
   * 保存规则组数据 - 带防抖
   */
  const { run: debouncedSaveGroups } = useDebounceFn(
    async (newGroups: GroupRuleVo) => {
      const ruleApi = ApiFactory.getRuleApi();
      const systemApi = ApiFactory.getSystemApi();

      const saveResult = await ruleApi.saveGroup(newGroups);
      if (!saveResult.success) {
        console.error('❌ 保存规则组失败:', saveResult.error);
        message.error('保存失败: ' + saveResult.error);
        return;
      }
      await loadGroups();
      // 更新徽章
      const badgeResult = await systemApi.updateBadge();
      if (!badgeResult.success) {
        console.warn('⚠️ 更新徽章失败:', badgeResult.error);
      }

      console.log('✅ 规则组保存成功');
    },
    { wait: 500 } // 500ms防抖延迟
  );

  useRequest(async (enabled: boolean) => {
    const systemApi = ApiFactory.getSystemApi();

    const saveResult = await systemApi.saveGlobalEnabled(enabled);
    if (!saveResult.success) {
      console.error('❌ 保存全局状态失败:', saveResult.error);
      return {
        success: false,
        message: saveResult.error || '保存全局状态失败',
      };
    }
    await loadGlobalEnabled();
  });

  /**
   * 处理全局启用状态变更
   */
  const handleGlobalEnabledChange = async (enabled: boolean) => {
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
    await loadGlobalEnabled();
    await updateBadge();
  };

  /**
   * 处理编辑器内容变化
   */
  const handleEditorChange = useMemoizedFn((value: string) => {
    setEditorValue(value);
    // 使用防抖保存
    debouncedSaveGroups({
      ...selectedGroup,
      ruleText: value,
    });
  });

  /**
   * 创建新规则组
   */
  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      message.error('请输入规则组名称');
      return;
    }
    const ruleApi = ApiFactory.getRuleApi();
    const result = await ruleApi.createGroup(
      newGroupName.trim(),
      DEFAULT_NEW_RULE
    );
    if (!result.success || !result.data) {
      message.error('创建失败: ' + result.error);
      return;
    }
    setSelectedGroupId(result.data.id);
    setNewGroupName('');
    await loadGroups();
    await updateBadge();
    message.success('规则组创建成功');
  };

  /**
   * 删除规则组
   */
  const handleDeleteGroup = async (groupId: string) => {
    const group = groups?.find(g => g.id === groupId);
    if (!group) return;

    Modal.confirm({
      title: '确认删除',
      content: `确定要删除规则组"${group.groupName}"吗？此操作不可恢复。`,
      onOk: async () => {
        const ruleApi = ApiFactory.getRuleApi();
        const result = await ruleApi.deleteGroup(groupId);
        if (!result.success) {
          message.error('删除失败: ' + result.error);
          return;
        }
        await loadGroups();
        await updateBadge();
        message.success('规则组删除成功');
      },
    });
  };

  /**
   * 切换规则组启用状态
   */
  const handleToggleGroupEnabled = async (groupId: string) => {
    const ruleApi = ApiFactory.getRuleApi();
    const result = await ruleApi.toggleGroup(groupId);
    if (!result.success) {
      message.error('操作失败: ' + result.error);
      return;
    }
    await loadGroups();
    await updateBadge();
    message.success(result.data ? '规则组已启用' : '规则组已禁用');
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
    const ruleApi = ApiFactory.getRuleApi();
    const result = await ruleApi.updateGroup(editingGroupId, {
      groupName: editingGroupName.trim(),
    });
    if (!result.success) {
      message.error('更新失败: ' + result.error);
      return;
    }
    await loadGroups();
    message.success('规则组名称更新成功');
  };

  /**
   * 复制规则组内容
   */
  const copyGroupContent = async (group: GroupRuleVo) => {
    const ruleApi = ApiFactory.getRuleApi();
    const result = await ruleApi.createGroup(
      `${group.groupName}-copy`,
      group.ruleText
    );
    if (!result.success || !result.data) {
      message.error('复制失败: ' + result.error);
      return;
    }
    setSelectedGroupId(result.data.id);
    setNewGroupName('');
    await loadGroups();
    await updateBadge();
    message.success('规则组复制成功');
  };

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
      {messageContextHolder}
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
                      <Tooltip title="复制规则并创建一份新规则" key="copy">
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
                <CodeMirrorEditor
                  value={editorValue}
                  onChange={handleEditorChange}
                />
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
