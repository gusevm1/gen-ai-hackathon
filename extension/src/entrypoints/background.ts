/**
 * Handle the onInstalled event. Exported for testability.
 */
export async function handleInstalled(details: { reason: string }) {
  if (details.reason === 'install') {
    await browser.tabs.create({
      url: browser.runtime.getURL('/onboarding.html'),
    });
  }
}

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(handleInstalled);
});
