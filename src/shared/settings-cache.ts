/**
 * Cache for settings read by content scripts on every selection
 */

/**
 * Wrap a stored setting's reader so storage is read once, then again only after the setting changes
 * @param key The chrome.storage.local key the reader reads
 */
export function cachedSetting<T>(key: string, read: () => Promise<T>): () => Promise<T> {
  let value: Promise<T> | null = null;

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && key in changes) value = null;
  });

  return () => (value ??= read());
}

/**
 * Keep a stored setting's latest value at hand, for code that must decide without waiting
 * (a key handler choosing whether to take a key). Until storage is first read, the fallback is used.
 * @param key The chrome.storage.local key the reader reads
 */
export function liveSetting<T>(key: string, read: () => Promise<T>, fallback: T): () => T {
  let value = fallback;
  const refresh = () => read().then(latest => { value = latest; });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && key in changes) refresh();
  });
  refresh();

  return () => value;
}
