// Utility function to normalize hostname (strip www.)
export function normalizeHostname(hostname: string): string {
  return hostname.replace(/^www\./, '');
}

// Get current active tab's hostname
export async function getCurrentTabHostname(): Promise<string | null> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    console.log('[Pronunciation Helper] Tab query result:', tab);

    if (!tab?.url) {
      console.log('[Pronunciation Helper] No tab URL found');
      return null;
    }

    // Skip chrome:// and edge:// URLs
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
      console.log('[Pronunciation Helper] Skipping browser internal URL');
      return null;
    }

    const url = new URL(tab.url);
    const hostname = normalizeHostname(url.hostname);
    console.log('[Pronunciation Helper] Extracted hostname:', hostname);
    return hostname;
  } catch (error) {
    console.error('[Pronunciation Helper] Failed to get current tab:', error);
    return null;
  }
}

// Get disabled sites from storage
export async function getDisabledSites(): Promise<string[]> {
  try {
    const result = await chrome.storage.local.get('disabledSites');
    return result.disabledSites || [];
  } catch (error) {
    console.error('[Pronunciation Helper] Failed to read storage:', error);
    return [];
  }
}

// Save disabled sites to storage
export async function saveDisabledSites(sites: string[]): Promise<void> {
  try {
    await chrome.storage.local.set({ disabledSites: sites });
  } catch (error) {
    console.error('[Pronunciation Helper] Failed to save to storage:', error);
  }
}

// Check if a site is enabled
export function isSiteEnabled(hostname: string, disabledSites: string[]): boolean {
  return !disabledSites.includes(hostname);
}

// Toggle site enabled/disabled status
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

// Remove a site from disabled list
export async function removeSite(hostname: string): Promise<void> {
  const disabledSites = await getDisabledSites();
  const filtered = disabledSites.filter(site => site !== hostname);
  await saveDisabledSites(filtered);
}
