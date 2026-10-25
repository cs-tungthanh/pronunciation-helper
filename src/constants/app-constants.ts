/**
 * Application-wide constants
 */

// API Configuration
export const DICTIONARY_API_BASE_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en';

// Translation Configuration
export const GOOGLE_TRANSLATE_URL = 'https://translate.googleapis.com/translate_a/single';
// Undocumented client strings; Google gates the endpoint per value, so rotate on refusal
export const GOOGLE_TRANSLATE_CLIENTS = ['dict-chrome-ex', 'gtx'];
export const MYMEMORY_TRANSLATE_URL = 'https://api.mymemory.translated.net/get';
export const MYMEMORY_MAX_CHARS = 500;
export const TRANSLATION_MAX_CHARS = 5000;
export const TRANSLATION_SOURCE_LANG = 'en';
export const DICTIONARY_MAX_MEANINGS = 5;
export const DICTIONARY_LOOKUP_URL = 'https://www.dictionary.com/browse/';
export const TRANSLATION_OFF = 'off';
export const DEFAULT_TARGET_LANGUAGE = 'vi';

// Text-to-speech: Google Translate's voice (undocumented endpoint; tw-ob is the client it answers)
export const GOOGLE_TTS_URL = 'https://translate.google.com/translate_tts';
export const GOOGLE_TTS_CLIENT = 'tw-ob';
export const GOOGLE_TTS_MAX_CHARS = 200;
export const GOOGLE_TTS_SLOW_SPEED = '0.24';
export const TTS_LANG = 'en';
export const OFFSCREEN_DOCUMENT_PATH = 'offscreen.html';

// CSS Classes
export const POPUP_CSS_CLASS = 'elang-pronunciation-popup';

// UI Timing (milliseconds)
export const SELECTION_DELAY_MS = 10;
export const POPUP_POSITION_OFFSET_PX = 10;
export const POPUP_EDGE_MARGIN_PX = 10;
export const VOICE_LOAD_TIMEOUT_MS = 3000;
export const WORD_BUBBLE_GAP_PX = 6;
export const SPEECH_FALLBACK_TIMEOUT_MS = 10000;
// Playing the same text again within this window plays it slowly
export const SLOW_REPEAT_WINDOW_MS = 30000;

// Voice Configuration
export const PREFERRED_VOICE_LANG = 'en-US';
export const DEFAULT_SPEECH_RATE = 1.0;
export const SLOW_SPEECH_RATE = 0.7;
