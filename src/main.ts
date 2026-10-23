import '@fontsource/kalam/400.css';
import '@fontsource/kalam/700.css';
import '@fontsource/caveat/400.css';
import '@fontsource/caveat/700.css';
import '@fontsource/nunito-sans/400.css';
import '@fontsource/nunito-sans/700.css';
import './style.css';
import { demo } from './demo';
import { demoEnglish } from './demoEnglish';
import { t, eventDate } from './copy';
import { safeExternalUrl, validateProject, type GiftProject, type Photo } from './project';
import { saveYesResponse } from './response';
import { downloadBlob, makeTicket } from './ticket';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('Missing app root');

let project: GiftProject = new URLSearchParams(location.search).get('lang') === 'en' ? demoEnglish : demo;
const issues = validateProject(project);
if (issues.length) throw new Error(`Invalid demo: ${issues.join(', ')}`);
let unlocked = false;
let visiblePhotos = 4;
let ticketBlob: Blob | null = null;
let audio: HTMLAudioElement | null = null;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const esc = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] || char);
const lines = (value: string) => esc(value).replace(/\n/g, '<br>');
const photo = (item: Photo, className = '') => `<img class="${className}" src="${esc(item.src)}" alt="${esc(item.alt)}" loading="lazy" decoding="async">`;
const icon = (name: string) => {
  const common = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
  const paths: Record<string, string> = {
    play: '<path d="m8 5 11 7-11 7V5Z"/>', pause: '<path d="M8 5v14M16 5v14"/>',
    music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    arrow: '<path d="M5 12h14m-7-7 7 7-7 7"/>', close: '<path d="M5 5l14 14M19 5 5 19"/>',
    download: '<path d="M12 3v12m-4-4 4 4 4-4M4 17v3h16v-3"/>', share: '<path d="M12 16V3m-4 4 4-4 4 4M4 13v7h16v-7"/>',
    pin: '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  };
  return `<svg ${common}>${paths[name] || ''}</svg>`;
};

function renderGallery(): string {
  const c = t(project.locale);
  const shown = project.gallery.photos.slice(0, visiblePhotos);
  return `<div class="stamp-grid">${shown.map((item, index) => `<figure class="stamp stamp-${index % 4}">${photo(item)}<figcaption>${esc(item.caption)}</figcaption></figure>`).join('')}</div>
    ${project.gallery.photos.length > 4 ? `<button class="text-link" id="gallery-toggle">${visiblePhotos < project.gallery.photos.length ? c.more : c.less} ${icon('arrow')}</button>` : ''}`;
}

function render(): void {
  const c = t(project.locale);
  const date = eventDate(project.invitation.date, project.locale);
  document.documentElement.lang = project.locale;
  document.title = `${project.invitation.title} · The Plan`;
  const mapUrl = safeExternalUrl(project.invitation.mapsUrl);
  app!.innerHTML = `
    <div class="grain" aria-hidden="true"></div>
    <div class="demo-ribbon">${c.demo}</div>
    <button class="language-switch" id="language-switch" aria-label="${project.locale === 'id' ? 'Switch to English' : 'Ganti ke Bahasa Indonesia'}">${project.locale === 'id' ? 'EN' : 'ID'}</button>
    <div class="gift-shell ${unlocked ? 'is-open' : ''}">
      <section class="gate" id="gate" aria-label="Opening puzzle">
        <div class="gate-paper">
          <div class="small-star star-a">✳</div><div class="small-star star-b">✳</div>
          <p class="eyebrow red">${esc(project.opening.eyebrow)}</p>
          <h1>${lines(project.opening.title)}</h1>
          <div class="puzzle-board" id="puzzle-board">
            <div class="gate-photo-frame">${photo(project.opening.photo)}<span>${esc(project.opening.photo.caption)}</span></div>
            <div class="puzzle-hole" id="puzzle-hole"><span>?</span></div>
          </div>
          <p class="gate-note">${esc(project.opening.note)}</p>
          <p class="gate-instruction">${c.puzzleHint}</p>
          <div class="puzzle-tray"><button class="puzzle-piece" id="puzzle-piece" aria-label="${c.open}" type="button"><span>♡</span></button><span class="tray-arrow">↗</span></div>
          <button class="assist-link" id="gate-assist">${c.openAssist}</button>
        </div>
      </section>

      <main id="gift-content" ${unlocked ? '' : 'inert'}>
        <section class="hero section-pad" id="hero">
          <div class="hero-topline"><span>THE PLAN</span><span>NO. 001 / MADE WITH LOVE</span></div>
          <div class="hero-composition">
            <div class="hero-copy"><span class="label-chip">${esc(project.hero.eyebrow)}</span><h2>${lines(project.hero.title)}</h2><p>${esc(project.hero.subtitle)}</p></div>
            <figure class="hero-polaroid"><span class="tape tape-one"></span>${photo(project.hero.photo)}<figcaption>${esc(project.hero.photo.caption)}</figcaption></figure>
          </div>
          <div class="music-card"><div class="music-cover">${photo(project.music.cover)}</div><div class="music-copy"><span>OUR SOUNDTRACK</span><strong>${esc(project.music.title)}</strong><small>${esc(project.music.artist)}</small></div><button id="music-control" class="music-button" aria-label="${c.play}" ${project.music.audioUrl ? '' : 'disabled'}>${icon('play')}</button></div>
          ${project.music.audioUrl ? '<div class="music-progress"><span id="music-current">0:00</span><input id="music-seek" aria-label="Song progress" type="range" min="0" max="100" value="0"><span id="music-total">0:00</span></div>' : `<p class="music-note">${c.noAudio}</p>`}
          <div class="scroll-cue">${c.scroll}<span>↓</span></div>
        </section>

        <section class="invitation section-pad" id="invitation"><div class="section-tag">01 / ${c.invitation}</div>
          <div class="invitation-paper"><div class="paper-tack">✳</div><p class="scribble">a little something for us</p><h2>${esc(project.invitation.title)}</h2><p class="invitation-message">${esc(project.invitation.message)}</p>
          <div class="event-grid"><div class="calendar-art"><span>${esc(date.month)}</span><strong>${esc(date.day)}</strong><em>${esc(date.weekday)}</em></div><div class="event-details">
            <div><span>${c.date}</span><strong>${esc(date.full)}</strong></div><div><span>${c.time}</span><strong>${esc(project.invitation.startTime)}${project.invitation.endTime ? ` – ${esc(project.invitation.endTime)}` : ''}</strong></div>
            ${project.invitation.venue ? `<div><span>${c.place}</span><strong>${esc(project.invitation.venue)}</strong>${project.invitation.address ? `<small>${esc(project.invitation.address)}</small>` : ''}${mapUrl ? `<a href="${esc(mapUrl)}" target="_blank" rel="noopener noreferrer">${icon('pin')}${c.map}</a>` : ''}</div>` : ''}
            ${project.invitation.dressCode ? `<div><span>${c.dress}</span><strong>${esc(project.invitation.dressCode)}</strong></div>` : ''}
          </div></div></div>
          ${project.invitation.rundown.length ? `<div class="rundown"><div class="rundown-title"><span>${c.plan}</span><i>✦</i></div><div class="rundown-list">${project.invitation.rundown.map((item, index) => `<div class="rundown-item"><time>${esc(item.time)}</time><span class="rundown-dot"></span><div><strong>${esc(item.title)}</strong>${item.note ? `<p>${esc(item.note)}</p>` : ''}</div><b>0${index + 1}</b></div>`).join('')}</div></div>` : ''}
        </section>

        <section class="letter-section section-pad"><div class="section-tag">02 / ${c.letter}</div><div class="letter-paper"><div class="letter-tape"></div><span class="letter-stamp">with all my heart ♡</span><h2>${esc(project.letter.title)}</h2><div class="letter-body">${project.letter.paragraphs.map(p => `<p>${esc(p)}</p>`).join('')}</div><p class="letter-signoff">${esc(project.letter.signoff)}</p></div></section>
        <section class="gallery-section section-pad"><div class="section-tag">03 / ${c.gallery}</div><div class="gallery-heading"><h2>${esc(project.gallery.title)}</h2><p>${esc(project.gallery.subtitle)}</p></div><div id="gallery-content">${renderGallery()}</div></section>
        <section class="closing-section section-pad"><div class="closing-paper"><p class="scribble">one more thing...</p><h2>${esc(project.closing.title)}</h2><p>${esc(project.closing.message)}</p><div class="closing-divider">✳ &nbsp; ✳ &nbsp; ✳</div><h3>${esc(project.closing.question)}</h3><button id="say-yes" class="yes-button">${c.yes} ${icon('arrow')}</button><small>THE PLAN · ${date.full.toUpperCase()}</small></div></section>
        <footer>made with love · for you, always.</footer>
      </main>
    </div>
    <div class="modal-backdrop" id="ticket-modal" hidden><div class="ticket-modal" role="dialog" aria-modal="true" aria-labelledby="ticket-title"><button class="modal-close" id="ticket-close" aria-label="${c.close}">${icon('close')}</button><div class="printer"><div class="printer-top"><span>THE PLAN</span><span class="printer-light"></span></div><div class="printer-slot"></div><div class="printed-card" id="printed-card"><span class="ticket-stamp">THE PLAN<br>FOR YOU</span><span class="ticket-kicker">A LITTLE DAY, PLANNED WITH LOVE</span><h3>${esc(project.invitation.title)}</h3><div class="ticket-rule"></div><span>${c.date}</span><strong>${esc(date.full)}</strong><span>${c.time}</span><strong>${esc(project.invitation.startTime)}${project.invitation.endTime ? ` – ${esc(project.invitation.endTime)}` : ''}</strong>${project.invitation.venue ? `<span>${c.place}</span><strong>${esc(project.invitation.venue)}</strong>` : ''}<em>${esc(project.closing.ticketMessage)}</em><small>THE PLAN · FOR YOU, ALWAYS.</small></div></div><h2 id="ticket-title">${c.ready}</h2><p class="ticket-feedback" id="ticket-feedback">${c.saved}</p><div class="ticket-actions"><button id="ticket-download">${icon('download')}${c.download}</button><button id="ticket-share">${icon('share')}${c.share}</button></div></div></div>`;
  bind();
}

function openGate(): void {
  if (unlocked) return;
  unlocked = true;
  const gate = document.querySelector<HTMLElement>('#gate');
  gate?.classList.add('gate-exit');
  setTimeout(() => { gate?.remove(); document.querySelector('#gift-content')?.removeAttribute('inert'); document.querySelector('#hero')?.scrollIntoView({ behavior: reduceMotion ? 'instant' : 'smooth' }); }, reduceMotion ? 0 : 540);
}

function bindPuzzle(): void {
  const piece = document.querySelector<HTMLButtonElement>('#puzzle-piece');
  const hole = document.querySelector<HTMLElement>('#puzzle-hole');
  if (!piece || !hole) return;
  let startX = 0; let startY = 0; let moved = false;
  piece.addEventListener('pointerdown', (event) => { startX = event.clientX; startY = event.clientY; moved = false; piece.setPointerCapture(event.pointerId); piece.classList.add('dragging'); });
  piece.addEventListener('pointermove', (event) => {
    if (!piece.hasPointerCapture(event.pointerId)) return;
    const dx = event.clientX - startX; const dy = event.clientY - startY;
    if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
    piece.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx * 0.035}deg)`;
    const a = piece.getBoundingClientRect(); const b = hole.getBoundingClientRect();
    hole.classList.toggle('near', a.left < b.right + 24 && a.right > b.left - 24 && a.top < b.bottom + 24 && a.bottom > b.top - 24);
  });
  piece.addEventListener('pointerup', (event) => {
    piece.classList.remove('dragging'); if (!moved) return;
    const a = piece.getBoundingClientRect(); const b = hole.getBoundingClientRect();
    if (a.left < b.right + 24 && a.right > b.left - 24 && a.top < b.bottom + 24 && a.bottom > b.top - 24) { hole.classList.add('solved'); piece.classList.add('solved'); setTimeout(openGate, 360); }
    else { piece.style.transform = ''; hole.classList.remove('near'); }
    try { piece.releasePointerCapture(event.pointerId); } catch { /* pointer may already be released */ }
  });
  piece.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openGate(); } });
  document.querySelector('#gate-assist')?.addEventListener('click', openGate);
}

function bindMusic(): void {
  const button = document.querySelector<HTMLButtonElement>('#music-control');
  if (!button || !project.music.audioUrl) return;
  audio = new Audio(project.music.audioUrl); audio.preload = 'metadata';
  const seek = document.querySelector<HTMLInputElement>('#music-seek');
  const current = document.querySelector<HTMLElement>('#music-current');
  const total = document.querySelector<HTMLElement>('#music-total');
  const stamp = (value: number) => `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}`;
  button.addEventListener('click', async () => { if (!audio) return; if (audio.paused) { try { await audio.play(); } catch { button.title = 'Audio unavailable'; } } else audio.pause(); });
  audio.addEventListener('play', () => { button.innerHTML = icon('pause'); button.setAttribute('aria-label', t(project.locale).pause); });
  audio.addEventListener('pause', () => { button.innerHTML = icon('play'); button.setAttribute('aria-label', t(project.locale).play); });
  audio.addEventListener('loadedmetadata', () => { if (total && audio) total.textContent = stamp(audio.duration); });
  audio.addEventListener('timeupdate', () => { if (!audio) return; if (current) current.textContent = stamp(audio.currentTime); if (seek && Number.isFinite(audio.duration)) seek.value = String(audio.currentTime / audio.duration * 100); });
  seek?.addEventListener('input', () => { if (audio && Number.isFinite(audio.duration)) audio.currentTime = Number(seek.value) / 100 * audio.duration; });
}

function bind(): void {
  bindPuzzle(); bindMusic();
  document.querySelector('#language-switch')?.addEventListener('click', () => { audio?.pause(); audio = null; project = project.locale === 'id' ? demoEnglish : demo; visiblePhotos = 4; history.replaceState(null, '', `${location.pathname}?lang=${project.locale}`); render(); });
  bindGallery();
  document.querySelector('#say-yes')?.addEventListener('click', async () => {
    await saveYesResponse(project.id);
    const modal = document.querySelector<HTMLElement>('#ticket-modal'); if (!modal) return;
    modal.hidden = false; document.body.classList.add('modal-open');
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

function bindGallery(): void { document.querySelector('#gallery-toggle')?.addEventListener('click', () => { visiblePhotos = visiblePhotos < project.gallery.photos.length ? Math.min(visiblePhotos + 4, project.gallery.photos.length) : 4; const target = document.querySelector('#gallery-content'); if (target) target.innerHTML = renderGallery(); bindGallery(); }); }
function feedback(message: string): void { const el = document.querySelector('#ticket-feedback'); if (el) el.textContent = message; }
function closeTicket(): void { const modal = document.querySelector<HTMLElement>('#ticket-modal'); if (!modal || modal.hidden) return; modal.hidden = true; document.body.classList.remove('modal-open'); document.querySelector<HTMLButtonElement>('#say-yes')?.focus(); }

document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeTicket(); });
render();
