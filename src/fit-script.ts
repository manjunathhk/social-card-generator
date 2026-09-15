import { CARD_HEIGHT } from './schema.js';

/**
 * The in-browser fit loop, kept as a plain JavaScript string.
 *
 * Why a string and not a TypeScript function passed to `page.evaluate`:
 * Playwright serialises a function by calling `toString()` on it. Tools such
 * as tsx and esbuild rewrite functions with a `__name(...)` helper that only
 * exists in Node, so the serialised source throws `__name is not defined`
 * inside Chromium. A string has nothing to rewrite.
 *
 * For each card: shrink the code font from the layout's maximum toward its
 * minimum until every <pre> fits its box, then apply the smallest size found
 * to all panels of that card so they match. Report failure instead of
 * letting content clip.
 */
export const FIT_SCRIPT = /* js */ `(() => {
  const CARD_HEIGHT = ${CARD_HEIGHT};
  const FOOTER_MARGIN = 40;
  const STEP = 0.5;
  const TOLERANCE = 0.5;

  const innerSize = (box) => {
    const style = getComputedStyle(box);
    return {
      width: box.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
      height: box.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom),
    };
  };

  const fits = (pre, box) => {
    const { width, height } = innerSize(box);
    return pre.scrollWidth <= width + TOLERANCE && pre.getBoundingClientRect().height <= height + TOLERANCE;
  };

  const results = [];
  for (const card of document.querySelectorAll('.card')) {
    const max = Number(card.dataset.fontMax);
    const min = Number(card.dataset.fontMin);
    const pres = [...card.querySelectorAll('pre.shiki')];
    let size = max;

    for (const pre of pres) {
      const box = pre.parentElement;
      let fontSize = max;
      pre.style.fontSize = fontSize + 'px';
      while (!fits(pre, box) && fontSize - STEP >= min) {
        fontSize -= STEP;
        pre.style.fontSize = fontSize + 'px';
      }
      size = Math.min(size, fontSize);
    }

    for (const pre of pres) pre.style.fontSize = size + 'px';

    const overflowing = pres.find((pre) => !fits(pre, pre.parentElement));
    const footer = card.querySelector('footer');
    const cardTop = card.getBoundingClientRect().top;
    const footerBottom = footer ? footer.getBoundingClientRect().bottom - cardTop : 0;
    const cardOverflows = card.scrollHeight > card.clientHeight + TOLERANCE || footerBottom > CARD_HEIGHT - FOOTER_MARGIN;

    let reason;
    if (overflowing) {
      const label = overflowing.closest('.panel')?.querySelector('.panel-title')?.textContent?.trim();
      reason = 'code in panel "' + (label ?? '?') + '" does not fit at the minimum ' + min + 'px; shorten lines or remove lines';
    } else if (cardOverflows) {
      reason = 'headline, subtitle, notes or insight push the footer off the card; shorten the prose';
    }
    results.push({ ok: !reason, fontSize: size, reason });
  }
  return results;
})()`;
