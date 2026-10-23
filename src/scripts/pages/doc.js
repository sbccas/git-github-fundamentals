// Long documents rendered from docs/ (faculty guide, handbook): stable session anchors + contents highlighting.
import '../main.js';

const article = document.querySelector('.doc');

// "Session 3 — …" headings get a short, stable id: #session-3
for (const h of article.querySelectorAll('h3, h4')) {
  const m = /^Session (\d+)\b/.exec(h.textContent.trim());
  if (m && !document.getElementById(`session-${m[1]}`)) {
    const anchor = document.createElement('span');
    anchor.id = `session-${m[1]}`;
    h.prepend(anchor);
  }
}
// Re-apply the #anchor once fonts and layout have settled (the ids above did not exist at first paint).
const jump = () => { if (location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView(); };
if (document.readyState === 'complete') jump(); else window.addEventListener('load', jump, { once: true });

const links = new Map([...document.querySelectorAll('[data-toc]')].map((a) => [a.dataset.toc, a]));
const heads = [...article.querySelectorAll('h2[id]')].filter((h) => links.has(h.id));
let ticking = false;
window.addEventListener('scroll', () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    let active = heads[0]?.id;
    for (const h of heads) if (h.getBoundingClientRect().top < window.innerHeight * 0.3) active = h.id;
    for (const [id, a] of links) a.classList.toggle('is-active', id === active);
  });
}, { passive: true });
