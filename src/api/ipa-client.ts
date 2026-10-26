/**
 * Content-script side of IPA lookup: asks the background worker, which caches results
 */

import { MESSAGE_ACTIONS } from '../constants/app-constants';
import { LOG_PREFIX } from '../constants/messages';

/**
 * Look up IPA for one word as shown in the text
 * @returns IPA, or null when none is found or the request fails
 */
export async function requestWordIpa(word: string): Promise<string | null> {
  try {
    const response = await chrome.runtime.sendMessage({ action: MESSAGE_ACTIONS.LOOKUP_IPA, word });
    return response?.ipa ?? null;
  } catch (error) {
    console.error(`${LOG_PREFIX} IPA request failed:`, error);
    return null;
  }
}
