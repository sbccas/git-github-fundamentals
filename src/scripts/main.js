/**
 * Shared behaviour for every page: theme, header menus, mobile menu, search palette.
 * Each page script imports this first.
 */
import { writeRaw } from './lib/storage.js';
import { initPalette } from './lib/palette.js';
import { initPwa } from './lib/pwa.js';

const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

function initTheme() {
  const root = document.documentElement;
  const btn = document.querySelector('[data-theme-toggle]');
  const label = () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    btn?.setAttribute('aria-label', `Switch to ${next} theme`);
  };
  label();
  btn?.addEventListener('click', () => {
    root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    writeRaw('theme', root.dataset.theme);
    label();
  });
  // Print and "save as PDF" always use the light theme (paper is white).
  let screenTheme = null;
  window.addEventListener('beforeprint', () => { screenTheme = root.dataset.theme; root.dataset.theme = 'light'; });
  window.addEventListener('afterprint', () => { if (screenTheme) root.dataset.theme = screenTheme; });
}

function initMenus() {
  const triggers = [...document.querySelectorAll('.nav-trigger')];
  const closeAll = (except) => triggers.forEach((t) => {
    if (t === except) return;
    t.setAttribute('aria-expanded', 'false');
    document.getElementById(t.getAttribute('aria-controls')).hidden = true;
  });
  triggers.forEach((t) => {
    const menu = document.getElementById(t.getAttribute('aria-controls'));
    // Highlight the trigger when the current page is inside its menu.
    if (menu.querySelector('[aria-current="page"]')) t.classList.add('is-current');
    t.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = t.getAttribute('aria-expanded') === 'true';
      closeAll(t);
      t.setAttribute('aria-expanded', String(!open));
      menu.hidden = open;
      if (!open) menu.querySelector('a')?.focus({ preventScroll: true });
    });
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('.has-menu')) closeAll(); });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const openTrigger = triggers.find((t) => t.getAttribute('aria-expanded') === 'true');
    if (openTrigger) { closeAll(); openTrigger.focus(); }
  });

  // Mobile menu
  const toggle = document.querySelector('[data-menu-toggle]');
  const panel = document.getElementById('mobile-menu');
  const setMobile = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    panel.hidden = !open;
    document.body.classList.toggle('menu-open', open);
  };
  toggle?.addEventListener('click', () => setMobile(toggle.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) { setMobile(false); toggle.focus(); } });
  window.matchMedia('(min-width: 1041px)').addEventListener('change', (mq) => { if (mq.matches) setMobile(false); });
}

function initHeaderShadow() {
  const header = document.querySelector('[data-header]');
  if (!header) return;
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

function initModKeys() {
  if (!isMac) return;
  document.querySelectorAll('[data-mod-key]').forEach((k) => { k.textContent = '⌘ K'; });
  document.querySelector('[data-palette-open]')?.setAttribute('aria-label', 'Search (⌘K)');
}

/**
 * Reveal-on-scroll for elements with [data-reveal]; skipped when reduced motion is preferred.
 * Page scripts call observeReveal() again after rendering new [data-reveal] elements.
 */
let revealObserver = null;
export function observeReveal() {
  const els = document.querySelectorAll('[data-reveal]:not(.is-visible):not([data-reveal-bound])');
  if (!els.length) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-visible'));
    return;
  }
  revealObserver ??= new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); revealObserver.unobserve(entry.target); }
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  els.forEach((el) => { el.setAttribute('data-reveal-bound', ''); revealObserver.observe(el); });
}

/** Any [data-copy] button copies its text (lessons, slides, handbook). */
function initCopyButtons() {
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-copy]');
    if (!btn) return;
    const label = btn.textContent;
    try {
      await navigator.clipboard.writeText(btn.dataset.copy);
      btn.textContent = 'Copied ✓';
    } catch {
      btn.textContent = 'Press Ctrl+C';
    }
    setTimeout(() => { btn.textContent = label; }, 1600);
  });
}

initTheme();
initMenus();
initCopyButtons();
initHeaderShadow();
initModKeys();
initPalette();
observeReveal();
initPwa();

// Phase 2 accounts: __ACCOUNTS__ is replaced at build time (vite.config.js). When false — always for the live site
// before the college sign-off — this line and all account code are left out of the build.
if (__ACCOUNTS__) import('./lib/account-boot.js');
