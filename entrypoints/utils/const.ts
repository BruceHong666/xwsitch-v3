export const DEFAULT_RULE =
  '{\n  // Use IntelliSense to learn about possible links.\n  // Type `rule` to quick insert rule.\n  // 输入 rule 来快速插入规则\n  // For more information, visit: https://github.com/yize/xswitch\n  "proxy": [\n    [\n      "https://unpkg.com/react@16.4.1/umd/react.production.min.js",\n      "https://unpkg.com/react@16.4.1/umd/react.development.js"\n    ],\n    // `Command/Ctrl + click` to visit:\n    // https://unpkg.com/react@16.4.1/umd/react.production.min.js\n    // [\n      // "(.*)/path1/path2/(.*)", // https://www.sample.com/path1/path2/index.js\n      // "http://127.0.0.1:3000/$2", // http://127.0.0.1:3000/index.js\n    // ],\n  ],\n  // urls that want CORS\n  // "cors": [\n    // "mocks.a.com",\n    // "mocks.b.com"\n  // ]\n}';

export const DEFAULT_NEW_RULE =
  '{\n  "proxy": [\n    [\n      "(.*)/path1/path2/(.*)", // https://www.sample.com/path1/path2/index.js\n      "http://127.0.0.1:3000/$2", // http://127.0.0.1:3000/index.js\n    ],\n  ],\n}';
