/**
 * Extension options page for managing disabled sites
 */

import {
  getCurrentTabHostname,
  getDisabledSites,
  isSiteEnabled,
  toggleSite,
  removeSite
} from '../shared/utils';
import { getOptionalElement, escapeHtml, onDOMReady } from '../shared/dom-helpers';
import { ERROR_MESSAGES, UI_LABELS } from '../constants/messages';

/**
 * DOM element references
 */
interface OptionsElements {
  currentSite: HTMLElement | null;
  enableToggle: HTMLInputElement | null;
  toggleLabel: HTMLElement | null;
  disabledSitesList: HTMLElement | null;
}

/**
 * Get DOM elements (all optional to handle partial templates)
 */
function getOptionsElements(): OptionsElements {
  return {
    currentSite: getOptionalElement<HTMLElement>('currentSite'),
    enableToggle: getOptionalElement<HTMLInputElement>('enableToggle'),
    toggleLabel: getOptionalElement<HTMLElement>('toggleLabel'),
    disabledSitesList: getOptionalElement<HTMLElement>('disabledSitesList')
  };
}

/**
 * Render current site toggle section
 */
async function renderCurrentSite(elements: OptionsElements): Promise<void> {
  if (!elements.currentSite || !elements.enableToggle || !elements.toggleLabel) {
    return;
  }

  const hostname = await getCurrentTabHostname();

  if (!hostname) {
    elements.currentSite.textContent = ERROR_MESSAGES.UNABLE_TO_DETECT;
    elements.enableToggle.disabled = true;
    elements.toggleLabel.textContent = UI_LABELS.ENABLE_ON_SITE;
    return;
  }

  elements.currentSite.textContent = hostname;

  const disabledSites = await getDisabledSites();
  const enabled = isSiteEnabled(hostname, disabledSites);

  elements.enableToggle.checked = enabled;
  elements.enableToggle.disabled = false;
  elements.toggleLabel.textContent = enabled ? UI_LABELS.ENABLED : UI_LABELS.DISABLED;

  // Setup toggle listener
  elements.enableToggle.addEventListener('change', async () => {
    const newState = elements.enableToggle!.checked;
    await toggleSite(hostname, newState);
    elements.toggleLabel!.textContent = newState ? UI_LABELS.ENABLED : UI_LABELS.DISABLED;
    await renderDisabledSites(elements);
  });
}

/**
 * Create a single site list item
 */
function createSiteItem(site: string, onRemove: () => void): string {
  const escapedSite = escapeHtml(site);
  return `
    <div class="site-item">
      <span class="site-name">${escapedSite}</span>
      <button class="remove-btn" data-site="${escapedSite}">Remove</button>
    </div>
  `;
}

/**
 * Setup remove button event listeners
 */
function setupRemoveButtons(
  listElement: HTMLElement,
  elements: OptionsElements
): void {
  const removeButtons = listElement.querySelectorAll<HTMLButtonElement>('.remove-btn');

  removeButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      const site = btn.getAttribute('data-site');
      if (site) {
        await removeSite(site);
        await renderDisabledSites(elements);
        await renderCurrentSite(elements);
      }
    });
  });
}

/**
 * Render disabled sites list
 */
async function renderDisabledSites(elements: OptionsElements): Promise<void> {
  if (!elements.disabledSitesList) {
    return;
  }

  const disabledSites = await getDisabledSites();

  if (disabledSites.length === 0) {
    elements.disabledSitesList.innerHTML = `<p class="empty-message">${ERROR_MESSAGES.NO_SITES_DISABLED}</p>`;
    return;
  }

  // Sort and render
  const sortedSites = [...disabledSites].sort();
  elements.disabledSitesList.innerHTML = sortedSites
    .map(site => createSiteItem(site, () => removeSite(site)))
    .join('');

  setupRemoveButtons(elements.disabledSitesList, elements);
}

/**
 * Initialize options page
 */
async function initOptions(): Promise<void> {
  const elements = getOptionsElements();
  await Promise.all([
    renderCurrentSite(elements),
    renderDisabledSites(elements)
  ]);
}

// Initialize when DOM is ready
onDOMReady(initOptions);
