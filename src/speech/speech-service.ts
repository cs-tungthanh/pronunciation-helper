/**
 * Text-to-speech: Google Translate's voice (played by the background's offscreen document),
 * falling back to the browser's speech synthesis
 */

import {
  PREFERRED_VOICE_LANG,
  DEFAULT_SPEECH_RATE,
  SLOW_SPEECH_RATE,
  SLOW_REPEAT_WINDOW_MS,
  VOICE_LOAD_TIMEOUT_MS,
  SPEECH_FALLBACK_TIMEOUT_MS
} from '../constants/app-constants';
import { TTS_MESSAGES, SpeechStatus } from './tts-messages';

interface SpeakCallbacks {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: () => void;
}

/**
 * State management for speech playback
 */
class SpeechService {
  // Bumped on every speak/stop so a superseded playback can tell it is stale
  private playToken = 0;
  // Google-Translate-style repeat: playing the same text again soon after plays it slowly
  private lastText = '';
  private lastWasSlow = false;
  private lastSpokenAt = 0;

  /**
   * Wait for browser voices to load, with a timeout (needed only by the fallback, so loaded on first use)
   */
  private ensureVoicesLoaded(): Promise<void> {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window) || speechSynthesis.getVoices().length > 0) {
        resolve();
        return;
      }

      const handler = () => {
        if (speechSynthesis.getVoices().length > 0) {
          speechSynthesis.removeEventListener('voiceschanged', handler);
          resolve();
        }
      };

      speechSynthesis.addEventListener('voiceschanged', handler);

      setTimeout(() => {
        speechSynthesis.removeEventListener('voiceschanged', handler);
        resolve();
      }, VOICE_LOAD_TIMEOUT_MS);
    });
  }

  /**
   * Get the preferred browser voice for the fallback
   */
  private getPreferredVoice(): SpeechSynthesisVoice | null {
    const voices = speechSynthesis.getVoices();
    return voices.find(voice => voice.lang === PREFERRED_VOICE_LANG) || null;
  }

  /**
   * Decide the speed: a repeat of the same text within the window alternates normal → slow → normal
   */
  private nextIsSlow(text: string): boolean {
    const now = Date.now();
    const isRepeat = text === this.lastText && now - this.lastSpokenAt < SLOW_REPEAT_WINDOW_MS;
    const slow = isRepeat && !this.lastWasSlow;

    this.lastText = text;
    this.lastWasSlow = slow;
    this.lastSpokenAt = now;
    return slow;
  }

  /**
   * Speak the given text; callbacks fire exactly once each, also when replaced or stopped
   */
  speak(text: string, callbacks?: SpeakCallbacks): void {
    // No stop message: the offscreen document replaces its audio on play, and a separate
    // stop could reach it after this play and cut it off
    this.cancelLocal();
    const token = this.playToken;
    const slow = this.nextIsSlow(text);

    callbacks?.onStart?.();

    const finish = (failed: boolean) => {
      if (failed) {
        callbacks?.onError?.();
      } else {
        callbacks?.onEnd?.();
      }
    };

    this.speakWithGoogle(text, slow).then((status) => {
      // Fall back only if this playback is still the current one
      if (status === 'failed' && token === this.playToken) {
        this.speakWithBrowser(text, slow, () => token === this.playToken).then(ok => finish(!ok));
        return;
      }
      finish(false);
    });
  }

  /**
   * Ask the background to play Google's voice; resolves when playback is over
   */
  private async speakWithGoogle(text: string, slow: boolean): Promise<SpeechStatus> {
    try {
      const response = await chrome.runtime.sendMessage({ action: TTS_MESSAGES.SPEAK, text, slow });
      return response?.status ?? 'failed';
    } catch {
      return 'failed';
    }
  }

  /**
   * Speak with the browser's own voices
   * @param isCurrent Whether this playback is still wanted once the voices have loaded
   * @returns false when speech synthesis is unavailable or errors
   */
  private async speakWithBrowser(text: string, slow: boolean, isCurrent: () => boolean): Promise<boolean> {
    if (!('speechSynthesis' in window)) return false;
    await this.ensureVoicesLoaded();
    // Replaced or stopped while waiting: not a failure
    if (!isCurrent()) return true;

    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      const voice = this.getPreferredVoice();
      if (voice) {
        utterance.voice = voice;
      }
      utterance.lang = PREFERRED_VOICE_LANG;
      utterance.rate = slow ? SLOW_SPEECH_RATE : DEFAULT_SPEECH_RATE;

      utterance.onend = () => resolve(true);
      // Being cancelled by stop() is not a failure
      utterance.onerror = (event) => resolve(event.error === 'interrupted' || event.error === 'canceled');

      // Fallback timeout for unreliable onend event
      setTimeout(() => resolve(true), SPEECH_FALLBACK_TIMEOUT_MS);

      speechSynthesis.speak(utterance);
    });
  }

  /**
   * Invalidate the current playback and silence the browser voice
   */
  private cancelLocal(): void {
    this.playToken++;

    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
  }

  /**
   * Stop any current speech playback, Google or browser
   */
  stop(): void {
    this.cancelLocal();

    try {
      chrome.runtime.sendMessage({ action: TTS_MESSAGES.STOP }).catch(() => {});
    } catch {
      // Extension context invalidated (extension reloaded); nothing to stop
    }
  }
}

// Export singleton instance
export const speechService = new SpeechService();
