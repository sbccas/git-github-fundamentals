/**
 * Apps' built-in browsers (WhatsApp, Instagram, Facebook, …) often hand GitHub sign-in to Chrome or the GitHub app,
 * so the sign-in returns to a different browser and cannot finish (owner report, 28 Oct 2026: five students stuck
 * before the profile step). The account page detects these browsers and suggests opening the page in Chrome/Safari.
 * A heuristic only: it shows advice, never blocks anything.
 */
const APP = /WhatsApp|Instagram|FBAN|FBAV|FB_IAB|FBIOS|LinkedInApp|Snapchat|Line\/|MicroMessenger|Telegram|GSA\//i;

export function inAppBrowser(ua = '') {
  if (APP.test(ua)) return true;
  if (/Android/i.test(ua) && /; wv\)/.test(ua)) return true; // Android WebView inside an app
  // iPhone/iPad app web views lack the "Safari/" token that Safari and the other real browsers send.
  if (/iPhone|iPad|iPod/i.test(ua) && !/Safari\//.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)) return true;
  return false;
}

export const isAndroid = (ua = '') => /Android/i.test(ua);

/** An Android link that opens the same address in Chrome. */
export const chromeIntent = (url) => {
  const u = new URL(url);
  return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=https;package=com.android.chrome;end`;
};
