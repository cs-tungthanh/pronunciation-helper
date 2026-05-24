/**
 * Make elements draggable
 */

/**
 * Make an element draggable by a handle
 * @param element The element to make draggable
 * @param handle The drag handle element
 */
export function makeDraggable(element: HTMLElement, handle: HTMLElement): void {
  let isDragging = false;
  let currentX = 0;
  let currentY = 0;
  let initialX = 0;
  let initialY = 0;

  const dragStart = (e: MouseEvent) => {
    // Don't start dragging if clicking a button
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON') {
      return;
    }

    initialX = e.clientX;
    initialY = e.clientY;

    const rect = element.getBoundingClientRect();
    currentX = rect.left;
    currentY = rect.top;

    isDragging = true;
    e.preventDefault();
  };

  const drag = (e: MouseEvent) => {
    if (!isDragging) return;

    e.preventDefault();

    const dx = e.clientX - initialX;
    const dy = e.clientY - initialY;

    const newX = currentX + dx;
    const newY = currentY + dy;

    element.style.left = `${newX}px`;
    element.style.top = `${newY}px`;
  };

  const dragEnd = () => {
    isDragging = false;
  };

  handle.addEventListener('mousedown', dragStart);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', dragEnd);

  // Cleanup when element is removed
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
