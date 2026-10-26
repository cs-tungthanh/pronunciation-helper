/**
 * DOM manipulation helpers
 */

/**
 * Get required DOM element or throw error
 * @throws Error if element not found
 */
export function getRequiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id) as T | null;
  if (!element) {
    throw new Error(`Required element not found: #${id}`);
  }
  return element;
}

/**
 * Get optional DOM element (returns null if not found)
 */
export function getOptionalElement<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

/**
 * Apply the Theme setting to an extension page; its stylesheet reads data-theme
 * ("system" leaves it to the page's prefers-color-scheme rules)
 */
export function applyPageTheme(theme: string): void {
  document.documentElement.dataset.theme = theme;
}

/**
 * Initialize function when DOM is ready
 */
export function onDOMReady(callback: () => void): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback);
  } else {
    callback();
  }
}
