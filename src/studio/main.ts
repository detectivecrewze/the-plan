import './style.css';
import { demo } from '../demo';
import type { GiftProject, Locale, Photo, PlanItem } from '../project';
import { validateProject } from '../project';
import { projectSchema } from '../projectSchema';
import { themeIds, themes } from '../themes';
import { studioApi, studioSession, StudioApiError } from './api';
import { studioText } from './copy';
import { contentPresets, type PresetSection } from './presets';
import { musicPlaylist } from '../musicPlaylist';
import { barcodeDataUrl, downloadBarcodePng, makeBarcodeSvg, reviewTemplate } from './barcode';

type Section = 'identity' | 'opening' | 'hero' | 'music' | 'invitation' | 'letter' | 'gallery' | 'closing';
const sections: Section[] = ['identity', 'opening', 'hero', 'music', 'invitation', 'letter', 'gallery', 'closing'];
const idPattern = /^[a-z0-9][a-z0-9-]{2,63}$/;
const root = document.querySelector<HTMLDivElement>('#app')!;
let uiLocale: Locale = localStorage.getItem('the-plan:studio-language') === 'en' ? 'en' : 'id';
let project: GiftProject | null = null;
let activeSection: Section = 'identity';
let savedAt = '';
let publishedAt: string | null = null;
let dirty = false;
let saveTimer: number | undefined;
let saveChain = Promise.resolve();
let revision = 0;
let errorText = '';
let previewOpen = false;
let barcodeOpen = false;
let barcodeSvg = '';
let barcodeProject: GiftProject | null = null;
let pendingPreset: string | null = null;
let musicMode: 'playlist' | 'upload' = 'playlist';
let playlistPreview: HTMLAudioElement | null = null;
let playlistPreviewUrl = '';

const t = () => studioText(uiLocale);
const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
const giftUrl = () => `${location.origin}/gift/${project!.id}`;
const status = (value: string, isError = false) => {
  const node = document.querySelector<HTMLElement>('#studio-status');
  if (node) { node.textContent = value; node.dataset.error = String(isError); }
};

function getPath(path: string): unknown {
  return path.split('.').reduce<unknown>((value, part) => (value as Record<string, unknown> | undefined)?.[part], project);
}

function setPath(path: string, value: unknown): void {
  const parts = path.split('.');
  let parent = project as unknown as Record<string, unknown>;
  for (const part of parts.slice(0, -1)) parent = parent[part] as Record<string, unknown>;
  parent[parts.at(-1)!] = value;
  markDirty();
}

function markDirty(): void {
  dirty = true;
  revision++;
  status(t().unsaved);
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => void flushSave(), 850);
}

async function flushSave(): Promise<boolean> {
  window.clearTimeout(saveTimer);
  if (!project || !dirty) { await saveChain; return !errorText; }
  const snapshot = structuredClone(project);
  const savingRevision = revision;
  const parsed = projectSchema.safeParse(snapshot);
  if (!parsed.success) {
    errorText = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
    status(errorText, true);
    return false;
  }
  status(t().saving);
  saveChain = saveChain.catch(() => undefined).then(async () => {
    const result = await studioApi.saveDraft(snapshot);
    savedAt = result.savedAt;
    if (revision === savingRevision) { dirty = false; errorText = ''; status(t().saved); }
  });
  try { await saveChain; return true; }
  catch (error) {
    saveChain = Promise.resolve();
    errorText = error instanceof Error ? error.message : t().saveFailed;
    status(`${t().saveFailed} ${errorText}`, true);
    if (error instanceof StudioApiError && error.status === 401) studioSession.clear();
    return false;
  }
}

function input(label: string, path: string, kind: 'text' | 'textarea' | 'date' | 'time' | 'url' = 'text', hint = ''): string {
  const value = getPath(path) ?? '';
  const isEndTime = path === 'invitation.endTime';
  const fieldKind = isEndTime ? 'text' : kind;
  const control = kind === 'textarea'
    ? `<textarea data-field="${escapeHtml(path)}" rows="4">${escapeHtml(value)}</textarea>`
    : `<input data-field="${escapeHtml(path)}" type="${fieldKind}" value="${escapeHtml(value)}" ${isEndTime ? 'placeholder="21:00 / END"' : ''}>`;
  const description = isEndTime ? t().endTimeHint : hint;
  return `<label class="studio-field"><span>${escapeHtml(label)}</span>${control}${description ? `<small>${escapeHtml(description)}</small>` : ''}</label>`;
}

function uploadControl(path: string, type: string): string {
  return `<label class="upload-control"><span>${escapeHtml(t().upload)} · ${escapeHtml(type)}</span><input type="file" data-upload="${escapeHtml(path)}" accept="${escapeHtml(type)}"></label>`;
}

function photoFields(prefix: string, label: string, mediaType = 'image/*'): string {
  const photo = getPath(prefix) as Photo;
  return `<div class="studio-group"><h3>${escapeHtml(label)}</h3><div class="studio-grid">${input(t().photoUrl, `${prefix}.src`, 'url')}${uploadControl(`${prefix}.src`, mediaType)}</div>${photo?.src ? `<img class="media-thumb" src="${escapeHtml(photo.src)}" alt="">` : ''}${input(t().caption, `${prefix}.caption`)}</div>`;
}

function presetControls(section: PresetSection): string {
  if (!project) return '';
  const presets = contentPresets[project.locale].filter((preset) => preset.section === section);
  return `<section class="preset-panel"><div class="preset-heading"><div><strong>${escapeHtml(t().presets)}</strong><small>${escapeHtml(t().presetHint)}</small></div><span aria-hidden="true">✦</span></div><div class="preset-options">${presets.map((preset) => `<button type="button" class="preset-option" data-action="choose-preset" data-preset-id="${escapeHtml(preset.id)}"><strong>${escapeHtml(preset.label)}</strong><small>${escapeHtml(preset.summary)}</small></button>`).join('')}</div></section>`;
}

function songCard(track: typeof musicPlaylist[number], index: number): string {
  const selected = project?.music.audioUrl === track.audioUrl;
  return `<article class="playlist-card" data-search="${escapeHtml(`${track.title} ${track.artist}`.toLocaleLowerCase())}"><img src="${escapeHtml(track.coverUrl)}" alt="" loading="lazy"><div class="playlist-meta"><strong>${escapeHtml(track.title)}</strong><span>${escapeHtml(track.artist)}</span>${selected ? `<small>${escapeHtml(t().selectedSong)}</small>` : ''}</div><div class="playlist-actions"><button type="button" class="secondary-button" data-action="preview-song" data-song-index="${index}">${escapeHtml(t().previewSong)}</button><button type="button" class="${selected ? 'selected-song' : 'secondary-button'}" data-action="use-song" data-song-index="${index}">${escapeHtml(selected ? t().selectedSong : t().useSong)}</button></div></article>`;
}

function renderFields(): string {
  if (!project) return '';
  const copy = t();
  switch (activeSection) {
    case 'identity': return `<div class="studio-grid"><label class="studio-field"><span>${copy.giftLanguage}</span><select data-field="locale"><option value="id" ${project.locale === 'id' ? 'selected' : ''}>Bahasa Indonesia</option><option value="en" ${project.locale === 'en' ? 'selected' : ''}>English</option></select></label><label class="studio-field"><span>${copy.theme}</span><select data-field="theme">${themeIds.map((id) => `<option value="${id}" ${project!.theme === id ? 'selected' : ''}>${escapeHtml(themes[id].name)}</option>`).join('')}</select></label>${input(copy.recipient, 'recipient')}${input(copy.sender, 'sender')}</div><div class="palette-grid">${themeIds.map((id) => `<button type="button" class="palette ${project!.theme === id ? 'selected' : ''}" data-theme="${id}" style="--swatch:${themes[id].colors.primary};--swatch-paper:${themes[id].colors.paper}"><span class="palette-color"></span><span>${escapeHtml(themes[id].name)}</span></button>`).join('')}</div>`;
    case 'opening': return `${presetControls('opening')}${input(copy.eyebrow, 'opening.eyebrow')}${input(copy.title, 'opening.title', 'textarea')}${input(copy.note, 'opening.note', 'textarea')}${photoFields('opening.photo', copy.opening)}`;
    case 'hero': return `${presetControls('hero')}${input(copy.eyebrow, 'hero.eyebrow')}${input(copy.title, 'hero.title', 'textarea')}${input(copy.subtitle, 'hero.subtitle', 'textarea')}${photoFields('hero.photo', copy.hero)}`;
    case 'music': {
      const catalog = `<div class="music-picker"><label class="studio-field"><span>${escapeHtml(copy.searchSongs)}</span><input type="search" data-playlist-search placeholder="${escapeHtml(copy.searchSongs)}"></label><div class="playlist-list">${musicPlaylist.map((track, index) => songCard(track, index)).join('')}</div></div>`;
      const upload = `<div class="studio-grid">${input(copy.musicTitle, 'music.title')}${input(copy.artist, 'music.artist')}${input(copy.audioUrl, 'music.audioUrl', 'url')}${uploadControl('music.audioUrl', 'audio/*')}</div>${photoFields('music.cover', copy.coverUrl)}`;
      return `<div class="music-source-switch" role="group" aria-label="${escapeHtml(copy.musicSource)}"><button type="button" class="${musicMode === 'playlist' ? 'active' : ''}" data-action="music-mode" data-mode="playlist">${escapeHtml(copy.playlistChoice)}</button><button type="button" class="${musicMode === 'upload' ? 'active' : ''}" data-action="music-mode" data-mode="upload">${escapeHtml(copy.uploadOwn)}</button></div>${musicMode === 'playlist' ? catalog : upload}`;
    }
    case 'invitation': return `${presetControls('invitation')}${input(copy.title, 'invitation.title')}${input(copy.message, 'invitation.message', 'textarea')}<div class="studio-grid">${input(copy.date, 'invitation.date', 'date')}${input(copy.startTime, 'invitation.startTime', 'time')}${input(copy.endTime, 'invitation.endTime', 'time')}${input(copy.venue, 'invitation.venue')}${input(copy.address, 'invitation.address')}${input(copy.mapsUrl, 'invitation.mapsUrl', 'url')}${input(copy.dressCode, 'invitation.dressCode')}</div><div class="studio-group"><div class="group-heading"><h3>${copy.rundown}</h3><button type="button" data-action="add-agenda">+ ${copy.addAgenda}</button></div>${project.invitation.rundown.map((item, index) => `<div class="array-card"><div class="array-card-heading"><span>${String(index + 1).padStart(2, '0')}</span><div><button type="button" data-action="agenda-up" data-index="${index}" aria-label="${copy.moveUp}">↑</button><button type="button" data-action="agenda-down" data-index="${index}" aria-label="${copy.moveDown}">↓</button><button type="button" data-action="agenda-remove" data-index="${index}">${copy.remove}</button></div></div><div class="studio-grid">${input(copy.agendaTime, `invitation.rundown.${index}.time`, 'time')}${input(copy.agendaTitle, `invitation.rundown.${index}.title`)}</div>${input(copy.agendaNote, `invitation.rundown.${index}.note`)}</div>`).join('')}</div>`;
    case 'letter': return `${presetControls('letter')}${input(copy.title, 'letter.title')}<label class="studio-field"><span>${copy.paragraphs}</span><textarea data-field="letter.paragraphs" rows="15">${escapeHtml(project.letter.paragraphs.join('\n\n'))}</textarea></label>${input(copy.signoff, 'letter.signoff')}`;
    case 'gallery': return `${input(copy.title, 'gallery.title')}${input(copy.subtitle, 'gallery.subtitle')}<div class="studio-group"><div class="group-heading"><h3>${copy.galleryItems}</h3><button type="button" data-action="add-media">+ ${copy.addMedia}</button></div>${project.gallery.photos.map((item, index) => `<div class="array-card"><div class="array-card-heading"><span>${String(index + 1).padStart(2, '0')} · ${item.type === 'video' ? copy.video : copy.image}</span><div><button type="button" data-action="media-up" data-index="${index}" aria-label="${copy.moveUp}">↑</button><button type="button" data-action="media-down" data-index="${index}" aria-label="${copy.moveDown}">↓</button><button type="button" data-action="media-remove" data-index="${index}">${copy.remove}</button></div></div><label class="studio-field"><span>${copy.mediaType}</span><select data-field="gallery.photos.${index}.type"><option value="image" ${item.type !== 'video' ? 'selected' : ''}>${copy.image}</option><option value="video" ${item.type === 'video' ? 'selected' : ''}>${copy.video}</option></select></label><div class="studio-grid">${input(copy.mediaUrl, `gallery.photos.${index}.src`, 'url')}${uploadControl(`gallery.photos.${index}.src`, item.type === 'video' ? 'video/*' : 'image/*')}</div>${item.src && item.type !== 'video' ? `<img class="media-thumb" src="${escapeHtml(item.src)}" alt="">` : ''}${item.type === 'video' ? `<div class="studio-grid">${input(copy.posterUrl, `gallery.photos.${index}.poster`, 'url')}${uploadControl(`gallery.photos.${index}.poster`, 'image/*')}</div>` : ''}${input(copy.caption, `gallery.photos.${index}.caption`)}</div>`).join('')}</div>`;
    case 'closing': return `${presetControls('closing')}${input(copy.title, 'closing.title')}${input(copy.message, 'closing.message', 'textarea')}${input(copy.question, 'closing.question', 'textarea')}${input(copy.ticketMessage, 'closing.ticketMessage', 'textarea')}`;
  }
}

function shell(inner: string): void {
  document.documentElement.lang = uiLocale;
  root.innerHTML = `<div class="studio-shell"><header class="studio-header"><a class="studio-brand" href="/studio">${t().brand}</a><div class="studio-header-actions"><label class="language-switch">${t().uiLanguage}<select id="ui-locale"><option value="id" ${uiLocale === 'id' ? 'selected' : ''}>ID</option><option value="en" ${uiLocale === 'en' ? 'selected' : ''}>EN</option></select></label>${studioSession.get() ? `<a class="text-button" style="text-decoration:none" href="/admin">${t().dashboard}</a><button type="button" class="text-button" data-action="logout">${t().logout}</button>` : ''}</div></header>${inner}</div>`;
}

function renderLogin(): void {
  shell(`<main class="studio-entry"><div class="entry-art"><span class="stamp-mark">THE PLAN</span><h1>${t().loginTitle}</h1><p>Every detail of your day, assembled with care.</p></div><form id="login-form" class="entry-form"><label class="studio-field"><span>${t().password}</span><input name="password" type="password" autocomplete="current-password" required></label><p class="form-error" role="alert">${escapeHtml(errorText)}</p><button class="primary-button" type="submit">${t().login} <span aria-hidden="true">↗</span></button></form></main>`);
}

function renderChooser(): void {
  shell(`<main class="studio-entry"><div class="entry-art"><span class="stamp-mark">THE PLAN</span><h1>${t().projectTitle}</h1><p>${t().createHint}</p></div><form id="project-form" class="entry-form"><label class="studio-field"><span>${t().projectId}</span><input name="projectId" type="text" placeholder="plan-nara-ari" value="${escapeHtml(new URLSearchParams(location.search).get('id') || '')}" pattern="[a-z0-9][a-z0-9-]{2,63}" required></label><p class="form-error" role="alert">${escapeHtml(errorText)}</p><button class="primary-button" type="submit" name="intent" value="open">${t().open} <span aria-hidden="true">↗</span></button><button class="secondary-button" type="submit" name="intent" value="create">${t().create}</button></form></main>`);
}

function stopPlaylistPreview(): void {
  playlistPreview?.pause(); playlistPreview = null; playlistPreviewUrl = '';
  document.querySelectorAll<HTMLButtonElement>('[data-action=preview-song]').forEach((button) => { button.textContent = t().previewSong; });
}
function cancelPreset(): void {
  pendingPreset = null; document.querySelector('.preset-overlay')?.remove(); document.body.style.overflow = '';
  document.querySelector<HTMLButtonElement>('[data-action="choose-preset"]')?.focus();
}
function mountPresetConfirmation(): void {
  if (!project || !pendingPreset) return;
  const preset = contentPresets[project.locale].find((item) => item.id === pendingPreset);
  if (!preset) { pendingPreset = null; return; }
  const labels: Record<string, string> = { title: t().title, eyebrow: t().eyebrow, note: t().note, subtitle: t().subtitle, message: t().message, paragraphs: t().paragraphs, signoff: t().signoff, question: t().question, ticketMessage: t().ticketMessage };
  const changes = Object.entries(preset.values).map(([path, next]) => {
    const format = (value: unknown) => (Array.isArray(value) ? value.join('\n\n') : String(value ?? '')).trim() || '—';
    return `<div class="preset-change"><span>${escapeHtml(labels[path.split('.').at(-1)!] || path)}</span><div><pre>${escapeHtml(format(getPath(path)))}</pre><b aria-hidden="true">↓</b><pre>${escapeHtml(format(next))}</pre></div></div>`;
  }).join('');
  const overlay = document.createElement('div'); overlay.className = 'preset-overlay';
  overlay.innerHTML = `<section class="preset-dialog" role="dialog" aria-modal="true" aria-labelledby="preset-dialog-title"><span class="overline">${escapeHtml(t().presets)}</span><h2 id="preset-dialog-title">${escapeHtml(preset.label)}</h2><p>${escapeHtml(t().presetConfirmHint)}</p><div class="preset-changes">${changes}</div><div class="preset-dialog-actions"><button type="button" class="secondary-button" data-action="cancel-preset">${escapeHtml(t().cancelPreset)}</button><button type="button" class="primary-button" data-action="apply-preset">${escapeHtml(t().applyPreset)}</button></div></section>`;
  overlay.addEventListener('click', (event) => { if (event.target === overlay) cancelPreset(); });
  root.append(overlay); document.body.style.overflow = 'hidden';
  overlay.querySelector<HTMLButtonElement>('[data-action="cancel-preset"]')?.focus();
}
function applyPreset(): void {
  if (!project || !pendingPreset) return;
  const preset = contentPresets[project.locale].find((item) => item.id === pendingPreset);
  if (!preset) return;
  for (const [path, value] of Object.entries(preset.values)) {
    const parts = path.split('.'); let target = project as unknown as Record<string, unknown>;
    for (const part of parts.slice(0, -1)) target = target[part] as Record<string, unknown>;
    target[parts.at(-1)!] = value;
  }
  pendingPreset = null; document.body.style.overflow = ''; markDirty(); renderEditor();
}

function renderEditor(): void {
  if (!project) return;
  const copy = t();
  shell(`<main class="editor"><aside class="editor-sidebar"><div class="project-meta"><span>${publishedAt ? copy.published : copy.draft}</span><strong>${escapeHtml(project.id)}</strong></div><nav aria-label="Studio sections">${sections.map((section, index) => `<button class="section-button ${activeSection === section ? 'active' : ''}" type="button" data-section="${section}"><span>${String(index + 1).padStart(2, '0')}</span>${copy[section]}</button>`).join('')}</nav><div class="sidebar-note">${copy.createHint}</div></aside><div class="editor-main"><div class="editor-toolbar"><div><span class="overline">THE PLAN / ${String(sections.indexOf(activeSection) + 1).padStart(2, '0')}</span><h1>${copy[activeSection]}</h1><span id="studio-status" role="status">${dirty ? copy.unsaved : copy.saved}</span></div><div class="toolbar-buttons"><button class="secondary-button" type="button" data-action="save">${copy.saveNow}</button><button class="secondary-button" type="button" data-action="preview">${copy.preview}</button><button class="primary-button" type="button" data-action="publish">${copy.publish} ↗</button></div></div><div class="editor-paper">${renderFields()}</div><div class="editor-footer">${publishedAt ? `<span>${copy.published}: ${new Date(publishedAt).toLocaleString(uiLocale)}</span><a href="${giftUrl()}" target="_blank" rel="noopener">${giftUrl()}</a><button type="button" data-action="copy">${copy.copyLink}</button>` : `<span>${copy.draft} · ${savedAt ? new Date(savedAt).toLocaleString(uiLocale) : ''}</span>`}</div></div></main>${previewOpen ? `<div class="preview-overlay" role="dialog" aria-modal="true" aria-label="${copy.preview}"><div class="preview-panel"><div class="preview-bar"><strong>${copy.preview}</strong><div><button type="button" data-action="refresh-preview">${copy.refresh}</button><button type="button" data-action="close-preview">${copy.close} ×</button></div></div><iframe title="${copy.preview}" src="/?preview=${encodeURIComponent(project.id)}&rev=${revision}"></iframe></div></div>` : ''}`);
  mountPresetConfirmation();
  const index = sections.indexOf(activeSection);
  const pager = document.createElement('div');
  pager.className = 'section-pager';
  pager.innerHTML = `<button type="button" data-action="previous-section" ${index === 0 ? 'disabled' : ''}>← ${copy.previous}</button><span>${copy.step} ${index + 1} / ${sections.length}</span>${index < sections.length - 1 ? `<button type="button" data-action="next-section">${copy.next} →</button>` : `<button type="button" data-action="publish">${copy.publish} ↗</button>`}`;
  document.querySelector('.editor-paper')?.insertAdjacentElement('afterend', pager);
  if (publishedAt) document.querySelector('.toolbar-buttons')?.insertAdjacentHTML('beforeend', `<button type="button" class="secondary-button" data-action="barcode">${copy.barcode}</button>`);
  const iframe = document.querySelector<HTMLIFrameElement>('.preview-panel iframe');
  if (iframe) {
    const target = activeSection === 'identity' ? 'hero' : activeSection === 'music' ? 'music-player' : activeSection;
    iframe.src = `/?preview=${encodeURIComponent(project.id)}&section=${encodeURIComponent(target)}&rev=${revision}`;
  }
  if (barcodeOpen && barcodeProject && barcodeSvg) {
    const overlay = document.createElement('div');
    overlay.className = 'barcode-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', copy.barcode);
    overlay.innerHTML = `<div class="barcode-dialog"><button type="button" class="barcode-close" data-action="close-barcode" aria-label="${copy.close}">×</button><span class="overline">${copy.barcodeReady}</span><h2>${copy.barcode}</h2><p>${copy.barcodeHint}</p><img class="barcode-art" src="${escapeHtml(barcodeDataUrl(barcodeSvg))}" alt="${copy.barcode}"><code>${escapeHtml(giftUrl())}</code><div class="barcode-actions"><button type="button" class="primary-button" data-action="download-barcode">${copy.downloadBarcode}</button><button type="button" class="secondary-button" data-action="copy-review">${copy.copyReview}</button><button type="button" class="secondary-button" data-action="copy">${copy.copyLink}</button><a class="secondary-button" href="${escapeHtml(giftUrl())}" target="_blank" rel="noopener">${copy.openGift} ↗</a></div><span class="barcode-status" role="status"></span></div>`;
    root.append(overlay);
    document.querySelector('.studio-shell')?.setAttribute('inert', '');
    document.body.style.overflow = 'hidden';
    overlay.querySelector<HTMLButtonElement>('.barcode-close')?.focus();
  }
}

function rerenderFields(): void {
  const area = document.querySelector('.editor-paper');
  if (area) area.innerHTML = renderFields();
}

async function openProject(id: string): Promise<void> {
  const record = await studioApi.getDraft(id);
  project = projectSchema.parse(record.project);
  project.gallery.photos.forEach((photo) => { photo.alt = photo.caption; });
  musicMode = musicPlaylist.some((track) => track.audioUrl === project!.music.audioUrl) ? 'playlist' : 'upload';
  pendingPreset = null; stopPlaylistPreview();
  savedAt = record.savedAt;
  publishedAt = record.publishedAt;
  dirty = false;
  errorText = '';
  history.replaceState(null, '', `/studio/${encodeURIComponent(id)}`);
  renderEditor();
}

function swap<T>(items: T[], index: number, offset: number): void {
  const target = index + offset;
  if (target < 0 || target >= items.length) return;
  [items[index], items[target]] = [items[target], items[index]];
  markDirty();
  rerenderFields();
}

function updatePreview(): boolean {
  if (!project) return false;
  const issues = validateProject(project);
  if (issues.length) { status(`${t().previewInvalid} ${issues.join(' · ')}`, true); return false; }
  sessionStorage.setItem(`the-plan:preview:${project.id}`, JSON.stringify(project));
  return true;
}

async function showBarcode(published?: GiftProject): Promise<void> {
  if (!project || !publishedAt) return;
  try {
    barcodeProject = published || (await studioApi.getPublished(project.id)).project;
    barcodeSvg = makeBarcodeSvg(giftUrl(), barcodeProject);
    barcodeOpen = true;
    const scroll = window.scrollY;
    renderEditor();
    window.scrollTo(0, scroll);
  } catch (error) { status(`${t().barcodeError} ${error instanceof Error ? error.message : ''}`, true); }
}

function closeBarcode(): void {
  barcodeOpen = false;
  document.querySelector('.barcode-overlay')?.remove();
  document.querySelector('.studio-shell')?.removeAttribute('inert');
  document.body.style.overflow = '';
  document.querySelector<HTMLButtonElement>('[data-action="barcode"]')?.focus();
}

function moveSection(offset: number): void {
  const next = sections[sections.indexOf(activeSection) + offset];
  if (!next) return;
  activeSection = next;
  renderEditor();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  const heading = document.querySelector<HTMLElement>('.editor-toolbar h1');
  heading?.setAttribute('tabindex', '-1');
  heading?.focus({ preventScroll: true });
}

root.addEventListener('input', (event) => {
  const element = event.target as HTMLInputElement | HTMLTextAreaElement;
  if (element.dataset.playlistSearch !== undefined) {
    const query = element.value.trim().toLocaleLowerCase();
    document.querySelectorAll<HTMLElement>('.playlist-card').forEach((card) => { card.hidden = !card.dataset.search?.includes(query); });
    return;
  }
  const path = element.dataset.field;
  if (!path || !project) return;
  if (path === 'letter.paragraphs') setPath(path, element.value.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean));
  else {
    setPath(path, element.value);
    const mediaCaption = path.match(/^(opening\.photo|hero\.photo|music\.cover|gallery\.photos\.(\d+))\.caption$/);
    if (mediaCaption) {
      const media = mediaCaption[2] === undefined
        ? getPath(mediaCaption[1]) as Photo
        : project.gallery.photos[Number(mediaCaption[2])];
      if (media) media.alt = element.value;
    }
  }
});

root.addEventListener('change', async (event) => {
  const element = event.target as HTMLInputElement | HTMLSelectElement;
  if (element.id === 'ui-locale') {
    uiLocale = element.value === 'en' ? 'en' : 'id';
    localStorage.setItem('the-plan:studio-language', uiLocale);
    if (project) renderEditor(); else if (studioSession.get()) renderChooser(); else renderLogin();
    return;
  }
  if (element.dataset.field && project && element instanceof HTMLSelectElement) { setPath(element.dataset.field, element.value); if (element.dataset.field === 'theme' || element.dataset.field.endsWith('.type')) rerenderFields(); return; }
  if (element instanceof HTMLInputElement && element.dataset.upload && element.files?.[0] && project) {
    const path = element.dataset.upload;
    const file = element.files[0];
    if (path.startsWith('music.')) musicMode = 'upload';
    status(t().uploading);
    try { const { url } = await studioApi.upload(project.id, file); setPath(path, url); rerenderFields(); }
    catch (error) { status(`${t().uploadError} ${error instanceof Error ? error.message : ''}`, true); }
  }
});

root.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.target as HTMLFormElement;
  const button = (event as SubmitEvent).submitter as HTMLButtonElement | null;
  if (form.id === 'login-form') {
    const password = String(new FormData(form).get('password') || '');
    try { await studioApi.login(password); errorText = ''; renderChooser(); }
    catch { errorText = t().loginError; renderLogin(); }
  }
  if (form.id === 'project-form') {
    const id = String(new FormData(form).get('projectId') || '').trim();
    if (!idPattern.test(id)) { errorText = t().invalidId; renderChooser(); return; }
    try {
      if (button?.value === 'create') {
        const starter = structuredClone(demo);
        starter.id = id;
        await studioApi.createDraft(starter);
      }
      await openProject(id);
    } catch (error) {
      errorText = error instanceof StudioApiError && error.status === 404 ? t().notFound : error instanceof Error ? error.message : String(error);
      if (error instanceof StudioApiError && error.status === 401) { studioSession.clear(); renderLogin(); } else renderChooser();
    }
  }
});

root.addEventListener('click', async (event) => {
  const button = (event.target as Element).closest<HTMLButtonElement>('[data-action], [data-section], [data-theme]');
  if (!button) return;
  if (button.dataset.section) { activeSection = button.dataset.section as Section; renderEditor(); return; }
  if (button.dataset.theme) { setPath('theme', button.dataset.theme); rerenderFields(); return; }
  const action = button.dataset.action;
  if (action === 'logout') { if (!(await flushSave())) return; studioSession.clear(); project = null; history.replaceState(null, '', '/studio'); renderLogin(); return; }
  if (!project) return;
  if (action === 'choose-preset') { pendingPreset = button.dataset.presetId || null; renderEditor(); return; }
  if (action === 'cancel-preset') { cancelPreset(); return; }
  if (action === 'apply-preset') { applyPreset(); return; }
  if (action === 'music-mode') { musicMode = button.dataset.mode === 'upload' ? 'upload' : 'playlist'; stopPlaylistPreview(); rerenderFields(); return; }
  if (action === 'preview-song' || action === 'use-song') {
    const track = musicPlaylist[Number(button.dataset.songIndex)];
    if (!track) return;
    if (action === 'preview-song') {
      if (playlistPreviewUrl === track.audioUrl && playlistPreview && !playlistPreview.paused) { stopPlaylistPreview(); button.textContent = t().previewSong; return; }
      stopPlaylistPreview(); playlistPreview = new Audio(track.audioUrl); playlistPreviewUrl = track.audioUrl;
      const preview = playlistPreview; button.textContent = t().pausePreview;
      preview.addEventListener('ended', () => { button.textContent = t().previewSong; if (playlistPreview === preview) stopPlaylistPreview(); }, { once: true });
      preview.play().catch(() => { button.textContent = t().previewSong; status(t().previewSongError, true); stopPlaylistPreview(); });
      return;
    }
    project.music.title = track.title; project.music.artist = track.artist; project.music.audioUrl = track.audioUrl;
    project.music.cover = { ...project.music.cover, src: track.coverUrl, alt: `${track.title} — ${track.artist}`, caption: track.title };
    musicMode = 'playlist'; stopPlaylistPreview(); markDirty(); rerenderFields(); return;
  }
  if (action === 'save') { await flushSave(); return; }
  if (action === 'previous-section') { moveSection(-1); return; }
  if (action === 'next-section') { moveSection(1); return; }
  if (action === 'barcode') { await showBarcode(); return; }
  if (action === 'close-barcode') { closeBarcode(); return; }
  if (action === 'download-barcode') {
    try { await downloadBarcodePng(barcodeSvg, `the-plan-${project.id}-barcode.png`); }
    catch (error) { const node = document.querySelector('.barcode-status'); if (node) node.textContent = `${t().barcodeError} ${error instanceof Error ? error.message : ''}`; }
    return;
  }
  if (action === 'copy-review' && barcodeProject) {
    await navigator.clipboard.writeText(reviewTemplate(barcodeProject, giftUrl(), uiLocale));
    button.textContent = t().copied;
    return;
  }
  const index = Number(button.dataset.index);
  if (action === 'add-agenda') { project.invitation.rundown.push({ id: crypto.randomUUID(), time: '', title: '', note: '' }); markDirty(); rerenderFields(); }
  if (action === 'agenda-remove') { project.invitation.rundown.splice(index, 1); markDirty(); rerenderFields(); }
  if (action === 'agenda-up' || action === 'agenda-down') swap<PlanItem>(project.invitation.rundown, index, action === 'agenda-up' ? -1 : 1);
  if (action === 'add-media') { project.gallery.photos.push({ id: crypto.randomUUID(), type: 'image', src: '', alt: '', caption: '' }); markDirty(); rerenderFields(); }
  if (action === 'media-remove') { project.gallery.photos.splice(index, 1); markDirty(); rerenderFields(); }
  if (action === 'media-up' || action === 'media-down') swap<Photo>(project.gallery.photos, index, action === 'media-up' ? -1 : 1);
  if (action === 'preview' || action === 'refresh-preview') {
    if (!updatePreview()) return;
    previewOpen = true;
    const scroll = window.scrollY;
    renderEditor();
    window.scrollTo(0, scroll);
  }
  if (action === 'close-preview') { previewOpen = false; document.querySelector('.preview-overlay')?.remove(); document.querySelector<HTMLButtonElement>('[data-action="preview"]')?.focus(); }
  if (action === 'copy') { await navigator.clipboard.writeText(giftUrl()); button.textContent = t().copied; }
  if (action === 'publish') {
    const issues = validateProject(project);
    if (issues.length) { status(`${t().publishIssues} ${issues.join(' · ')}`, true); return; }
    if (!confirm(t().publishConfirm)) return;
    if (!(await flushSave())) return;
    try { const result = await studioApi.publish(project.id); publishedAt = result.publishedAt; await showBarcode(structuredClone(project)); }
    catch (error) { status(error instanceof Error ? error.message : String(error), true); }
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && pendingPreset) { cancelPreset(); return; }
  if (event.key === 'Escape' && barcodeOpen) { closeBarcode(); return; }
  if (event.key === 'Escape' && previewOpen) { previewOpen = false; document.querySelector('.preview-overlay')?.remove(); document.querySelector<HTMLButtonElement>('[data-action="preview"]')?.focus(); }
  if (pendingPreset && event.key === 'Tab') {
    const buttons = [...document.querySelectorAll<HTMLElement>('.preset-dialog button')];
    if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons.at(-1)?.focus(); }
    else if (!event.shiftKey && document.activeElement === buttons.at(-1)) { event.preventDefault(); buttons[0]?.focus(); }
    return;
  }
  if (event.key !== 'Tab' || !barcodeOpen) return;
  const buttons = [...document.querySelectorAll<HTMLElement>('.barcode-overlay button, .barcode-overlay a')];
  if (!buttons.length) return;
  if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons.at(-1)?.focus(); }
  else if (!event.shiftKey && document.activeElement === buttons.at(-1)) { event.preventDefault(); buttons[0].focus(); }
});

window.addEventListener('beforeunload', (event) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
const match = location.pathname.match(/^\/studio\/([^/]+)\/?$/);
if (!studioSession.get()) renderLogin();
else if (match) openProject(decodeURIComponent(match[1])).catch((error) => { errorText = error instanceof Error ? error.message : String(error); renderChooser(); });
else renderChooser();
