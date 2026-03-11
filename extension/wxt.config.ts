import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  extensionApi: 'chrome',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'HomeMatch',
    description: 'AI-powered property match scoring for Flatfox.ch',
    version: '0.2.0',
    permissions: ['storage'],
    host_permissions: [
      '*://*.flatfox.ch/*',
      'https://mlhtozdtiorkemamzjjc.supabase.co/*',
    ],
  },
});
