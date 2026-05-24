/**
 * Speech synthesis service for text-to-speech functionality
 */

import {
  PREFERRED_VOICE_LANG,
  DEFAULT_SPEECH_RATE,
  VOICE_LOAD_TIMEOUT_MS,
  SPEECH_FALLBACK_TIMEOUT_MS
} from '../constants/app-constants';
import { ERROR_MESSAGES } from '../constants/messages';

/**
 * State management for speech synthesis
 */
class SpeechService {
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isPlaying = false;
  private voicesLoaded = false;

  /**
   * Check if speech synthesis is supported and has required voices
   */
  getSupportError(): string | null {
    if (!('speechSynthesis' in window)) {
      return ERROR_MESSAGES.SPEECH_NOT_SUPPORTED;
    }

    const voices = speechSynthesis.getVoices();
    const hasEnUSVoice = voices.some(voice => voice.lang === PREFERRED_VOICE_LANG);

    if (voices.length > 0 && !hasEnUSVoice) {
      return ERROR_MESSAGES.NO_EN_US_VOICE;
    }

    return null;
  }

  /**
   * Ensure voices are loaded with timeout
   */
  async ensureVoicesLoaded(): Promise<void> {
    return new Promise((resolve) => {
      const voices = speechSynthesis.getVoices();
      if (voices.length > 0) {
        this.voicesLoaded = true;
        resolve();
        return;
      }

      const handler = () => {
        const voices = speechSynthesis.getVoices();
        if (voices.length > 0) {
          this.voicesLoaded = true;
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
   * Get the preferred voice for speech synthesis
   */
  private getPreferredVoice(): SpeechSynthesisVoice | null {
    const voices = speechSynthesis.getVoices();
    return voices.find(voice => voice.lang === PREFERRED_VOICE_LANG) || null;
  }

  /**
   * Speak the given text with optional callbacks
   */
  speak(
    text: string,
    callbacks?: {
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (event: SpeechSynthesisErrorEvent) => void;
    }
  ): void {
    // Stop any current playback
    if (this.isPlaying) {
      speechSynthesis.cancel();
      this.isPlaying = false;
    }

    // Create utterance
    const utterance = new SpeechSynthesisUtterance(text);
    this.currentUtterance = utterance;

    // Configure voice
    const voice = this.getPreferredVoice();
    if (voice) {
      utterance.voice = voice;
    }

    utterance.lang = PREFERRED_VOICE_LANG;
    utterance.rate = DEFAULT_SPEECH_RATE;

    // Set up event handlers
    utterance.onstart = () => {
      this.isPlaying = true;
      callbacks?.onStart?.();
    };

    utterance.onend = () => {
      this.isPlaying = false;
      callbacks?.onEnd?.();
    };

    utterance.onerror = (event) => {
      this.isPlaying = false;
      callbacks?.onError?.(event);
    };

    // Fallback timeout for unreliable onend event
    setTimeout(() => {
      if (this.isPlaying) {
        this.isPlaying = false;
        callbacks?.onEnd?.();
      }
    }, SPEECH_FALLBACK_TIMEOUT_MS);

    speechSynthesis.speak(utterance);
  }

  /**
   * Stop any current speech playback
   */
  stop(): void {
    if (this.isPlaying) {
      speechSynthesis.cancel();
      this.isPlaying = false;
      this.currentUtterance = null;
    }
  }

  /**
   * Check if voices are loaded
   */
  areVoicesLoaded(): boolean {
    return this.voicesLoaded;
  }

  /**
   * Check if currently playing
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

// Export singleton instance
export const speechService = new SpeechService();
