/**
 * 规则组接口定义
 */
export interface GroupRuleVo {
  /** 规则组ID */
  id: string;
  /** 规则组名称 */
  groupName: string;
  /** 是否启用 */
  enabled: boolean;
  /** 规则配置文本（JSON格式） */
  ruleText: string;
  /** 创建时间 */
  createTime: string;
  /** 更新时间 */
  updateTime: string;
}

/**
 * 操作结果类型
 */
export interface OperationResult {
  success: boolean;
  message?: string;
}

/**
 * 单条代理规则
 */
export interface ProxyRule {
  /** 源地址模式 */
  source: string;
  /** 目标地址 */
  target: string;
}

/**
 * 解析后的规则配置
 */
export interface ParsedRuleConfig {
  /** 代理规则列表 */
  proxy: ProxyRule[];
  /** CORS规则列表 */
  cors: string[];
}