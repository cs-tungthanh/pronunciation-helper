/**
 * A Sayly button in the YouTube player's control bar, opening a panel with Sayly's YouTube
 * settings over the video (so they can be changed without leaving it, in full screen too)
 */

import {
  getYouTubeSeekSeconds,
  saveYouTubeSeekSeconds,
  getYouTubeShortcutsEnabled,
  saveYouTubeShortcutsEnabled
} from '../shared/utils';
import { createIcon, setButtonIcon, ICONS } from '../ui/icons';
import { UI_LABELS } from '../constants/messages';
import {
  MESSAGE_ACTIONS,
  YOUTUBE_SEEK_MIN_SECONDS,
  YOUTUBE_SEEK_MAX_SECONDS
} from '../constants/app-constants';
import { hasCurrentCaptions } from './caption-tracker';
import type { YouTubeFeature } from './youtube-features';

const BUTTON_CLASS = 'elang-yt-button';
const PANEL_CLASS = 'elang-yt-panel';

let button: HTMLButtonElement | null = null;
let panel: HTMLElement | null = null;
let observer: MutationObserver | null = null;
let insertQueued = false;

/**
 * A switch row: label on the left, toggle on the right
 */
function createSwitchRow(label: string, hint: string, checked: boolean, onChange: (checked: boolean) => void): HTMLElement {
  const row = document.createElement('label');
  row.className = 'elang-yt-row';

  const text = document.createElement('span');
  text.className = 'elang-yt-row-text';
  const name = document.createElement('span');
  name.textContent = label;
  const hintElement = document.createElement('span');
  hintElement.className = 'elang-yt-hint';
  hintElement.textContent = hint;
  text.append(name, hintElement);

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.className = 'elang-yt-checkbox';
  input.checked = checked;
  input.addEventListener('change', () => onChange(input.checked));

  row.append(text, input);
  return row;
}

/**
 * The − 2s + stepper for how far the shortcuts skip without captions
 */
function createSecondsRow(seconds: number): HTMLElement {
  const row = document.createElement('div');
  row.className = 'elang-yt-row';

  const name = document.createElement('span');
  name.className = 'elang-yt-row-text';
  name.textContent = UI_LABELS.YT_SKIP_SECONDS;

  const stepper = document.createElement('span');
  stepper.className = 'elang-yt-stepper';
  const value = document.createElement('output');
  value.className = 'elang-yt-stepper-value';
  const less = document.createElement('button');
  const more = document.createElement('button');
  less.type = more.type = 'button';
  setButtonIcon(less, ICONS.LESS, 18, UI_LABELS.YT_SKIP_LESS);
  setButtonIcon(more, ICONS.MORE, 18, UI_LABELS.YT_SKIP_MORE);

  let current = seconds;
  const show = () => {
    value.textContent = `${current}s`;
    less.disabled = current <= YOUTUBE_SEEK_MIN_SECONDS;
    more.disabled = current >= YOUTUBE_SEEK_MAX_SECONDS;
  };
  const step = (by: number) => {
    current = Math.min(Math.max(current + by, YOUTUBE_SEEK_MIN_SECONDS), YOUTUBE_SEEK_MAX_SECONDS);
    show();
    saveYouTubeSeekSeconds(current);
  };
  less.addEventListener('click', () => step(-1));
  more.addEventListener('click', () => step(1));
  show();

  stepper.append(less, value, more);
  row.append(name, stepper);
  return row;
}

/**
 * Build the panel with the settings as they're stored now
 */
async function createPanel(): Promise<HTMLElement> {
  const [enabled, seconds] = await Promise.all([getYouTubeShortcutsEnabled(), getYouTubeSeekSeconds()]);

  const element = document.createElement('div');
  element.className = PANEL_CLASS;
  element.setAttribute('role', 'dialog');
  element.setAttribute('aria-label', UI_LABELS.YT_PANEL_BUTTON);

  const title = document.createElement('p');
  title.className = 'elang-yt-title';
  title.textContent = UI_LABELS.YT_PANEL_TITLE;

  const status = document.createElement('p');
  const ready = hasCurrentCaptions();
  status.className = `elang-yt-status${ready ? ' elang-yt-status-ready' : ''}`;
  status.textContent = ready ? UI_LABELS.YT_CAPTIONS_READY : UI_LABELS.YT_CAPTIONS_MISSING;

  const allSettings = document.createElement('button');
  allSettings.type = 'button';
  allSettings.className = 'elang-yt-link';
  allSettings.textContent = UI_LABELS.YT_ALL_SETTINGS;
  allSettings.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: MESSAGE_ACTIONS.OPEN_OPTIONS });
    closePanel();
  });

  element.append(
    title,
    createSwitchRow(UI_LABELS.YT_SHORTCUTS, UI_LABELS.YT_SHORTCUTS_HINT, enabled, saveYouTubeShortcutsEnabled),
    createSecondsRow(seconds),
    status,
    allSettings
  );

  // Keep clicks and keys inside the panel from reaching the player (which would pause or seek)
  ['click', 'mousedown', 'mouseup', 'pointerdown', 'pointerup', 'dblclick', 'wheel'].forEach(type => {
    element.addEventListener(type, event => event.stopPropagation());
  });
  // Keys pressed in the panel stay out of the player's shortcuts (Escape is handled on the document)
  element.addEventListener('keydown', event => {
    if (event.key !== 'Escape') event.stopPropagation();
  });

  return element;
}

function closePanel(): void {
  panel?.remove();
  panel = null;
  button?.setAttribute('aria-expanded', 'false');
  window.removeEventListener('click', handleOutsideClick, true);
  document.removeEventListener('keydown', handleEscape, true);
}

/**
 * A click outside the panel closes it. On the video it only closes the panel, like the player's
 * own menus, instead of also pausing or playing.
 */
function handleOutsideClick(event: MouseEvent): void {
  const target = event.target as Node;
  if (panel?.contains(target) || button?.contains(target)) return;

  const player = document.getElementById('movie_player');
  const onControls = target instanceof Element && target.closest('.ytp-chrome-bottom');
  if (player?.contains(target) && !onControls) {
    event.preventDefault();
    event.stopPropagation();
  }
  closePanel();
}

function handleEscape(event: KeyboardEvent): void {
  if (event.key !== 'Escape') return;
  // Taken here, so the player doesn't also leave full screen
  event.preventDefault();
  event.stopPropagation();
  const focusWasInside = panel?.contains(document.activeElement);
  closePanel();
  if (focusWasInside) button?.focus();
}

async function togglePanel(): Promise<void> {
  if (panel) {
    closePanel();
    return;
  }

  const player = document.getElementById('movie_player');
  if (!player) return;

  // Rebuilt on each open, so it shows settings changed elsewhere and whether captions arrived
  panel = await createPanel();
  player.appendChild(panel);
  button?.setAttribute('aria-expanded', 'true');
  window.addEventListener('click', handleOutsideClick, true);
  document.addEventListener('keydown', handleEscape, true);
}

function createButton(): HTMLButtonElement {
  const element = document.createElement('button');
  element.type = 'button';
  // ytp-button gives it the size and hover look of the player's own buttons
  element.className = `ytp-button ${BUTTON_CLASS}`;
  element.setAttribute('aria-haspopup', 'dialog');
  element.setAttribute('aria-expanded', 'false');
  element.title = UI_LABELS.YT_PANEL_BUTTON;
  element.setAttribute('aria-label', UI_LABELS.YT_PANEL_BUTTON);
  element.appendChild(createIcon(ICONS.TRIGGER, 24));
  element.addEventListener('click', event => {
    event.stopPropagation();
    togglePanel();
  });
  return element;
}

/**
 * Put the button in the control bar, before the player's settings button, unless it's there
 */
function insertButton(): void {
  insertQueued = false;
  if (button?.isConnected) return;

  const controls = document.querySelector('#movie_player .ytp-right-controls');
  if (!controls) return;

  button ??= createButton();
  // The settings button may sit in a group inside the controls, so insert into whatever holds it
  const settingsButton = controls.querySelector('.ytp-settings-button');
  if (settingsButton?.parentElement) {
    settingsButton.parentElement.insertBefore(button, settingsButton);
  } else {
    controls.prepend(button);
  }
}

export const playerPanel: YouTubeFeature = {
  start() {
    if (observer) return;
    insertButton();
    // The player appears after the page loads and can be rebuilt; put the button back when it goes
    observer = new MutationObserver(() => {
      if (button?.isConnected || insertQueued) return;
      insertQueued = true;
      requestAnimationFrame(insertButton);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  },
  stop() {
    observer?.disconnect();
    observer = null;
    closePanel();
    button?.remove();
  }
};
