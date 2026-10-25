import '@fontsource/caveat/400.css';
import '@fontsource/caveat/700.css';
import '@fontsource/chewy/400.css';
import '@fontsource/comic-neue/400.css';
import '@fontsource/comic-neue/700.css';
import './style.css';
import { loadGiftProject, isPreview } from './giftData';
import { t, eventDate } from './copy';
import { safeExternalUrl, validateProject, type GiftProject, type Photo } from './project';
import { saveYesResponse } from './response';
import { downloadBlob, makeTicket } from './ticket';
import { applyTheme, isThemeId } from './themes';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('Missing app root');

// The published gift receives one locale from project data. Language selection belongs
// to the future customer form, so the recipient page intentionally has no switch.
const requestedTheme = new URLSearchParams(location.search).get('theme');
const samplePreview = location.pathname === '/' && new URLSearchParams(location.search).get('sample') === '1';
const localTheme = (['localhost', '127.0.0.1'].includes(location.hostname) || samplePreview) && isThemeId(requestedTheme) ? requestedTheme : undefined;
const loadedProject = await loadGiftProject();
const sourceProject: GiftProject = localTheme ? { ...loadedProject, theme: localTheme } : loadedProject;
const enteredEndTime = sourceProject.invitation.endTime?.trim();
const project: GiftProject = { ...sourceProject, invitation: { ...sourceProject.invitation, endTime: !enteredEndTime || enteredEndTime.toUpperCase() === 'END' ? 'END' : enteredEndTime } };
const issues = validateProject(project);
if (issues.length) throw new Error(`Invalid demo: ${issues.join(', ')}`);
const previewTarget = isPreview ? new URLSearchParams(location.search).get('section') : null;
const previewTargets = ['opening', 'hero', 'music-player', 'invitation', 'letter', 'gallery', 'closing'];
let unlocked = Boolean(previewTarget && previewTarget !== 'opening' && previewTargets.includes(previewTarget));
let ticketBlob: Blob | null = null;
let audio: HTMLAudioElement | null = null;
let gateCompletionPending = false;
let gateAudioAttemptPending = false;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobileMusicHandshake = Boolean(project.music.audioUrl) && (
  matchMedia('(max-width: 760px)').matches || matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0
);
const GATE_AUDIO_TIMEOUT_MS = 8_000;

const esc = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] || char);
const lines = (value: string) => esc(value).replace(/\n/g, '<br>');
const photo = (item: Photo, className = '') => `<img class="${className}" src="${esc(item.src)}" alt="${esc(item.alt)}" loading="lazy" decoding="async">`;
const PUZZLE_PATH = 'M80 60H155C150 35 168 18 193 18C218 18 236 35 231 60H320V135C345 130 362 148 362 173C362 198 345 216 320 211V300H231C236 325 218 342 193 342C168 342 150 325 155 300H80V211C55 216 38 198 38 173C38 148 55 130 80 135Z';
const PUZZLE_PIECES = [
  { id: 'one', transform: 'translate(0 0)', viewBox: '20 0 360 360', target: 'left:3.8%;top:2.5%;width:34%;height:51%' },
  { id: 'two', transform: 'translate(600 60) rotate(90 200 180)', viewBox: '620 60 360 360', target: 'left:62%;top:11%;width:34%;height:51%' },
  { id: 'three', transform: 'translate(280 340) rotate(180 200 180)', viewBox: '300 340 360 360', target: 'left:31%;top:49%;width:34%;height:49%' },
] as const;
const icon = (name: string) => {
  const common = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
  const paths: Record<string, string> = {
    play: '<path d="m8 5 11 7-11 7V5Z"/>', pause: '<path d="M8 5v14M16 5v14"/>',
    music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    arrow: '<path d="M5 12h14m-7-7 7 7-7 7"/>', close: '<path d="M5 5l14 14M19 5 5 19"/>',
    download: '<path d="M12 3v12m-4-4 4 4 4-4M4 17v3h16v-3"/>', share: '<path d="M12 16V3m-4 4 4-4 4 4M4 13v7h16v-7"/>',
    pin: '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    spark: '<path d="M12 2v20M2 12h20M4.9 4.9l14.2 14.2M19.1 4.9 4.9 19.1"/>',
    down: '<path d="M12 3v17m-6-6 6 6 6-6"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
  };
  return `<svg ${common}>${paths[name] || ''}</svg>`;
};

function renderGallery(): string {
  return `<div class="stamp-grid">${project.gallery.photos.map((item, index) => {
    const media = item.type === 'video'
      ? `<div class="stamp-media stamp-video"><video autoplay muted loop playsinline preload="metadata" disablepictureinpicture ${item.poster ? `poster="${esc(item.poster)}"` : ''} aria-label="${esc(item.alt)}"><source src="${esc(item.src)}"></video><span class="video-mark">${icon('play')} ${t(project.locale).video}</span></div>`
      : `<div class="stamp-media">${photo(item)}</div>`;
    return `<figure class="stamp stamp-${index % 4}" data-reveal style="--reveal-order:${index % 4}">${media}<figcaption>${esc(item.caption)}</figcaption></figure>`;
  }).join('')}</div>`;
}

function renderOpeningPuzzle(): string {
  const item = project.opening.photo;
  const source = esc(item.src);
  const alt = esc(item.alt);
  return `<div class="puzzle-board" id="puzzle-board">
    <div class="puzzle-photo-mount">
      <span class="puzzle-tape" aria-hidden="true"></span>
      <div class="puzzle-visual">
        <svg class="puzzle-photo" viewBox="0 0 1000 700" role="img" aria-label="${alt}" preserveAspectRatio="xMidYMid slice">
          <defs>
            <mask id="opening-photo-mask"><rect width="1000" height="700" fill="white"/>${PUZZLE_PIECES.map((piece) => `<path d="${PUZZLE_PATH}" transform="${piece.transform}" fill="black"/>`).join('')}</mask>
            ${PUZZLE_PIECES.map((piece) => `<clipPath id="opening-board-clip-${piece.id}" clipPathUnits="userSpaceOnUse"><path d="${PUZZLE_PATH}" transform="${piece.transform}"/></clipPath>`).join('')}
            <linearGradient id="puzzle-hole-fill" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="var(--theme-shadow)"/><stop offset=".42" stop-color="var(--theme-border)"/><stop offset="1" stop-color="var(--theme-tape)"/>
            </linearGradient>
            <filter id="puzzle-hole-shadow" x="-30%" y="-30%" width="160%" height="170%">
              <feDropShadow dx="0" dy="8" stdDeviation="6" flood-color="#3b1b17" flood-opacity=".42"/>
            </filter>
          </defs>
          <image href="${source}" width="1000" height="700" preserveAspectRatio="xMidYMid slice" mask="url(#opening-photo-mask)"/>
          ${PUZZLE_PIECES.map((piece) => `<image class="puzzle-filled-piece" data-filled-piece="${piece.id}" href="${source}" width="1000" height="700" preserveAspectRatio="xMidYMid slice" clip-path="url(#opening-board-clip-${piece.id})"/>`).join('')}
          <image class="puzzle-complete-photo" href="${source}" width="1000" height="700" preserveAspectRatio="xMidYMid slice"/>
          ${PUZZLE_PIECES.map((piece) => `<path class="puzzle-empty-shape" data-empty-piece="${piece.id}" d="${PUZZLE_PATH}" transform="${piece.transform}"/>`).join('')}
          <rect class="puzzle-photo-line" x="3" y="3" width="994" height="694" rx="10"/>
        </svg>
        ${PUZZLE_PIECES.map((piece) => `<span class="puzzle-target" id="puzzle-hole-${piece.id}" data-piece="${piece.id}" style="${piece.target}" aria-hidden="true"></span>`).join('')}
      </div>
      <p class="puzzle-caption">${esc(item.caption)}</p>
    </div>
  </div>`;
}

function renderPuzzlePieces(label: string): string {
  const item = project.opening.photo;
  return PUZZLE_PIECES.map((piece, index) => `<button class="puzzle-piece" id="puzzle-piece-${piece.id}" data-piece="${piece.id}" aria-label="${esc(label)} ${index + 1}" type="button">
      <svg viewBox="${piece.viewBox}" aria-hidden="true">
        <defs><clipPath id="opening-piece-clip-${piece.id}" clipPathUnits="userSpaceOnUse"><path d="${PUZZLE_PATH}" transform="${piece.transform}"/></clipPath></defs>
        <image href="${esc(item.src)}" width="1000" height="700" preserveAspectRatio="xMidYMid slice" clip-path="url(#opening-piece-clip-${piece.id})"/>
        <path class="puzzle-piece-line" d="${PUZZLE_PATH}" transform="${piece.transform}"/>
      </svg>
    </button>`).join('');
}

function render(): void {
  const c = t(project.locale);
  const date = eventDate(project.invitation.date, project.locale);
  document.documentElement.lang = project.locale;
  applyTheme(project.theme);
  document.title = `${project.invitation.title} · The Plan`;
  document.body.classList.toggle('gate-open', !unlocked);
  const mapUrl = safeExternalUrl(project.invitation.mapsUrl);
  app!.innerHTML = `
    <div class="grain" aria-hidden="true"></div>
    <div class="gift-shell ${unlocked ? 'is-open' : ''}">
      <section class="gate" id="gate" aria-label="${c.openingAria}">
        <div class="gate-paper">
          <div class="small-star star-a">${icon('spark')}</div><div class="small-star star-b">${icon('spark')}</div>
          <p class="eyebrow red">${esc(project.opening.eyebrow)}</p>
          <h1>${lines(project.opening.title)}</h1>
          ${renderOpeningPuzzle()}
          <p class="gate-note">${esc(project.opening.note)}</p>
          <p class="gate-instruction">${c.puzzleHint}</p>
          <div class="puzzle-progress"><span>${c.puzzleProgress}</span><strong id="puzzle-counter">0 / ${PUZZLE_PIECES.length}</strong></div>
          <div class="puzzle-tray">${renderPuzzlePieces(c.open)}</div>
          <button class="assist-link" id="gate-assist">${c.openAssist}</button>
          <div class="gate-continuation" id="gate-continuation" hidden>
            <span class="continuation-tape" aria-hidden="true"></span>
            <p class="continuation-note">${c.pictureComplete}</p>
            <button class="continuation-button" id="gate-continue" type="button">${c.continueStory}${icon('arrow')}</button>
            <p class="continuation-status" id="gate-continuation-status" role="status" aria-live="polite" aria-atomic="true" hidden></p>
            <div class="continuation-fallback" id="gate-continuation-fallback" hidden>
              <button class="continuation-retry" id="gate-continuation-retry" type="button">${c.retry}</button>
              <button class="continuation-silent" id="gate-continuation-silent" type="button">${c.enterWithoutAudio}</button>
            </div>
          </div>
        </div>
      </section>

      <main id="gift-content" ${unlocked ? '' : 'inert'}>
        <section class="hero section-pad" id="hero">
          <div class="hero-topline" data-reveal><span>THE PLAN</span><span>NO. 001 / ${c.madeWithLove}</span></div>
          <div class="hero-composition">
            <div class="hero-copy" data-reveal><span class="label-chip">${esc(project.hero.eyebrow)}</span><h2>${lines(project.hero.title)}</h2><p>${esc(project.hero.subtitle)}</p></div>
            <figure class="hero-photo-frame" data-reveal><span class="hero-tape" aria-hidden="true"></span><div class="hero-photo-media">${photo(project.hero.photo)}</div><figcaption>${esc(project.hero.photo.caption)}</figcaption></figure>
          </div>
          <div class="music-player" id="music-player" data-reveal>
            <div class="music-player-main"><div class="music-cover">${photo(project.music.cover)}</div><div class="music-copy"><span>${c.nowPlaying}</span><strong>${esc(project.music.title)}</strong><small>${esc(project.music.artist)}</small></div><div class="music-actions"><span class="music-more" aria-hidden="true"><i></i><i></i><i></i></span><button id="music-control" class="music-button" aria-label="${c.play}" ${project.music.audioUrl ? '' : 'disabled'}>${icon('play')}</button></div></div>
            ${project.music.audioUrl ? `<div class="music-progress"><span id="music-current">0:00</span><input id="music-seek" aria-label="${c.songProgress}" type="range" min="0" max="100" step="0.1" value="0"><span id="music-total">0:00</span></div>` : `<p class="music-note">${c.noAudio}</p>`}
          </div>
          <div class="scroll-cue">${c.scroll}<span>${icon('down')}</span></div>
        </section>

        <section class="invitation section-pad" id="invitation"><div class="section-tag" data-reveal>01 / ${c.invitation}</div>
          <div class="invitation-print-stage">
            <div class="invitation-printer-machine" aria-hidden="true"><span>THE PLAN PRESS</span><i></i><b></b></div>
            <div class="invitation-printer-slot" aria-hidden="true"></div>
            <div class="invitation-paper-sheet"><div class="invitation-paper"><div class="paper-tack">${icon('spark')}</div><p class="scribble">${c.invitationNote}</p><h2>${esc(project.invitation.title)}</h2><p class="invitation-message">${esc(project.invitation.message)}</p>
            <div class="event-grid"><div class="calendar-art"><span>${esc(date.month)}</span><strong>${esc(date.day)}</strong><em>${esc(date.weekday)}</em></div><div class="event-details">
              <div><span>${c.date}</span><strong>${esc(date.full)}</strong></div><div><span>${c.time}</span><strong>${esc(project.invitation.startTime)}${project.invitation.endTime ? ` – ${esc(project.invitation.endTime)}` : ''}</strong></div>
              ${project.invitation.venue ? `<div><span>${c.place}</span><strong>${esc(project.invitation.venue)}</strong>${project.invitation.address ? `<small>${esc(project.invitation.address)}</small>` : ''}${mapUrl ? `<a href="${esc(mapUrl)}" target="_blank" rel="noopener noreferrer">${icon('pin')}${c.map}</a>` : ''}</div>` : ''}
              ${project.invitation.dressCode ? `<div><span>${c.dress}</span><strong>${esc(project.invitation.dressCode)}</strong></div>` : ''}
            </div></div></div></div>
          </div>
          ${project.invitation.rundown.length ? `<div class="rundown"><div class="rundown-title" data-reveal><span>${c.plan}</span><i>${icon('spark')}</i></div><div class="rundown-list">${project.invitation.rundown.map((item, index) => `<div class="rundown-item" data-reveal style="--reveal-order:${index}"><time>${esc(item.time)}</time><span class="rundown-dot"></span><div><strong>${esc(item.title)}</strong>${item.note ? `<p>${esc(item.note)}</p>` : ''}</div><b>0${index + 1}</b></div>`).join('')}</div></div>` : ''}
        </section>

        <section class="letter-section section-pad"><div class="section-tag" data-reveal>02 / ${c.letter}</div><div class="letter-paper" data-reveal><div class="letter-tape"></div><span class="letter-stamp">${c.letterStamp} ${icon('heart')}</span><h2>${esc(project.letter.title)}</h2><div class="letter-body">${project.letter.paragraphs.map((p, index) => `<p data-reveal style="--reveal-order:${index}">${esc(p)}</p>`).join('')}</div><p class="letter-signoff" data-reveal>${esc(project.letter.signoff)}</p></div></section>
        <section class="gallery-section section-pad"><div class="section-tag" data-reveal>03 / ${c.gallery}</div><div class="gallery-heading" data-reveal><h2>${esc(project.gallery.title)}</h2><p>${esc(project.gallery.subtitle)}</p></div><div id="gallery-content">${renderGallery()}</div></section>
        <section class="closing-section section-pad"><div class="closing-paper" data-reveal><p class="scribble">${c.oneMoreThing}</p><h2>${esc(project.closing.title)}</h2><p>${esc(project.closing.message)}</p><div class="closing-divider"><span>${icon('spark')}</span><span>${icon('spark')}</span><span>${icon('spark')}</span></div><h3>${esc(project.closing.question)}</h3><button id="say-yes" class="yes-button">${c.yes} ${icon('arrow')}</button><small>THE PLAN · ${date.full.toUpperCase()}</small></div></section>
      </main>
    </div>
    <div class="modal-backdrop" id="ticket-modal" hidden><div class="ticket-modal" role="dialog" aria-modal="true" aria-labelledby="ticket-title"><button class="modal-close" id="ticket-close" aria-label="${c.close}">${icon('close')}</button><div class="printer"><div class="printer-top"><span>THE PLAN</span><span class="printer-light"></span></div><div class="printer-slot"></div><div class="printed-card" id="printed-card"><span class="ticket-stamp">THE PLAN<br>${c.forYou}</span><span class="ticket-kicker">${c.ticketKicker}</span><h3>${esc(project.invitation.title)}</h3><div class="ticket-rule"></div><span>${c.date}</span><strong>${esc(date.full)}</strong><span>${c.time}</span><strong>${esc(project.invitation.startTime)}${project.invitation.endTime ? ` – ${esc(project.invitation.endTime)}` : ''}</strong>${project.invitation.venue ? `<span>${c.place}</span><strong>${esc(project.invitation.venue)}</strong>` : ''}<em>${esc(project.closing.ticketMessage)}</em><small>THE PLAN · ${c.keepDate}</small></div></div><h2 id="ticket-title">${c.ready}</h2><p class="ticket-feedback" id="ticket-feedback">${c.saved}</p><div class="ticket-actions"><button id="ticket-download">${icon('download')}${c.download}</button><button id="ticket-share">${icon('share')}${c.share}</button></div></div></div>`;
  bind();
  if (unlocked && isPreview && previewTarget) {
    document.querySelector('#gate')?.remove();
    bindScrollReveals();
    bindInvitationPrinter();
    requestAnimationFrame(() => {
      const target = document.getElementById(previewTarget) || document.querySelector<HTMLElement>(`.${previewTarget}-section`);
      target?.scrollIntoView({ block: previewTarget === 'music-player' ? 'center' : 'start', behavior: 'instant' });
    });
  }
}

function openGate(): void {
  if (unlocked) return;
  unlocked = true;
  const gate = document.querySelector<HTMLElement>('#gate');
  const gift = document.querySelector<HTMLElement>('#gift-content');
  gift?.removeAttribute('inert');
  document.body.classList.remove('gate-open');
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  gate?.classList.add('gate-exit');
  setTimeout(() => {
    gate?.remove();
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    bindScrollReveals();
    bindInvitationPrinter();
  }, reduceMotion ? 0 : 620);
}

function completePuzzle(): void {
  if (gateCompletionPending || unlocked) return;
  gateCompletionPending = true;
  document.querySelector('#puzzle-board')?.classList.add('is-complete');
  document.querySelector('.gate-paper')?.classList.add('puzzle-completed');
  document.querySelector<HTMLElement>('.gate')?.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  if (mobileMusicHandshake) setTimeout(revealGateContinuation, reduceMotion ? 0 : 900);
  else setTimeout(openGate, reduceMotion ? 0 : 1300);
}

function revealGateContinuation(): void {
  const card = document.querySelector<HTMLElement>('#gate-continuation');
  const button = document.querySelector<HTMLButtonElement>('#gate-continue');
  if (!card || !button || unlocked) return;
  card.hidden = false;
  requestAnimationFrame(() => {
    card.classList.add('is-visible');
    button.focus({ preventScroll: true });
    card.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
  });
}

function showGateAudioFailure(): void {
  const c = t(project.locale);
  const card = document.querySelector<HTMLElement>('#gate-continuation');
  const button = document.querySelector<HTMLButtonElement>('#gate-continue');
  const status = document.querySelector<HTMLElement>('#gate-continuation-status');
  const fallback = document.querySelector<HTMLElement>('#gate-continuation-fallback');
  gateAudioAttemptPending = false;
  audio?.pause();
  card?.classList.add('has-error');
  if (button) { button.hidden = true; button.disabled = false; }
  if (status) { status.hidden = false; status.textContent = c.openingError; }
  if (fallback) fallback.hidden = false;
  document.querySelector<HTMLButtonElement>('#gate-continuation-retry')?.focus({ preventScroll: true });
}

function enterGiftWithMusic(): void {
  if (gateAudioAttemptPending || unlocked || !audio) {
    if (!audio && !unlocked) showGateAudioFailure();
    return;
  }
  const c = t(project.locale);
  const card = document.querySelector<HTMLElement>('#gate-continuation');
  const button = document.querySelector<HTMLButtonElement>('#gate-continue');
  const status = document.querySelector<HTMLElement>('#gate-continuation-status');
  const fallback = document.querySelector<HTMLElement>('#gate-continuation-fallback');
  gateAudioAttemptPending = true;
  card?.classList.remove('has-error');
  if (button) { button.hidden = false; button.disabled = true; }
  if (status) { status.hidden = false; status.textContent = c.openingLoading; }
  if (fallback) fallback.hidden = true;

  let playback: Promise<void>;
  try {
    // Keep play() directly inside the click handler so Safari treats it as a user gesture.
    playback = audio.play();
  } catch {
    showGateAudioFailure();
    return;
  }
  let timeoutId = 0;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error('Opening audio timed out')), GATE_AUDIO_TIMEOUT_MS);
  });
  void Promise.race([playback, timeout]).then(() => {
    clearTimeout(timeoutId);
    gateAudioAttemptPending = false;
    setTimeout(openGate, reduceMotion ? 0 : 260);
  }).catch(() => {
    clearTimeout(timeoutId);
    showGateAudioFailure();
  });
}

function startGiftMusic(): void {
  if (!audio || !audio.paused) return;
  const button = document.querySelector<HTMLButtonElement>('#music-control');
  void audio.play().catch(() => {
    if (button) button.title = project.locale === 'id' ? 'Ketuk untuk memutar musik' : 'Tap to play the music';
  });
}

function bindPuzzle(): void {
  const pieces = [...document.querySelectorAll<HTMLButtonElement>('.puzzle-piece')];
  if (!pieces.length) return;
  const solved = new Set<string>();

  const lockPiece = (piece: HTMLButtonElement, hole: HTMLElement) => {
    const id = piece.dataset.piece;
    if (!id || solved.has(id)) return;
    solved.add(id);
    hole.classList.remove('near');
    hole.classList.add('solved');
    piece.classList.add('solved');
    document.querySelector<SVGElement>(`[data-filled-piece="${id}"]`)?.classList.add('is-filled');
    document.querySelector<SVGElement>(`[data-empty-piece="${id}"]`)?.classList.add('is-filled');
    const counter = document.querySelector('#puzzle-counter');
    if (counter) counter.textContent = `${solved.size} / ${PUZZLE_PIECES.length}`;
    if (solved.size === PUZZLE_PIECES.length) {
      // Desktop keeps the immediate soundtrack. Mobile waits for the explicit
      // continuation button so Safari receives a reliable, dedicated gesture.
      if (!mobileMusicHandshake) startGiftMusic();
      setTimeout(completePuzzle, reduceMotion ? 0 : 320);
    }
  };

  pieces.forEach((piece) => {
    const id = piece.dataset.piece;
    const hole = id ? document.querySelector<HTMLElement>(`#puzzle-hole-${id}`) : null;
    if (!hole) return;
    let startX = 0; let startY = 0; let moved = false;
    piece.addEventListener('pointerdown', (event) => { startX = event.clientX; startY = event.clientY; moved = false; piece.setPointerCapture(event.pointerId); piece.classList.add('dragging'); });
    piece.addEventListener('pointermove', (event) => {
      if (!piece.hasPointerCapture(event.pointerId)) return;
      const dx = event.clientX - startX; const dy = event.clientY - startY;
      if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
      piece.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx * 0.025}deg)`;
      const a = piece.getBoundingClientRect(); const b = hole.getBoundingClientRect();
      hole.classList.toggle('near', a.left < b.right + 18 && a.right > b.left - 18 && a.top < b.bottom + 18 && a.bottom > b.top - 18);
    });
    piece.addEventListener('pointerup', (event) => {
      piece.classList.remove('dragging');
      const a = piece.getBoundingClientRect(); const b = hole.getBoundingClientRect();
      if (moved && a.left < b.right + 18 && a.right > b.left - 18 && a.top < b.bottom + 18 && a.bottom > b.top - 18) lockPiece(piece, hole);
      else { piece.style.transform = ''; hole.classList.remove('near'); }
      try { piece.releasePointerCapture(event.pointerId); } catch { /* pointer may already be released */ }
    });
    piece.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); lockPiece(piece, hole); } });
  });

  document.querySelector('#gate-assist')?.addEventListener('click', () => {
    pieces.forEach((piece) => {
      const id = piece.dataset.piece;
      const hole = id ? document.querySelector<HTMLElement>(`#puzzle-hole-${id}`) : null;
      if (hole) lockPiece(piece, hole);
    });
  });
}

function bindMusic(): void {
  const button = document.querySelector<HTMLButtonElement>('#music-control');
  if (!button || !project.music.audioUrl) return;
  audio = new Audio(project.music.audioUrl); audio.preload = 'auto'; audio.loop = true;
  const seek = document.querySelector<HTMLInputElement>('#music-seek');
  const current = document.querySelector<HTMLElement>('#music-current');
  const total = document.querySelector<HTMLElement>('#music-total');
  const player = document.querySelector<HTMLElement>('#music-player');
  const stamp = (value: number) => `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}`;
  button.addEventListener('click', async () => { if (!audio) return; if (audio.paused) { try { await audio.play(); } catch { button.title = t(project.locale).audioUnavailable; } } else audio.pause(); });
  audio.addEventListener('play', () => { button.innerHTML = icon('pause'); button.setAttribute('aria-label', t(project.locale).pause); player?.classList.add('is-playing'); });
  audio.addEventListener('pause', () => { button.innerHTML = icon('play'); button.setAttribute('aria-label', t(project.locale).play); player?.classList.remove('is-playing'); });
  audio.addEventListener('loadedmetadata', () => { if (total && audio) total.textContent = stamp(audio.duration); });
  audio.addEventListener('timeupdate', () => { if (!audio) return; if (current) current.textContent = stamp(audio.currentTime); if (seek && Number.isFinite(audio.duration)) { seek.value = String(audio.currentTime / audio.duration * 100); seek.style.setProperty('--progress', `${seek.value}%`); } });
  seek?.addEventListener('input', () => { if (audio && Number.isFinite(audio.duration)) { audio.currentTime = Number(seek.value) / 100 * audio.duration; seek.style.setProperty('--progress', `${seek.value}%`); } });
}

function bindGateContinuation(): void {
  document.querySelector('#gate-continue')?.addEventListener('click', enterGiftWithMusic);
  document.querySelector('#gate-continuation-retry')?.addEventListener('click', () => {
    const button = document.querySelector<HTMLButtonElement>('#gate-continue');
    if (button) button.hidden = false;
    enterGiftWithMusic();
  });
  document.querySelector('#gate-continuation-silent')?.addEventListener('click', openGate);
}

function bindScrollReveals(root: ParentNode = document): void {
  const nodes = [...root.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-visible)')];
  if (!nodes.length) return;
  document.querySelector('#gift-content')?.classList.add('motion-ready');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    nodes.forEach((node) => node.classList.add('is-visible'));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      (entry.target as HTMLElement).classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: .12, rootMargin: '0px 0px -7% 0px' });
  nodes.forEach((node) => observer.observe(node));
}

function bindInvitationPrinter(): void {
  const stage = document.querySelector<HTMLElement>('.invitation-print-stage');
  if (!stage || stage.classList.contains('is-printing')) return;
  if (reduceMotion || !('IntersectionObserver' in window)) {
    stage.classList.add('is-printing');
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    stage.classList.add('is-printing');
    observer.disconnect();
  }, { threshold: 0, rootMargin: '0px 0px -42% 0px' });
  observer.observe(stage);
}

function bind(): void {
  bindPuzzle(); bindMusic(); bindGateContinuation();
  document.querySelector('#say-yes')?.addEventListener('click', async () => {
    let responseSaved = true;
    if (!isPreview) {
      try { await saveYesResponse(project.id); } catch { responseSaved = false; }
    }
    const modal = document.querySelector<HTMLElement>('#ticket-modal'); if (!modal) return;
    modal.hidden = false; document.body.classList.add('modal-open');
    if (!responseSaved) feedback(t(project.locale).responseError);
    document.querySelector('#ticket-close')?.addEventListener('click', closeTicket, { once: true });
    setTimeout(() => document.querySelector<HTMLButtonElement>('#ticket-close')?.focus(), 50);
  });
  document.querySelector('#ticket-download')?.addEventListener('click', async () => {
    try { ticketBlob ||= await makeTicket(project); downloadBlob(ticketBlob, `the-plan-${project.id}.png`); }
    catch { feedback(t(project.locale).downloadError); }
  });
  document.querySelector('#ticket-share')?.addEventListener('click', async () => {
    try {
      ticketBlob ||= await makeTicket(project);
      const file = new File([ticketBlob], `the-plan-${project.id}.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: project.invitation.title });
      else { downloadBlob(ticketBlob, file.name); feedback(t(project.locale).shareFallback); }
    } catch (error) { if ((error as Error).name !== 'AbortError') feedback(t(project.locale).downloadError); }
  });
}

function feedback(message: string): void { const el = document.querySelector('#ticket-feedback'); if (el) el.textContent = message; }
function closeTicket(): void { const modal = document.querySelector<HTMLElement>('#ticket-modal'); if (!modal || modal.hidden) return; modal.hidden = true; document.body.classList.remove('modal-open'); document.querySelector<HTMLButtonElement>('#say-yes')?.focus(); }

document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeTicket(); });
render();
