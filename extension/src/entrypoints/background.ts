export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(async ({ reason }) => {
    if (reason === 'install') {
      await browser.tabs.create({
        url: browser.runtime.getURL('/onboarding.html'),
      });
    }
  });
});
