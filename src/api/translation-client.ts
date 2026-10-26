/**
 * Content-script side of translation: asks the background worker to translate
 */

import type { TranslationResult } from './translate-api';
import { TRANSLATION_OFF, MESSAGE_ACTIONS } from '../constants/app-constants';
import { LOG_PREFIX } from '../constants/messages';
import { getTargetLanguage } from '../shared/utils';

// Read once, then kept current by storage change events instead of a storage read per selection
let targetLanguage: Promise<string> | null = null;

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && 'targetLanguage' in changes) targetLanguage = null;
});

/**
 * Translate text into the user's target language
 * @returns Translation (with dictionary entries for a single word), or null when translation is off or fails
 */
export async function requestTranslation(text: string): Promise<TranslationResult | null> {
  targetLanguage ??= getTargetLanguage();
  const to = await targetLanguage;
  if (to === TRANSLATION_OFF) return null;

  try {
    const response = await chrome.runtime.sendMessage({ action: MESSAGE_ACTIONS.TRANSLATE, text, to });
    if (response?.error) {
      console.warn(`${LOG_PREFIX} Translation failed:`, response.error);
      return null;
    }
    return response?.result ?? null;
  } catch (error) {
    console.error(`${LOG_PREFIX} Translation request failed:`, error);
    return null;
  }
}
