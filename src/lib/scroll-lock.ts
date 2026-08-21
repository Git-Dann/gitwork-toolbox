/**
 * Stop the page scrolling behind an overlay, without the site jumping sideways as the
 * scrollbar disappears. The gap is measured before the lock and given back as padding —
 * on a classic scrollbar that is 15-ish pixels, and because the content is centred it
 * shows up as everything sliding right by half of that.
 *
 * Returns the undo, so an effect can hand it straight back as its cleanup.
 */
export function lockScroll() {
  const body = document.body;
  const gap = window.innerWidth - document.documentElement.clientWidth;
  const previousOverflow = body.style.overflow;
  const previousPadding = body.style.paddingRight;
  body.style.overflow = "hidden";
  if (gap > 0) body.style.paddingRight = `${gap}px`;
  return () => {
    body.style.overflow = previousOverflow;
    body.style.paddingRight = previousPadding;
  };
}
