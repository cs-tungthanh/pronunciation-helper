/**
 * Background service worker - performs cross-origin translation and IPA requests for content scripts
 * and plays Google TTS audio through the offscreen document
 */

import { translate } from '../api/translate-api';
import { lookupWordIpa } from '../api/dictionary-api';
import { buildGoogleTtsUrls } from '../api/google-tts';
import { getTtsAudio, getCachedTtsAudio } from '../speech/tts-audio-cache';
import { OFFSCREEN_DOCUMENT_PATH, MESSAGE_ACTIONS } from '../constants/app-constants';
import { LOG_PREFIX } from '../constants/messages';
import { OFFSCREEN_TARGET, TTS_MESSAGES, SpeechStatus } from '../speech/tts-messages';

// Shared while a createDocument call is in flight; creating a second document throws
let creatingOffscreen: Promise<void> | null = null;
// Bumped on every speak and stop, so a playback still downloading can tell it was replaced or stopped
let speechToken = 0;

/**
 * Create the offscreen audio document unless it already exists
 */
async function ensureOffscreenDocument(): Promise<void> {
  if (await chrome.offscreen.hasDocument()) return;

  creatingOffscreen ??= chrome.offscreen
    .createDocument({
      url: OFFSCREEN_DOCUMENT_PATH,
      reasons: [chrome.offscreen.Reason.AUDIO_PLAYBACK],
      justification: 'Play pronunciation audio'
    })
    .finally(() => {
      creatingOffscreen = null;
    });

  await creatingOffscreen;
}

/**
 * Download (or take from the cache) every chunk of text at one speed
 */
function getSpeechAudio(text: string, slow: boolean): Promise<string[]> {
  return Promise.all(buildGoogleTtsUrls(text, slow).map(getTtsAudio));
}

/**
 * What to play for each chunk: the cached audio, or else Google's URL, which starts playing while it
 * downloads; the cache downloads a copy of it for next time
 */
function getSpeechSources(text: string, slow: boolean): Promise<string[]> {
  return Promise.all(
    buildGoogleTtsUrls(text, slow).map(async (url) => {
      const cached = await getCachedTtsAudio(url);
      if (cached) return cached;
      getTtsAudio(url).catch(() => {});
      return url;
    })
  );
}

/**
 * Speak text with Google's voice; resolves when playback ends, is stopped, or fails
 */
async function speakWithGoogle(text: string, slow: boolean, speed: number): Promise<SpeechStatus> {
  const token = ++speechToken;
  const [sources] = await Promise.all([getSpeechSources(text, slow), ensureOffscreenDocument()]);
  if (token !== speechToken) return 'stopped';

  // Playing the same text again soon after is the slow repeat: get it ready while this one plays
  if (!slow) getSpeechAudio(text, true).catch(() => {});

  const response = await chrome.runtime.sendMessage({
    target: OFFSCREEN_TARGET,
    action: TTS_MESSAGES.OFFSCREEN_PLAY,
    urls: sources,
    speed
  });
  return response?.status ?? 'failed';
}

/**
 * Stop Google TTS playback, if the offscreen document is running
 */
async function stopGoogleSpeech(): Promise<void> {
  speechToken++;
  if (!(await chrome.offscreen.hasDocument())) return;
  await chrome.runtime.sendMessage({ target: OFFSCREEN_TARGET, action: TTS_MESSAGES.OFFSCREEN_STOP });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  // Addressed to the offscreen document, not to us
  if (message.target === OFFSCREEN_TARGET) return false;

  if (message.action === MESSAGE_ACTIONS.LOOKUP_IPA) {
    // lookupWordIpa reads failures as "no IPA", so it never rejects
    lookupWordIpa(message.word).then(ipa => sendResponse({ ipa }));
    return true;
  }

  if (message.action === MESSAGE_ACTIONS.TRANSLATE) {
    translate(message.text, message.to)
      .then(result => sendResponse({ result }))
      .catch(error => {
        console.error(`${LOG_PREFIX} Translation failed:`, error);
        sendResponse({ error: error instanceof Error ? error.message : String(error) });
      });
    return true; // Keep message channel open for the async response
  }

  if (message.action === TTS_MESSAGES.SPEAK) {
    speakWithGoogle(message.text, message.slow, message.speed ?? 1)
      .then(status => sendResponse({ status }))
      .catch(error => {
        console.error(`${LOG_PREFIX} Google TTS failed:`, error);
        sendResponse({ status: 'failed' });
      });
    return true;
  }

  // Only starts the offscreen document: the text is sent to Google when play is pressed, not before
  if (message.action === TTS_MESSAGES.PRELOAD) {
    ensureOffscreenDocument()
      .catch(error => console.error(`${LOG_PREFIX} Preloading Google TTS failed:`, error))
      .finally(() => sendResponse({}));
    return true;
  }

  if (message.action === TTS_MESSAGES.STOP) {
    stopGoogleSpeech()
      .catch(error => console.error(`${LOG_PREFIX} Stopping Google TTS failed:`, error))
      .finally(() => sendResponse({}));
    return true;
  }

  return false;
});
