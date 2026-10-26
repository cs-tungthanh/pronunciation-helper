/**
 * Extension options page for managing disabled sites
 */

import {
  getRecentWebTabHostname,
  getDisabledSites,
  isSiteEnabled,
  toggleSite,
  removeSite,
  getTargetLanguage,
  saveTargetLanguage,
  getPopupMode,
  savePopupMode
} from '../shared/utils';
import { getOptionalElement, onDOMReady } from '../shared/dom-helpers';
import { ERROR_MESSAGES, UI_LABELS } from '../constants/messages';
import { POPUP_MODES, PopupMode } from '../constants/app-constants';
import { TRANSLATION_CHOICES } from '../constants/languages';

/**
 * DOM element references
 */
interface OptionsElements {
  currentSite: HTMLElement | null;
  enableToggle: HTMLInputElement | null;
  toggleLabel: HTMLElement | null;
  disabledSitesList: HTMLElement | null;
  targetLanguage: HTMLSelectElement | null;
  popupMode: HTMLSelectElement | null;
}

/**
 * Get DOM elements (all optional to handle partial templates)
 */
function getOptionsElements(): OptionsElements {
  return {
    currentSite: getOptionalElement<HTMLElement>('currentSite'),
    enableToggle: getOptionalElement<HTMLInputElement>('enableToggle'),
    toggleLabel: getOptionalElement<HTMLElement>('toggleLabel'),
    disabledSitesList: getOptionalElement<HTMLElement>('disabledSitesList'),
    targetLanguage: getOptionalElement<HTMLSelectElement>('targetLanguage'),
    popupMode: getOptionalElement<HTMLSelectElement>('popupMode')
  };
}

/**
 * Render translation target language selector
 */
async function renderTargetLanguage(elements: OptionsElements): Promise<void> {
  const select = elements.targetLanguage;
  if (!select) {
    return;
  }

  TRANSLATION_CHOICES.forEach(({ code, name }) => {
    select.appendChild(new Option(name, code));
  });

  select.value = await getTargetLanguage();

  // Content scripts listen for storage changes, so no reload is needed
  select.addEventListener('change', () => saveTargetLanguage(select.value));
}

/**
 * Render the selector for what happens when text is selected
 */
async function renderPopupMode(elements: OptionsElements): Promise<void> {
  const select = elements.popupMode;
  if (!select) {
    return;
  }

  const options: { mode: PopupMode; name: string }[] = [
    { mode: POPUP_MODES.IMMEDIATE, name: UI_LABELS.POPUP_MODE_IMMEDIATE },
    { mode: POPUP_MODES.ICON, name: UI_LABELS.POPUP_MODE_ICON },
    { mode: POPUP_MODES.NONE, name: UI_LABELS.POPUP_MODE_NONE }
  ];
  options.forEach(({ mode, name }) => {
    select.appendChild(new Option(name, mode));
  });

  select.value = await getPopupMode();

  // Content scripts listen for storage changes, so no reload is needed
  select.addEventListener('change', () => savePopupMode(select.value as PopupMode));
}

/**
 * Show whether the extension is enabled on the current site
 */
async function renderCurrentSite(elements: OptionsElements, hostname: string | null): Promise<void> {
  if (!elements.currentSite || !elements.enableToggle || !elements.toggleLabel) {
    return;
  }

  if (!hostname) {
    elements.currentSite.textContent = ERROR_MESSAGES.UNABLE_TO_DETECT;
    elements.enableToggle.disabled = true;
    elements.toggleLabel.textContent = UI_LABELS.ENABLE_ON_SITE;
    return;
  }

  elements.currentSite.textContent = hostname;

  const enabled = isSiteEnabled(hostname, await getDisabledSites());
  elements.enableToggle.checked = enabled;
  elements.enableToggle.disabled = false;
  elements.toggleLabel.textContent = enabled ? UI_LABELS.ENABLED : UI_LABELS.DISABLED;
}

/**
 * Wire the current site toggle once; renders only update its state
 */
function setupCurrentSiteToggle(elements: OptionsElements, hostname: string | null): void {
  const { enableToggle } = elements;
  if (!enableToggle || !hostname) {
    return;
  }

  enableToggle.addEventListener('change', async () => {
    await toggleSite(hostname, enableToggle.checked);
    await renderAll(elements, hostname);
  });
}

/**
 * Create a single site list item
 */
function createSiteItem(site: string, onRemove: () => void): HTMLElement {
  const item = document.createElement('div');
  item.className = 'site-item';

  const name = document.createElement('span');
  name.className = 'site-name';
  name.textContent = site;

  const removeButton = document.createElement('button');
  removeButton.className = 'remove-btn';
  removeButton.textContent = 'Remove';
  removeButton.addEventListener('click', onRemove);

  item.append(name, removeButton);
  return item;
}

/**
 * Render disabled sites list
 */
async function renderDisabledSites(elements: OptionsElements, hostname: string | null): Promise<void> {
  const list = elements.disabledSitesList;
  if (!list) {
    return;
  }

  const disabledSites = await getDisabledSites();

  if (disabledSites.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-message';
    empty.textContent = ERROR_MESSAGES.NO_SITES_DISABLED;
    list.replaceChildren(empty);
    return;
  }

  list.replaceChildren(
    ...[...disabledSites].sort().map(site =>
      createSiteItem(site, async () => {
        await removeSite(site);
        await renderAll(elements, hostname);
      })
    )
  );
}

/**
 * Re-render everything that depends on the disabled sites list
 */
async function renderAll(elements: OptionsElements, hostname: string | null): Promise<void> {
  await Promise.all([
    renderCurrentSite(elements, hostname),
    renderDisabledSites(elements, hostname)
  ]);
}

/**
 * Initialize options page
 */
async function initOptions(): Promise<void> {
  const elements = getOptionsElements();
  const hostname = await getRecentWebTabHostname();
  setupCurrentSiteToggle(elements, hostname);
  await Promise.all([
    renderAll(elements, hostname),
    renderPopupMode(elements),
    renderTargetLanguage(elements)
  ]);
}

// Initialize when DOM is ready
onDOMReady(initOptions);
