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
