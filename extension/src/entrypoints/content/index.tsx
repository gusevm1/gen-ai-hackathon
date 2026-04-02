/**
 * HomeMatch content script entry point.
 * Injects a Shadow DOM overlay with a FAB for on-demand listing scoring.
 * Passes ContentScriptContext to App so it can create per-badge Shadow DOM roots.
 */
import './style.css';
import ReactDOM from 'react-dom/client';
import App from './App';
export default defineContentScript({
  matches: ['*://*.flatfox.ch/*'],
  cssInjectionMode: 'ui',

  async main(ctx) {
    console.log('[HM] index.tsx main() called — content script running');
    console.log('[HM] index.tsx URL:', window.location.href);

    // Create a Shadow DOM overlay for the FAB (fixed position, always visible)
    const fab = await createShadowRootUi(ctx, {
      name: 'homematch-fab',
      position: 'overlay',
      anchor: 'body',
      onMount: (container) => {
        const el = document.createElement('div');
        container.append(el);
        const root = ReactDOM.createRoot(el);
        root.render(<App ctx={ctx} />);
        return root;
      },
      onRemove: (root) => {
        root?.unmount();
      },
    });

    fab.mount();
  },
});
