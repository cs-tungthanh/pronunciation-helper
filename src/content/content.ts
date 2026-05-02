const POPUP_CLASS = 'elang-pronunciation-popup';
const DICTIONARY_API = 'https://api.dictionaryapi.dev/api/v2/entries/en';

let currentPopup: HTMLElement | null = null;
let currentUtterance: SpeechSynthesisUtterance | null = null;
let isPlaying = false;
let voicesLoaded = false;

/**
 * Get the selected text from the page
 */
function getSelectedText(): string {
  const selection = window.getSelection();
  return selection ? selection.toString().trim() : '';
}

/**
 * Check if text is a single word (no spaces or punctuation except hyphens/apostrophes)
 */
function isSingleWord(text: string): boolean {
  return /^[a-zA-Z'-]+$/.test(text);
}

/**
 * Common English contractions mapped to their expanded forms
 */
const CONTRACTIONS: Record<string, string> = {
  // Negations
  "aren't": "are not",
  "can't": "cannot",
  "couldn't": "could not",
  "didn't": "did not",
  "doesn't": "does not",
  "don't": "do not",
  "hadn't": "had not",
  "hasn't": "has not",
  "haven't": "have not",
  "isn't": "is not",
  "mightn't": "might not",
  "mustn't": "must not",
  "needn't": "need not",
  "shan't": "shall not",
  "shouldn't": "should not",
  "wasn't": "was not",
  "weren't": "were not",
  "won't": "will not",
  "wouldn't": "would not",

  // Pronouns + be
  "i'm": "I am",
  "you're": "you are",
  "he's": "he is",
  "she's": "she is",
  "it's": "it is",
  "we're": "we are",
  "they're": "they are",
  "that's": "that is",
  "there's": "there is",
  "here's": "here is",
  "who's": "who is",
  "what's": "what is",
  "where's": "where is",

  // Pronouns + will
  "i'll": "I will",
  "you'll": "you will",
  "he'll": "he will",
  "she'll": "she will",
  "it'll": "it will",
  "we'll": "we will",
  "they'll": "they will",
  "that'll": "that will",

  // Pronouns + have
  "i've": "I have",
  "you've": "you have",
  "we've": "we have",
  "they've": "they have",

  // Pronouns + would/had
  "i'd": "I would",
  "you'd": "you would",
  "he'd": "he would",
  "she'd": "she would",
  "it'd": "it would",
  "we'd": "we would",
  "they'd": "they would",

  // Other common contractions
  "let's": "let us",
  "ma'am": "madam",
  "o'clock": "of the clock",
  "y'all": "you all",
};

/**
 * Expand contractions in text
 */
function expandContractions(text: string): string {
  let expanded = text;

  // Replace each contraction (case-insensitive)
  Object.keys(CONTRACTIONS).forEach(contraction => {
    const expansion = CONTRACTIONS[contraction];
    const regex = new RegExp(`\\b${contraction}\\b`, 'gi');
    expanded = expanded.replace(regex, expansion);
  });

  return expanded;
}

/**
 * Extract words from text (removing punctuation)
 */
function extractWords(text: string): string[] {
  // First expand contractions
  const expandedText = expandContractions(text);

  // Split by spaces and remove punctuation, keep only letter-based words
  return expandedText
    .split(/\s+/)
    .map(word => word.replace(/[^a-zA-Z'-]/g, ''))
    .filter(word => word.length > 0);
}

/**
 * Fetch IPA phonetic transcription from dictionary API
 */
async function fetchIPA(word: string): Promise<string | null> {
  try {
    const response = await fetch(`${DICTIONARY_API}/${encodeURIComponent(word.toLowerCase())}`);
    if (!response.ok) return null;

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    // Try to get phonetic from various places in the response
    const entry = data[0];

    // First try: phonetic at root level
    if (entry.phonetic) return entry.phonetic;

    // Second try: phonetics array
    if (entry.phonetics && Array.isArray(entry.phonetics)) {
      for (const phonetic of entry.phonetics) {
        if (phonetic.text) return phonetic.text;
      }
    }

    return null;
  } catch (error) {
    console.error('Failed to fetch IPA:', error);
    return null;
  }
}

/**
 * Fetch IPA for multiple words in parallel
 */
async function fetchIPAForWords(text: string): Promise<Array<{ word: string; ipa: string | null }>> {
  const words = extractWords(text);

  // Deduplicate words (case-insensitive) while preserving first occurrence case
  const uniqueWords = new Map<string, string>();
  words.forEach(word => {
    const lowerWord = word.toLowerCase();
    if (!uniqueWords.has(lowerWord)) {
      uniqueWords.set(lowerWord, word);
    }
  });

  // Fetch IPA for unique words in parallel
  const ipaPromises = Array.from(uniqueWords.entries()).map(async ([lowerWord, displayWord]) => ({
    word: displayWord,
    ipa: await fetchIPA(lowerWord)
  }));

  return Promise.all(ipaPromises);
}

/**
 * Get cursor position from selection
 */
function getSelectionPosition(): { x: number; y: number } | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  return {
    x: rect.left + rect.width / 2,
    y: rect.bottom + window.scrollY,
  };
}

/**
 * Make an element draggable
 */
function makeDraggable(element: HTMLElement, handle: HTMLElement): void {
  let isDragging = false;
  let currentX = 0;
  let currentY = 0;
  let initialX = 0;
  let initialY = 0;

  const dragStart = (e: MouseEvent) => {
    // Don't start dragging if clicking the close button
    const target = e.target as HTMLElement;
    if (target.classList.contains('elang-popup-close-button')) {
      return;
    }

    // Get initial mouse position
    initialX = e.clientX;
    initialY = e.clientY;

    // Get current element position
    const rect = element.getBoundingClientRect();
    currentX = rect.left;
    currentY = rect.top;

    isDragging = true;

    // Prevent text selection while dragging
    e.preventDefault();
  };

  const drag = (e: MouseEvent) => {
    if (!isDragging) return;

    e.preventDefault();

    // Calculate new position
    const dx = e.clientX - initialX;
    const dy = e.clientY - initialY;

    const newX = currentX + dx;
    const newY = currentY + dy;

    // Update element position
    element.style.left = `${newX}px`;
    element.style.top = `${newY}px`;
  };

  const dragEnd = () => {
    isDragging = false;
  };

  // Add event listeners
  handle.addEventListener('mousedown', dragStart);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', dragEnd);

  // Clean up listeners when popup is removed
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.removedNodes.forEach((node) => {
        if (node === element) {
          document.removeEventListener('mousemove', drag);
          document.removeEventListener('mouseup', dragEnd);
          observer.disconnect();
        }
      });
    });
  });

  if (element.parentNode) {
    observer.observe(element.parentNode, { childList: true });
  }
}

/**
 * Create the popup element with text and play button
 */
function createPopup(
  text: string,
  error: string | null,
  ipaData: Array<{ word: string; ipa: string | null }> | null = null
): HTMLElement {
  const popup = document.createElement('div');
  popup.className = POPUP_CLASS;

  // Drag handle header
  const dragHandle = document.createElement('div');
  dragHandle.className = 'elang-popup-drag-handle';
  dragHandle.textContent = '⋮⋮';
  dragHandle.title = 'Drag to move';
  popup.appendChild(dragHandle);

  // Close button
  const closeButton = document.createElement('button');
  closeButton.className = 'elang-popup-close-button';
  closeButton.textContent = '×';
  closeButton.title = 'Close';
  closeButton.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent drag from triggering
    removePopup();
  });
  dragHandle.appendChild(closeButton);

  // Make popup draggable
  makeDraggable(popup, dragHandle);

  // Content wrapper for scrolling
  const contentWrapper = document.createElement('div');
  contentWrapper.className = 'elang-popup-content-wrapper';
  popup.appendChild(contentWrapper);

  // Display text
  const textDiv = document.createElement('div');
  textDiv.className = 'elang-popup-text';
  textDiv.textContent = text;
  contentWrapper.appendChild(textDiv);

  // IPA phonetic transcription for words
  if (ipaData && ipaData.length > 0) {
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

    // Only add container if at least one word has IPA
    if (ipaContainer.children.length > 0) {
      contentWrapper.appendChild(ipaContainer);
    }
  }

  // Error message
  if (error) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'elang-popup-error';
    errorDiv.textContent = error;
    contentWrapper.appendChild(errorDiv);
  }

  // Play button (only if no error)
  if (!error) {
    const playButton = document.createElement('button');
    playButton.className = 'elang-play-button';

    if (!voicesLoaded) {
      playButton.textContent = 'Loading...';
      playButton.disabled = true;

      // Enable when voices load
      const enableButton = () => {
        if (voicesLoaded) {
          playButton.textContent = 'Play';
          playButton.disabled = false;
        }
      };

      // Check periodically
      const checkInterval = setInterval(() => {
        if (voicesLoaded) {
          enableButton();
          clearInterval(checkInterval);
        }
      }, 100);

      // Clean up if popup is removed before voices load
      setTimeout(() => clearInterval(checkInterval), 5000);
    } else {
      playButton.textContent = 'Play';
    }

    playButton.addEventListener('click', () => handlePlay(text, playButton));
    contentWrapper.appendChild(playButton);
  }

  return popup;
}

/**
 * Position the popup near the cursor with smart repositioning
 */
function positionPopup(popup: HTMLElement, position: { x: number; y: number }): void {
  const offset = 10; // pixels below selection
  let left = position.x;
  let top = position.y + offset;

  // Temporarily position to measure dimensions
  popup.style.left = '0px';
  popup.style.top = '0px';
  document.body.appendChild(popup);

  const popupRect = popup.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Adjust horizontal position if off-screen
  if (left + popupRect.width > viewportWidth) {
    left = viewportWidth - popupRect.width - 10;
  }
  if (left < 10) {
    left = 10;
  }

  // Adjust vertical position if off-screen
  if (top + popupRect.height > window.scrollY + viewportHeight) {
    // Position above selection instead
    top = position.y - popupRect.height - offset;
  }

  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
}

/**
 * Handle play button click - play or restart pronunciation
 */
function handlePlay(text: string, button: HTMLButtonElement): void {
  console.log('[Elang] Play button clicked');

  // Force reload voices
  const voices = speechSynthesis.getVoices();
  console.log('[Elang] Available voices:', voices.length);

  if (voices.length === 0) {
    console.log('[Elang] No voices available');
    button.textContent = 'Loading...';
    button.disabled = true;
    return;
  }

  // If already playing, stop and restart
  if (isPlaying && currentUtterance) {
    console.log('[Elang] Stopping current playback');
    speechSynthesis.cancel();
    isPlaying = false;
  }

  // Change button to voicing immediately for feedback
  button.textContent = 'Voicing';
  isPlaying = true;

  // Create new utterance
  const utterance = new SpeechSynthesisUtterance(text);
  currentUtterance = utterance;

  // Get en-US voice
  const enUSVoice = voices.find(voice => voice.lang === 'en-US');
  if (enUSVoice) {
    utterance.voice = enUSVoice;
    console.log('[Elang] Using voice:', enUSVoice.name);
  } else {
    console.log('[Elang] No en-US voice found, using default');
  }

  utterance.lang = 'en-US';
  utterance.rate = 1.0;

  // Update button state during playback
  utterance.onstart = () => {
    console.log('[Elang] Speech started');
    isPlaying = true;
    button.textContent = 'Voicing';
  };

  utterance.onend = () => {
    console.log('[Elang] Speech ended');
    isPlaying = false;
    button.textContent = 'Play';
  };

  utterance.onerror = (event) => {
    console.error('[Elang] Speech error:', event);
    isPlaying = false;
    button.textContent = 'Play';
  };

  // Fallback: reset button after 10 seconds if onend never fires
  setTimeout(() => {
    if (isPlaying && button.textContent === 'Voicing') {
      console.log('[Elang] Fallback timeout triggered');
      isPlaying = false;
      button.textContent = 'Play';
    }
  }, 10000);

  console.log('[Elang] Calling speechSynthesis.speak()');
  speechSynthesis.speak(utterance);
}

/**
 * Remove the current popup and stop any playing audio
 */
function removePopup(): void {
  if (currentPopup) {
    currentPopup.remove();
    currentPopup = null;
  }

  if (isPlaying) {
    speechSynthesis.cancel();
    isPlaying = false;
    currentUtterance = null;
  }
}

/**
 * Check if Web Speech API is available and has en-US voice
 */
function checkSpeechSupport(): string | null {
  if (!('speechSynthesis' in window)) {
    return 'Speech synthesis not supported in this browser';
  }

  const voices = speechSynthesis.getVoices();
  const hasEnUSVoice = voices.some(voice => voice.lang === 'en-US');

  if (voices.length > 0 && !hasEnUSVoice) {
    return 'No en-US voice available';
  }

  return null; // No error
}

/**
 * Show popup for selected text
 */
async function showPopupForSelection(): Promise<void> {
  const selectedText = getSelectedText();
  if (!selectedText) return;

  // Don't show popup if selection is inside the current popup
  if (currentPopup) {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer;
      const containerElement = container.nodeType === Node.ELEMENT_NODE
        ? container as Element
        : container.parentElement;

      if (containerElement && currentPopup.contains(containerElement)) {
        return; // Selection is inside popup, don't create new popup
      }
    }
  }

  // Remove old popup if exists
  removePopup();

  // Check for speech support
  const error = checkSpeechSupport();

  // Get cursor position
  const position = getSelectionPosition();
  if (!position) return;

  // Fetch IPA for all words in the selection
  const ipaData = await fetchIPAForWords(selectedText);

  // Create and position popup
  const popup = createPopup(selectedText, error, ipaData);
  positionPopup(popup, position);

  currentPopup = popup;
}

/**
 * Handle click outside popup to dismiss
 */
function handleDocumentClick(event: MouseEvent): void {
  if (!currentPopup) return;

  const target = event.target as HTMLElement;
  if (!currentPopup.contains(target)) {
    removePopup();
  }
}

/**
 * Load and cache voices
 */
function loadVoices(): void {
  const voices = speechSynthesis.getVoices();
  if (voices.length > 0) {
    voicesLoaded = true;
    console.log('[Elang] Voices loaded:', voices.length);
  }
}

/**
 * Ensure voices are loaded with retry
 */
async function ensureVoicesLoaded(): Promise<void> {
  return new Promise((resolve) => {
    const voices = speechSynthesis.getVoices();
    if (voices.length > 0) {
      voicesLoaded = true;
      resolve();
      return;
    }

    // Wait for voiceschanged event
    const handler = () => {
      const voices = speechSynthesis.getVoices();
      if (voices.length > 0) {
        voicesLoaded = true;
        speechSynthesis.removeEventListener('voiceschanged', handler);
        resolve();
      }
    };

    speechSynthesis.addEventListener('voiceschanged', handler);

    // Timeout after 3 seconds
    setTimeout(() => {
      speechSynthesis.removeEventListener('voiceschanged', handler);
      resolve();
    }, 3000);
  });
}

/**
 * Initialize the extension
 */
async function init(): Promise<void> {
  // Ensure voices are loaded
  await ensureVoicesLoaded();

  // Keep listening for voice changes
  speechSynthesis.addEventListener('voiceschanged', loadVoices);

  // Listen for text selection
  document.addEventListener('mouseup', (event) => {
    // Don't trigger if clicking inside the popup
    if (currentPopup) {
      const target = event.target as HTMLElement;
      if (currentPopup.contains(target)) {
        return; // Clicked inside popup, don't create new one
      }
    }

    // Small delay to ensure selection is complete
    setTimeout(showPopupForSelection, 10);
  });

  // Listen for clicks to dismiss popup
  document.addEventListener('mousedown', handleDocumentClick);
}

// Start the extension
init();
