import { GroupRuleVo } from '../../types';

export const mockProxyRules = [
  {
    id: 'proxy-1',
    name: 'API重定向',
    enabled: true,
    source: 'https://api.example.com',
    target: 'http://localhost:3000',
    type: 'string'
  },
  {
    id: 'proxy-2', 
    name: '正则匹配',
    enabled: true,
    source: '(.*).example.com',
    target: 'http://localhost:8080',
    type: 'regex'
  },
  {
    id: 'proxy-3',
    name: '禁用规则',
    enabled: false,
    source: 'https://disabled.com',
    target: 'http://localhost:9000',
    type: 'string'
  }
];

export const mockCorsRules = [
  {
    id: 'cors-1',
    pattern: 'api.example.com',
    enabled: true
  },
  {
    id: 'cors-2',
    pattern: '(.*).example.com',
    enabled: true
  },
  {
    id: 'cors-3',
    pattern: 'disabled-cors.com',
    enabled: false
  }
];

export const mockGroupRuleVo: GroupRuleVo = {
  id: 'group-1',
  groupName: '测试分组',
  enabled: true,
  ruleText: JSON.stringify({
    proxy: mockProxyRules,
    cors: mockCorsRules
  }, null, 2),
  createTime: new Date().toISOString(),
  updateTime: new Date().toISOString()
};

export const mockGroups: GroupRuleVo[] = [
  mockGroupRuleVo,
  {
    id: 'group-2',
    groupName: '空分组',
    enabled: false,
    ruleText: JSON.stringify({
      proxy: [],
      cors: []
    }, null, 2),
    createTime: new Date().toISOString(),
    updateTime: new Date().toISOString()
  }
];

export const legacyConfigExample = {
  proxy: [
    ['https://api.example.com', 'http://localhost:3000'],
    ['(.*).example.com', 'http://localhost:8080']
  ],
  cors: [
    'api.example.com',
    '(.*).example.com'
  ]
};

export const invalidConfigs = {
  malformedJson: '{ "proxy": [invalid json',
  missingRequired: '{ "proxy": [] }', // missing cors
  invalidProxyRule: JSON.stringify({
    proxy: [{ source: '', target: 'target' }], // empty source
    cors: []
  }),
  invalidRegex: JSON.stringify({
    proxy: [{ source: '[invalid regex', target: 'target' }],
    cors: []
  })
};

export const performanceTestConfig: GroupRuleVo = {
  id: 'perf-group',
  groupName: '性能测试',
  enabled: true,
  ruleText: JSON.stringify({
    proxy: Array.from({ length: 100 }, (_, i) => ({
      id: `proxy-${i}`,
      name: `规则 ${i}`,
      enabled: true,
      source: `https://api${i}.example.com`,
      target: `http://localhost:${3000 + i}`,
      type: 'string'
    })),
    cors: Array.from({ length: 50 }, (_, i) => ({
      id: `cors-${i}`,
      pattern: `api${i}.example.com`,
      enabled: true
    }))
  }, null, 2),
  createTime: new Date().toISOString(),
  updateTime: new Date().toISOString()
};

export const testRuleConfigs = {
  // 基本配置测试
  basic: {
    proxy: [
      {
        id: 'test-1',
        name: '基本转发',
        enabled: true,
        source: 'api.example.com',
        target: 'localhost:3000',
        type: 'string'
      }
    ],
    cors: [
      {
        id: 'cors-1',
        pattern: 'api.example.com',
        enabled: true
      }
    ]
  },
  
  // 正则表达式配置
  regex: {
    proxy: [
      {
        id: 'regex-1',
        name: '正则转发',
        enabled: true,
        source: '(.*).staging.example.com',
        target: '$1.dev.example.com',
        type: 'regex'
      }
    ],
    cors: []
  },
  
  // 复杂配置
  complex: {
    proxy: [
      {
        id: 'complex-1',
        name: 'API转发',
        enabled: true,
        source: 'https://api.production.com/v1',
        target: 'https://api.staging.com/v1',
        type: 'string'
      },
      {
        id: 'complex-2',
        name: '子域名转发',
        enabled: true,
        source: '(.*).prod.company.com',
        target: '$1.test.company.com',
        type: 'regex'
      }
    ],
    cors: [
      {
        id: 'cors-complex-1',
        pattern: 'api.production.com',
        enabled: true
      },
      {
        id: 'cors-complex-2',
        pattern: '(.*).company.com',
        enabled: true
      }
    ]
  }
};