/**
 * Load a video's captions with CC off, so the sentence shortcuts work without them on screen
 *
 * The player only fetches captions when CC is on (and Sayly can't fetch them itself; see
 * caption-tracker.ts), so when a video opens with CC off, Sayly hides the caption text, turns CC
 * on until the player has fetched the captions, then turns it back off. When CC is on but the
 * player fetched the captions before Sayly started watching, turning CC off and on again makes it
 * fetch them again. Either way the user's CC choice ends up as it was.
 */

import { cachedSetting } from '../shared/settings-cache';
import { LOG_PREFIX } from '../constants/messages';
import { getYouTubeAutoLoadCaptions } from '../shared/utils';
import {
  CAPTION_AUTOLOAD_TIMEOUT_MS,
  CAPTION_AUTOLOAD_POLL_MS,
  CAPTION_AUTOLOAD_UNHIDE_DELAY_MS
} from '../constants/app-constants';
import { hasCurrentCaptions } from './caption-tracker';
import { getCaptionsButton, getWatchVideoId, isAdShowing, isCaptionsOn } from './youtube-page';
import type { YouTubeFeature } from './youtube-features';

// On the player while captions load, so the stylesheet hides the caption text
const HIDING_CLASS = 'elang-yt-captions-hidden';
// YouTube fires this on the document when it has moved to another page in place
const NAVIGATE_EVENT = 'yt-navigate-finish';
const MEDIA_EVENTS = ['loadeddata', 'playing'];

const readAutoLoad = cachedSetting('youtubeAutoLoadCaptions', getYouTubeAutoLoadCaptions);

// Videos already tried, so a video without captions isn't retried each time it loads data
const triedVideos = new Set<string>();
let loading = false;
let started = false;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Wait until a check passes, or give up after the timeout
 * @returns whether the check passed
 */
async function waitFor(check: () => boolean, timeoutMs = CAPTION_AUTOLOAD_TIMEOUT_MS): Promise<boolean> {
  for (let waited = 0; waited < timeoutMs; waited += CAPTION_AUTOLOAD_POLL_MS) {
    if (check()) return true;
    await sleep(CAPTION_AUTOLOAD_POLL_MS);
  }
  return check();
}

/**
 * Turn CC on or off with the player's button, checking that it took. The player can rebuild its
 * buttons, so the button is looked up again each time.
 * @returns whether CC ended up as asked
 */
async function setCaptions(on: boolean): Promise<boolean> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const button = getCaptionsButton();
    if (!button) return false;
    if (isCaptionsOn() === on) return true;
    button.click();
    if (await waitFor(() => isCaptionsOn() === on, CAPTION_AUTOLOAD_POLL_MS * 5)) return true;
  }
  return isCaptionsOn() === on;
}

async function loadCaptions(): Promise<void> {
  const videoId = getWatchVideoId();
  if (loading || !videoId || triedVideos.has(videoId) || isAdShowing() || hasCurrentCaptions()) return;
  if (!(await readAutoLoad())) return;

  loading = true;
  triedVideos.add(videoId);
  const player = document.getElementById('movie_player');
  const stillHere = () => getWatchVideoId() === videoId;
  let wasOn: boolean | null = null;

  try {
    // The button shows up once the player knows the video's caption tracks
    if (!(await waitFor(() => getCaptionsButton() !== null)) || !stillHere()) return;
    wasOn = isCaptionsOn();

    // With CC on, the player may be fetching the captions right now
    if (wasOn && await waitFor(hasCurrentCaptions, CAPTION_AUTOLOAD_POLL_MS * 10)) return;

    player?.classList.add(HIDING_CLASS);
    if (wasOn) await setCaptions(false);
    if (await setCaptions(true)) {
      await waitFor(() => hasCurrentCaptions() || !stillHere());
    }
  } finally {
    // Put CC back as the user had it
    if (wasOn !== null) await setCaptions(wasOn);
    if (player?.classList.contains(HIDING_CLASS)) {
      await sleep(CAPTION_AUTOLOAD_UNHIDE_DELAY_MS);
      player.classList.remove(HIDING_CLASS);
    }
    loading = false;
  }
}

function handleVideoChange(): void {
  loadCaptions().catch(error => console.debug(`${LOG_PREFIX} Loading captions failed:`, error));
}

export const captionAutoload: YouTubeFeature = {
  start() {
    if (started) return;
    started = true;
    document.addEventListener(NAVIGATE_EVENT, handleVideoChange);
    // Media events don't bubble, but a capturing listener on the document still sees them.
    // A video loading or starting to play (also once an ad ends) is when its captions can load.
    MEDIA_EVENTS.forEach(type => document.addEventListener(type, handleVideoChange, true));
    handleVideoChange();
  },
  stop() {
    started = false;
    document.removeEventListener(NAVIGATE_EVENT, handleVideoChange);
    MEDIA_EVENTS.forEach(type => document.removeEventListener(type, handleVideoChange, true));
  }
};
