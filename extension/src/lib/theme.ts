import { storage } from 'wxt/utils/storage';

export const themeStorage = storage.defineItem<'light' | 'dark'>(
  'local:theme',
  { fallback: 'light' },
);

export async function initTheme() {
  const theme = await themeStorage.getValue();
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export async function toggleTheme() {
  const current = await themeStorage.getValue();
  const next = current === 'light' ? 'dark' : 'light';
  await themeStorage.setValue(next);
  document.documentElement.classList.toggle('dark', next === 'dark');
}
