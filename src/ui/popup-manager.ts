/**
 * Manage popup lifecycle, positioning, and state
 */

import { POPUP_CSS_CLASS, POPUP_POSITION_OFFSET_PX, POPUP_EDGE_MARGIN_PX } from '../constants/app-constants';
import { speechService } from '../speech/speech-service';

/**
 * Popup state manager
 */
class PopupManager {
  private currentPopup: HTMLElement | null = null;

  /**
   * Position popup near selection with smart boundary detection
   */
  positionPopup(popup: HTMLElement, position: { x: number; y: number }): void {
    let left = position.x;
    let top = position.y + POPUP_POSITION_OFFSET_PX;

    // Temporarily position to measure dimensions
    popup.style.left = '0px';
    popup.style.top = '0px';
    document.body.appendChild(popup);

    const popupRect = popup.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Adjust horizontal position if off-screen
    if (left + popupRect.width > viewportWidth) {
      left = viewportWidth - popupRect.width - POPUP_EDGE_MARGIN_PX;
    }
    if (left < POPUP_EDGE_MARGIN_PX) {
      left = POPUP_EDGE_MARGIN_PX;
    }

    // Adjust vertical position if off-screen (show above selection)
    if (top + popupRect.height > window.scrollY + viewportHeight) {
      top = position.y - popupRect.height - POPUP_POSITION_OFFSET_PX;
    }

    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;
  }

  /**
   * Show a new popup (removes current popup if exists)
   */
  showPopup(popup: HTMLElement, position: { x: number; y: number }): void {
    this.removePopup();

    // Also clear popups left by another copy of this script (e.g. one orphaned by an extension reload)
    document.querySelectorAll(`.${POPUP_CSS_CLASS}`).forEach((stale) => stale.remove());

    this.positionPopup(popup, position);
    this.currentPopup = popup;
  }

  /**
   * Remove the current popup and stop any playing audio
   */
  removePopup(): void {
    if (this.currentPopup) {
      this.currentPopup.remove();
      this.currentPopup = null;
    }

    speechService.stop();
  }

  /**
   * Get current popup element
   */
  getCurrentPopup(): HTMLElement | null {
    return this.currentPopup;
  }

  /**
   * Check if a popup is currently shown
   */
  hasPopup(): boolean {
    return this.currentPopup !== null;
  }
}

// Export singleton instance
export const popupManager = new PopupManager();
