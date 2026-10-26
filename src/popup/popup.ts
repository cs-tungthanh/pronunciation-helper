/**
 * Browser extension popup UI: this site's on/off switch plus the settings that apply everywhere
 */

import { AudioLines, EyeOff, MessageSquareText, Monitor, Moon, Settings, Sun } from 'lucide';
import type { IconNode } from 'lucide';
import {
  getCurrentTabHostname,
  getDisabledSites,
  isSiteEnabled,
  toggleSite,
  getPopupMode,
  savePopupMode,
  getTargetLanguage,
  saveTargetLanguage,
  getDictionarySite,
  saveDictionarySite,
  getShowCopyButton,
  saveShowCopyButton,
  getTheme,
  saveTheme,
  getSpeechSpeed,
  saveSpeechSpeed
} from '../shared/utils';
import { getRequiredElement, onDOMReady, applyPageTheme } from '../shared/dom-helpers';
import { createIcon, setButtonIcon } from '../ui/icons';
import { ERROR_MESSAGES, UI_LABELS, THEME_CHOICES, SPEED_CHOICES } from '../constants/messages';
import {
  MESSAGE_ACTIONS,
  POPUP_MODES,
  PopupMode,
  DICTIONARY_SITES,
  DictionarySite,
  Theme
} from '../constants/app-constants';
import { TRANSLATION_CHOICES } from '../constants/languages';

/**
 * The popup-mode choices, as shown in the segmented control
 */
const MODE_CHOICES: ReadonlyArray<{ mode: PopupMode; label: string; hint: string; icon: IconNode }> = [
  { mode: POPUP_MODES.IMMEDIATE, label: UI_LABELS.MODE_IMMEDIATE_SHORT, hint: UI_LABELS.MODE_IMMEDIATE_HINT, icon: MessageSquareText },
  { mode: POPUP_MODES.ICON, label: UI_LABELS.MODE_ICON_SHORT, hint: UI_LABELS.MODE_ICON_HINT, icon: AudioLines },
  { mode: POPUP_MODES.NONE, label: UI_LABELS.MODE_NONE_SHORT, hint: UI_LABELS.MODE_NONE_HINT, icon: EyeOff }
];

/** Icons for the theme switch: match system, light, dark */
const THEME_ICONS: Record<Theme, IconNode> = {
  system: Monitor,
  light: Sun,
  dark: Moon
};

/**
 * DOM element references
 */
interface PopupElements {
  siteName: HTMLElement;
  enableToggle: HTMLInputElement;
  toggleStatus: HTMLElement;
  openSettings: HTMLButtonElement;
  popupModes: HTMLElement;
  popupModeHint: HTMLElement;
  copyButtonRow: HTMLElement;
  showCopyButton: HTMLInputElement;
  speechSpeed: HTMLSelectElement;
  targetLanguage: HTMLSelectElement;
  dictionarySite: HTMLSelectElement;
  themeSwitch: HTMLElement;
}

/**
 * Get and validate DOM elements
 */
function getPopupElements(): PopupElements {
  return {
    siteName: getRequiredElement<HTMLElement>('siteName'),
    enableToggle: getRequiredElement<HTMLInputElement>('enableToggle'),
    toggleStatus: getRequiredElement<HTMLElement>('toggleStatus'),
    openSettings: getRequiredElement<HTMLButtonElement>('openSettings'),
    popupModes: getRequiredElement<HTMLElement>('popupModes'),
    popupModeHint: getRequiredElement<HTMLElement>('popupModeHint'),
    copyButtonRow: getRequiredElement<HTMLElement>('copyButtonRow'),
    showCopyButton: getRequiredElement<HTMLInputElement>('showCopyButton'),
    speechSpeed: getRequiredElement<HTMLSelectElement>('speechSpeed'),
    targetLanguage: getRequiredElement<HTMLSelectElement>('targetLanguage'),
    dictionarySite: getRequiredElement<HTMLSelectElement>('dictionarySite'),
    themeSwitch: getRequiredElement<HTMLElement>('themeSwitch')
  };
}

/**
 * Update the status line under the site name
 */
function updateToggleStatus(elements: PopupElements, enabled: boolean): void {
  elements.toggleStatus.textContent = enabled ? UI_LABELS.SITE_ON : UI_LABELS.SITE_OFF;
  elements.toggleStatus.classList.toggle('is-on', enabled);
}

/**
 * Send message to content script for immediate effect
 */
async function notifyContentScript(hostname: string, enabled: boolean): Promise<void> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (tab?.id) {
      const action = enabled ? MESSAGE_ACTIONS.ENABLE : MESSAGE_ACTIONS.DISABLE;
      await chrome.tabs.sendMessage(tab.id, { action, hostname });
    }
  } catch (error) {
    // Content script might not be loaded yet, which is fine
    console.debug('Failed to notify content script:', error);
  }
}

/**
 * Show this site's on/off state and wire its switch
 */
async function renderSite(elements: PopupElements): Promise<void> {
  const hostname = await getCurrentTabHostname();

  // Browser pages (chrome://, the Web Store, extension pages) don't run content scripts
  if (!hostname) {
    elements.siteName.textContent = UI_LABELS.BROWSER_PAGE;
    elements.toggleStatus.textContent = UI_LABELS.BROWSER_PAGE_STATUS;
    return;
  }

  elements.siteName.textContent = hostname;
  elements.siteName.title = hostname;

  const enabled = isSiteEnabled(hostname, await getDisabledSites());
  elements.enableToggle.checked = enabled;
  elements.enableToggle.disabled = false;
  updateToggleStatus(elements, enabled);

  elements.enableToggle.addEventListener('change', async () => {
    const newState = elements.enableToggle.checked;
    updateToggleStatus(elements, newState);
    await toggleSite(hostname, newState);
    await notifyContentScript(hostname, newState);
  });
}

/**
 * Build the segmented control for what happens when text is selected
 */
async function renderPopupMode(elements: PopupElements): Promise<void> {
  const [current, showCopy] = await Promise.all([getPopupMode(), getShowCopyButton()]);

  // The hint explains the chosen mode; copy buttons only exist when something appears
  const showModeDetails = (mode: PopupMode) => {
    elements.popupModeHint.textContent = MODE_CHOICES.find(choice => choice.mode === mode)?.hint ?? '';
    elements.copyButtonRow.hidden = mode === POPUP_MODES.NONE;
  };

  elements.showCopyButton.checked = showCopy;
  elements.showCopyButton.addEventListener('change', () => saveShowCopyButton(elements.showCopyButton.checked));

  MODE_CHOICES.forEach(({ mode, label, icon }) => {
    const segment = document.createElement('div');
    segment.className = 'segment';

    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'popupMode';
    input.id = `popupMode-${mode}`;
    input.value = mode;
    input.checked = mode === current;
    input.setAttribute('aria-describedby', 'popupModeHint');
    input.addEventListener('change', () => {
      showModeDetails(mode);
      savePopupMode(mode);
    });

    const labelElement = document.createElement('label');
    labelElement.htmlFor = input.id;
    labelElement.append(createIcon(icon, 18), label);

    segment.append(input, labelElement);
    elements.popupModes.appendChild(segment);
  });

  showModeDetails(current);
}

/**
 * Fill the speech speed picker
 */
async function renderSpeechSpeed(elements: PopupElements): Promise<void> {
  const select = elements.speechSpeed;
  SPEED_CHOICES.forEach(({ speed, name }) => {
    select.appendChild(new Option(name, String(speed)));
  });

  select.value = String(await getSpeechSpeed());
  select.addEventListener('change', () => saveSpeechSpeed(Number(select.value)));
}

/**
 * Fill the translation language picker
 */
async function renderTargetLanguage(elements: PopupElements): Promise<void> {
  const select = elements.targetLanguage;
  TRANSLATION_CHOICES.forEach(({ code, name }) => {
    select.appendChild(new Option(name, code));
  });

  select.value = await getTargetLanguage();
  select.addEventListener('change', () => saveTargetLanguage(select.value));
}

/**
 * Fill the picker for the site that dictionary links open
 */
async function renderDictionarySite(elements: PopupElements): Promise<void> {
  const select = elements.dictionarySite;
  Object.entries(DICTIONARY_SITES).forEach(([id, { name }]) => {
    select.appendChild(new Option(name, id));
  });

  select.value = await getDictionarySite();
  select.addEventListener('change', () => saveDictionarySite(select.value as DictionarySite));
}

/**
 * Fill the theme picker and apply the theme to this popup, also as it changes
 */
async function renderTheme(elements: PopupElements): Promise<void> {
  const current = await getTheme();
  applyPageTheme(current);

  THEME_CHOICES.forEach(({ theme, name }) => {
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'theme';
    input.id = `theme-${theme}`;
    input.value = theme;
    input.checked = theme === current;
    input.addEventListener('change', () => {
      applyPageTheme(theme);
      saveTheme(theme);
    });

    // Icon only; the name is its tooltip and what screen readers announce
    const label = document.createElement('label');
    label.htmlFor = input.id;
    label.title = name;
    label.setAttribute('aria-label', name);
    label.appendChild(createIcon(THEME_ICONS[theme], 16));

    const option = document.createElement('span');
    option.className = 'theme-option';
    option.append(input, label);
    elements.themeSwitch.appendChild(option);
  });
}

/**
 * Initialize popup UI
 */
async function initPopup(): Promise<void> {
  const elements = getPopupElements();

  setButtonIcon(elements.openSettings, Settings, 18, UI_LABELS.ALL_SETTINGS);
  elements.openSettings.addEventListener('click', () => chrome.runtime.openOptionsPage());

  // The global settings still work when this site can't be read
  const results = await Promise.allSettled([
    renderSite(elements),
    renderPopupMode(elements),
    renderSpeechSpeed(elements),
    renderTargetLanguage(elements),
    renderDictionarySite(elements),
    renderTheme(elements)
  ]);

  if (results[0].status === 'rejected') {
    console.error('Error loading the current site:', results[0].reason);
    elements.siteName.textContent = ERROR_MESSAGES.ERROR_LOADING;
    elements.toggleStatus.textContent = '';
  }
}

// Initialize when DOM is ready
onDOMReady(initPopup);
