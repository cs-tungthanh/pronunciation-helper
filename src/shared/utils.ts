/**
 * Shared utility functions for site management and settings
 */

import {
  DEFAULT_TARGET_LANGUAGE,
  DEFAULT_POPUP_MODE,
  POPUP_MODES,
  PopupMode,
  DEFAULT_DICTIONARY_SITE,
  DICTIONARY_SITES,
  DictionarySite
} from '../constants/app-constants';
import { LOG_PREFIX } from '../constants/messages';

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
 * Normalized hostname of a web page URL
 * @returns null for anything but http(s) pages (browser internal pages, extension pages, files)
 */
function getWebHostname(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === 'http:' || protocol === 'https:' ? normalizeHostname(hostname) : null;
  } catch {
    return null;
  }
}

/**
 * Get current active tab's normalized hostname
 * @returns Normalized hostname or null when the tab is not a web page
 * @example
 * await getCurrentTabHostname() // returns 'example.com' or null
 */
export async function getCurrentTabHostname(): Promise<string | null> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    return getWebHostname(tab?.url);
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to get current tab:`, error);
    return null;
  }
}

/**
 * Get the hostname of the most recently used web page tab in the focused window
 * (the options page opens in its own tab, so the active tab is the options page itself)
 * @returns Normalized hostname or null when no web page is open
 */
export async function getRecentWebTabHostname(): Promise<string | null> {
  try {
    const tabs = await chrome.tabs.query({ lastFocusedWindow: true });
    const recentFirst = tabs.sort((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0));
    for (const tab of recentFirst) {
      const hostname = getWebHostname(tab.url);
      if (hostname) return hostname;
    }
    return null;
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to query tabs:`, error);
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
    console.error(`${LOG_PREFIX} Failed to read storage:`, error);
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
    console.error(`${LOG_PREFIX} Failed to save to storage:`, error);
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

/**
 * Get the translation target language from storage
 * @returns Language code, or TRANSLATION_OFF when translation is disabled
 */
export async function getTargetLanguage(): Promise<string> {
  try {
    const result = await chrome.storage.local.get('targetLanguage');
    return result.targetLanguage || DEFAULT_TARGET_LANGUAGE;
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to read storage:`, error);
    return DEFAULT_TARGET_LANGUAGE;
  }
}

/**
 * Save the translation target language to storage
 * @param language - Language code, or TRANSLATION_OFF to disable translation
 */
export async function saveTargetLanguage(language: string): Promise<void> {
  try {
    await chrome.storage.local.set({ targetLanguage: language });
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to save to storage:`, error);
  }
}

/**
 * Get what happens when text is selected
 * @returns The stored popup mode, or the default when unset or unknown
 */
export async function getPopupMode(): Promise<PopupMode> {
  try {
    const { popupMode } = await chrome.storage.local.get('popupMode');
    const modes: readonly string[] = Object.values(POPUP_MODES);
    return modes.includes(popupMode) ? popupMode : DEFAULT_POPUP_MODE;
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to read storage:`, error);
    return DEFAULT_POPUP_MODE;
  }
}

/**
 * Save what happens when text is selected
 */
export async function savePopupMode(mode: PopupMode): Promise<void> {
  try {
    await chrome.storage.local.set({ popupMode: mode });
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to save to storage:`, error);
  }
}

/**
 * Get the site the dictionary link opens words on
 * @returns The stored site, or the default when unset or unknown
 */
export async function getDictionarySite(): Promise<DictionarySite> {
  try {
    const { dictionarySite } = await chrome.storage.local.get('dictionarySite');
    const sites: readonly string[] = Object.keys(DICTIONARY_SITES);
    return sites.includes(dictionarySite) ? dictionarySite : DEFAULT_DICTIONARY_SITE;
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to read storage:`, error);
    return DEFAULT_DICTIONARY_SITE;
  }
}

/**
 * Save the site the dictionary link opens words on
 */
export async function saveDictionarySite(site: DictionarySite): Promise<void> {
  try {
    await chrome.storage.local.set({ dictionarySite: site });
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to save to storage:`, error);
  }
}

/**
 * Get whether copy buttons are shown, in the popup and next to the icon in "display icon" mode
 * @returns true unless turned off
 */
export async function getShowCopyButton(): Promise<boolean> {
  try {
    const { showCopyButton } = await chrome.storage.local.get('showCopyButton');
    return showCopyButton !== false;
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to read storage:`, error);
    return true;
  }
}

/**
 * Save whether copy buttons are shown, in the popup and next to the icon
 */
export async function saveShowCopyButton(show: boolean): Promise<void> {
  try {
    await chrome.storage.local.set({ showCopyButton: show });
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to save to storage:`, error);
  }
}
