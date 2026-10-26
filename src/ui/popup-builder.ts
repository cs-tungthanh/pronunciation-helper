/**
 * Build popup DOM elements with clickable words and speech controls
 */

import { requestWordIpa } from '../api/ipa-client';
import type { DictionaryEntry, TranslationResult } from '../api/translate-api';
import {
  POPUP_CSS_CLASS,
  WORD_BUBBLE_GAP_PX,
  DICTIONARY_LOOKUP_URL
} from '../constants/app-constants';
import { UI_LABELS } from '../constants/messages';
import { makeDraggable } from './draggable';
import { ICONS, createIcon, setButtonIcon } from './icons';
import { speechService } from '../speech/speech-service';

// A word, allowing inner apostrophes (straight or curly) and hyphens: "it's", "well-known"
const WORD_PATTERN = /([A-Za-z]+(?:['’-][A-Za-z]+)*)/;
// The whole selection is one word, ignoring punctuation around it: "hello," → "hello"
const SINGLE_WORD_PATTERN = new RegExp(`^[^A-Za-z]*${WORD_PATTERN.source}[^A-Za-z]*$`);

/**
 * Popup element plus setters for content that arrives after it is shown
 */
export interface PronunciationPopup {
  element: HTMLElement;
  setTranslation: (translation: TranslationResult | null) => void;
}

/**
 * Create the popup element with a loading placeholder for the translation
 */
export function createPopup(text: string, onClose: () => void): PronunciationPopup {
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

  const singleWord = text.match(SINGLE_WORD_PATTERN)?.[1];
  if (singleWord) {
    // One word: show its IPA, play and dictionary link inline, like the word bubble
    contentWrapper.appendChild(createWordHeader(singleWord));
  } else {
    // Several words: each word opens its pronunciation bubble
    const wordBubble = createWordBubble(popup);
    const textDisplay = createTextDisplay(text, wordBubble.toggle);
    const sourceRow = document.createElement('div');
    sourceRow.className = 'elang-popup-source';
    sourceRow.appendChild(textDisplay);

    // Play button beside the text
    sourceRow.appendChild(createPlayButton(text));
    contentWrapper.appendChild(sourceRow);

    // The bubble is anchored to a word, so it closes when the word scrolls away
    textDisplay.addEventListener('scroll', wordBubble.close);
    contentWrapper.addEventListener('scroll', wordBubble.close);

    // Clicking anywhere else in the popup dismisses the bubble
    popup.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.elang-popup-word, .elang-popup-word-bubble')) {
        wordBubble.close();
      }
    });
  }

  // Placeholder keeps the layout stable while the translation is in flight
  const translationSlot = createSkeleton('elang-popup-skeleton-translation');
  contentWrapper.appendChild(translationSlot);

  return {
    element: popup,
    setTranslation: (translation) => {
      replaceSlot(translationSlot, translation ? createTranslationDisplay(translation) : null);
    }
  };
}

/**
 * Swap a placeholder for its loaded content, or drop it when there is none
 */
function replaceSlot(slot: HTMLElement, content: HTMLElement | null): void {
  if (content) {
    slot.replaceWith(content);
  } else {
    slot.remove();
  }
}

/**
 * Create a pulsing placeholder block
 */
function createSkeleton(variantClass: string): HTMLElement {
  const skeleton = document.createElement('div');
  skeleton.className = `elang-popup-skeleton ${variantClass}`;
  return skeleton;
}

/**
 * Create drag handle with close button
 */
function createDragHandle(onClose: () => void): HTMLElement {
  const dragHandle = document.createElement('div');
  dragHandle.className = 'elang-popup-drag-handle';
  dragHandle.appendChild(createIcon(ICONS.DRAG, 14));
  dragHandle.title = UI_LABELS.DRAG_TOOLTIP;

  const closeButton = document.createElement('button');
  closeButton.className = 'elang-popup-close-button';
  setButtonIcon(closeButton, ICONS.CLOSE, 14, UI_LABELS.CLOSE_TOOLTIP);
  closeButton.addEventListener('click', (e) => {
    e.stopPropagation();
    onClose();
  });
  dragHandle.appendChild(closeButton);

  return dragHandle;
}

/**
 * Create text display where every word is clickable; punctuation and spacing stay as plain text
 */
function createTextDisplay(text: string, onWordClick: (wordElement: HTMLElement) => void): HTMLElement {
  const textDiv = document.createElement('div');
  textDiv.className = 'elang-popup-text';

  // split() with a capture group keeps the words at odd indexes
  text.split(WORD_PATTERN).forEach((part, index) => {
    if (!part) return;

    if (index % 2 === 0) {
      textDiv.appendChild(document.createTextNode(part));
      return;
    }

    const wordSpan = document.createElement('span');
    wordSpan.className = 'elang-popup-word';
    wordSpan.textContent = part;
    wordSpan.title = UI_LABELS.WORD_TOOLTIP;
    wordSpan.tabIndex = 0;
    wordSpan.setAttribute('role', 'button');
    wordSpan.addEventListener('click', () => onWordClick(wordSpan));
    wordSpan.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onWordClick(wordSpan);
      }
    });
    textDiv.appendChild(wordSpan);
  });

  return textDiv;
}

/**
 * Create a link that opens a word on Dictionary.com in a new tab
 */
function createDictionaryLink(className: string, iconSize: number, word?: string): HTMLAnchorElement {
  const link = document.createElement('a');
  link.className = className;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  setButtonIcon(link, ICONS.DICTIONARY, iconSize, UI_LABELS.DICTIONARY_TOOLTIP);
  if (word) link.href = getDictionaryUrl(word);
  return link;
}

/**
 * Dictionary.com page for a word as shown in the text
 */
function getDictionaryUrl(word: string): string {
  return `${DICTIONARY_LOOKUP_URL}${encodeURIComponent(word.replace(/’/g, "'").toLowerCase())}`;
}

/**
 * Create the header for a single selected word: word, IPA, play and dictionary link
 */
function createWordHeader(word: string): HTMLElement {
  const header = document.createElement('div');
  header.className = 'elang-popup-word-header';

  const wordLabel = document.createElement('span');
  wordLabel.className = 'elang-popup-word-header-word';
  wordLabel.textContent = word;

  const ipaLabel = document.createElement('span');
  ipaLabel.className = 'elang-popup-word-header-ipa elang-popup-word-bubble-pending';
  ipaLabel.textContent = UI_LABELS.LOOKING_UP;
  requestWordIpa(word).then((ipa) => {
    ipaLabel.textContent = ipa || UI_LABELS.NO_IPA;
    ipaLabel.classList.remove('elang-popup-word-bubble-pending');
  });

  const details = document.createElement('div');
  details.className = 'elang-popup-word-header-details';
  details.appendChild(wordLabel);
  details.appendChild(ipaLabel);
  header.appendChild(details);

  header.appendChild(createPlayButton(word));
  header.appendChild(createDictionaryLink('elang-play-button', 14, word));

  return header;
}

/**
 * Create the small bubble that shows one word's IPA under the clicked word
 */
function createWordBubble(popup: HTMLElement) {
  const bubble = document.createElement('div');
  bubble.className = 'elang-popup-word-bubble';
  bubble.hidden = true;

  const wordLabel = document.createElement('span');
  wordLabel.className = 'elang-popup-word-bubble-word';

  const ipaLabel = document.createElement('span');
  ipaLabel.className = 'elang-popup-word-bubble-ipa';

  const speakButton = document.createElement('button');
  speakButton.className = 'elang-popup-word-bubble-speak';
  setButtonIcon(speakButton, ICONS.SPEAK, 15, UI_LABELS.PLAY_WORD_TOOLTIP);

  const dictionaryLink = createDictionaryLink('elang-popup-word-bubble-link', 14);

  bubble.appendChild(wordLabel);
  bubble.appendChild(ipaLabel);
  bubble.appendChild(speakButton);
  bubble.appendChild(dictionaryLink);
  popup.appendChild(bubble);

  // Each word is requested once per popup (the background also caches across popups)
  const ipaCache = new Map<string, Promise<string | null>>();
  let activeWord: HTMLElement | null = null;

  speakButton.addEventListener('click', () => {
    if (activeWord?.textContent) speechService.speak(activeWord.textContent);
  });

  const close = () => {
    activeWord?.classList.remove('elang-popup-word-active');
    activeWord = null;
    bubble.hidden = true;
  };

  const position = (wordElement: HTMLElement) => {
    const popupRect = popup.getBoundingClientRect();
    const wordRect = wordElement.getBoundingClientRect();
    const maxLeft = popup.clientWidth - bubble.offsetWidth - WORD_BUBBLE_GAP_PX;

    bubble.style.top = `${wordRect.bottom - popupRect.top + WORD_BUBBLE_GAP_PX}px`;
    bubble.style.left = `${Math.max(WORD_BUBBLE_GAP_PX, Math.min(wordRect.left - popupRect.left, maxLeft))}px`;
  };

  const open = (wordElement: HTMLElement) => {
    const word = wordElement.textContent || '';
    const key = word.toLowerCase();

    activeWord?.classList.remove('elang-popup-word-active');
    activeWord = wordElement;
    wordElement.classList.add('elang-popup-word-active');

    wordLabel.textContent = word;
    dictionaryLink.href = getDictionaryUrl(word);
    ipaLabel.textContent = UI_LABELS.LOOKING_UP;
    ipaLabel.classList.add('elang-popup-word-bubble-pending');
    bubble.hidden = false;
    position(wordElement);

    if (!ipaCache.has(key)) ipaCache.set(key, requestWordIpa(word));
    ipaCache.get(key)!.then((ipa) => {
      // Ignore results for a word the user has already moved away from
      if (activeWord !== wordElement) return;
      ipaLabel.textContent = ipa || UI_LABELS.NO_IPA;
      ipaLabel.classList.remove('elang-popup-word-bubble-pending');
      position(wordElement);
    });
  };

  const toggle = (wordElement: HTMLElement) => {
    if (activeWord === wordElement) {
      close();
    } else {
      open(wordElement);
    }
  };

  return { toggle, close };
}

/**
 * Create translation display element, with meanings by part of speech for a single word
 */
function createTranslationDisplay(translation: TranslationResult): HTMLElement {
  const translationDiv = document.createElement('div');
  translationDiv.className = 'elang-popup-translation';

  const translationText = document.createElement('div');
  translationText.textContent = translation.text;
  translationDiv.appendChild(translationText);

  if (translation.dictionary.length > 0) {
    translationDiv.appendChild(createDictionaryDisplay(translation.dictionary));
  }

  return translationDiv;
}

/**
 * Create a two-column list: part of speech, then its meanings
 */
function createDictionaryDisplay(entries: DictionaryEntry[]): HTMLElement {
  const dictionary = document.createElement('div');
  dictionary.className = 'elang-popup-dictionary';

  entries.forEach(({ partOfSpeech, meanings }) => {
    const partOfSpeechSpan = document.createElement('span');
    partOfSpeechSpan.className = 'elang-popup-dictionary-pos';
    partOfSpeechSpan.textContent = partOfSpeech;

    const meaningsSpan = document.createElement('span');
    meaningsSpan.className = 'elang-popup-dictionary-meanings';
    meaningsSpan.textContent = meanings.join(', ');

    dictionary.appendChild(partOfSpeechSpan);
    dictionary.appendChild(meaningsSpan);
  });

  return dictionary;
}

/**
 * Create play button that toggles between playing and stopping the selection
 */
function createPlayButton(text: string): HTMLElement {
  const playButton = document.createElement('button');
  playButton.className = 'elang-play-button';

  const showIdle = () => {
    setButtonIcon(playButton, ICONS.SPEAK, 15, UI_LABELS.PLAY_TOOLTIP);
    playButton.classList.remove('elang-play-button-playing');
  };

  const showPlaying = () => {
    setButtonIcon(playButton, ICONS.STOP, 12, UI_LABELS.STOP_TOOLTIP);
    playButton.classList.add('elang-play-button-playing');
  };

  showIdle();

  playButton.addEventListener('click', () => {
    if (playButton.classList.contains('elang-play-button-playing')) {
      speechService.stop();
      showIdle();
      return;
    }

    showPlaying();
    speechService.speak(text, {
      onEnd: showIdle,
      onError: showIdle
    });
  });

  return playButton;
}
