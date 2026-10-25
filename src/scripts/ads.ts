/**
 * Loads AdSense only after the page is usable: on idle after `load`, on the first
 * interaction, or 3 s after `load` — whichever comes first — and only once.
 */
let scheduled = false;
let injected = false;

type AdsWindow = Window & { adsbygoogle?: unknown[]; requestIdleCallback?: (cb: () => void) => number };

export function scheduleAds(client: string, win: AdsWindow = window): void {
  if (scheduled || !client) return;
  scheduled = true;

  const inject = () => {
    if (injected) return;
    injected = true;
    const s = win.document.createElement('script');
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
    win.document.head.appendChild(s);
    const queue = (win.adsbygoogle = win.adsbygoogle || []);
    win.document.querySelectorAll('ins.adsbygoogle').forEach(() => queue.push({}));
  };

  const afterLoad = () => {
    const idle = win.requestIdleCallback ?? ((cb: () => void) => win.setTimeout(cb, 1));
    idle(inject);
    win.setTimeout(inject, 3000);
  };

  if (win.document.readyState === 'complete') afterLoad();
  else win.addEventListener('load', afterLoad, { once: true });
  for (const type of ['pointerdown', 'keydown', 'scroll']) win.addEventListener(type, inject, { once: true, passive: true });
}
