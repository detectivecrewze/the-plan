import '@fontsource/caveat/400.css';
import '@fontsource/caveat/700.css';
import '@fontsource/chewy/400.css';
import '@fontsource/comic-neue/400.css';
import '@fontsource/comic-neue/700.css';
import './style.css';
import playlist from '../music-playlist.json';
import type { Locale } from '../project';
import { themeIds, themes, type ThemeId } from '../themes';
import { formApi, FormApiError } from './api';
import { formText } from './copyV2';
import { planFormDraftSchema, planFormSchema } from './schema';
import type { FormAudio, FormContentLanguage, FormLetterMode, FormMedia, FormMusicMode, FormMusicSelection, PlanFormAnswers } from './types';

const root = document.querySelector<HTMLDivElement>('#app')!;
const parts = location.pathname.split('/').filter(Boolean);
const projectId = parts[0] === 'form' ? parts[1] || '' : '';
const formToken = new URLSearchParams(location.search).get('token') || '';
const storageKey = `the-plan:form:v1:${projectId}`;
const uiLanguageKey = 'the-plan:form-ui-language';
const exampleGiftUrl = 'https://plan.for-you-always.my.id/';
const teamWhatsApp = '6281936109076';
const steps = ['people', 'event', 'story', 'style', 'media', 'review'] as const;
type Step = typeof steps[number];

const defaultAnswers = (): PlanFormAnswers => ({
  version: 1,
  locale: 'id',
  contentLanguage: 'id',
  deadline: '',
  people: { sender: '', recipient: '', recipientNickname: '', relationship: 'partner', occasion: 'date-plan', customOccasion: '' },
  event: { date: '', startTime: '', endTime: '', venue: '', address: '', mapsUrl: '', dressCode: '', rundownNotes: '' },
  story: { message: '', letterMode: 'expand', tone: ['casual'] },
  theme: 'burgundy-keepsake',
  music: { mode: 'playlist', selected: null, request: '', uploaded: null, uploadTitle: '', uploadArtist: '' },
  media: { featured: null, gallery: [] },
});

let answers = defaultAnswers();
let stepIndex = -1;
let loading = true;
let submitted = false;
let submittedAt = '';
let orderId = '';
let fatalError = '';
let validationError = '';
let saveState: 'saved' | 'saving' | 'error' = 'saved';
let saveTimer = 0;
let uploading = 0;
let submitting = false;
let previewOpen = false;
let previewRevision = 0;
let formUiLocale: Locale = (() => {
  try { const stored = localStorage.getItem(uiLanguageKey); if (stored === 'id' || stored === 'en') return stored; } catch { /* browser storage unavailable */ }
  return navigator.language.toLowerCase().startsWith('id') ? 'id' : 'en';
})();

const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
const c = () => formText(formUiLocale);
const currentStep = (): Step => steps[Math.max(0, stepIndex)] || 'people';
const field = (path: string): unknown => path.split('.').reduce<unknown>((value, part) => value && typeof value === 'object' ? (value as Record<string, unknown>)[part] : undefined, answers);

function setField(path: string, value: unknown): void {
  const segments = path.split('.');
  let target = answers as unknown as Record<string, unknown>;
  for (const segment of segments.slice(0, -1)) target = target[segment] as Record<string, unknown>;
  target[segments.at(-1)!] = value;
}

function icon(name: 'arrow' | 'back' | 'check' | 'cloud' | 'user' | 'calendar' | 'letter' | 'music' | 'camera' | 'review' | 'upload' | 'trash' | 'search' | 'play' | 'heart' | 'eye' | 'close' | 'refresh'): string {
  const paths = {
    arrow: '<path d="M5 12h14m-7-7 7 7-7 7"/>', back: '<path d="M19 12H5m7 7-7-7 7-7"/>', check: '<path d="m5 12 4 4L19 6"/>',
    cloud: '<path d="M7 18h10a4 4 0 0 0 .6-8 6 6 0 0 0-11.4-1.7A4.8 4.8 0 0 0 7 18Z"/><path d="m9 13 3-3 3 3M12 10v6"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>', calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    letter: '<path d="M4 5h16v14H4z"/><path d="m4 7 8 6 8-6"/>', music: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
    camera: '<path d="M4 7h4l2-3h4l2 3h4v13H4z"/><circle cx="12" cy="13" r="4"/>', review: '<path d="M5 4h14v17H5z"/><path d="M9 9h6M9 13h6M9 17h4"/>',
    upload: '<path d="M12 16V4m-5 5 5-5 5 5M4 17v3h16v-3"/>', trash: '<path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>', play: '<path d="m8 5 11 7-11 7V5Z"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
    eye: '<path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.7"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>', refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name]}</svg>`;
}

function label(text: string, required = false): string {
  return `<span class="field-label">${esc(text)}${required ? `<b>${esc(c().required)}</b>` : `<em>${esc(c().optional)}</em>`}</span>`;
}

function input(path: string, text: string, options: { type?: string; placeholder?: string; required?: boolean; hint?: string; rows?: number } = {}): string {
  const value = String(field(path) ?? '');
  const control = options.rows
    ? `<textarea data-field="${path}" rows="${options.rows}" placeholder="${esc(options.placeholder || '')}">${esc(value)}</textarea>`
    : `<input data-field="${path}" type="${options.type || 'text'}" value="${esc(value)}" placeholder="${esc(options.placeholder || '')}" ${options.required ? 'required' : ''}>`;
  return `<label class="form-field">${label(text, options.required)}${control}${options.hint ? `<small>${esc(options.hint)}</small>` : ''}</label>`;
}

function select(path: string, text: string, items: Array<[string, string]>, required = false): string {
  const value = String(field(path) ?? '');
  return `<label class="form-field">${label(text, required)}<select data-field="${path}">${items.map(([id, title]) => `<option value="${esc(id)}" ${value === id ? 'selected' : ''}>${esc(title)}</option>`).join('')}</select></label>`;
}

function scheduleSave(): void {
  if (loading || submitted || fatalError) return;
  saveState = 'saving'; updateSaveStatus();
  try { localStorage.setItem(storageKey, JSON.stringify(answers)); } catch { /* online draft remains canonical */ }
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(async () => {
    try { await formApi.save(projectId, formToken, answers); saveState = 'saved'; }
    catch { saveState = 'error'; }
    updateSaveStatus();
  }, 900);
}

function updateSaveStatus(): void {
  const node = document.querySelector<HTMLElement>('#form-save-status');
  if (!node) return;
  node.dataset.state = saveState;
  node.innerHTML = `${icon(saveState === 'saved' ? 'check' : 'cloud')}<span>${esc(saveState === 'saving' ? c().saving : saveState === 'error' ? c().saveFailed : c().saved)}</span>`;
}

function renderProgress(): string {
  return `<nav class="form-progress" aria-label="${esc(c().formProgress)}">${steps.map((step, index) => {
    const names = [c().step1, c().step2, c().step3, c().step4, c().step5, c().step6];
    const icons: Array<Parameters<typeof icon>[0]> = ['user', 'calendar', 'letter', 'music', 'camera', 'review'];
    return `<button type="button" data-goto="${index}" class="${stepIndex === index ? 'active' : ''} ${stepIndex > index ? 'complete' : ''}" ${index > stepIndex ? 'disabled' : ''}><span>${stepIndex > index ? icon('check') : icon(icons[index])}</span><div><small>${String(index + 1).padStart(2, '0')}</small><strong>${esc(names[index])}</strong></div></button>`;
  }).join('')}</nav>`;
}

function renderWelcome(): string {
  return `<main class="form-welcome"><section class="welcome-card"><span class="welcome-tape"></span><div class="welcome-stamp">THE PLAN<br><small>MADE FOR YOU</small></div><span class="form-eyebrow">${esc(c().eyebrow)}</span><h1>${esc(c().welcomeTitle).replace(/\n/g, '<br>')}</h1><p>${esc(c().welcomeText)}</p><span class="section-label">${esc(c().languageLabel)}</span><div class="language-cards" role="group" aria-label="${esc(c().languageLabel)}">${renderLanguageCards()}</div><button type="button" class="form-primary welcome-start" data-action="start">${esc(c().start)}${icon('arrow')}</button><small class="privacy-note">${icon('heart')} ${esc(c().privacyNote)}</small></section><aside class="welcome-art" aria-hidden="true"><div class="scrap scrap-one">A DAY<br>PLANNED<br>WITH LOVE</div><div class="scrap scrap-two"><span>01</span><b>your story</b><i>our little plan</i></div><div class="scrap scrap-three">${icon('heart')}</div></aside></main>`;
}

function renderLanguageCards(): string {
  const languages: Array<[FormContentLanguage, string, string, string]> = [
    ['id', 'ID', c().idLanguage, c().idLanguageHint],
    ['id-en', 'MIX', c().indoglishLanguage, c().indoglishLanguageHint],
    ['en', 'EN', c().enLanguage, c().enLanguageHint],
  ];
  return languages.map(([id, code, title, hint]) => `<button type="button" class="${answers.contentLanguage === id ? 'active' : ''}" data-content-language="${id}"><b>${code}</b><span><strong>${esc(title)}</strong><small>${esc(hint)}</small></span></button>`).join('');
}

function renderUiLanguageToggle(): string {
  return `<div class="form-ui-language" role="group" aria-label="${esc(c().formLanguageLabel)}"><button type="button" data-ui-locale="id" aria-pressed="${formUiLocale === 'id'}" class="${formUiLocale === 'id' ? 'active' : ''}">ID</button><button type="button" data-ui-locale="en" aria-pressed="${formUiLocale === 'en'}" class="${formUiLocale === 'en' ? 'active' : ''}">EN</button></div>`;
}

function renderPeople(): string {
  const relationshipItems: Array<[string, string]> = [['partner', c().partner], ['spouse', c().spouse], ['crush', c().crush], ['other', c().otherRelationship]];
  const occasionItems: Array<[string, string]> = [['birthday', c().birthday], ['anniversary', c().anniversary], ['date-plan', c().datePlan], ['proposal', c().proposal], ['just-because', c().justBecause], ['other', c().other]];
  return `<div class="form-grid two">${input('people.sender', c().sender, { required: true })}${input('people.recipient', c().recipient, { required: true })}${input('people.recipientNickname', c().recipientNickname, { hint: c().recipientNicknameHint })}${select('people.relationship', c().relationship, relationshipItems, true)}${select('people.occasion', c().occasion, occasionItems, true)}${answers.people.occasion === 'other' ? input('people.customOccasion', c().customOccasion, { required: true }) : ''}<section class="language-section full"><div><span class="section-label">${esc(c().contentLanguageLabel)}</span><p>${esc(c().contentLanguageNote)}</p></div><div class="language-cards compact" role="group" aria-label="${esc(c().contentLanguageLabel)}">${renderLanguageCards()}</div></section></div>`;
}

function renderEvent(): string {
  return `<div class="form-grid two">${input('event.date', c().date, { type: 'date', required: true })}${input('event.startTime', c().startTime, { type: 'time', required: true })}${input('event.endTime', c().endTime, { placeholder: '21:00 / END', hint: c().endTimeHint })}${input('event.venue', c().venue, { placeholder: c().venuePlaceholder })}${input('event.address', c().address, { rows: 3 })}${input('event.mapsUrl', c().mapsUrl, { type: 'url', placeholder: 'https://maps.google.com/...' })}${input('event.dressCode', c().dressCode, { placeholder: c().dressCodePlaceholder })}<div class="full">${input('event.rundownNotes', c().rundown, { rows: 7, placeholder: c().rundownHint, hint: c().rundownHint })}</div></div>`;
}

function renderStory(): string {
  const toneOptions = [['casual', c().toneCasual, c().toneCasualHint], ['poetic', c().tonePoetic, c().tonePoeticHint], ['romantic', c().toneRomantic, c().toneRomanticHint], ['heartfelt', c().toneHeartfelt, c().toneHeartfeltHint], ['playful', c().tonePlayful, c().tonePlayfulHint]] as const;
  const letterModes: Array<[FormLetterMode, string, string]> = [['expand', c().letterExpand, c().letterExpandHint], ['keep', c().letterKeep, c().letterKeepHint]];
  return `<div class="story-layout"><div class="story-main"><div class="letter-callout">${icon('letter')}<div><strong>${esc(c().letterSectionTitle)}</strong><p>${esc(c().letterSectionHint)}</p></div></div>${input('story.message', c().letterText, { rows: 13, required: true, placeholder: c().letterTextPlaceholder, hint: c().letterTextHint })}<fieldset class="letter-mode"><legend>${esc(c().letterModeTitle)}</legend>${letterModes.map(([id, title, hint]) => `<button type="button" class="${answers.story.letterMode === id ? 'active' : ''}" data-letter-mode="${id}"><span>${answers.story.letterMode === id ? icon('check') : ''}</span><div><strong>${esc(title)}</strong><small>${esc(hint)}</small></div></button>`).join('')}</fieldset></div><aside class="tone-paper"><span class="mini-tape"></span><h3>${esc(c().tone)}</h3><p class="tone-hint">${esc(c().toneMultipleHint)}</p><div class="choice-stack">${toneOptions.map(([id, title, hint]) => `<button type="button" aria-pressed="${answers.story.tone.includes(id)}" class="${answers.story.tone.includes(id) ? 'active' : ''}" data-tone="${id}"><span>${answers.story.tone.includes(id) ? icon('check') : ''}</span><div><strong>${esc(title)}</strong><small>${esc(hint)}</small></div></button>`).join('')}</div></aside></div>`;
}

function renderStyle(): string {
  const musicModes: Array<[FormMusicMode, string, string]> = [['playlist', c().playlist, 'music'], ['request', c().request, 'letter'], ['upload', c().uploadSong, 'upload'], ['team', c().team, 'heart']];
  return `<div class="style-section"><section><span class="section-label">${esc(c().theme)}</span><div class="theme-picker">${themeIds.map((id) => {
    const palette = themes[id];
    return `<button type="button" class="theme-card ${answers.theme === id ? 'active' : ''}" data-theme="${id}" style="--swatch-primary:${palette.colors.primary};--swatch-paper:${palette.colors.paper};--swatch-ink:${palette.colors.ink}"><span class="theme-swatch"><i></i><b></b><em></em></span><strong>${esc(palette.name)}</strong>${answers.theme === id ? icon('check') : ''}</button>`;
  }).join('')}</div></section><section><span class="section-label">${esc(c().music)}</span><div class="music-modes">${musicModes.map(([id, title, symbol]) => `<button type="button" class="${answers.music.mode === id ? 'active' : ''}" data-music-mode="${id}">${icon(symbol as Parameters<typeof icon>[0])}<span>${esc(title)}</span></button>`).join('')}</div>${answers.music.mode === 'playlist' ? renderPlaylist() : answers.music.mode === 'request' ? input('music.request', c().songRequest, { required: true, placeholder: 'About You - The 1975', hint: c().songRequestHint }) : answers.music.mode === 'upload' ? `<div class="song-upload">${uploading ? `<div role="status">${esc(c().uploading)}</div>` : ''}${answers.music.uploaded ? `<div class="uploaded-song">${icon('music')}<div><strong>${esc(answers.music.uploaded.name)}</strong><small>${esc(c().songUploaded)}</small></div><button type="button" data-action="remove-song" aria-label="${esc(c().remove)}">${icon('trash')}</button></div>` : `<label class="add-media-button">${icon('upload')} ${esc(c().chooseSong)}<input type="file" data-upload-kind="music" accept="audio/mpeg,audio/mp4,audio/wav,audio/ogg"></label>`}${input('music.uploadTitle', c().songTitle, { required: true })}${input('music.uploadArtist', c().songArtist, { required: true })}<small>${esc(c().songUploadHint)}</small></div>` : `<div class="team-choice-note">${icon('heart')}<p>${esc(c().team)}</p></div>`}</section></div>`;
}

function renderPlaylist(): string {
  return `<div class="playlist-picker"><label class="song-search">${icon('search')}<input type="search" id="song-search" placeholder="${esc(c().searchSong)}"></label><div class="song-list">${playlist.map((song, index) => {
    const selected = answers.music.selected?.audioUrl === song.audioUrl;
    return `<article class="song-card" data-song-card data-search="${esc(`${song.title} ${song.artist}`.toLowerCase())}"><img src="${esc(song.coverUrl)}" alt="" loading="lazy"><div><strong>${esc(song.title)}</strong><span>${esc(song.artist)}</span></div><button type="button" class="${selected ? 'selected' : ''}" data-song="${index}">${selected ? icon('check') + esc(c().selected) : esc(c().useSong)}</button></article>`;
  }).join('')}</div></div>`;
}

function mediaCard(media: FormMedia, featured = false): string {
  const preview = media.type === 'video' ? `<video src="${esc(media.url)}" muted playsinline preload="metadata"></video><span class="media-kind">${icon('play')} ${esc(c().video)}</span>` : `<img src="${esc(media.url)}" alt="" loading="lazy">`;
  return `<article class="uploaded-media ${featured ? 'featured-media' : ''}">${preview}<div><strong>${esc(media.name)}</strong><small>${featured ? esc(c().featured) : esc(media.type === 'video' ? c().video : c().image)}</small></div><button type="button" data-remove-media="${esc(media.id)}" data-featured="${featured ? 'true' : 'false'}" aria-label="${esc(c().remove)}">${icon('trash')}</button></article>`;
}

function renderMedia(): string {
  return `<div class="media-sections"><section class="featured-upload"><div><span class="section-label">${esc(c().featured)} · ${esc(c().required)}</span><p>${esc(c().featuredHint)}</p></div>${answers.media.featured ? mediaCard(answers.media.featured, true) : `<label class="upload-drop">${icon('camera')}<strong>${esc(c().chooseFeatured)}</strong><small>JPG, PNG, WEBP · max 15 MB</small><input type="file" data-upload-kind="featured" accept="image/*"></label>`}${answers.media.featured ? `<label class="replace-upload">${icon('upload')} ${esc(c().replaceFeatured)}<input type="file" data-upload-kind="featured" accept="image/*"></label>` : ''}</section><section class="gallery-upload"><div class="gallery-upload-heading"><div><span class="section-label">${esc(c().gallery)} · ${esc(c().required)}</span><p>${esc(c().galleryHint)}</p></div><label class="add-media-button">${icon('upload')} ${esc(c().addMedia)}<input type="file" data-upload-kind="gallery" accept="image/*,video/mp4,video/webm" multiple></label></div><div class="gallery-upload-grid">${answers.media.gallery.map((item) => mediaCard(item)).join('')}${uploading ? `<div class="uploading-card"><span></span><strong>${esc(c().uploading)}</strong><small>${uploading} file</small></div>` : ''}</div></section></div>`;
}

const display = (value: string) => value.trim() || c().notFilled;
function reviewCard(title: string, target: number, body: string): string {
  return `<article class="review-card"><div class="review-card-heading"><h3>${esc(title)}</h3><button type="button" data-goto="${target}">${esc(c().edit)}</button></div>${body}</article>`;
}

function renderReview(): string {
  const occasion = answers.people.occasion === 'other' ? answers.people.customOccasion : ({ birthday: c().birthday, anniversary: c().anniversary, 'date-plan': c().datePlan, proposal: c().proposal, 'just-because': c().justBecause } as Record<string, string>)[answers.people.occasion] || answers.people.occasion;
  const music = answers.music.mode === 'playlist' ? `${answers.music.selected?.title || c().notFilled} · ${answers.music.selected?.artist || ''}` : answers.music.mode === 'request' ? answers.music.request : answers.music.mode === 'upload' ? `${answers.music.uploadTitle || c().notFilled} · ${answers.music.uploadArtist || ''} (${answers.music.uploaded?.name || c().notFilled})` : c().team;
  const language = answers.contentLanguage === 'id-en' ? c().indoglishLanguage : answers.contentLanguage === 'en' ? c().enLanguage : c().idLanguage;
  const letterMode = answers.story.letterMode === 'expand' ? c().letterExpand : c().letterKeep;
  const toneNames: Record<PlanFormAnswers['story']['tone'][number], string> = { casual: c().toneCasual, poetic: c().tonePoetic, romantic: c().toneRomantic, heartfelt: c().toneHeartfelt, playful: c().tonePlayful };
  return `<div class="review-grid">${reviewCard(c().reviewPeople, 0, `<dl><div><dt>${esc(c().sender)}</dt><dd>${esc(display(answers.people.sender))}</dd></div><div><dt>${esc(c().recipient)}</dt><dd>${esc(display(answers.people.recipient))}</dd></div><div><dt>${esc(c().recipientNickname)}</dt><dd>${esc(display(answers.people.recipientNickname))}</dd></div><div><dt>${esc(c().occasion)}</dt><dd>${esc(display(occasion))}</dd></div><div><dt>${esc(c().contentLanguageLabel)}</dt><dd>${esc(language)}</dd></div></dl>`)}${reviewCard(c().reviewEvent, 1, `<dl><div><dt>${esc(c().date)}</dt><dd>${esc(display(answers.event.date))}</dd></div><div><dt>${esc(c().startTime)}</dt><dd>${esc(display(answers.event.startTime))}${answers.event.endTime ? ` – ${esc(answers.event.endTime)}` : ''}</dd></div><div><dt>${esc(c().venue)}</dt><dd>${esc(display(answers.event.venue))}</dd></div><div><dt>${esc(c().dressCode)}</dt><dd>${esc(display(answers.event.dressCode))}</dd></div></dl>`)}${reviewCard(c().reviewStory, 2, `<blockquote>${esc(display(answers.story.message))}</blockquote><div class="review-letter-mode"><span>${esc(c().letterModeTitle)}</span><strong>${esc(letterMode)}</strong></div><div class="review-letter-mode"><span>${esc(c().tone)}</span><strong>${esc(answers.story.tone.map((tone) => toneNames[tone]).join(', '))}</strong></div>`)}${reviewCard(c().reviewStyle, 3, `<div class="review-style"><span class="review-swatch" style="--review-primary:${themes[answers.theme].colors.primary};--review-paper:${themes[answers.theme].colors.paper}"></span><div><strong>${esc(themes[answers.theme].name)}</strong><small>${esc(music)}</small></div></div>`)}${reviewCard(c().reviewMedia, 4, `<div class="review-media"><strong>${answers.media.featured ? '1' : '0'} ${esc(c().featured)}</strong><span>${answers.media.gallery.length} ${esc(c().gallery)}</span></div>`)}</div><section class="deadline-paper"><span class="section-label">${esc(c().deadline)}</span>${input('deadline', c().deadlineField, { type: 'datetime-local', hint: c().deadlineHint })}</section><label class="consent"><input id="form-consent" type="checkbox"><span>${icon('check')}</span><p>${esc(c().consent)}</p></label>`;
}

const previewSections = ['hero', 'invitation', 'letter', 'hero', 'gallery', 'closing'] as const;

function preparePreview(): string {
  const url = new URL(exampleGiftUrl);
  url.searchParams.set('sample', '1');
  url.searchParams.set('section', previewSections[Math.max(0, stepIndex)]);
  url.searchParams.set('theme', answers.theme);
  url.searchParams.set('rev', String(previewRevision));
  return url.href;
}

function renderPreviewModal(): string {
  if (!previewOpen) return '';
  const url = preparePreview();
  return `<div class="form-preview-modal" role="presentation"><section role="dialog" aria-modal="true" aria-labelledby="form-preview-title"><header><div><span>${esc(c().livePreviewEyebrow)}</span><h2 id="form-preview-title">${esc(c().livePreviewTitle)}</h2><p>${esc(c().livePreviewNote)}</p></div><button type="button" data-action="close-preview" aria-label="${esc(c().closePreview)}">${icon('close')}</button></header><div class="preview-device"><iframe title="${esc(c().livePreviewTitle)}" src="${esc(url)}" allow="autoplay; fullscreen"></iframe></div><footer><a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(c().openExample)}</a><button type="button" class="form-primary" data-action="close-preview">${esc(c().continueEditing)}</button></footer></section></div>`;
}

function renderStep(): string {
  const title = [c().step1, c().step2, c().step3, c().step4, c().step5, c().step6][stepIndex];
  const note = [c().step1Note, c().step2Note, c().step3Note, c().step4Note, c().step5Note, c().step6Note][stepIndex];
  const contents = [renderPeople, renderEvent, renderStory, renderStyle, renderMedia, renderReview][stepIndex]();
  return `<div class="form-app"><header><a href="/" class="form-brand"><span>TP</span><strong>${esc(c().brand)}</strong></a><div id="form-save-status" class="save-status" data-state="${saveState}">${icon(saveState === 'saved' ? 'check' : 'cloud')}<span>${esc(saveState === 'saving' ? c().saving : saveState === 'error' ? c().saveFailed : c().saved)}</span></div></header><div class="form-layout">${renderProgress()}<main class="form-paper"><div class="paper-number">0${stepIndex + 1}</div><div class="step-heading"><span>${esc(c().eyebrow)}</span><h1>${esc(title)}</h1><p>${esc(note)}</p><button type="button" class="preview-trigger" data-action="preview">${icon('eye')}<span>${esc(c().previewGift)}</span></button></div><div class="form-content">${contents}</div><p class="form-validation" role="alert">${esc(validationError)}</p><footer><button type="button" class="form-secondary" data-action="back">${icon('back')}${esc(c().back)}</button><span>${stepIndex + 1} / ${steps.length}</span><button type="button" class="form-primary" data-action="${stepIndex === steps.length - 1 ? 'submit' : 'next'}" ${submitting ? 'disabled' : ''}>${esc(submitting ? c().submitting : stepIndex === steps.length - 1 ? c().submit : stepIndex === steps.length - 2 ? c().review : c().continue)}${icon('arrow')}</button></footer></main></div>${renderPreviewModal()}</div>`;
}

function renderSuccess(): string {
  const message = formUiLocale === 'id'
    ? `Halo For You, Always. Saya sudah mengisi form The Plan. Order ID: ${orderId}. Mohon konfirmasi bahwa bahan saya sudah diterima.`
    : `Hello For You, Always. I have submitted my The Plan form. Order ID: ${orderId}. Please confirm that you received my materials.`;
  const whatsappUrl = `https://wa.me/${teamWhatsApp}?text=${encodeURIComponent(message)}`;
  return `<main class="form-success"><section><span class="success-mark">${icon('check')}</span><span class="form-eyebrow">${esc(c().successEyebrow)}</span><h1>${esc(c().successTitle)}</h1><p>${esc(c().successText)}</p><div class="order-ticket"><span>${esc(c().orderId)}</span><strong>${esc(orderId)}</strong><small>${submittedAt ? new Date(submittedAt).toLocaleString(formUiLocale === 'id' ? 'id-ID' : 'en-US') : ''}</small></div><a class="form-primary whatsapp-cta" href="${esc(whatsappUrl)}" target="_blank" rel="noopener noreferrer">${esc(c().whatsappAction)}${icon('arrow')}</a><p class="success-note">${esc(c().whatsappHint)}</p><p class="success-note">${esc(c().successNote)}</p></section></main>`;
}

function renderFatal(): string {
  return `<main class="form-fatal"><section><span>THE PLAN</span><h1>${esc(fatalError || c().invalidLink)}</h1><button type="button" data-action="reload">${esc(c().retry)}</button></section></main>`;
}

function render(): void {
  document.documentElement.lang = formUiLocale;
  document.body.classList.toggle('preview-open', previewOpen);
  document.title = `${c().brand} · ${projectId || 'Form'}`;
  if (loading) { root.innerHTML = `<main class="form-loading"><span class="loading-piece"></span><strong>THE PLAN</strong><p>${esc(c().saving)}</p></main>`; return; }
  if (fatalError) { root.innerHTML = renderFatal(); return; }
  if (submitted) { root.innerHTML = renderSuccess(); return; }
  root.innerHTML = stepIndex < 0 ? renderWelcome() : renderStep();
  if (stepIndex < 0) root.querySelector('.form-welcome')?.insertAdjacentHTML('afterbegin', `<div class="welcome-language-toggle">${renderUiLanguageToggle()}</div>`);
  else root.querySelector('.form-app>header')?.insertAdjacentHTML('beforeend', renderUiLanguageToggle());
}

function validateStep(index: number): string {
  if (index === 0 && (!answers.people.sender || !answers.people.recipient || (answers.people.occasion === 'other' && !answers.people.customOccasion))) return c().validationNames;
  if (index === 1 && (!answers.event.date || !answers.event.startTime)) return c().validationEvent;
  if (index === 2 && answers.story.message.trim().length < 10) return c().validationStory;
  if (index === 3 && uploading) return c().uploadingWait;
  if (index === 3 && (answers.music.mode === 'playlist' && !answers.music.selected || answers.music.mode === 'request' && !answers.music.request.trim() || answers.music.mode === 'upload' && (!answers.music.uploaded || !answers.music.uploadTitle.trim() || !answers.music.uploadArtist.trim()))) return c().validationMusic;
  if (index === 4 && (!answers.media.featured || !answers.media.gallery.length)) return c().validationMedia;
  if (index === 4 && uploading) return c().uploadingWait;
  return '';
}

async function flushSave(): Promise<boolean> {
  clearTimeout(saveTimer);
  saveState = 'saving'; updateSaveStatus();
  try { await formApi.save(projectId, formToken, answers); saveState = 'saved'; updateSaveStatus(); return true; }
  catch { saveState = 'error'; updateSaveStatus(); return false; }
}

async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.size < 900_000) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const max = 1800;
    const ratio = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas'); canvas.width = Math.round(bitmap.width * ratio); canvas.height = Math.round(bitmap.height * ratio);
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', .84));
    return blob ? new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }) : file;
  } catch { return file; }
}

async function uploadFiles(files: File[], kind: 'featured' | 'gallery' | 'music'): Promise<void> {
  const accepted = files.filter((file) => kind === 'music' ? ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg'].includes(file.type) : kind === 'featured' ? file.type.startsWith('image/') : file.type.startsWith('image/') || ['video/mp4', 'video/webm'].includes(file.type));
  if (!accepted.length) return;
  const chosen = kind === 'gallery' ? accepted : accepted.slice(0, 1);
  uploading += chosen.length; validationError = ''; render();
  await Promise.all(chosen.map(async (original) => {
    try {
      const file = await compressImage(original);
      const { media } = await formApi.upload(projectId, formToken, file);
      if (kind === 'music' && media.type === 'audio') answers.music.uploaded = media as FormAudio;
      else if (kind === 'featured' && media.type === 'image') answers.media.featured = media as FormMedia;
      else if (kind === 'gallery' && media.type !== 'audio') answers.media.gallery.push(media as FormMedia);
    } catch { validationError = c().uploadFailed; }
    finally { uploading -= 1; render(); }
  }));
  scheduleSave();
}

root.addEventListener('input', (event) => {
  const element = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  if (element.id === 'song-search') {
    const query = element.value.trim().toLowerCase();
    document.querySelectorAll<HTMLElement>('[data-song-card]').forEach((card) => { card.hidden = Boolean(query) && !card.dataset.search!.includes(query); });
    return;
  }
  const path = element.dataset.field;
  if (!path) return;
  setField(path, element.value);
  if (path === 'people.occasion') render();
  validationError = '';
  scheduleSave();
});

root.addEventListener('change', (event) => {
  const inputElement = event.target as HTMLInputElement;
  const kind = inputElement.dataset.uploadKind as 'featured' | 'gallery' | 'music' | undefined;
  if (!kind || !inputElement.files) return;
  const files = [...inputElement.files]; inputElement.value = '';
  void uploadFiles(files, kind);
});

root.addEventListener('click', async (event) => {
  const target = (event.target as Element).closest<HTMLElement>('[data-action], [data-ui-locale], [data-content-language], [data-goto], [data-tone], [data-letter-mode], [data-theme], [data-music-mode], [data-song], [data-remove-media]');
  if (!target) return;
  if (target.dataset.uiLocale) {
    formUiLocale = target.dataset.uiLocale as Locale;
    try { localStorage.setItem(uiLanguageKey, formUiLocale); } catch { /* optional preference */ }
    render(); return;
  }
  if (target.dataset.contentLanguage) {
    answers.contentLanguage = target.dataset.contentLanguage as FormContentLanguage;
    answers.locale = answers.contentLanguage === 'en' ? 'en' : 'id';
    scheduleSave(); render(); return;
  }
  if (target.dataset.goto) { stepIndex = Number(target.dataset.goto); validationError = ''; render(); window.scrollTo({ top: 0 }); return; }
  if (target.dataset.tone) {
    const tone = target.dataset.tone as PlanFormAnswers['story']['tone'][number];
    answers.story.tone = answers.story.tone.includes(tone)
      ? (answers.story.tone.length > 1 ? answers.story.tone.filter((item) => item !== tone) : answers.story.tone)
      : [...answers.story.tone, tone];
    scheduleSave(); render(); return;
  }
  if (target.dataset.letterMode) { answers.story.letterMode = target.dataset.letterMode as FormLetterMode; scheduleSave(); render(); return; }
  if (target.dataset.theme) { answers.theme = target.dataset.theme as ThemeId; scheduleSave(); render(); return; }
  if (target.dataset.musicMode) { answers.music.mode = target.dataset.musicMode as FormMusicMode; scheduleSave(); render(); return; }
  if (target.dataset.song) {
    const song = playlist[Number(target.dataset.song)];
    answers.music.selected = { title: song.title, artist: song.artist, audioUrl: song.audioUrl, coverUrl: song.coverUrl } satisfies FormMusicSelection;
    scheduleSave(); render(); return;
  }
  if (target.dataset.removeMedia) {
    if (target.dataset.featured === 'true') answers.media.featured = null;
    else answers.media.gallery = answers.media.gallery.filter((item) => item.id !== target.dataset.removeMedia);
    scheduleSave(); render(); return;
  }
  const action = target.dataset.action;
  if (action === 'reload') { location.reload(); return; }
  if (action === 'remove-song') { answers.music.uploaded = null; scheduleSave(); render(); return; }
  if (action === 'preview') { previewOpen = true; previewRevision += 1; render(); return; }
  if (action === 'close-preview') { previewOpen = false; render(); return; }
  if (action === 'refresh-preview') { previewRevision += 1; render(); return; }
  if (action === 'start') { stepIndex = 0; render(); window.scrollTo({ top: 0 }); return; }
  if (action === 'back') { stepIndex = Math.max(-1, stepIndex - 1); validationError = ''; render(); window.scrollTo({ top: 0 }); return; }
  if (action === 'next') {
    validationError = validateStep(stepIndex);
    if (validationError) { render(); document.querySelector('.form-validation')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    await flushSave(); stepIndex = Math.min(steps.length - 1, stepIndex + 1); render(); window.scrollTo({ top: 0 }); return;
  }
  if (action === 'submit') {
    if (!(document.querySelector<HTMLInputElement>('#form-consent')?.checked)) { validationError = c().consentRequired; render(); return; }
    const parsed = planFormSchema.safeParse(answers);
    if (!parsed.success) { validationError = parsed.error.issues[0]?.message || c().validationStory; render(); return; }
    submitting = true; validationError = ''; render();
    try {
      const result = await formApi.submit(projectId, formToken, answers);
      submitted = true; submittedAt = result.submittedAt; orderId = result.orderId;
      try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
    } catch (error) { validationError = error instanceof FormApiError ? error.message : c().saveFailed; submitting = false; }
    render(); window.scrollTo({ top: 0 });
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && previewOpen) { previewOpen = false; render(); }
});

function normalizeAnswers(raw: unknown): PlanFormAnswers {
  if (!raw || typeof raw !== 'object') return defaultAnswers();
  const candidate = structuredClone(raw) as Record<string, unknown>;
  if (!('contentLanguage' in candidate)) candidate.contentLanguage = candidate.locale === 'en' ? 'en' : 'id';
  if (candidate.story && typeof candidate.story === 'object') {
    const story = candidate.story as Record<string, unknown>;
    if (typeof story.tone === 'string') {
      const oldTone: Record<string, string> = { warm: 'casual', romantic: 'romantic', playful: 'playful', poetic: 'poetic', simple: 'casual' };
      story.tone = [oldTone[story.tone] || 'casual'];
    }
  }
  const parsed = planFormDraftSchema.safeParse(candidate);
  return parsed.success ? parsed.data : defaultAnswers();
}

async function load(): Promise<void> {
  if (!projectId || !formToken) { loading = false; fatalError = c().invalidLink; render(); return; }
  try {
    let local: unknown = null;
    try { local = JSON.parse(localStorage.getItem(storageKey) || 'null'); } catch { /* ignore invalid local draft */ }
    const record = await formApi.get(projectId, formToken);
    answers = normalizeAnswers(record.draft || local);
    orderId = record.orderId; submittedAt = record.submittedAt || ''; submitted = record.status === 'submitted';
  } catch (error) {
    fatalError = error instanceof FormApiError && error.status === 410 ? c().submitted : c().invalidLink;
  }
  loading = false; render();
}

void load();

