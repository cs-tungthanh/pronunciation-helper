/**
 * Browser extension popup UI
 */

import {
  getCurrentTabHostname,
  getDisabledSites,
  isSiteEnabled,
  toggleSite
} from '../shared/utils';
import { getRequiredElement, onDOMReady } from '../shared/dom-helpers';
import { ERROR_MESSAGES, UI_LABELS } from '../constants/messages';

/**
 * DOM element references
 */
interface PopupElements {
  siteName: HTMLElement;
  enableToggle: HTMLInputElement;
  toggleStatus: HTMLElement;
  openSettings: HTMLElement | null;
}

/**
 * Get and validate DOM elements
 */
function getPopupElements(): PopupElements {
  return {
    siteName: getRequiredElement<HTMLElement>('siteName'),
    enableToggle: getRequiredElement<HTMLInputElement>('enableToggle'),
    toggleStatus: getRequiredElement<HTMLElement>('toggleStatus'),
    openSettings: document.getElementById('openSettings')
  };
}

/**
 * Update UI to show loading state
 */
function setLoadingState(elements: PopupElements): void {
  elements.enableToggle.disabled = true;
  elements.siteName.textContent = ERROR_MESSAGES.LOADING;
}

/**
 * Update UI to show error state
 */
function setErrorState(elements: PopupElements): void {
  elements.siteName.textContent = ERROR_MESSAGES.ERROR_LOADING;
  elements.toggleStatus.textContent = ERROR_MESSAGES.ERROR_STATUS;
  elements.toggleStatus.className = 'toggle-status disabled';
}

/**
 * Update UI to show internal page state (chrome://, edge://, etc.)
 */
function setInternalPageState(elements: PopupElements): void {
  elements.siteName.textContent = ERROR_MESSAGES.BROWSER_INTERNAL_PAGE;
  elements.toggleStatus.textContent = ERROR_MESSAGES.NOT_AVAILABLE;
  elements.toggleStatus.className = 'toggle-status disabled';
}

/**
 * Update toggle status display
 */
function updateToggleStatus(elements: PopupElements, enabled: boolean): void {
  elements.toggleStatus.textContent = enabled ? UI_LABELS.ENABLED : UI_LABELS.DISABLED;
  elements.toggleStatus.className = enabled ? 'toggle-status enabled' : 'toggle-status disabled';
}

/**
 * Send message to content script for immediate effect
 */
async function notifyContentScript(hostname: string, enabled: boolean): Promise<void> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (tab?.id) {
      const action = enabled ? 'enable' : 'disable';
      await chrome.tabs.sendMessage(tab.id, { action, hostname });
    }
  } catch (error) {
    // Content script might not be loaded yet, which is fine
    console.debug('Failed to notify content script:', error);
  }
}

/**
 * Setup toggle event listener
 */
function setupToggleListener(elements: PopupElements, hostname: string): void {
  elements.enableToggle.addEventListener('change', async () => {
    const newState = elements.enableToggle.checked;

    await toggleSite(hostname, newState);
    updateToggleStatus(elements, newState);
    await notifyContentScript(hostname, newState);
  });
}

/**
 * Setup settings button
 */
function setupSettingsButton(openSettings: HTMLElement): void {
  openSettings.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
}

/**
 * Initialize popup UI
 */
async function initPopup(): Promise<void> {
  const elements = getPopupElements();
  setLoadingState(elements);

  try {
    const hostname = await getCurrentTabHostname();

    // Handle special cases
    if (!hostname) {
      setInternalPageState(elements);
      return;
    }

    // Set hostname
    elements.siteName.textContent = hostname;

    // Get and display enabled state
    const disabledSites = await getDisabledSites();
    const enabled = isSiteEnabled(hostname, disabledSites);

    elements.enableToggle.disabled = false;
    elements.enableToggle.checked = enabled;
    updateToggleStatus(elements, enabled);

    // Setup event listeners
    setupToggleListener(elements, hostname);

    if (elements.openSettings) {
      setupSettingsButton(elements.openSettings);
    }
  } catch (error) {
    console.error('Error during popup initialization:', error);
    setErrorState(elements);
  }
}

// Initialize when DOM is ready
onDOMReady(initPopup);
