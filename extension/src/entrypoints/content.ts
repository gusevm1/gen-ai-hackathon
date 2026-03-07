export default defineContentScript({
  matches: ['*://*.homegate.ch/*'],
  main() {
    console.log('[HomeMatch] Content script loaded on Homegate.ch');
    // Phase 1: placeholder only -- scoring UI added in Phase 4
  },
});
