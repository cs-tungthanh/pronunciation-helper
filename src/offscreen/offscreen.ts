/**
 * Offscreen document - plays Google TTS audio in an extension page, where the host page's CSP can't block it
 */

import { OFFSCREEN_TARGET, TTS_MESSAGES, SpeechStatus } from '../speech/tts-messages';

// Bumped whenever playback is replaced or stopped so an older chunk loop can tell it is stale
let playToken = 0;
let currentAudio: HTMLAudioElement | null = null;
let finishCurrent: ((status: SpeechStatus) => void) | null = null;

/**
 * Stop the current audio; its pending playback resolves as 'stopped'
 */
function stopPlayback(): void {
  playToken++;
  currentAudio?.pause();
  currentAudio = null;
  finishCurrent?.('stopped');
  finishCurrent = null;
}

/**
 * Play one MP3 URL to the end
 */
function playUrl(url: string): Promise<SpeechStatus> {
  return new Promise((resolve) => {
    const audio = new Audio(url);
    currentAudio = audio;
    finishCurrent = resolve;
    audio.onended = () => resolve('ended');
    audio.onerror = () => resolve('failed');
    audio.play().catch(() => resolve('failed'));
  });
}

/**
 * Play chunk URLs back to back, replacing anything already playing
 */
async function playUrls(urls: string[]): Promise<SpeechStatus> {
  stopPlayback();
  const token = playToken;

  for (const url of urls) {
    const status = await playUrl(url);
    if (token !== playToken) return 'stopped';
    if (status !== 'ended') return status;
  }

  return 'ended';
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.target !== OFFSCREEN_TARGET) return false;

  if (message.action === TTS_MESSAGES.OFFSCREEN_PLAY) {
    playUrls(message.urls).then(status => sendResponse({ status }));
    return true; // Respond when playback finishes
  }

  if (message.action === TTS_MESSAGES.OFFSCREEN_STOP) {
    stopPlayback();
    sendResponse({});
  }

  return false;
});
