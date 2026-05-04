import {
  getCurrentTabHostname,
  getDisabledSites,
  isSiteEnabled,
  toggleSite,
  removeSite
} from '../shared/utils';

// Render the current site section
async function renderCurrentSite(): Promise<void> {
  const currentSiteEl = document.getElementById('currentSite');
  const enableToggle = document.getElementById('enableToggle') as HTMLInputElement;
  const toggleLabel = document.getElementById('toggleLabel');

  if (!currentSiteEl || !enableToggle || !toggleLabel) return;

  const hostname = await getCurrentTabHostname();

  if (!hostname) {
    currentSiteEl.textContent = 'Unable to detect current site';
    enableToggle.disabled = true;
    toggleLabel.textContent = 'Enable on this site';
    return;
  }

  currentSiteEl.textContent = hostname;

  const disabledSites = await getDisabledSites();
  const enabled = isSiteEnabled(hostname, disabledSites);

  enableToggle.checked = enabled;
  enableToggle.disabled = false;
  toggleLabel.textContent = enabled ? 'Enabled' : 'Disabled';

  // Add event listener for toggle
  enableToggle.addEventListener('change', async () => {
    const newState = enableToggle.checked;
    await toggleSite(hostname, newState);
    toggleLabel.textContent = newState ? 'Enabled' : 'Disabled';
    await renderDisabledSites(); // Refresh the list
  });
}

// Render the disabled sites list
async function renderDisabledSites(): Promise<void> {
  const listEl = document.getElementById('disabledSitesList');
  if (!listEl) return;

  const disabledSites = await getDisabledSites();

  if (disabledSites.length === 0) {
    listEl.innerHTML = '<p class="empty-message">No sites disabled yet</p>';
    return;
  }

  // Sort alphabetically
  disabledSites.sort();

  listEl.innerHTML = disabledSites.map(site => `
    <div class="site-item">
      <span class="site-name">${escapeHtml(site)}</span>
      <button class="remove-btn" data-site="${escapeHtml(site)}">Remove</button>
    </div>
  `).join('');

  // Add event listeners to remove buttons
  const removeButtons = listEl.querySelectorAll('.remove-btn');
  removeButtons.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const target = e.target as HTMLButtonElement;
      const site = target.getAttribute('data-site');
      if (site) {
        await removeSite(site);
        await renderDisabledSites();
        await renderCurrentSite(); // Refresh current site toggle if it matches
      }
    });
  });
}

// Escape HTML to prevent XSS
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize the options page
async function initOptions(): Promise<void> {
  await renderCurrentSite();
  await renderDisabledSites();
}

// Run initialization when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initOptions);
} else {
  initOptions();
}
