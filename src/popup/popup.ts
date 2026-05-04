import {
  getCurrentTabHostname,
  getDisabledSites,
  isSiteEnabled,
  toggleSite
} from '../shared/utils';

// Initialize the popup
async function initPopup(): Promise<void> {
  console.log('[Pronunciation Helper] Initializing popup...');

  const siteNameEl = document.getElementById('siteName');
  const enableToggle = document.getElementById('enableToggle') as HTMLInputElement;
  const toggleStatus = document.getElementById('toggleStatus');
  const openSettingsBtn = document.getElementById('openSettings');

  if (!siteNameEl || !enableToggle || !toggleStatus) {
    console.error('[Pronunciation Helper] Missing DOM elements');
    return;
  }

  // Set initial state
  enableToggle.disabled = true;
  siteNameEl.textContent = 'Loading...';

  try {
    // Get current hostname
    const hostname = await getCurrentTabHostname();
    console.log('[Pronunciation Helper] Got hostname:', hostname);

    if (!hostname) {
      siteNameEl.textContent = 'Browser internal page';
      toggleStatus.textContent = 'N/A';
      toggleStatus.className = 'toggle-status disabled';
      return;
    }

    siteNameEl.textContent = hostname;

    // Get current state
    const disabledSites = await getDisabledSites();
    console.log('[Pronunciation Helper] Disabled sites:', disabledSites);

    const enabled = isSiteEnabled(hostname, disabledSites);
    console.log('[Pronunciation Helper] Site enabled:', enabled);

    // Update UI
    enableToggle.disabled = false;
    enableToggle.checked = enabled;
    toggleStatus.textContent = enabled ? 'Enabled' : 'Disabled';
    toggleStatus.className = enabled ? 'toggle-status enabled' : 'toggle-status disabled';

    // Add toggle event listener
    enableToggle.addEventListener('change', async () => {
      const newState = enableToggle.checked;
      console.log('[Pronunciation Helper] Toggling to:', newState);

      // Save to storage
      await toggleSite(hostname, newState);

      // Update UI
      toggleStatus.textContent = newState ? 'Enabled' : 'Disabled';
      toggleStatus.className = newState ? 'toggle-status enabled' : 'toggle-status disabled';

      // Send message to content script for immediate effect
      try {
        const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        if (tab?.id) {
          const action = newState ? 'enable' : 'disable';
          console.log('[Pronunciation Helper] Sending message to tab:', tab.id, action);
          await chrome.tabs.sendMessage(tab.id, { action, hostname });
        }
      } catch (error) {
        console.error('[Pronunciation Helper] Failed to send message to content script:', error);
      }
    });
  } catch (error) {
    console.error('[Pronunciation Helper] Error during initialization:', error);
    siteNameEl.textContent = 'Error loading';
    toggleStatus.textContent = 'Error';
    toggleStatus.className = 'toggle-status disabled';
  }

  // Add settings link handler
  if (openSettingsBtn) {
    openSettingsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.runtime.openOptionsPage();
    });
  }
}

// Run initialization when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPopup);
} else {
  initPopup();
}
