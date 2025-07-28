import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Switch V3',
    description:
      'HTTP request forwarding with string matching and regex support. A modern rewrite of xswitch for Manifest V3 compatibility.',
    permissions: [
      'storage',
      'tabs',
      'scripting',
      'declarativeNetRequest',
      'webRequest',
    ],
    host_permissions: ['<all_urls>'],
  },
});
