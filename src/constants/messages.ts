/**
 * User-facing messages and error text
 */

export const ERROR_MESSAGES = {
  ERROR_LOADING: 'Error loading',
  UNABLE_TO_DETECT: 'Unable to detect current site',
  NO_SITES_DISABLED: 'No sites disabled yet',
} as const;

export const UI_LABELS = {
  PLAY_TOOLTIP: 'Hear the whole selection',
  STOP_TOOLTIP: 'Stop',
  ENABLED: 'Enabled',
  DISABLED: 'Disabled',
  DRAG_TOOLTIP: 'Drag to move',
  CLOSE_TOOLTIP: 'Close (Esc)',
  PLAY_WORD_TOOLTIP: 'Hear this word',
  WORD_TOOLTIP: 'Click for pronunciation',
  LOOKING_UP: 'Looking up…',
  NO_IPA: 'No IPA found',
  ENABLE_ON_SITE: 'Enable on this site',
  TRANSLATION_OFF: 'Off (no translation)',
  TRIGGER_TOOLTIP: 'Show pronunciation',
  COPY_TOOLTIP: 'Copy',
  COPIED: 'Copied',
  COPY_FAILED: "Couldn't copy",
  POPUP_MODE_IMMEDIATE: 'Immediately display',
  POPUP_MODE_ICON: 'Display icon',
  POPUP_MODE_NONE: "Don't display",
  SITE_ON: 'On for this site',
  SITE_OFF: 'Off for this site',
  BROWSER_PAGE: 'Browser page',
  BROWSER_PAGE_STATUS: "Sayly can't run on browser pages",
  ALL_SETTINGS: 'All settings',
  DICTIONARY_SITE: 'Open words in',
  SELECTION_LEGEND: 'When you select text',
  MODE_IMMEDIATE_SHORT: 'Popup',
  MODE_ICON_SHORT: 'Icon',
  MODE_NONE_SHORT: 'Off',
  MODE_IMMEDIATE_HINT: 'The popup opens as soon as you select text.',
  MODE_ICON_HINT: 'A small icon appears by the selection. Click it to open the popup.',
  MODE_NONE_HINT: 'Nothing appears when you select text.',
} as const;

export const LOG_PREFIX = '[Sayly]';
