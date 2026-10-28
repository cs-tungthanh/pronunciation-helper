/**
 * Features for watching YouTube; the content script starts and stops them with the rest of Sayly
 */

import { captionTracker } from './caption-tracker';
import { captionAutoload } from './caption-autoload';
import { sentenceShortcuts } from './sentence-shortcuts';
import { playerPanel } from './player-panel';
import { isYouTubeSite } from './youtube-page';

/**
 * A YouTube feature. start() runs once on youtube.com, whatever page is open, because YouTube
 * moves between pages without reloading; each feature checks the page it needs when it acts.
 */
export interface YouTubeFeature {
  start(): void;
  stop(): void;
}

// Add new features here; the caption tracker comes first, since the others read captions from it
const FEATURES: readonly YouTubeFeature[] = [captionTracker, captionAutoload, sentenceShortcuts, playerPanel];

let started = false;

/**
 * Start the YouTube features when this page is on YouTube
 */
export function startYouTubeFeatures(): void {
  if (started || !isYouTubeSite()) return;
  started = true;
  FEATURES.forEach(feature => feature.start());
}

/**
 * Stop the YouTube features (Sayly was turned off for the site, or the extension reloaded)
 */
export function stopYouTubeFeatures(): void {
  if (!started) return;
  started = false;
  FEATURES.forEach(feature => feature.stop());
}
