# English Pronunciation Extension

A Chrome extension for English language learners to hear pronunciation of words and sentences on any webpage.

## Core Concepts

### Selection
Text highlighted by the user on a webpage. Can be a single word, full sentences, or even multiple paragraphs. The extension responds to any text selection without length limits.

### Pronunciation
Audio playback of the selected text using American English (en-US). Plays at normal speaking speed. Users can restart pronunciation while audio is playing to hear it again immediately - essential for learning contexts where repetition aids retention.

### Popup
The floating UI card that appears near the cursor after selection. Shows the selected text, IPA phonetic transcription for each word, and provides a play button to trigger pronunciation. Dismissed by clicking anywhere outside it. When dismissed, any playing audio stops immediately - dismissal signals the user is done with that learning moment.

### IPA (International Phonetic Alphabet)
Phonetic transcription displayed for each word in the selection. Fetched in parallel from the Free Dictionary API. Each word is shown in a separate blue-tinted card with the word label above and IPA notation below. Words without available IPA data are silently skipped - only words with phonetic data appear. This design works equally well for single words and full sentences, helping learners see pronunciation for every recognizable word in their selection.

**Contraction Expansion:** Before looking up IPA, contractions are automatically expanded to their full forms (e.g., "doesn't" becomes "does not"). This ensures learners see pronunciation for both parts of common contractions, improving coverage and educational value.

## Design Principles

- **Immediate feedback**: Popup appears as soon as text is selected
- **Reliability over quality**: Uses browser's built-in Web Speech API to ensure pronunciation always works, avoiding network dependencies and CORS issues
- **Learning-focused**: Features (replay, dismissal behavior) optimize for language learners who need repetition and focus
- **No limits**: Can handle selections of any length, from single words to entire paragraphs
