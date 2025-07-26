import { vi } from 'vitest';

// Chrome Extension API 模拟
export const mockChrome = {
  runtime: {
    id: 'test-extension-id',
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn()
    },
    sendMessage: vi.fn(),
    onInstalled: {
      addListener: vi.fn()
    },
    onStartup: {
      addListener: vi.fn()
    }
  },
  
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn()
    },
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn()
    },
    _storage: {} as Record<string, any>,
    _setStorage: function(data: Record<string, any>) {
      this._storage = { ...data };
      // 模拟 get 方法
      this.local.get.mockImplementation((keys: string | string[] | null) => {
        if (keys === null || keys === undefined) {
          return Promise.resolve(this._storage);
        }
        if (typeof keys === 'string') {
          return Promise.resolve({ [keys]: this._storage[keys] });
        }
        if (Array.isArray(keys)) {
          const result: Record<string, any> = {};
          keys.forEach(key => {
            if (key in this._storage) {
              result[key] = this._storage[key];
            }
          });
          return Promise.resolve(result);
        }
        return Promise.resolve({});
      });
      
      // 模拟 set 方法
      this.local.set.mockImplementation((data: Record<string, any>) => {
        Object.assign(this._storage, data);
        return Promise.resolve();
      });
      
      // 模拟 remove 方法
      this.local.remove.mockImplementation((keys: string | string[]) => {
        const keysArray = Array.isArray(keys) ? keys : [keys];
        keysArray.forEach(key => {
          delete this._storage[key];
        });
        return Promise.resolve();
      });
    }
  },
  
  action: {
    setBadgeText: vi.fn(),
    setBadgeBackgroundColor: vi.fn(),
    setTitle: vi.fn(),
    onClicked: {
      addListener: vi.fn()
    }
  },
  
  tabs: {
    create: vi.fn(),
    sendMessage: vi.fn(),
    query: vi.fn()
  },
  
  declarativeNetRequest: {
    getDynamicRules: vi.fn(() => Promise.resolve([])),
    updateDynamicRules: vi.fn(() => Promise.resolve()),
    RuleActionType: {
      REDIRECT: 'redirect',
      MODIFY_HEADERS: 'modifyHeaders'
    },
    ResourceType: {
      MAIN_FRAME: 'main_frame',
      SUB_FRAME: 'sub_frame',
      XMLHTTPREQUEST: 'xmlhttprequest',
      SCRIPT: 'script',
      STYLESHEET: 'stylesheet',
      IMAGE: 'image',
      FONT: 'font',
      OBJECT: 'object',
      MEDIA: 'media',
      WEBSOCKET: 'websocket',
      OTHER: 'other'
    },
    HeaderOperation: {
      SET: 'set',
      REMOVE: 'remove'
    }
  },
  
  webRequest: {
    onBeforeRequest: {
      addListener: vi.fn()
    },
    onCompleted: {
      addListener: vi.fn()
    }
  },
  
  browsingData: {
    removeCache: vi.fn(() => Promise.resolve())
  }
};

// Browser API 模拟 (WebExtensions标准)
export const mockBrowser = {
  runtime: mockChrome.runtime,
  storage: mockChrome.storage,
  action: mockChrome.action,
  tabs: mockChrome.tabs
};

// 设置全局 Chrome 和 Browser 对象
export function setupChromeEnvironment() {
  // @ts-ignore
  global.chrome = mockChrome;
  // @ts-ignore
  global.browser = mockBrowser;
  
  // 重置所有 mock
  Object.values(mockChrome.runtime.onMessage).forEach(fn => {
    if (typeof fn === 'function' && 'mockClear' in fn) {
      (fn as any).mockClear();
    }
  });
  
  Object.values(mockChrome.storage.local).forEach(fn => {
    if (typeof fn === 'function' && 'mockClear' in fn) {
      (fn as any).mockClear();
    }
  });
  
  Object.values(mockChrome.action).forEach(fn => {
    if (typeof fn === 'function' && 'mockClear' in fn) {
      (fn as any).mockClear();
    }
  });
  
  return mockChrome;
}

// 清理环境
export function cleanupChromeEnvironment() {
  // @ts-ignore
  delete global.chrome;
  // @ts-ignore
  delete global.browser;
}