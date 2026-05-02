# Pronunciation Helper for Chrome

> A powerful Chrome extension that helps English language learners hear pronunciation and see IPA notation for any text on the web.

[![Chrome Web Store](https://img.shields.io/badge/Chrome-Extension-blue?logo=google-chrome)](https://chrome.google.com/webstore)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

Pronunciation Helper is a Chrome extension designed for English language learners. Simply select any text on a webpage to instantly see IPA (International Phonetic Alphabet) notation and hear native American English pronunciation. Perfect for students, teachers, and anyone learning English!

## Features

### 🎯 Core Features
- **Instant Pronunciation** - Select any word, sentence, or paragraph to hear it spoken
- **IPA Notation** - See phonetic transcription for each word using the International Phonetic Alphabet
- **Smart Contractions** - Automatically expands contractions (doesn't → does + not) for better learning
- **Draggable Popup** - Move the popup anywhere on screen to avoid blocking content
- **No Length Limits** - Works with selections of any size, from single words to entire paragraphs

### 🎨 User Experience
- **Clean Interface** - Minimal, distraction-free popup design
- **Responsive Layout** - Scrollable content for long selections
- **Visual Feedback** - Button states clearly show loading, playing, and ready states
- **Click Prevention** - Smart detection prevents popup from reopening when interacting with it

### 🔊 Audio Features
- **American English** - High-quality en-US pronunciation using Web Speech API
- **Replay Support** - Click "Voicing" to restart audio during playback
- **Reliable Playback** - Works offline with browser's built-in voices
- **Auto-cleanup** - Audio stops when popup is dismissed

### 📖 Learning Features
- **Word-by-Word IPA** - Each word gets its own pronunciation card
- **Compact Display** - Scrollable IPA container shows ~2 lines at a time
- **Copy-Friendly** - Select and copy IPA text without triggering new popups
- **Context Aware** - Won't create new popups when selecting text inside the current one

## Screenshots

<!-- Add screenshots here -->
![Popup with IPA](screenshots/popup-example.png)
![Dragging the popup](screenshots/dragging.png)

## Installation

### For Users (Chrome Web Store)

1. Visit the [Chrome Web Store](https://chrome.google.com/webstore) (link coming soon)
2. Click "Add to Chrome"
3. Grant necessary permissions
4. Start selecting text on any webpage!

### For Developers (Local Installation)

1. Clone this repository:
   ```bash
   git clone https://github.com/cs-tungthanh/pronunciation-helper.git
   cd pronunciation-helper
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

4. Load in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select the `dist/` directory

## Usage Guide

### Basic Usage

1. **Select Text** - Highlight any text on a webpage
2. **View Popup** - Popup appears automatically near your selection
3. **See IPA** - Scroll through phonetic notations for each word
4. **Play Audio** - Click the "Play" button to hear pronunciation
5. **Move Popup** - Drag the top bar (⋮⋮) to reposition
6. **Dismiss** - Click outside the popup to close it

### Tips

- **Long Selections**: Popup content scrolls automatically for long text
- **Replay**: Click "Voicing" during playback to restart
- **Copy IPA**: Select IPA text to copy without triggering new popup
- **No Distraction**: Drag popup out of the way to see underlying content

## Development

### Project Structure

```
pronunciation-helper/
├── src/
│   ├── content/
│   │   ├── content.ts          # Main extension logic
│   │   └── popup.css           # Popup styling
│   └── icons/
│       ├── icon.png            # Source icon (1024x1024)
│       ├── icon16.png          # 16x16 icon
│       ├── icon48.png          # 48x48 icon
│       └── icon128.png         # 128x128 icon
├── dist/                       # Built extension (gitignored)
├── manifest.json               # Extension manifest (V3)
├── package.json
├── tsconfig.json
├── vite.config.ts             # Build configuration
├── CONTEXT.md                 # Domain glossary
├── LICENSE                    # MIT License
└── README.md
```

### Scripts

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Build and watch for changes
npm run dev

# Type check
npm run type-check
```

### Tech Stack

- **TypeScript** - Type-safe development
- **Vite** - Fast build tooling
- **Web Speech API** - Browser-native text-to-speech
- **Free Dictionary API** - IPA phonetic data
- **Manifest V3** - Latest Chrome extension standard

### Key Technologies

**Speech Synthesis**
- Uses browser's built-in `speechSynthesis` API
- Prefers Google en-US voices when available
- Falls back to system voices
- No external API calls for audio

**IPA Data**
- Fetched from [Free Dictionary API](https://dictionaryapi.dev/)
- Parallel requests for multiple words
- Automatic deduplication
- Graceful handling of missing data

**Contraction Expansion**
- 70+ common contractions supported
- Case-insensitive matching
- Improves IPA coverage for casual text

## Architecture

### Extension Components

1. **Content Script** (`content.ts`)
   - Injected into all web pages
   - Listens for text selection events
   - Creates and manages popup
   - Handles speech synthesis

2. **Popup UI** (`popup.css`)
   - Draggable floating interface
   - Responsive scrolling
   - Visual states and feedback

3. **Manifest** (`manifest.json`)
   - Minimal permissions (`activeTab`, `scripting`)
   - Content script injection
   - Chrome extension metadata

### Data Flow

```
User selects text
    ↓
Extract words & expand contractions
    ↓
Fetch IPA data in parallel (Free Dictionary API)
    ↓
Create popup with IPA cards
    ↓
User clicks Play
    ↓
Load voices & create utterance
    ↓
Play audio via Web Speech API
```

## Publishing to Chrome Web Store

### Prerequisites

1. **Developer Account** - $5 one-time registration fee
2. **Extension Icon** - Create 128x128 PNG at `src/icons/icon128.png`
3. **Screenshots** - At least one 1280x800 or 640x400 image
4. **Privacy Policy** - Required if collecting data (this extension doesn't)

### Publishing Steps

1. **Prepare Assets**
   ```bash
   # Create icon (use your favorite tool)
   # Add to src/icons/icon128.png

   # Rebuild with icon
   npm run build
   ```

2. **Create Package**
   ```bash
   cd dist
   zip -r ../pronunciation-helper.zip .
   cd ..
   ```

3. **Upload to Chrome Web Store**
   - Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
   - Click "New Item"
   - Upload `pronunciation-helper.zip`
   - Fill out store listing (see below)
   - Submit for review

### Store Listing Content

**Description** (see below for suggested text)

**Category**: Accessibility or Education

**Language**: English

**Privacy Practices**:
- No data collection
- No user data storage
- No third-party sharing

## Suggested GitHub Repository Names

1. **pronunciation-helper-chrome** ⭐ (Recommended)
   - Clear, descriptive
   - Includes platform name
   - Good SEO

2. **english-ipa-extension**
   - Emphasizes IPA feature
   - Shorter
   - Educational focus

3. **speak-easy-chrome**
   - Catchy name
   - Easy to remember
   - Friendly tone

4. **voice-learn-assistant**
   - Generic but clear
   - Learning-focused

5. **word-pronounce-helper**
   - Straightforward
   - Action-oriented

**Recommendation**: `pronunciation-helper-chrome`

## Contributing

Contributions are welcome! Here's how you can help:

### Reporting Issues

- Use the GitHub issue tracker
- Include Chrome version
- Provide steps to reproduce
- Include console logs if applicable

### Submitting Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly
5. Commit with clear messages
6. Push to your fork
7. Open a Pull Request

### Development Guidelines

- Write TypeScript with strict type checking
- Follow existing code style
- Test on multiple websites
- Update documentation
- Keep commits atomic and well-described

## Roadmap

Future enhancements being considered:

- [ ] British English pronunciation option
- [ ] Keyboard shortcut to trigger popup
- [ ] Settings page (accent, speed, voice selection)
- [ ] Definition tooltips
- [ ] Export/save pronunciations
- [ ] Dark mode support
- [ ] Multiple language support
- [ ] Offline IPA dictionary

## FAQ

**Q: Why doesn't it work for some words?**
A: The Free Dictionary API has limited coverage. Common words usually have IPA data, but specialized vocabulary may not be available.

**Q: Can I use a different voice?**
A: Currently uses the first available en-US voice. Future versions will add voice selection.

**Q: Does it work offline?**
A: Audio works offline using browser voices. IPA data requires internet connection.

**Q: Why does the button blink sometimes?**
A: Voices may not be fully loaded. Wait a moment and try again, or refresh the page.

**Q: Can I change the pronunciation speed?**
A: Not currently. This feature may be added in a future update.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Free Dictionary API](https://dictionaryapi.dev/) for IPA phonetic data
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API) for text-to-speech
- All the language learners who inspired this project

## Support

If you find this extension helpful:
- ⭐ Star this repository
- 🐛 Report bugs and suggest features
- 📢 Share with other English learners
- ☕ [Buy me a coffee](https://buymeacoffee.com/yourname) (optional)

---

**Made with ❤️ for English language learners worldwide**
