/**
 * Shared utility functions for site management
 */

/**
 * Normalize hostname by stripping www. prefix
 * @param hostname - The hostname to normalize
 * @returns Normalized hostname without www. prefix
 * @example
 * normalizeHostname('www.example.com') // returns 'example.com'
 * normalizeHostname('example.com') // returns 'example.com'
 */
export function normalizeHostname(hostname: string): string {
  return hostname.replace(/^www\./, '');
}

/**
 * Get current active tab's normalized hostname
 * @returns Normalized hostname or null for browser internal pages
 * @example
 * await getCurrentTabHostname() // returns 'example.com' or null
 */
export async function getCurrentTabHostname(): Promise<string | null> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });

    if (!tab?.url) {
      return null;
    }

    // Skip browser internal URLs
    if (tab.url.startsWith('chrome://') ||
        tab.url.startsWith('edge://') ||
        tab.url.startsWith('about:')) {
      return null;
    }

    const url = new URL(tab.url);
    return normalizeHostname(url.hostname);
  } catch (error) {
    console.error('[Pronunciation Helper] Failed to get current tab:', error);
    return null;
  }
}

/**
 * Get list of disabled sites from storage
 * @returns Array of disabled hostnames
 */
export async function getDisabledSites(): Promise<string[]> {
  try {
    const result = await chrome.storage.local.get('disabledSites');
    return result.disabledSites || [];
  } catch (error) {
    console.error('[Pronunciation Helper] Failed to read storage:', error);
    return [];
  }
}

/**
 * Save disabled sites to storage
 * @param sites - Array of hostnames to save as disabled
 */
export async function saveDisabledSites(sites: string[]): Promise<void> {
  try {
    await chrome.storage.local.set({ disabledSites: sites });
  } catch (error) {
    console.error('[Pronunciation Helper] Failed to save to storage:', error);
  }
}

/**
 * Check if extension is enabled on a specific site
 * @param hostname - The hostname to check
 * @param disabledSites - Array of disabled hostnames
 * @returns true if enabled, false if disabled
 */
export function isSiteEnabled(hostname: string, disabledSites: string[]): boolean {
  return !disabledSites.includes(hostname);
}

/**
 * Toggle extension enabled/disabled status for a site
 * @param hostname - The hostname to toggle
 * @param enabled - true to enable, false to disable
 */
export async function toggleSite(hostname: string, enabled: boolean): Promise<void> {
  const disabledSites = await getDisabledSites();

  if (enabled) {
    // Remove from disabled list
    const filtered = disabledSites.filter(site => site !== hostname);
    await saveDisabledSites(filtered);
  } else {
    // Add to disabled list
    if (!disabledSites.includes(hostname)) {
      disabledSites.push(hostname);
      await saveDisabledSites(disabledSites);
    }
  }
}

/**
 * Remove a site from the disabled list (enable it)
 * @param hostname - The hostname to remove from disabled list
 */
export async function removeSite(hostname: string): Promise<void> {
  const disabledSites = await getDisabledSites();
  const filtered = disabledSites.filter(site => site !== hostname);
  await saveDisabledSites(filtered);
}
