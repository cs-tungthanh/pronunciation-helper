/**
 * Features for watching YouTube; the content script starts and stops them with the rest of Sayly
 */

import { seekShortcuts } from './seek-shortcuts';
import { isYouTubeSite } from './youtube-page';

/**
 * A YouTube feature. start() runs once on youtube.com, whatever page is open, because YouTube
 * moves between pages without reloading; each feature checks the page it needs when it acts.
 */
export interface YouTubeFeature {
  start(): void;
  stop(): void;
}

// Add new features here
const FEATURES: readonly YouTubeFeature[] = [seekShortcuts];

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
