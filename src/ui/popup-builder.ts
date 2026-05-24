/**
 * Build popup DOM elements with IPA and speech controls
 */

import { IpaResult } from '../api/dictionary-api';
import { POPUP_CSS_CLASS, VOICE_CHECK_INTERVAL_MS, VOICE_CHECK_TIMEOUT_MS } from '../constants/app-constants';
import { UI_LABELS } from '../constants/messages';
import { makeDraggable } from './draggable';
import { speechService } from '../speech/speech-service';

/**
 * Create the popup element with IPA display and playback controls
 */
export function createPopup(
  text: string,
  error: string | null,
  ipaData: IpaResult[] | null = null,
  onClose: () => void
): HTMLElement {
  const popup = document.createElement('div');
  popup.className = POPUP_CSS_CLASS;

  // Drag handle header
  const dragHandle = createDragHandle(onClose);
  popup.appendChild(dragHandle);

  // Make popup draggable
  makeDraggable(popup, dragHandle);

  // Content wrapper for scrolling
  const contentWrapper = document.createElement('div');
  contentWrapper.className = 'elang-popup-content-wrapper';
  popup.appendChild(contentWrapper);

  // Display text
  contentWrapper.appendChild(createTextDisplay(text));

  // IPA phonetic transcription
  if (ipaData && ipaData.length > 0) {
    const ipaContainer = createIpaContainer(ipaData);
    if (ipaContainer) {
      contentWrapper.appendChild(ipaContainer);
    }
  }

  // Error message
  if (error) {
    contentWrapper.appendChild(createErrorDisplay(error));
  }

  // Play button (only if no error)
  if (!error) {
    contentWrapper.appendChild(createPlayButton(text));
  }

  return popup;
}

/**
 * Create drag handle with close button
 */
function createDragHandle(onClose: () => void): HTMLElement {
  const dragHandle = document.createElement('div');
  dragHandle.className = 'elang-popup-drag-handle';
  dragHandle.textContent = UI_LABELS.DRAG_HANDLE;
  dragHandle.title = UI_LABELS.DRAG_TOOLTIP;

  const closeButton = document.createElement('button');
  closeButton.className = 'elang-popup-close-button';
  closeButton.textContent = UI_LABELS.CLOSE_BUTTON;
  closeButton.title = UI_LABELS.CLOSE_TOOLTIP;
  closeButton.addEventListener('click', (e) => {
    e.stopPropagation();
    onClose();
  });
  dragHandle.appendChild(closeButton);

  return dragHandle;
}

/**
 * Create text display element
 */
function createTextDisplay(text: string): HTMLElement {
  const textDiv = document.createElement('div');
  textDiv.className = 'elang-popup-text';
  textDiv.textContent = text;
  return textDiv;
}

/**
 * Create IPA container with word cards
 */
function createIpaContainer(ipaData: IpaResult[]): HTMLElement | null {
  const ipaContainer = document.createElement('div');
  ipaContainer.className = 'elang-popup-ipa-container';

  ipaData.forEach(({ word, ipa }) => {
    if (ipa) {
      const wordIpaDiv = document.createElement('div');
      wordIpaDiv.className = 'elang-popup-ipa-item';

      const wordSpan = document.createElement('span');
      wordSpan.className = 'elang-popup-ipa-word';
      wordSpan.textContent = word;

      const ipaSpan = document.createElement('span');
      ipaSpan.className = 'elang-popup-ipa-text';
      ipaSpan.textContent = ipa;

      wordIpaDiv.appendChild(wordSpan);
      wordIpaDiv.appendChild(ipaSpan);
      ipaContainer.appendChild(wordIpaDiv);
    }
  });

  // Only return if at least one word has IPA
  return ipaContainer.children.length > 0 ? ipaContainer : null;
}

/**
 * Create error display element
 */
function createErrorDisplay(error: string): HTMLElement {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'elang-popup-error';
  errorDiv.textContent = error;
  return errorDiv;
}

/**
 * Create play button with speech synthesis integration
 */
function createPlayButton(text: string): HTMLElement {
  const playButton = document.createElement('button');
  playButton.className = 'elang-play-button';

  if (!speechService.areVoicesLoaded()) {
    playButton.textContent = UI_LABELS.LOADING;
    playButton.disabled = true;

    // Poll for voices to load
    const checkInterval = setInterval(() => {
      if (speechService.areVoicesLoaded()) {
        playButton.textContent = UI_LABELS.PLAY;
        playButton.disabled = false;
        clearInterval(checkInterval);
      }
    }, VOICE_CHECK_INTERVAL_MS);

    // Cleanup timeout
    setTimeout(() => clearInterval(checkInterval), VOICE_CHECK_TIMEOUT_MS);
  } else {
    playButton.textContent = UI_LABELS.PLAY;
  }

  playButton.addEventListener('click', () => {
    speechService.speak(text, {
      onStart: () => {
        playButton.textContent = UI_LABELS.VOICING;
      },
      onEnd: () => {
        playButton.textContent = UI_LABELS.PLAY;
      },
      onError: () => {
        playButton.textContent = UI_LABELS.PLAY;
      }
    });
  });

  return playButton;
}
