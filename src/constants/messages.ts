/**
 * User-facing messages and error text
 */

export const ERROR_MESSAGES = {
  STORAGE_ERROR: 'Storage error',
  BROWSER_INTERNAL_PAGE: 'Browser internal page',
  LOADING: 'Loading...',
  ERROR_LOADING: 'Error loading',
  ERROR_STATUS: 'Error',
  NOT_AVAILABLE: 'N/A',
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
  DICTIONARY_TOOLTIP: 'Open in Dictionary.com',
  WORD_TOOLTIP: 'Click for pronunciation',
  LOOKING_UP: 'Looking up…',
  NO_IPA: 'No IPA found',
  ENABLE_ON_SITE: 'Enable on this site',
  TRANSLATION_OFF: 'Off (no translation)',
  TRIGGER_TOOLTIP: 'Show pronunciation',
  POPUP_MODE_IMMEDIATE: 'Immediately display',
  POPUP_MODE_ICON: 'Display icon',
  POPUP_MODE_NONE: "Don't display",
} as const;

export const LOG_PREFIX = '[Sayly]';
