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
import { storage } from '../../../utils/storage';
import CodeMirrorEditor from '../code-mirror-editor';
import './index.css';

const { Header, Content, Sider } = Layout;
const { Text, Title } = Typography;

export function Main() {
  const [groups, setGroups] = useState<GroupRuleVo[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [editorValue, setEditorValue] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroupId, setEditingGroupId] = useState<string>('');
  const [editingGroupName, setEditingGroupName] = useState('');
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeData();
  }, []);

  useEffect(() => {
    const selectedGroup = groups.find(g => g.id === selectedGroupId);
    if (selectedGroup) {
      setEditorValue(selectedGroup.ruleText);
    }
  }, [selectedGroupId, groups]);

  const initializeData = async () => {
    try {
      setLoading(true);
      const [savedGroups, savedGlobalEnabled] = await Promise.all([
        storage.loadGroups(),
        storage.loadGlobalEnabled(),
      ]);

      if (savedGroups.length === 0) {
        const defaultGroup: GroupRuleVo = {
          id: '1',
          name: 'Default Group',
          enabled: true,
          ruleText:
            '{\n  "proxy": [\n    ["https://api.example.com/v1/(.*)", "http://localhost:3000/api/$1"]\n  ],\n  "cors": [\n    "https://api.example.com/*"\n  ]\n}',
        };
        setGroups([defaultGroup]);
        setSelectedGroupId('1');
        await storage.saveGroups([defaultGroup]);
      } else {
        setGroups(savedGroups);
        setSelectedGroupId(savedGroups[0]?.id || '');
      }

      setGlobalEnabled(savedGlobalEnabled);
    } catch (error) {
      console.error('Failed to initialize data:', error);
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    const targetGroup = groups.find(g => g.id === selectedGroupId);
    if (!targetGroup) return;

    try {
      JSON.parse(editorValue);
      const updatedGroups = groups.map(g =>
        g.id === selectedGroupId ? { ...g, ruleText: editorValue } : g
      );
      setGroups(updatedGroups);
      await storage.saveGroups(updatedGroups);
      message.success('规则配置保存成功！');
    } catch (e) {
      message.error('保存失败：JSON格式无效');
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      message.warning('请输入规则组名称');
      return;
    }
    const newGroup: GroupRuleVo = {
      id: Date.now().toString(),
      name: newGroupName.trim(),
      enabled: true,
      ruleText: '{\n  "proxy": [],\n  "cors": []\n}',
    };
    const updatedGroups = [...groups, newGroup];
    setGroups(updatedGroups);
    setNewGroupName('');
    setSelectedGroupId(newGroup.id);
    await storage.saveGroups(updatedGroups);
    message.success('规则组创建成功！');
  };

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
        const updatedGroups = groups.filter(g => g.id !== groupId);
        setGroups(updatedGroups);
        if (selectedGroupId === groupId) {
          setSelectedGroupId(updatedGroups[0]?.id || '');
        }
        await storage.saveGroups(updatedGroups);
        message.success('规则组删除成功！');
      },
    });
  };

  const handleCopyGroup = async (group: GroupRuleVo) => {
    const newGroup: GroupRuleVo = {
      id: Date.now().toString(),
      name: `${group.name} - 副本`,
      enabled: group.enabled,
      ruleText: group.ruleText,
    };
    const updatedGroups = [...groups, newGroup];
    setGroups(updatedGroups);
    await storage.saveGroups(updatedGroups);
    message.success('规则组复制成功！');
  };

  const handleEditGroupName = (groupId: string, currentName: string) => {
    setEditingGroupId(groupId);
    setEditingGroupName(currentName);
  };

  const handleSaveGroupName = async (groupId: string) => {
    if (!editingGroupName.trim()) {
      message.warning('规则组名称不能为空');
      return;
    }
    const updatedGroups = groups.map(g =>
      g.id === groupId ? { ...g, name: editingGroupName.trim() } : g
    );
    setGroups(updatedGroups);
    setEditingGroupId('');
    setEditingGroupName('');
    await storage.saveGroups(updatedGroups);
    message.success('规则组名称修改成功！');
  };

  const toggleGroupEnabled = async (groupId: string) => {
    const updatedGroups = groups.map(g =>
      g.id === groupId ? { ...g, enabled: !g.enabled } : g
    );
    setGroups(updatedGroups);
    await storage.saveGroups(updatedGroups);
  };

  const handleGlobalEnabledChange = async (enabled: boolean) => {
    setGlobalEnabled(enabled);
    await storage.saveGlobalEnabled(enabled);
  };

  const openOptionsPage = () => browser.runtime.openOptionsPage();

  const openGitHubReadme = () =>
    browser.tabs.create({
      url: 'https://github.com/BruceHong666/xswitch-v3',
    });

  const openConsole = () =>
    browser.tabs.create({
      url: browser.runtime.getURL('popup.html'),
    });

  const selectedGroup = groups.find(g => g.id === selectedGroupId);
  const isChanged = selectedGroup && editorValue !== selectedGroup.ruleText;

  if (loading) {
    return (
      <div className="main-container">
        <div className="main-loading">
          <Text>加载中...</Text>
        </div>
      </div>
    );
  }

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
              disabled={!newGroupName.trim()}
            />
          </Space.Compact>

          <Space size="small">
            <Tooltip
              title={`代理全局开关 - ${globalEnabled ? '已启用' : '已禁用'}`}
            >
              <Switch
                onChange={handleGlobalEnabledChange}
                checked={globalEnabled}
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
                              <Text
                                strong={isSelected}
                                className={`group-name-text ${isSelected ? 'group-name-text-selected' : ''} ${!group.enabled ? 'group-name-text-disabled' : ''}`}
                              >
                                {group.name}
                              </Text>
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
          <div className="main-editor-container">
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
