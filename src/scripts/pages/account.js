/**
 * Account page (Milestone 10 plan §4.1, §4.5, §4.6, §4.8, §4.9.1; Milestone 11 plan §4.3).
 * Consent first → GitHub sign-in → profile (accept_consent) → this device's progress → background sync.
 * Built only when accounts are enabled; the database enforces every rule again (supabase/migrations/).
 */
import '../main.js';
import { CONSENT, PROGRAMMES, configured } from '../data/supabase.js';
import { BASE } from '../data/site.js';
import { showStatus, STATUS_TEXT } from '../lib/account-boot.js';
import { getClient, getSession, signInWithGitHub, signOutHere, api, rememberAccount } from '../lib/account.js';
import { inAppBrowser, isAndroid, chromeIntent } from '../lib/inapp.js';
import { REMOTE_SESSION } from '../data/session.js';
import { parseRepoUrl, parseWallPr, partAItems, checkRepo, checklist } from '../lib/session.js';
import { load } from '../lib/progress.js';
import { createSync, deviceSituation, linkDevice, leaveDevice, forgetDeviceLink, hasStash, syncMeta, classify } from '../lib/sync.js';

const $ = (s, root = document) => root.querySelector(s);
const view = $('[data-acct-view]');
const msgBox = $('[data-acct-msg]');
const RETURN_KEY = 'gg-return-to';
const AGREED_KEY = 'gg-consent-agreed';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const programmeLabel = (v) => PROGRAMMES.find((p) => p.value === v)?.label ?? v;
const session$ = { current: null };
let sync = null;
let accountState = null; // last account_status(): batch name, faculty role

const ss = {
  get: (k) => { try { return sessionStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { sessionStorage.setItem(k, v); } catch { /* ignore */ } },
  del: (k) => { try { sessionStorage.removeItem(k); } catch { /* ignore */ } },
};

function message(text, tone = 'info') {
  msgBox.textContent = text ?? '';
  msgBox.dataset.tone = tone;
  msgBox.hidden = !text;
}

function render(html) {
  view.innerHTML = html;
  view.focus({ preventScroll: true });
}

/** A short, specific message for a failed call (§4.6). */
function explain(err) {
  const kind = classify(err);
  if (kind === 'offline') return 'You seem to be offline, or the account service is unavailable. Nothing was lost — try again when you are online.';
  if (kind === 'auth') return 'Your sign-in has ended. Please sign in again.';
  if (kind === 'consent') return 'Please review and accept the updated consent first.';
  return err?.message || 'Something went wrong. Please try again.';
}

/** Name rules shared with the database: 1–60 characters, no < > or control characters. */
const cleanName = (s) => String(s ?? '').replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60);
/** Roll number / SID (M12-D9): 1–20 letters, digits, - or /, stored in capitals. */
const cleanRoll = (s) => String(s ?? '').replace(/\s+/g, '').toUpperCase();
const validRoll = (s) => /^[A-Z0-9/-]{1,20}$/.test(s);
const rollField = (value = '') => `
        <label for="acct-roll">Roll no / SID <span class="muted">(needed to join your class batch)</span></label>
        <input id="acct-roll" name="roll" type="text" maxlength="20" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="e.g. 23BCA-AI-045" value="${esc(value)}">`;

/* ---------------- Screens ---------------- */

function consentHtml({ signedIn, reconsent }) {
  const lines = CONSENT.lines.map((t) => `<p>${esc(t)}</p>`).join('');
  return `
    <section class="card acct-card" aria-labelledby="acct-consent-h">
      <h2 id="acct-consent-h">${esc(CONSENT.title)}</h2>
      ${reconsent ? '<p class="acct-note">The wording has changed since you agreed. Please read it and agree again to keep saving online.</p>' : ''}
      ${lines}
      <p class="muted acct-small">Consent version ${esc(CONSENT.version)}.</p>
      <div class="acct-actions">
        <button class="btn btn-primary" type="button" data-agree>${signedIn ? 'I agree' : 'I agree — continue with GitHub'}</button>
        <button class="btn btn-ghost" type="button" data-not-now>Not now</button>
      </div>
    </section>`;
}

/** Shown above the consent when the page is inside an app's built-in browser (lib/inapp.js). */
function inAppNoteHtml() {
  const ua = navigator.userAgent;
  if (!inAppBrowser(ua)) return '';
  const url = location.origin + location.pathname;
  return `
    <section class="card acct-card acct-inapp" role="note" aria-labelledby="acct-inapp-h">
      <h2 id="acct-inapp-h">Open this page in ${isAndroid(ua) ? 'Chrome' : 'Safari'} first</h2>
      <p>You opened the link inside an app (such as WhatsApp). GitHub sign-in may not finish here. Open the page in your phone's browser, then sign in.</p>
      <div class="acct-actions">
        ${isAndroid(ua) ? `<a class="btn btn-primary" href="${esc(chromeIntent(url))}">Open in Chrome</a>` : ''}
        <button class="btn btn-ghost" type="button" data-copy-link="${esc(url)}">Copy link</button>
      </div>
      <p class="muted acct-small">${isAndroid(ua) ? 'Or tap ⋮ (top right) → Open in Chrome.' : 'Or tap ⋯ or the compass icon → Open in Safari.'}</p>
    </section>`;
}

function showConsent({ signedIn = false, reconsent = false, profile = null } = {}) {
  render((signedIn ? '' : inAppNoteHtml()) + consentHtml({ signedIn, reconsent }));
  $('[data-copy-link]', view)?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    try { await navigator.clipboard.writeText(btn.dataset.copyLink); btn.textContent = 'Link copied ✓'; } catch { btn.textContent = btn.dataset.copyLink; }
  });
  $('[data-agree]', view).addEventListener('click', async (e) => {
    e.currentTarget.disabled = true;
    if (!signedIn) {
      ss.set(AGREED_KEY, CONSENT.version);
      try {
        message('Opening GitHub…');
        await signInWithGitHub();
      } catch (err) {
        e.currentTarget.disabled = false;
        message(explain(err), 'bad');
      }
      return;
    }
    if (!reconsent) { ss.set(AGREED_KEY, CONSENT.version); showProfileForm(); return; }
    try {
      await api.acceptConsent(CONSENT.version, profile.display_name, profile.programme);
      message('Thank you — consent recorded.', 'ok');
      afterSession();
    } catch (err) {
      e.currentTarget.disabled = false;
      message(explain(err), 'bad');
    }
  });
  $('[data-not-now]', view).addEventListener('click', () => {
    if (!signedIn) { location.href = ss.get(RETURN_KEY) || BASE; return; }
    if (reconsent) showLimited(profile);
    else showNotNow();
  });
}

function showProfileForm() {
  const meta = session$.current?.user?.user_metadata ?? {};
  const suggested = cleanName(meta.full_name || meta.name || meta.user_name || '');
  render(`
    <section class="card acct-card" aria-labelledby="acct-profile-h">
      <h2 id="acct-profile-h">Your profile</h2>
      <p>Signed in with GitHub as <strong>@${esc(meta.user_name || meta.preferred_username || '')}</strong>. Saving this form records your consent (version ${esc(CONSENT.version)}) and creates your profile.</p>
      <form class="acct-form" data-profile-form novalidate>
        <label for="acct-name">Display name <span class="muted">(1–60 characters)</span></label>
        <input id="acct-name" name="name" type="text" maxlength="60" autocomplete="name" required value="${esc(suggested)}">
        <label for="acct-prog">Programme</label>
        <select id="acct-prog" name="programme" required>
          <option value="">Choose…</option>
          ${PROGRAMMES.map((p) => `<option value="${esc(p.value)}">${esc(p.label)}</option>`).join('')}
        </select>
        ${rollField()}
        <div class="acct-actions">
          <button class="btn btn-primary" type="submit">Save and continue</button>
          <button class="btn btn-ghost" type="button" data-not-now>Not now</button>
        </div>
      </form>
    </section>`);
  const form = $('[data-profile-form]', view);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = cleanName(form.name.value);
    const programme = form.programme.value;
    if (!name) { message('Please enter a display name.', 'bad'); form.name.focus(); return; }
    if (!programme) { message('Please choose your programme.', 'bad'); form.programme.focus(); return; }
    const roll = cleanRoll(form.roll.value);
    if (roll && !validRoll(roll)) { message('Roll no / SID: up to 20 letters, digits, - or /.', 'bad'); form.roll.focus(); return; }
    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true;
    message('Saving…');
    try {
      await api.acceptConsent(CONSENT.version, name, programme);
      ss.del(AGREED_KEY);
      if (roll) {
        try { await api.updateProfile({ roll_no: roll }); } catch { message('Profile saved, but the roll number could not be saved — add it in "Edit profile".', 'bad'); }
      }
      message('Profile saved.', 'ok');
      afterSession();
    } catch (err) {
      btn.disabled = false; // the form keeps its values; consent is recorded only when the call succeeds
      message(explain(err), 'bad');
    }
  });
  $('[data-not-now]', view).addEventListener('click', showNotNow);
}

/** §4.1 6b: leaving before the profile is saved. */
function showNotNow() {
  render(`
    <section class="card acct-card">
      <h2>Not now</h2>
      <p>Nothing has been saved online by this site yet. GitHub sign-in did create a sign-in record with Supabase (see the consent text).</p>
      <div class="acct-actions acct-actions-col">
        <button class="btn btn-primary" type="button" data-keep>Sign out and keep for later</button>
        <button class="btn btn-ghost" type="button" data-remove>Ask the college to remove my sign-in record</button>
        <button class="btn btn-ghost" type="button" data-back>Back to the profile form</button>
      </div>
    </section>`);
  $('[data-keep]', view).addEventListener('click', async () => { await signOutHere(); ss.del(AGREED_KEY); signedOutDone('Signed out. You can finish setting up later.'); });
  $('[data-remove]', view).addEventListener('click', () => confirmDelete({ hasProfile: false }));
  $('[data-back]', view).addEventListener('click', showProfileForm);
}

/** Choice when this device already holds progress (plan §4.3). Never merged without an answer. */
function showDeviceChoice(situation, profile) {
  const uid = session$.current.user.id;
  const whose = situation === 'guest' ? 'made while signed out' : 'from another account';
  render(`
    <section class="card acct-card" aria-labelledby="acct-device-h">
      <h2 id="acct-device-h">This device already has progress</h2>
      <p>This browser holds course progress ${whose}. Add it to <strong>${esc(profile.display_name)}</strong>?</p>
      <div class="acct-actions acct-actions-col">
        <button class="btn btn-primary" type="button" data-add>Add this device's progress to ${esc(profile.display_name)}</button>
        <button class="btn btn-ghost" type="button" data-separate>Keep separate (it comes back when you sign out)</button>
      </div>
    </section>`);
  $('[data-add]', view).addEventListener('click', () => { linkDevice(uid, { addLocal: true }); startSync(profile); });
  $('[data-separate]', view).addEventListener('click', () => {
    if (!linkDevice(uid, { addLocal: false })) {
      message('This device has progress from another account that is not saved online yet. Sign in with that account first, or choose "Add".', 'bad');
      return;
    }
    startSync(profile);
  });
}

function syncLineText(state) {
  const meta = syncMeta();
  const when = meta?.lastSyncAt && state === 'saved' ? ` · ${new Date(meta.lastSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '';
  return `${STATUS_TEXT[state] ?? state}${when}`;
}

function showSignedIn(profile) {
  const user = session$.current.user.user_metadata ?? {};
  const back = ss.get(RETURN_KEY);
  render(`
    <section class="card acct-card" aria-labelledby="acct-me-h">
      <h2 id="acct-me-h">Signed in as ${esc(profile.display_name)}</h2>
      <p class="muted">GitHub @${esc(profile.github_username || user.user_name || '')} · ${esc(programmeLabel(profile.programme))}${profile.roll_no ? ` · Roll no ${esc(profile.roll_no)}` : ''}</p>
      <p class="acct-sync" data-tone="busy"><span class="acct-dot" aria-hidden="true"></span><span data-sync-text>${esc(STATUS_TEXT.checking)}</span></p>
      <div class="acct-actions">
        <button class="btn btn-ghost" type="button" data-sync-now>Save now</button>
        ${back ? `<a class="btn btn-primary" href="${esc(back)}" data-back>Continue where you were →</a>` : ''}
      </div>
    </section>

    <section class="card acct-card" aria-labelledby="acct-edit-h">
      <h2 id="acct-edit-h">Edit profile</h2>
      <form class="acct-form" data-edit-form novalidate>
        <label for="acct-name">Display name</label>
        <input id="acct-name" name="name" type="text" maxlength="60" required value="${esc(profile.display_name)}">
        <label for="acct-prog">Programme</label>
        <select id="acct-prog" name="programme" required>
          ${PROGRAMMES.map((p) => `<option value="${esc(p.value)}"${p.value === profile.programme ? ' selected' : ''}>${esc(p.label)}</option>`).join('')}
        </select>
        ${rollField(profile.roll_no ?? '')}
        <div class="acct-actions"><button class="btn btn-ghost" type="submit">Save profile</button></div>
      </form>
    </section>

    ${batchSectionHtml(profile)}

    ${accountState?.is_faculty ? '' : sessionSectionHtml()}

    ${dataSectionHtml()}`);

  $('[data-sync-now]', view).addEventListener('click', () => sync?.push());
  $('[data-back]', view)?.addEventListener('click', () => ss.del(RETURN_KEY));
  const form = $('[data-edit-form]', view);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = cleanName(form.name.value);
    if (!name) { message('Please enter a display name.', 'bad'); return; }
    const roll = cleanRoll(form.roll.value);
    if (roll && !validRoll(roll)) { message('Roll no / SID: up to 20 letters, digits, - or /.', 'bad'); form.roll.focus(); return; }
    try {
      const saved = await api.updateProfile({ display_name: name, programme: form.programme.value, roll_no: roll || null });
      rememberAccount({ name: saved.display_name });
      form.roll.value = saved.roll_no ?? '';
      $('[data-roll-hint]', view)?.remove();
      Object.assign(profile, saved);
      $('#acct-me-h', view).textContent = `Signed in as ${saved.display_name}`;
      message('Profile saved.', 'ok');
    } catch (err) {
      message(explain(err), 'bad');
    }
  });
  wireBatchSection();
  wireRequest();
  wireSession();
  wireDataSection({ hasProfile: true });
  if (location.hash === '#request') $('#request', view)?.scrollIntoView({ block: 'center' });
}

/** "Your batch" (Milestone 12): join with the code shown in class; faculty get a link to the dashboard. */
function batchSectionHtml(profile) {
  const batch = accountState?.batch_name;
  return `
    <section class="card acct-card" aria-labelledby="acct-batch-h">
      <h2 id="acct-batch-h">Your batch</h2>
      <p data-batch-now>${batch ? `You are in <strong>${esc(batch)}</strong>. Your teachers for this batch can see your progress.` : 'Not in a batch yet. Type the code your teacher shows in class.'}</p>
      ${profile?.roll_no || accountState?.is_faculty ? '' : '<p class="muted acct-small" data-roll-hint>Add your roll no / SID in "Edit profile" above first.</p>'}
      <form class="acct-form acct-inline" data-batch-form novalidate>
        <label for="acct-code">${batch ? 'Change batch — code' : 'Batch code'}</label>
        <div class="acct-row">
          <input id="acct-code" name="code" type="text" inputmode="text" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="12" placeholder="e.g. K7Q2 M9XA">
          <button class="btn btn-primary" type="submit">Join</button>
        </div>
      </form>
      ${batch || accountState?.is_faculty ? '' : `<div class="acct-request" id="request" data-request>${requestHtml()}</div>`}
      ${accountState?.is_faculty ? `<p class="acct-faculty"><a class="btn btn-ghost" href="${BASE}teach/dashboard/">Open the faculty dashboard →</a></p>` : ''}
    </section>`;
}

/* ---------------- Remote session (Milestone 12c) ---------------- */

const tick = (ok) => `<span class="acct-tick" data-ok="${ok}">${ok ? '✓' : '○'}</span>`;

function partAHtml() {
  return partAItems(load()).map((i) => `<li>${tick(i.ok)} ${esc(i.label)}</li>`).join('');
}

function projectResultHtml(check) {
  if (!check) return '';
  if (check.error === 'rate_limited') return '<p class="muted acct-small">GitHub is busy right now, so the checklist could not be read. Your link is saved — tap <strong>Check again</strong> later.</p>';
  if (check.error) return '<p class="muted acct-small">The checklist could not be read just now. Your link is saved — tap <strong>Check again</strong> later.</p>';
  if (check.public === false) return '<p class="acct-warn">Repository not found or private. Make it <strong>public</strong> (GitHub → Settings → General → Change visibility), then check again.</p>';
  const c = checklist(check);
  return `
    ${c.envWarning ? '<p class="acct-warn"><strong>Remove your .env file from GitHub now</strong> and change any API keys it contained — anyone can read a public repository. Add .env to .gitignore.</p>' : ''}
    <p><strong>Checklist: ${c.score} of ${c.total}</strong> · ${check.commits_in_session ?? 0} commit${check.commits_in_session === 1 ? '' : 's'} during the session</p>
    <ul class="acct-checks">${c.items.map((i) => `<li>${tick(i.ok)} ${esc(i.label)}${i.ok ? '' : ` <span class="muted acct-small">— ${esc(i.hint)}</span>`}</li>`).join('')}</ul>`;
}

function sessionSectionHtml() {
  const s = REMOTE_SESSION;
  const links = accountState?.session ?? {};
  return `
    <section class="card acct-card acct-session" id="session" aria-labelledby="acct-session-h">
      <h2 id="acct-session-h">${esc(s.title)} — ${esc(s.date)}, 11:00 – 15:00</h2>
      <p class="muted acct-small">Work for at least 2 hours. Your faculty see your activity, the missions you finish and the links you submit here.</p>
      <p><a class="btn btn-ghost" href="${BASE}remote-session/">📄 Step-by-step task sheet</a></p>

      <h3>Part A — on this site</h3>
      <ul class="acct-checks" data-part-a>${partAHtml()}</ul>
      <p class="acct-small"><a href="${BASE}missions/">Missions →</a> · <a href="${BASE}unit-4/#quiz">Unit 4 quiz →</a> · <a href="${BASE}unit-5/#quiz">Unit 5 quiz →</a> · <a href="${BASE}self-check/">Self-check →</a></p>

      <h3>Part B — your AI project on GitHub</h3>
      <p class="acct-small">Push the AI project you built to a <strong>public</strong> GitHub repository with a README, a .gitignore, at least 5 commits, a branch merged through a pull request and a tag <code>v1.0</code>. <strong>Never upload API keys</strong> — keep them in <code>.env</code> and list <code>.env</code> in .gitignore.</p>
      <form class="acct-form" data-project-form novalidate>
        <label for="acct-project">Repository link</label>
        <div class="acct-row">
          <input id="acct-project" name="url" type="url" inputmode="url" autocomplete="off" spellcheck="false" placeholder="https://github.com/your-name/your-project" value="${esc(links.project_url ?? '')}">
          <button class="btn btn-primary" type="submit">${links.project_url ? 'Check again' : 'Check and submit'}</button>
        </div>
      </form>
      <div data-project-result>${projectResultHtml(links.project_check)}</div>

      <h3>Part C — class wall <span class="muted">(optional)</span></h3>
      <p class="acct-small">Fork <a href="https://github.com/${s.wallRepo}" target="_blank" rel="noopener">${s.wallRepo}</a>, add a file named with your roll number (for example <code>541.md</code>) with your name and one line about your project, open a pull request and paste its link.</p>
      <form class="acct-form" data-wall-form novalidate>
        <label for="acct-wall">Pull request link</label>
        <div class="acct-row">
          <input id="acct-wall" name="url" type="url" inputmode="url" autocomplete="off" spellcheck="false" placeholder="https://github.com/${s.wallRepo}/pull/…" value="${esc(links.wall_pr_url ?? '')}">
          <button class="btn btn-ghost" type="submit">Submit</button>
        </div>
      </form>
    </section>`;
}

function wireSession() {
  const box = $('[data-part-a]', view);
  if (!box) return;
  if (!wireSession.listening) {
    wireSession.listening = true; // one listener for the page, whatever is re-rendered
    window.addEventListener('gg:progress', () => { const b = $('[data-part-a]', view); if (b) b.innerHTML = partAHtml(); });
  }
  const project = $('[data-project-form]', view);
  project.addEventListener('submit', async (e) => {
    e.preventDefault();
    const parsed = parseRepoUrl(project.url.value);
    if (!parsed) { message('Paste your repository link, like https://github.com/your-name/your-project', 'bad'); project.url.focus(); return; }
    const btn = project.querySelector('[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Checking on GitHub…';
    const check = await checkRepo(parsed);
    try {
      const saved = await api.submitSessionLinks(parsed.url, check, null);
      accountState = { ...accountState, session: saved };
      project.url.value = saved.project_url;
      $('[data-project-result]', view).innerHTML = projectResultHtml(saved.project_check);
      message('Project link saved. Your faculty can see it.', 'ok');
    } catch (err) {
      message(explain(err), 'bad');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Check again';
    }
  });
  const wall = $('[data-wall-form]', view);
  wall.addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = parseWallPr(wall.url.value);
    if (!url) { message(`Paste the link of your pull request on ${REMOTE_SESSION.wallRepo}`, 'bad'); wall.url.focus(); return; }
    try {
      const saved = await api.submitSessionLinks(null, null, url);
      accountState = { ...accountState, session: saved };
      wall.url.value = saved.wall_pr_url;
      message('Class wall link saved.', 'ok');
    } catch (err) { message(explain(err), 'bad'); }
  });
}

/** "Request to join" (Milestone 12b): for students whose class has no batch yet. */
const YEARS = [[1, '1st year'], [2, '2nd year'], [3, '3rd year']];
function requestHtml() {
  const req = accountState?.request;
  if (req?.status === 'pending') {
    return `<p><strong>Request sent</strong> — ${esc(YEARS.find(([y]) => y === req.year)?.[1] ?? '')}${req.division ? `, division ${esc(req.division)}` : ''}. Waiting for the course faculty; you will be added to your class's batch.</p>
      <button class="btn btn-ghost" type="button" data-withdraw>Withdraw request</button>`;
  }
  return `
    <h3>Your class is not in the course yet?</h3>
    ${req?.status === 'declined' ? '<p class="muted acct-small">Your last request was not accepted. Ask your teacher, or request again.</p>' : ''}
    <form class="acct-form" data-request-form novalidate>
      <div class="acct-row">
        <label class="acct-grow"><span>Year</span>
          <select name="year" required>${YEARS.map(([y, l]) => `<option value="${y}">${l}</option>`).join('')}</select></label>
        <label class="acct-grow"><span>Division <span class="muted">(optional)</span></span>
          <input name="division" type="text" maxlength="10" autocomplete="off" autocapitalize="characters" placeholder="e.g. A"></label>
      </div>
      <div class="acct-actions"><button class="btn btn-ghost" type="submit">Request this course</button></div>
      <p class="muted acct-small">Faculty see your name, roll number, GitHub username, programme, year and division.</p>
    </form>`;
}

function wireRequest() {
  const box = $('[data-request]', view);
  if (!box) return;
  const refresh = (req) => { accountState = { ...accountState, request: req }; box.innerHTML = requestHtml(); wireRequest(); };
  $('[data-withdraw]', box)?.addEventListener('click', async () => {
    try { refresh(await api.withdrawRequest()); message('Request withdrawn.', 'ok'); } catch (err) { message(explain(err), 'bad'); }
  });
  $('[data-request-form]', box)?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    const division = f.division.value.replace(/\s+/g, ' ').trim().toUpperCase();
    if (division && !/^[A-Z0-9 -]{1,10}$/.test(division)) { message('Division: up to 10 letters, digits, spaces or -.', 'bad'); return; }
    try {
      refresh(await api.requestToJoin(Number(f.year.value), division || null));
      message('Request sent. The course faculty will add you to your class.', 'ok');
    } catch (err) {
      message(explain(err), 'bad');
      if (/roll number/i.test(err?.message ?? '')) $('#acct-roll', view)?.focus();
    }
  });
}

function wireBatchSection() {
  const form = $('[data-batch-form]', view);
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = form.code.value.trim();
    if (!code) { message('Please type the batch code.', 'bad'); form.code.focus(); return; }
    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true;
    try {
      const res = await api.joinBatch(code);
      if (!res.ok) {
        message(res.message, 'bad');
        if (res.needs_roll_no) $('#acct-roll', view)?.focus();
        return;
      }
      accountState = { ...accountState, batch_name: res.batch_name };
      $('[data-request]', view)?.remove();
      $('[data-batch-now]', view).innerHTML = `You are in <strong>${esc(res.batch_name)}</strong>. Your teachers for this batch can see your progress.`;
      form.reset();
      message(`You joined ${res.batch_name}.`, 'ok');
    } catch (err) {
      message(explain(err), 'bad');
    } finally {
      btn.disabled = false;
    }
  });
}

/** Re-consent declined (§4.8.3): only download, delete and sign out remain. */
function showLimited(profile) {
  render(`
    <section class="card acct-card">
      <h2>Online saving is paused</h2>
      <p>Until you agree to the updated consent, nothing new is saved online. Your progress on this device keeps working as before.</p>
      <div class="acct-actions"><button class="btn btn-primary" type="button" data-review>Review the consent</button></div>
    </section>
    ${dataSectionHtml()}`);
  $('[data-review]', view).addEventListener('click', () => showConsent({ signedIn: true, reconsent: true, profile }));
  wireDataSection({ hasProfile: true });
}

function dataSectionHtml() {
  const stash = hasStash();
  return `
    <section class="card acct-card" aria-labelledby="acct-data-h">
      <h2 id="acct-data-h">Your data</h2>
      <div class="acct-actions acct-actions-col">
        <button class="btn btn-ghost" type="button" data-export>Download my data (JSON)</button>
        ${stash
          ? '<button class="btn btn-ghost" type="button" data-signout="restore">Sign out (this device\'s earlier progress comes back)</button>'
          : `<button class="btn btn-ghost" type="button" data-signout="remove">Sign out and remove my progress from this PC</button>
             <button class="btn btn-ghost" type="button" data-signout="keep">Sign out and keep my progress on this PC</button>`}
        <button class="btn btn-ghost acct-danger" type="button" data-delete>Delete my account…</button>
      </div>
      <p class="muted acct-small">Signing out affects this device only. Your online copy stays until you delete your account.</p>
    </section>`;
}

function wireDataSection({ hasProfile }) {
  $('[data-export]', view)?.addEventListener('click', downloadData);
  view.querySelectorAll('[data-signout]').forEach((b) => b.addEventListener('click', () => signOutFlow(b.dataset.signout)));
  $('[data-delete]', view)?.addEventListener('click', () => confirmDelete({ hasProfile }));
}

async function downloadData() {
  try {
    const data = await api.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'git-github-fundamentals-my-data.json' });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    message('Downloaded. It holds everything stored online about you; see "not_included" in the file for what is not.', 'ok');
  } catch (err) {
    message(explain(err), 'bad');
  }
}

async function signOutFlow(mode) {
  if (syncMeta()?.pending) {
    await sync?.push();
    if (syncMeta()?.pending && !confirm('Some progress has not been saved online yet. Sign out anyway? It stays on this device only if you keep it here.')) return;
  }
  sync?.stop();
  try { await signOutHere(); } catch { /* local sign-out still clears this device below */ }
  const result = leaveDevice({ removeLocal: mode === 'remove' });
  signedOutDone(result === 'restored' ? 'Signed out. This device\'s earlier progress is back.'
    : result === 'removed' ? 'Signed out. Your progress was removed from this PC; it is still saved online.'
      : 'Signed out. Your progress stays on this PC.');
}

function confirmDelete({ hasProfile }) {
  const what = hasProfile ? 'your profile and all progress saved online' : 'nothing is saved online yet';
  render(`
    <section class="card acct-card" aria-labelledby="acct-del-h">
      <h2 id="acct-del-h">${hasProfile ? 'Delete my account' : 'Remove my sign-in record'}</h2>
      <p>This deletes ${what} straight away. Your sign-in record (kept by Supabase) is removed by the college on request. Supabase's security logs and your GitHub authorisation of this app (GitHub → Settings → Applications) are not removed by us.</p>
      <p>Progress saved on this device is not changed.</p>
      <div class="acct-actions">
        <button class="btn btn-primary acct-danger-solid" type="button" data-yes>Yes, ${hasProfile ? 'delete my account' : 'ask for removal'}</button>
        <button class="btn btn-ghost" type="button" data-no>Cancel</button>
      </div>
    </section>`);
  $('[data-no]', view).addEventListener('click', () => afterSession());
  $('[data-yes]', view).addEventListener('click', async (e) => {
    e.currentTarget.disabled = true;
    try {
      await api.deleteAccount();
    } catch (err) {
      // §4.9.1: never assume success from a missing response — check the status.
      let st = null;
      try { st = await api.status(); } catch { /* unknown */ }
      if (!st?.deletion_requested) { e.currentTarget.disabled = false; message(st ? 'Deletion was not completed — you can try again.' : `Status unknown — check again later. (${explain(err)})`, 'bad'); return; }
    }
    sync?.stop();
    try { await signOutHere(); } catch { /* ignore */ }
    if (hasStash()) leaveDevice({ removeLocal: false }); // the device's earlier progress comes back
    else forgetDeviceLink(); // this device's progress stays, no longer linked to the deleted account
    signedOutDone('Your online data was deleted. Your sign-in record is removed by the college on request. You are signed out on this device.');
  });
}

function showDeletionPending(profileName) {
  render(`
    <section class="card acct-card">
      <h2>Removal requested</h2>
      <p>Your online data was deleted. Your sign-in record stays with Supabase until the college removes it on request.</p>
      <div class="acct-actions acct-actions-col">
        <button class="btn btn-primary" type="button" data-signout-plain>Sign out</button>
        <button class="btn btn-ghost" type="button" data-reuse>Use my account again instead</button>
      </div>
    </section>`);
  $('[data-signout-plain]', view).addEventListener('click', async () => { await signOutHere(); signedOutDone('Signed out.'); });
  $('[data-reuse]', view).addEventListener('click', () => showConsent({ signedIn: true, profile: { display_name: profileName } }));
}

function signedOutDone(text) {
  showStatus('signed-out');
  message(text, 'ok');
  showConsent();
}

/* ---------------- Flow ---------------- */

async function startSync(profile) {
  showSignedIn(profile);
  const line = () => $('[data-sync-text]', view);
  const onStatus = (state) => {
    showStatus(state);
    const p = line()?.closest('.acct-sync');
    if (p) { p.dataset.tone = { saved: 'ok', saving: 'busy', pending: 'busy' }[state] ?? 'warn'; line().textContent = syncLineText(state); }
  };
  sync?.stop();
  sync = createSync({ api, uid: session$.current.user.id, onStatus });
  sync.attach();
  await sync.pull();
}

async function afterSession() {
  showStatus('checking');
  let st;
  try {
    st = await api.status();
  } catch (err) {
    showStatus(classify(err));
    render(`<section class="card acct-card"><h2>Could not check your account</h2><p>${esc(explain(err))}</p><div class="acct-actions"><button class="btn btn-primary" type="button" data-retry>Try again</button></div></section>`);
    $('[data-retry]', view).addEventListener('click', afterSession);
    return;
  }
  accountState = st;
  if (st.current_consent_version !== CONSENT.version) {
    render('<section class="card acct-card"><h2>Please reload</h2><p>The consent text has been updated since this page was loaded. Reload the page to see the current version.</p></section>');
    return;
  }
  if (!st.has_profile) {
    showStatus('setup');
    if (st.deletion_requested) { showDeletionPending(cleanName(session$.current.user.user_metadata?.full_name || 'Student')); return; }
    // §4.1 6c: the wording is shown again unless the student agreed to this version moments ago in this tab.
    if (ss.get(AGREED_KEY) === CONSENT.version) showProfileForm();
    else showConsent({ signedIn: true });
    return;
  }
  let profile;
  try { profile = await api.profile(); } catch (err) { message(explain(err), 'bad'); return; }
  rememberAccount({ name: profile.display_name, faculty: !!st.is_faculty });
  if (!st.consent_current) { showStatus('consent'); showConsent({ signedIn: true, reconsent: true, profile }); return; }
  const situation = deviceSituation(session$.current.user.id);
  if (situation === 'guest' || situation === 'other-account') { showStatus('setup'); showDeviceChoice(situation, profile); return; }
  await startSync(profile);
}

async function main() {
  if (!configured) {
    render('<section class="card acct-card"><h2>Accounts are not set up</h2><p>This build has no account settings. Everything else on the site works without signing in.</p></section>');
    return;
  }
  const params = new URLSearchParams(location.search);
  const returning = params.has('code') || params.has('error');
  const oauthError = params.get('error_description') || params.get('error');
  if (returning) render('<p class="muted">Signing you in…</p>');
  // Remember where the student came from (same site only), to offer the way back afterwards.
  const ref = document.referrer && new URL(document.referrer, location.href);
  if (!returning && ref && ref.origin === location.origin && ref.pathname.startsWith(BASE) && !ref.pathname.startsWith(`${BASE}account/`)) {
    ss.set(RETURN_KEY, ref.pathname + ref.search + ref.hash);
  }
  await getClient({ detectSessionInUrl: true }); // completes the PKCE exchange when ?code= is present
  try { session$.current = await getSession(); } catch { session$.current = null; }
  if (returning) history.replaceState(null, '', location.pathname); // drop the one-time code from the address bar
  if (!session$.current) {
    showStatus('signed-out');
    if (oauthError) message(`Sign-in was not completed (${oauthError}). You can try again.`, 'bad');
    else if (returning) message('Sign-in could not be completed in this browser. Please start again here — in Chrome or Safari, not inside WhatsApp or another app.', 'bad');
    showConsent();
    return;
  }
  const client = await getClient();
  client.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') { sync?.stop(); showStatus('signed-out'); }
  });
  await afterSession();
}

main();
