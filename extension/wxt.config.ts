import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  extensionApi: 'chrome',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'HomeMatch',
    description: 'AI-powered property match scoring for Homegate.ch',
    version: '0.1.0',
    permissions: ['storage'],
    host_permissions: ['*://*.homegate.ch/*'],
  },
});
