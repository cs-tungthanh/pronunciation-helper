/**
 * Helper utilities for working with text selection
 */

/**
 * Get the selected text from the page
 */
export function getSelectedText(): string {
  const selection = window.getSelection();
  return selection ? selection.toString().trim() : '';
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
