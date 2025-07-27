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

  async updateRules(
    groups: GroupRuleVo[],
    globalEnabled: boolean
  ): Promise<void> {
    if (!globalEnabled) {
      await this.clearAllRules();
      return;
    }

    const enabledGroups = groups.filter(group => group.enabled);
    if (enabledGroups.length === 0) {
      await this.clearAllRules();
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

        allRules.push(...proxyRules, ...corsRules);
      } catch (error) {
        console.error(
          `Failed to parse rules for group ${group.groupName}:`,
          error
        );
      }
    }

    await this.applyDeclarativeRules(allRules);
  }

  private generateProxyRules(
    proxyRules: ProxyRule[]
  ): chrome.declarativeNetRequest.Rule[] {
    const rules: chrome.declarativeNetRequest.Rule[] = [];

    proxyRules.forEach(rule => {
      if (!rule.enabled) return;

      try {
        const urlFilter = this.convertToUrlFilter(rule.source);
        const redirect = this.convertToRedirect(rule.source, rule.target);

        if (urlFilter && redirect) {
          const ruleId = this.ruleIdCounter++;

          this.ruleMapping.set(ruleId, {
            source: rule.source,
            target: rule.target,
            name: rule.name,
          });

          rules.push({
            id: ruleId,
            priority: 1,
            action: {
              type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
              redirect,
            },
            condition: {
              urlFilter,
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
            },
          });
        }
      } catch (error) {
        console.error('Failed to generate proxy rule:', rule, error);
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

  private convertToUrlFilter(source: string): string | undefined {
    try {
      console.log('Converting URL filter for source:', source);

      if (source.startsWith('(.*')) {
        const domainMatch = source.match(/https?:\/\/([^/*()]+)/);
        if (domainMatch) {
          const domain = domainMatch[1];
          console.log('Extracted domain from regex:', domain);
          return `*://${domain}/*`;
        }

        const simplePattern = source
          .replace(/^\(\.\*/, '')
          .replace(/\.\*\)$/, '');
        if (simplePattern) {
          console.log('Extracted pattern from regex:', simplePattern);
          return `*://*${simplePattern}*`;
        }

        return '*://*/*';
      }

      if (source.includes('://')) {
        let urlFilter = source.replace(/^https?/, '*');
        if (
          !urlFilter.endsWith('/') &&
          !urlFilter.includes('*') &&
          !this.isFileExtension(urlFilter)
        ) {
          urlFilter += '*';
        }
        console.log('Generated URL filter from full URL:', urlFilter);
        return urlFilter;
      }

      if (source.includes('.') && !source.includes('/')) {
        const domainFilter = `*://*${source}*`;
        console.log('Generated domain filter:', domainFilter);
        return domainFilter;
      }

      const pathFilter = `*://*/*${source}*`;
      console.log('Generated path filter:', pathFilter);
      return pathFilter;
    } catch (error) {
      console.error('Failed to convert URL filter:', source, error);
      return undefined;
    }
  }

  private convertToRedirect(
    source: string,
    target: string
  ): chrome.declarativeNetRequest.Redirect | undefined {
    try {
      console.log('Converting redirect - source:', source, 'target:', target);

      if (target.startsWith('http://') || target.startsWith('https://')) {
        console.log('Direct URL redirect:', target);
        return { url: target };
      }

      if (target.startsWith('/')) {
        const redirectUrl = `http://localhost:3000${target}`;
        console.log('Relative path redirect:', redirectUrl);
        return { url: redirectUrl };
      }

      if (source.startsWith('(.*') && target.includes('$1')) {
        try {
          const regexPattern = source
            .replace(/^\(\.\*/, '(.*)')
            .replace(/\.\*\)$/, '(.*)');
          console.log(
            'Attempting regex substitution with pattern:',
            regexPattern
          );

          return {
            regexSubstitution: target.replace(/\$1/g, '\\1'),
          };
        } catch {
          console.log(
            'Regex substitution failed, falling back to simple redirect'
          );
          return { url: target };
        }
      }

      if (!target.includes('://') && target.includes('.')) {
        const redirectUrl = `http://${target}`;
        console.log('Domain redirect:', redirectUrl);
        return { url: redirectUrl };
      }

      console.log('Fallback redirect:', target);
      return { url: target };
    } catch (error) {
      console.error('Failed to convert redirect:', source, target, error);
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
    } catch (error) {
      console.error('❌ Failed to apply declarative rules:', error);
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
      });

      console.log('Cleared all rules');
    } catch (error) {
      console.error('Failed to clear rules:', error);
    }
  }

  setupNetworkLogging(globalEnabled: boolean, groups: GroupRuleVo[]): void {
    if (typeof chrome === 'undefined' || !chrome.webRequest) return;

    chrome.webRequest.onBeforeRequest.addListener(
      (details: chrome.webRequest.WebRequestBodyDetails) => {
        this.logProxyHit(details, globalEnabled, groups);
      },
      { urls: ['<all_urls>'] },
      ['requestBody']
    );

    chrome.webRequest.onCompleted.addListener(
      details => {
        this.logRequestCompleted(details, globalEnabled, groups);
      },
      { urls: ['<all_urls>'] }
    );
  }

  private logProxyHit(
    details: chrome.webRequest.WebRequestDetails,
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
          `Failed to parse rules for group ${group.groupName}:`,
          error
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
            `Failed to check rules for group ${group.groupName}:`,
            error
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
      // 检查是否为正则表达式模式
      const isRegexPattern =
        pattern.includes('(.') ||
        pattern.includes('.*') ||
        pattern.includes('$') ||
        pattern.includes('^');

      if (isRegexPattern) {
        // 正则表达式匹配
        try {
          const regex = new RegExp(pattern.replace('??', '\\?\\?'), 'i');
          return regex.test(url);
        } catch (error) {
          console.error('Invalid regex pattern:', pattern, error);
          return false;
        }
      } else {
        // 字符串匹配
        return url.indexOf(pattern) > -1;
      }
    } catch (error) {
      console.error('URL matching failed:', error);
      return false;
    }
  }

  private getTargetUrl(
    originalUrl: string,
    sourcePattern: string,
    target: string
  ): string {
    try {
      // 检查是否为正则表达式模式
      const isRegexPattern =
        sourcePattern.includes('(.') ||
        sourcePattern.includes('.*') ||
        sourcePattern.includes('$') ||
        sourcePattern.includes('^');

      if (isRegexPattern) {
        try {
          const regex = new RegExp(sourcePattern.replace('??', '\\?\\?'), 'i');
          return originalUrl.replace(regex, target);
        } catch (error) {
          console.error('Error applying regex replacement:', error);
          return originalUrl;
        }
      } else {
        // 字符串替换
        return originalUrl.split(sourcePattern).join(target);
      }
    } catch (error) {
      console.error('Target URL generation failed:', error);
      return target;
    }
  }
}

export const networkService = new NetworkService();
