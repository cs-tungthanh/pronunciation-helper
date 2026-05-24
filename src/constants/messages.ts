/**
 * User-facing messages and error text
 */

export const ERROR_MESSAGES = {
  SPEECH_NOT_SUPPORTED: 'Speech synthesis not supported in this browser',
  NO_EN_US_VOICE: 'No en-US voice available',
  NO_VOICES_AVAILABLE: 'Loading...',
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
  PLAY: 'Play',
  VOICING: 'Voicing',
  LOADING: 'Loading...',
  DRAG_HANDLE: '⋮⋮',
  CLOSE_BUTTON: 'x',
  ENABLED: 'Enabled',
  DISABLED: 'Disabled',
  DRAG_TOOLTIP: 'Drag to move',
  CLOSE_TOOLTIP: 'Close',
  ENABLE_ON_SITE: 'Enable on this site',
} as const;

export const LOG_PREFIX = '[Pronunciation Helper]';
