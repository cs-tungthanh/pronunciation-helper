/**
 * Helper utilities for working with text selection
 */

import { SELECTION_MAX_CHARS } from '../constants/app-constants';

/**
 * Get the selected text from the page, cut at a word to at most SELECTION_MAX_CHARS with an ellipsis
 */
export function getSelectedText(): string {
  const selection = window.getSelection();
  const text = selection ? selection.toString().trim() : '';
  if (text.length <= SELECTION_MAX_CHARS) return text;

  // One character is left for the ellipsis
  const cut = text.slice(0, SELECTION_MAX_CHARS - 1);
  const lastSpace = cut.search(/\s\S*$/);
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd() + '…';
}

/**
 * Get the position of the current selection for popup placement
 */
export function getSelectionPosition(): { x: number; y: number } | null {
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
 * Check if selection is inside a given element
 */
export function isSelectionInsideElement(element: HTMLElement): boolean {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;

  const range = selection.getRangeAt(0);
  const container = range.commonAncestorContainer;
  const containerElement = container.nodeType === Node.ELEMENT_NODE
    ? container as Element
    : container.parentElement;

  return containerElement ? element.contains(containerElement) : false;
}
