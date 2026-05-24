/**
 * Main content script - orchestrates pronunciation helper functionality
 */

import { fetchIPABatch } from '../api/dictionary-api';
import { extractWords } from '../text/text-processor';
import { speechService } from '../speech/speech-service';
import { createPopup } from '../ui/popup-builder';
import { popupManager } from '../ui/popup-manager';
import {
  getSelectedText,
  getSelectionPosition,
  isSelectionInsideElement
} from '../ui/selection-helper';
import { normalizeHostname } from '../shared/utils';
import { SELECTION_DELAY_MS } from '../constants/app-constants';
import { LOG_PREFIX } from '../constants/messages';

/**
 * Extension state
 */
let isActive = false;
let mouseupHandler: ((event: MouseEvent) => void) | null = null;
let mousedownHandler: ((event: MouseEvent) => void) | null = null;

/**
 * Get current normalized hostname
 */
function getCurrentHostname(): string {
  return normalizeHostname(window.location.hostname);
}

/**
 * Check if extension is enabled on current site
 */
async function isExtensionEnabled(): Promise<boolean> {
  try {
    const hostname = getCurrentHostname();
    const result = await chrome.storage.local.get('disabledSites');
    const disabledSites: string[] = result.disabledSites || [];
    return !disabledSites.includes(hostname);
  } catch (error) {
    console.error(`${LOG_PREFIX} Storage error:`, error);
    return true; // Fail open
  }
}

/**
 * Show popup for selected text with IPA and speech controls
 */
async function showPopupForSelection(): Promise<void> {
  const selectedText = getSelectedText();
  if (!selectedText) return;

  // Don't show popup if selecting inside current popup
  const currentPopup = popupManager.getCurrentPopup();
  if (currentPopup && isSelectionInsideElement(currentPopup)) {
    return;
  }

  // Get selection position
  const position = getSelectionPosition();
  if (!position) return;

  // Check for speech support
  const error = speechService.getSupportError();

  // Fetch IPA for all words
  const words = extractWords(selectedText);
  const ipaData = await fetchIPABatch(words);

  // Create and show popup
  const popup = createPopup(
    selectedText,
    error,
    ipaData,
    () => popupManager.removePopup()
  );

  popupManager.showPopup(popup, position);
}

/**
 * Handle click outside popup to dismiss
 */
function handleDocumentClick(event: MouseEvent): void {
  const currentPopup = popupManager.getCurrentPopup();
  if (!currentPopup) return;

  const target = event.target as HTMLElement;
  if (!currentPopup.contains(target)) {
    popupManager.removePopup();
  }
}

/**
 * Cleanup function to remove all event listeners and UI
 */
function cleanup(): void {
  console.log(`${LOG_PREFIX} Cleaning up...`);

  popupManager.removePopup();

  if (mouseupHandler) {
    document.removeEventListener('mouseup', mouseupHandler);
    mouseupHandler = null;
  }

  if (mousedownHandler) {
    document.removeEventListener('mousedown', mousedownHandler);
    mousedownHandler = null;
  }

  isActive = false;
  console.log(`${LOG_PREFIX} Cleanup complete`);
}

/**
 * Initialize the extension
 */
async function init(): Promise<void> {
  if (isActive) {
    console.log(`${LOG_PREFIX} Already active, skipping init`);
    return;
  }

  console.log(`${LOG_PREFIX} Initializing...`);
  isActive = true;

  // Ensure voices are loaded
  await speechService.ensureVoicesLoaded();

  // Create event handlers
  mouseupHandler = (event: MouseEvent) => {
    const currentPopup = popupManager.getCurrentPopup();
    if (currentPopup && currentPopup.contains(event.target as HTMLElement)) {
      return; // Clicked inside popup
    }

    setTimeout(showPopupForSelection, SELECTION_DELAY_MS);
  };

  mousedownHandler = handleDocumentClick;

  // Register event listeners
  document.addEventListener('mouseup', mouseupHandler);
  document.addEventListener('mousedown', mousedownHandler);

  console.log(`${LOG_PREFIX} Initialization complete`);
}

/**
 * Start extension if enabled on current site
 */
async function start() {
  const enabled = await isExtensionEnabled();
  if (!enabled) {
    return;
  }
  init();
}

/**
 * Handle messages from popup/options to enable/disable immediately
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log(`${LOG_PREFIX} Received message:`, message);

  const hostname = getCurrentHostname();

  if (message.action === 'disable' && message.hostname === hostname) {
    console.log(`${LOG_PREFIX} Disabling extension immediately`);
    cleanup();
    sendResponse({ success: true });
  } else if (message.action === 'enable' && message.hostname === hostname && !isActive) {
    console.log(`${LOG_PREFIX} Enabling extension immediately`);
    init();
    sendResponse({ success: true });
  }

  return true; // Keep message channel open
});

// Start the extension
start();
