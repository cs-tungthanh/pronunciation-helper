/**
 * Content-script side of translation: asks the background worker to translate
 */

import type { TranslationResult } from './translate-api';
import { TRANSLATION_OFF } from '../constants/app-constants';
import { LOG_PREFIX } from '../constants/messages';
import { getTargetLanguage } from '../shared/utils';

/**
 * Translate text into the user's target language
 * @returns Translation (with dictionary entries for a single word), or null when translation is off or fails
 */
export async function requestTranslation(text: string): Promise<TranslationResult | null> {
  const targetLanguage = await getTargetLanguage();
  if (targetLanguage === TRANSLATION_OFF) return null;

  try {
    const response = await chrome.runtime.sendMessage({ action: 'translate', text, to: targetLanguage });
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
