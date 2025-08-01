import { GroupRuleVo } from '../../types';
import { parseRuleGroup, validateJsonFormat } from './json';

interface ProxyRule {
  id: string;
  name: string;
  enabled: boolean;
  source: string;
  target: string;
  type: 'string' | 'regex';
}

interface CorsRule {
  id: string;
  pattern: string;
  enabled: boolean;
}

const CORS_HEADERS = {
  ORIGIN: 'Access-Control-Allow-Origin',
  CREDENTIALS: 'Access-Control-Allow-Credentials',
  METHODS: 'Access-Control-Allow-Methods',
  HEADERS: 'Access-Control-Allow-Headers',
};

const DEFAULT_CORS_CONFIG = {
  origin: '*',
  credentials: 'true',
  methods: 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
  headers: 'Origin, X-Requested-With, Content-Type, Accept, Authorization',
};

export class NetworkService {
  private ruleIdCounter = 1;
  private ruleMapping = new Map<
    number,
    { source: string; target: string; name?: string }
  >();
  private beforeRequestListener: ((details: any) => any) | null = null;
  private completedListener: ((details: any) => void) | null = null;
  private currentGlobalEnabled: boolean = false;
  private currentGroups: GroupRuleVo[] = [];

  async updateRules(
    groups: GroupRuleVo[],
    globalEnabled: boolean
  ): Promise<void> {
    if (!globalEnabled) {
      await this.clearAllRules();
      // 重新设置监听器（禁用状态）
      this.setupNetworkLogging(globalEnabled, groups);
      return;
    }

    const enabledGroups = groups.filter(group => group.enabled);
    if (enabledGroups.length === 0) {
      await this.clearAllRules();
      // 重新设置监听器（无规则状态）
      this.setupNetworkLogging(globalEnabled, groups);
      return;
    }

    const allRules: chrome.declarativeNetRequest.Rule[] = [];
    this.ruleMapping.clear();

    for (const group of enabledGroups) {
      const validation = validateJsonFormat(group.ruleText);
      if (!validation.isValid) {
        console.warn(`Skipping group ${group.groupName} due to invalid JSON`);
        continue;
      }

      try {
        const parsedRules = parseRuleGroup(group.ruleText);
        const proxyRules = this.generateProxyRules(parsedRules.proxy || []);
        const corsRules = this.generateCorsRules(parsedRules.cors || []);

        console.log(`📋 Generated ${proxyRules.length} proxy rules and ${corsRules.length} CORS rules for group: ${group.groupName}`);
        allRules.push(...proxyRules, ...corsRules);
      } catch (error) {
        console.error(
          `Failed to parse rules for group ${group.groupName}:`,
          error
        );
      }
    }

    await this.applyDeclarativeRules(allRules);
    // 规则更新后重新设置监听器
    this.setupNetworkLogging(globalEnabled, groups);
  }

  private generateProxyRules(
    proxyRules: ProxyRule[]
  ): chrome.declarativeNetRequest.Rule[] {
    const rules: chrome.declarativeNetRequest.Rule[] = [];

    proxyRules.forEach(rule => {
      if (!rule.enabled) return;

      try {
        const redirect = this.convertToRedirect(rule.source, rule.target);
        
        if (redirect) {
          const ruleId = this.ruleIdCounter++;

          this.ruleMapping.set(ruleId, {
            source: rule.source,
            target: rule.target,
            name: rule.name,
          });

          // 判断是否需要使用正则表达式
          const isRegexPattern = rule.source.includes('(') && rule.target.includes('$');
          
          let condition: any = {
            resourceTypes: [
              chrome.declarativeNetRequest.ResourceType.MAIN_FRAME,
              chrome.declarativeNetRequest.ResourceType.SUB_FRAME,
              chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
              chrome.declarativeNetRequest.ResourceType.SCRIPT,
              chrome.declarativeNetRequest.ResourceType.STYLESHEET,
              chrome.declarativeNetRequest.ResourceType.IMAGE,
              chrome.declarativeNetRequest.ResourceType.FONT,
              chrome.declarativeNetRequest.ResourceType.OBJECT,
              chrome.declarativeNetRequest.ResourceType.MEDIA,
              chrome.declarativeNetRequest.ResourceType.WEBSOCKET,
              chrome.declarativeNetRequest.ResourceType.OTHER,
            ],
          };

          if (isRegexPattern && redirect.regexSubstitution) {
            // 使用regexFilter而不是urlFilter
            const regexFilter = this.convertToRegexFilter(rule.source);
            if (regexFilter) {
              condition.regexFilter = regexFilter;
              console.log('📋 Using regexFilter:', condition.regexFilter);
            } else {
              // 如果regexFilter转换失败，回退到urlFilter并清除regexSubstitution
              console.warn('⚠️ RegexFilter conversion failed, falling back to urlFilter');
              condition.urlFilter = this.convertToUrlFilter(rule.source);
              redirect = { url: rule.target }; // 清除regexSubstitution，使用简单URL重定向
              console.log('📋 Fallback to urlFilter:', condition.urlFilter);
            }
          } else {
            // 使用urlFilter
            condition.urlFilter = this.convertToUrlFilter(rule.source);
            console.log('📋 Using urlFilter:', condition.urlFilter);
          }

          rules.push({
            id: ruleId,
            priority: 1,
            action: {
              type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
              redirect,
            },
            condition,
          });
        }
      } catch (error) {
        console.error(
          'Failed to generate proxy rule:',
          'Rule:',
          rule,
          'Error:',
          error instanceof Error ? error.message : String(error),
          'Code: PROXY_RULE_ERROR'
        );
      }
    });

    return rules;
  }

  private generateCorsRules(
    corsRules: CorsRule[]
  ): chrome.declarativeNetRequest.Rule[] {
    const rules: chrome.declarativeNetRequest.Rule[] = [];

    corsRules.forEach(rule => {
      if (!rule.enabled) return;

      try {
        const urlFilter = this.convertToUrlFilter(rule.pattern);
        if (urlFilter) {
          rules.push({
            id: this.ruleIdCounter++,
            priority: 2,
            action: {
              type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
              responseHeaders: [
                {
                  header: CORS_HEADERS.ORIGIN,
                  operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                  value: DEFAULT_CORS_CONFIG.origin,
                },
                {
                  header: CORS_HEADERS.CREDENTIALS,
                  operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                  value: DEFAULT_CORS_CONFIG.credentials,
                },
                {
                  header: CORS_HEADERS.METHODS,
                  operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                  value: DEFAULT_CORS_CONFIG.methods,
                },
                {
                  header: CORS_HEADERS.HEADERS,
                  operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                  value: DEFAULT_CORS_CONFIG.headers,
                },
              ],
            },
            condition: {
              urlFilter,
              resourceTypes: [
                chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
              ],
            },
          });
        }
      } catch (error) {
        console.error('Failed to generate CORS rule:', rule, error);
      }
    });

    return rules;
  }

  private convertToRegexFilter(source: string): string | undefined {
    try {
      console.log('🔧 Converting regex filter for source:', source);
      
      // 对于正则表达式，直接返回原始模式
      // Chrome declarativeNetRequest 的 regexFilter 使用 RE2 语法
      let regexFilter = source;
      
      // 确保以 ^ 开头和 $ 结尾以精确匹配
      if (!regexFilter.startsWith('^')) {
        regexFilter = '^' + regexFilter;
      }
      if (!regexFilter.endsWith('$')) {
        regexFilter = regexFilter + '$';
      }
      
      // 将贪婪匹配 (.*) 转换为非贪婪匹配 (.*?) 以提高匹配精度
      regexFilter = regexFilter.replace(/\(\.\*\)/g, '(.*?)');
      
      console.log('📋 Regex filter:', regexFilter);
      return regexFilter;
    } catch (error) {
      console.error('❌ Failed to convert regex filter:', source, error);
      return undefined;
    }
  }

  private convertToUrlFilter(source: string): string | undefined {
    try {
      console.log('🔧 Converting URL filter for source:', source);

      // 处理正则表达式形式: (.*)/path/(.*)
      if (source.includes('(') && source.includes('.*')) {
        // 提取主域名部分
        const domainMatch = source.match(/https?:\/\/([^\/\(\)]+)/);
        if (domainMatch) {
          const domain = domainMatch[1];
          console.log('📋 Extracted domain from regex:', domain);
          return `*://${domain}/*`;
        }
        
        // 处理更复杂的正则模式，简化为通配符
        let simplified = source
          .replace(/^\(\.\*\)/, '*')
          .replace(/\(\.\*\)/g, '*')
          .replace(/\.\*/, '*')
          .replace(/\$$/, '')
          .replace(/^\^/, '');
          
        if (simplified.includes('://')) {
          simplified = simplified.replace(/^https?/, '*');
          console.log('📋 Simplified regex to:', simplified);
          return simplified;
        }
        
        // 作为路径模式处理
        const pathPattern = `*://*/*${simplified.replace(/[^\w\-\.\/]/g, '')}*`;
        console.log('📋 Created path pattern:', pathPattern);
        return pathPattern;
      }

      // 处理完整URL: https://example.com/path
      if (source.includes('://')) {
        let urlFilter = source.replace(/^https?:/, '*:');
        // 如果没有路径，添加通配符
        if (!urlFilter.includes('/', 8)) {
          urlFilter += '/*';
        } else if (!urlFilter.endsWith('/') && !this.isFileExtension(urlFilter)) {
          urlFilter += '*';
        }
        console.log('📋 Full URL filter:', urlFilter);
        return urlFilter;
      }

      // 处理域名: example.com
      if (source.includes('.') && !source.includes('/')) {
        const domainFilter = `*://${source}/*`;
        console.log('📋 Domain filter:', domainFilter);
        return domainFilter;
      }

      // 处理路径模式: /api/test
      if (source.startsWith('/')) {
        const pathFilter = `*://*/*${source}*`;
        console.log('📋 Path filter:', pathFilter);
        return pathFilter;
      }

      // 默认作为子字符串匹配
      const defaultFilter = `*://*/*${source}*`;
      console.log('📋 Default filter:', defaultFilter);
      return defaultFilter;
    } catch (error) {
      console.error('❌ Failed to convert URL filter:', source, error);
      return undefined;
    }
  }

  private runRegexSubstitutionTests(): void {
    console.log('🧪 ========== RegexSubstitution 测试开始 ==========');
    
    // 测试用例：模拟用户的实际配置
    const testCases = [
      {
        name: '用户实际案例 - 版本号替换',
        source: 'https://g.alicdn.com/m2c-fe/1688-print-order/([0-9.]*)/(.*)',
        target: 'https://g.alicdn.com/m2c-fe/1688-print-order/1.2.0/$2',
        testUrl: 'https://g.alicdn.com/m2c-fe/1688-print-order/4.2.2/umi.js',
        expectedResult: 'https://g.alicdn.com/m2c-fe/1688-print-order/1.2.0/umi.js'
      },
      {
        name: '基础替换测试',
        source: 'https://example.com/(.*)/old/(.*)',
        target: 'https://example.com/$1/new/$2',
        testUrl: 'https://example.com/api/old/index.js',
        expectedResult: 'https://example.com/api/new/index.js'
      },
      {
        name: '单捕获组测试',
        source: 'https://cdn.example.com/v([0-9.]+)/(.*)',
        target: 'https://cdn.example.com/v2.0.0/$2',
        testUrl: 'https://cdn.example.com/v1.5.3/main.js',
        expectedResult: 'https://cdn.example.com/v2.0.0/main.js'
      }
    ];

    testCases.forEach((testCase, index) => {
      console.log(`\n🧪 测试案例 ${index + 1}: ${testCase.name}`);
      console.log(`   Source Pattern: ${testCase.source}`);
      console.log(`   Target Pattern: ${testCase.target}`);
      console.log(`   Test URL: ${testCase.testUrl}`);
      console.log(`   Expected: ${testCase.expectedResult}`);
      
      // 1. 测试 JavaScript 正则替换（用于 webRequest 日志）
      try {
        const jsRegex = new RegExp(testCase.source, 'i');
        const jsResult = testCase.testUrl.replace(jsRegex, testCase.target);
        console.log(`   ✅ JS Regex Result: ${jsResult}`);
        
        if (jsResult === testCase.expectedResult) {
          console.log(`   ✅ JS 替换正确`);
        } else {
          console.log(`   ❌ JS 替换错误`);
        }
      } catch (error) {
        console.log(`   ❌ JS Regex Error: ${error}`);
      }
      
      // 2. 测试 Chrome regexSubstitution 转换
      const chromeSubstitution = testCase.target.replace(/\$(\d+)/g, '\\\\$1');
      console.log(`   Chrome regexSubstitution: ${chromeSubstitution}`);
      
      // 3. 测试 regexFilter 生成
      const regexFilter = this.convertToRegexFilter(testCase.source);
      console.log(`   Chrome regexFilter: ${regexFilter}`);
      
      // 4. 生成完整的 declarativeNetRequest 规则
      const rule = {
        id: 999 + index,
        priority: 1,
        action: {
          type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
          redirect: {
            regexSubstitution: chromeSubstitution
          }
        },
        condition: {
          regexFilter: regexFilter,
          resourceTypes: [chrome.declarativeNetRequest.ResourceType.SCRIPT]
        }
      };
      
      console.log(`   Generated Rule:`, JSON.stringify(rule, null, 4));
    });
    
    console.log('\n🧪 ========== RegexSubstitution 测试结束 ==========\n');
  }

  private convertToRedirect(
    source: string,
    target: string
  ): chrome.declarativeNetRequest.Redirect | undefined {
    try {
      console.log('🔧 Converting redirect - source:', source, 'target:', target);

      // 直接URL重定向: https://example.com/new (仅当source不包含捕获组时)
      if (!source.includes('(') && (target.startsWith('http://') || target.startsWith('https://'))) {
        console.log('📋 Direct URL redirect:', target);
        return { url: target };
      }

      // 处理正则表达式替换: (.*)/old/(.*) -> $1/new/$2 或完整URL替换
      if (source.includes('(')) {
        console.log('📋 Attempting regex substitution for source:', source);
        
        // 尝试使用regexSubstitution
        try {
          let substitution: string;
          
          if (target.includes('$')) {
            // 包含 $1, $2 等捕获组引用，转换为 Chrome regexSubstitution 格式
            // Chrome 使用 \1, \2 格式，在 JavaScript 字符串中需要写成 '\\1', '\\2'
            substitution = target.replace(/\$(\d+)/g, '\\$1');
          } else {
            // 分析 source 和 target，尝试自动生成替换模式
            // 例如: source = "https://g.alicdn.com/m2c-fe/1688-print-order/(.*)/umi.js"
            //      target = "https://g.alicdn.com/m2c-fe/1688-print-order/1.2.0/umi.js"
            // 应该生成: "https://g.alicdn.com/m2c-fe/1688-print-order/1.2.0/umi.js"
            
            // 检查 source 中是否有捕获组
            const captureGroups = (source.match(/\([^)]*\)/g) || []).length;
            
            if (captureGroups === 0) {
              // 没有捕获组，直接使用目标URL
              substitution = target;
            } else {
              // 有捕获组但target是固定URL，需要智能匹配
              // 对于版本号替换这种常见场景，直接使用目标URL
              console.log(`⚠️ Source has ${captureGroups} capture group(s) but target is fixed URL, using direct substitution`);
              substitution = target;
            }
          }
          
          console.log('🔧 [DEBUG] ========== Redirect 转换详情 ==========');
          console.log('📋 Source pattern:', source);
          console.log('📋 Original target:', target);
          console.log('📋 Converted substitution:', substitution);
          
          // 验证转换结果
          if (target.includes('$')) {
            console.log('🔧 [DEBUG] 捕获组转换:');
            const matches = target.match(/\$(\d+)/g) || [];
            matches.forEach(match => {
              const converted = match.replace(/\$(\d+)/, '\\\\$1');
              console.log(`   ${match} -> ${converted}`);
            });
          }
          
          // 测试对用户实际案例的处理
          if (source.includes('1688-print-order')) {
            console.log('🔧 [DEBUG] 用户案例测试:');
            console.log(`   用户的target: ${target}`);
            console.log(`   Chrome格式: ${substitution}`);
            console.log(`   应该将 $2 转换为 \\\\2`);
          }
          console.log('🔧 [DEBUG] ========== 转换详情结束 ==========');
          
          return {
            regexSubstitution: substitution,
          };
        } catch (error) {
          console.log('⚠️ Regex substitution failed:', error);
        }
      }

      // 相对路径重定向: /api/new -> http://localhost:3000/api/new  
      if (target.startsWith('/')) {
        const redirectUrl = `http://localhost:3000${target}`;
        console.log('📋 Relative path redirect:', redirectUrl);
        return { url: redirectUrl };
      }

      // 域名重定向: example.com -> http://example.com
      if (!target.includes('://') && target.includes('.') && !target.includes('/')) {
        const redirectUrl = `http://${target}`;
        console.log('📋 Domain redirect:', redirectUrl);
        return { url: redirectUrl };
      }

      // 处理包含协议的目标
      if (target.includes('://')) {
        console.log('📋 Protocol-included redirect:', target);
        return { url: target };
      }

      // 默认处理：假设是完整URL或添加http前缀
      const fallbackUrl = target.startsWith('//') ? `http:${target}` : 
                         target.includes('://') ? target : `http://${target}`;
      console.log('📋 Fallback redirect:', fallbackUrl);
      return { url: fallbackUrl };
    } catch (error) {
      console.error(
        '❌ Failed to convert redirect:',
        'Source:', source,
        'Target:', target,
        'Error:', error instanceof Error ? error.message : String(error),
        'Code: REDIRECT_CONVERSION_ERROR'
      );
      return undefined;
    }
  }

  private isFileExtension(url: string): boolean {
    const fileExtensions = [
      '.js',
      '.css',
      '.html',
      '.json',
      '.xml',
      '.txt',
      '.pdf',
      '.png',
      '.jpg',
      '.jpeg',
      '.gif',
      '.svg',
      '.woff',
      '.woff2',
      '.ttf',
      '.eot',
    ];
    return fileExtensions.some(ext => url.toLowerCase().endsWith(ext));
  }

  private async applyDeclarativeRules(
    rules: chrome.declarativeNetRequest.Rule[]
  ): Promise<void> {
    try {
      console.log('🔄 Applying declarative rules...');
      console.log('Rules to apply:', JSON.stringify(rules, null, 2));
      
      // 专门检查 regexSubstitution 规则
      rules.forEach(rule => {
        if (rule.action.redirect?.regexSubstitution) {
          console.log(`🔍 RegexSubstitution rule ${rule.id}:`);
          console.log(`   regexFilter: ${rule.condition.regexFilter}`);
          console.log(`   regexSubstitution: ${rule.action.redirect.regexSubstitution}`);
        }
      });

      const existingRules =
        await chrome.declarativeNetRequest.getDynamicRules();
      const ruleIdsToRemove = existingRules.map(rule => rule.id);

      console.log('Removing existing rules:', ruleIdsToRemove);

      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: ruleIdsToRemove,
        addRules: rules,
      });

      console.log(`✅ Successfully applied ${rules.length} declarative rules`);

      const newRules = await chrome.declarativeNetRequest.getDynamicRules();
      console.log('Active rules after update:', newRules.length);
      console.log('Active rules details:', JSON.stringify(newRules, null, 2));
    } catch (error) {
      console.error(
        '❌ Failed to apply declarative rules:',
        'Rules count:',
        rules.length,
        'Error:',
        error instanceof Error ? error.message : String(error),
        'Code: DECLARATIVE_RULES_ERROR'
      );
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }
    }
  }

  private async clearAllRules(): Promise<void> {
    try {
      const existingRules =
        await chrome.declarativeNetRequest.getDynamicRules();
      const ruleIdsToRemove = existingRules.map(rule => rule.id);

      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: ruleIdsToRemove,
        addRules: [],
      });

      console.log('Cleared all rules');
    } catch (error) {
      console.error('Failed to clear rules:', error);
    }
  }

  setupNetworkLogging(globalEnabled: boolean, groups: GroupRuleVo[]): void {
    if (typeof chrome === 'undefined' || !chrome.webRequest) return;

    console.log(`🔧 [DEBUG] Setting up network logging - globalEnabled: ${globalEnabled}, groups: ${groups.length}`);

    // 移除旧的监听器
    if (this.beforeRequestListener) {
      console.log('🗑️ [DEBUG] Removing old beforeRequest listener');
      chrome.webRequest.onBeforeRequest.removeListener(this.beforeRequestListener);
    }
    if (this.completedListener) {
      console.log('🗑️ [DEBUG] Removing old completed listener');
      chrome.webRequest.onCompleted.removeListener(this.completedListener);
    }

    // 存储当前的规则状态
    this.currentGlobalEnabled = globalEnabled;
    this.currentGroups = groups;

    // 创建新的监听器
    this.beforeRequestListener = (details: any) => {
      console.log(`🎯 [DEBUG] webRequest triggered for: ${details.url}`);
      this.logProxyHit(details, this.currentGlobalEnabled, this.currentGroups);
      return undefined;
    };

    this.completedListener = (details: any) => {
      this.logRequestCompleted(details, this.currentGlobalEnabled, this.currentGroups);
    };

    // 添加新的监听器
    console.log('➕ [DEBUG] Adding new beforeRequest listener');
    chrome.webRequest.onBeforeRequest.addListener(
      this.beforeRequestListener,
      { urls: ['<all_urls>'] },
      ['requestBody']
    );

    console.log('➕ [DEBUG] Adding new completed listener');
    chrome.webRequest.onCompleted.addListener(
      this.completedListener,
      { urls: ['<all_urls>'] }
    );
    
    console.log('✅ [DEBUG] Network logging setup completed');
  }

  private logProxyHit(
    details: any,
    globalEnabled: boolean,
    groups: GroupRuleVo[]
  ): void {
    if (!globalEnabled) {
      console.log(`🔍 [XSwitch V3] Skip - Global disabled: ${details.url}`);
      return;
    }

    const enabledGroups = groups.filter(group => group.enabled);
    if (enabledGroups.length === 0) {
      console.log(`🔍 [XSwitch V3] Skip - No enabled groups: ${details.url}`);
      return;
    }

    console.log(`🔍 [XSwitch V3] Checking: ${details.url} (${details.type})`);

    let hasMatch = false;
    enabledGroups.forEach(group => {
      const validation = validateJsonFormat(group.ruleText);
      if (!validation.isValid) return;

      try {
        const parsedRules = parseRuleGroup(group.ruleText);
        const proxyRules = parsedRules.proxy || [];

        proxyRules.forEach((rule, index) => {
          if (!rule.enabled) {
            console.log(
              `  ❌ Rule ${index + 1} (${rule.name || 'Unnamed'}) - DISABLED`
            );
            return;
          }

          const isMatched = this.isUrlMatched(details.url, rule.source);
          if (isMatched) {
            hasMatch = true;
            const targetUrl = this.getTargetUrl(
              details.url,
              rule.source,
              rule.target
            );

            console.group(`✅ [XSwitch V3] MATCH - Rule ${index + 1}`);
            console.log(`📥 Original: ${details.url}`);
            console.log(`📤 Target: ${targetUrl}`);
            console.log(`📋 Rule: ${rule.name || 'Unnamed'}`);
            console.log(`🎯 Pattern: ${rule.source}`);
            console.log(`⏰ Time: ${new Date().toLocaleString()}`);
            console.log(`📊 Type: ${details.type}`);
            if (details.tabId && details.tabId !== -1) {
              console.log(`🖼️ Tab: ${details.tabId}`);
            }
            console.groupEnd();

            if (details.tabId && details.tabId !== -1) {
              chrome.tabs
                .sendMessage(details.tabId, {
                  type: 'PROXY_HIT',
                  data: {
                    originalUrl: details.url,
                    targetUrl: targetUrl,
                    ruleName: rule.name || '未命名规则',
                    requestType: details.type,
                    method: details.method || 'GET',
                    timestamp: Date.now(),
                  },
                })
                .catch(() => {
                  // 忽略错误，可能没有content script
                });
            }
          } else {
            console.log(
              `  ❌ Rule ${index + 1} (${rule.name || 'Unnamed'}) - NO MATCH: ${rule.source}`
            );
          }
        });
      } catch (error) {
        console.error(
          'Failed to parse rules for group:',
          'Group name:',
          group.groupName,
          'Error:',
          error instanceof Error ? error.message : String(error),
          'Code: RULE_PARSE_ERROR'
        );
      }
    });

    if (!hasMatch) {
      console.log(`  ➡️ [XSwitch V3] No matching rules for: ${details.url}`);
    }
  }

  private logRequestCompleted(
    details: chrome.webRequest.WebRequestDetails & { statusCode?: number },
    globalEnabled: boolean,
    groups: GroupRuleVo[]
  ): void {
    if (
      details.statusCode &&
      (details.statusCode < 200 || details.statusCode >= 400)
    ) {
      const enabledGroups = groups.filter(group => group.enabled);
      if (enabledGroups.length === 0) return;

      let hasMatchedRule = false;
      enabledGroups.forEach(group => {
        const validation = validateJsonFormat(group.ruleText);
        if (!validation.isValid) return;

        try {
          const parsedRules = parseRuleGroup(group.ruleText);
          const proxyRules = parsedRules.proxy || [];

          const matchedRule = proxyRules.find(rule => {
            if (!rule.enabled) return false;
            return this.isUrlMatched(details.url, rule.source);
          });

          if (matchedRule) {
            hasMatchedRule = true;
          }
        } catch (error) {
          console.error(
            'Failed to check rules for group:',
            'Group name:',
            group.groupName,
            'Error:',
            error instanceof Error ? error.message : String(error),
            'Code: RULE_CHECK_ERROR'
          );
        }
      });

      if (hasMatchedRule) {
        console.warn(
          `⚠️ [XSwitch V3] 代理请求失败 - 状态码: ${details.statusCode}, URL: ${details.url}`
        );
      }
    }
  }

  private isUrlMatched(url: string, pattern: string): boolean {
    try {
      console.log(`🔍 Matching URL: "${url}" against pattern: "${pattern}"`);
      
      // 检查是否为正则表达式模式
      const isRegexPattern =
        pattern.includes('(') ||
        pattern.includes('.*') ||
        pattern.includes('$') ||
        pattern.includes('^') ||
        pattern.includes('[') ||
        pattern.includes(']') ||
        pattern.includes('+') ||
        pattern.includes('?') ||
        pattern.includes('|');

      if (isRegexPattern) {
        // 正则表达式匹配
        console.log(`🔧 Using regex matching for pattern: ${pattern}`);
        try {
          const regex = new RegExp(pattern, 'i');
          const result = regex.test(url);
          console.log(`📋 Regex result: ${result}`);
          return result;
        } catch (error) {
          console.error(
            '❌ Invalid regex pattern:',
            'Pattern:',
            pattern,
            'Error:',
            error instanceof Error ? error.message : String(error),
            'Code: REGEX_ERROR'
          );
          return false;
        }
      } else {
        // 字符串匹配
        console.log(`🔧 Using string matching for pattern: ${pattern}`);
        const result = url.indexOf(pattern) > -1;
        console.log(`📋 String match result: ${result}`);
        return result;
      }
    } catch (error) {
      console.error(
        '❌ URL matching failed:',
        'URL:',
        url,
        'Pattern:',
        pattern,
        'Error:',
        error instanceof Error ? error.message : String(error),
        'Code: URL_MATCH_ERROR'
      );
      return false;
    }
  }

  private getTargetUrl(
    originalUrl: string,
    sourcePattern: string,
    target: string
  ): string {
    try {
      console.log(`🔧 getTargetUrl: "${originalUrl}" -> pattern: "${sourcePattern}" -> target: "${target}"`);
      
      // 检查是否为正则表达式模式
      const isRegexPattern =
        sourcePattern.includes('(') ||
        sourcePattern.includes('.*') ||
        sourcePattern.includes('$') ||
        sourcePattern.includes('^') ||
        sourcePattern.includes('[') ||
        sourcePattern.includes(']') ||
        sourcePattern.includes('+') ||
        sourcePattern.includes('?') ||
        sourcePattern.includes('|');

      if (isRegexPattern) {
        try {
          const regex = new RegExp(sourcePattern, 'i');
          console.log(`🔧 Using regex: ${regex}`);
          
          // JavaScript 正则替换语法：$1, $2, ... 对应捕获组
          const result = originalUrl.replace(regex, target);
          console.log(`📋 Regex replacement result: "${result}"`);
          return result;
        } catch (error) {
          console.error('❌ Error applying regex replacement:', error);
          return originalUrl;
        }
      } else {
        // 字符串替换
        console.log(`🔧 Using string replacement`);
        const result = originalUrl.split(sourcePattern).join(target);
        console.log(`📋 String replacement result: "${result}"`);
        return result;
      }
    } catch (error) {
      console.error('❌ Target URL generation failed:', error);
      return target;
    }
  }
}

export const networkService = new NetworkService();
