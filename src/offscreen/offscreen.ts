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
 * Play one loaded or loading MP3 to the end
 * @param speed Playback rate; the browser keeps the pitch
 */
function playAudio(audio: HTMLAudioElement, speed: number): Promise<SpeechStatus> {
  return new Promise((resolve) => {
    currentAudio = audio;
    audio.playbackRate = speed;
    finishCurrent = resolve;
    audio.onended = () => resolve('ended');
    audio.onerror = () => resolve('failed');
    audio.play().catch(() => resolve('failed'));
  });
}

/**
 * Play chunk URLs back to back, replacing anything already playing
 */
async function playUrls(urls: string[], speed: number): Promise<SpeechStatus> {
  stopPlayback();
  const token = playToken;

  // new Audio(url) starts downloading, so each chunk is fetched while the previous one plays
  let next: HTMLAudioElement | null = urls.length > 0 ? new Audio(urls[0]) : null;

  for (let i = 0; next; i++) {
    const audio = next;
    next = i + 1 < urls.length ? new Audio(urls[i + 1]) : null;

    const status = await playAudio(audio, speed);
    if (token !== playToken) return 'stopped';
    if (status !== 'ended') return status;
  }

  return 'ended';
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.target !== OFFSCREEN_TARGET) return false;

  if (message.action === TTS_MESSAGES.OFFSCREEN_PLAY) {
    playUrls(message.urls, message.speed ?? 1).then(status => sendResponse({ status }));
    return true; // Respond when playback finishes
  }

  if (message.action === TTS_MESSAGES.OFFSCREEN_STOP) {
    stopPlayback();
    sendResponse({});
  }

  return false;
});
