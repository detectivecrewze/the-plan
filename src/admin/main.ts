import './style.css';
import './phase4.css';
import { createProjectStarter } from '../projectStarter';
import { studioApi, studioSession, StudioApiError } from '../studio/api';
import { themes } from '../themes';
import { adminApi } from './api';
import type { AdminOrder, DashboardData, OrderStatus } from './types';
import type { PlanFormAnswers } from '../form/types';
import { reviewTemplate } from '../reviewTemplate';

const root = document.querySelector<HTMLDivElement>('#app')!;
const statuses: OrderStatus[] = ['waiting_form', 'ready_to_craft', 'in_progress', 'review', 'done'];
const statusLabels: Record<OrderStatus, string> = {
  waiting_form: 'Menunggu form', ready_to_craft: 'Siap dikerjakan', in_progress: 'Sedang dikerjakan', review: 'Menunggu review', done: 'Selesai',
};
let data: DashboardData = { orders: [], projects: [], responses: [] };
let loading = true;
let errorText = '';
let tab: 'orders' | 'history' | 'projects' | 'responses' = 'orders';
let query = '';
let creating = false;
let createdOrder: { projectId: string; orderId: string; formToken: string } | null = null;
let selectedOrderId = '';
let identityProjectId = '';

const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
const frontendOrigin = location.origin;
const formatDate = (value?: string) => value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
const formUrl = (id: string, token: string) => `${frontendOrigin}/form/${id}?token=${encodeURIComponent(token)}`;
const giftUrl = (id: string) => {
  const project = projectFor(id);
  return project?.customHostname ? `https://${project.customHostname}/` : `${frontendOrigin}/gift/${id}`;
};

function icon(name: 'grid' | 'inbox' | 'gift' | 'heart' | 'plus' | 'search' | 'copy' | 'open' | 'close' | 'check'): string {
  const paths = {
    grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
    inbox: '<path d="M4 4h16v14H4z"/><path d="M4 14h5l2 3h2l2-3h5"/>',
    gift: '<rect x="3" y="8" width="18" height="13"/><path d="M12 8v13M3 12h18M12 8H7.5a2.5 2.5 0 1 1 2.2-3.7L12 8Zm0 0h4.5a2.5 2.5 0 1 0-2.2-3.7L12 8Z"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    copy: '<rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
    open: '<path d="M14 3h7v7M10 14 21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>', check: '<path d="m5 12 4 4L19 6"/>',
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name]}</svg>`;
}

function projectFor(id: string) { return data.projects.find((project) => project.id === id); }
function orderForProject(id: string) { return data.orders.find((order) => order.projectId === id); }

function renderLogin(): void {
  document.documentElement.lang = 'id';
  root.innerHTML = `<main class="admin-login"><section><span class="admin-overline">THE PLAN · INTERNAL</span><h1>Satu meja untuk semua gift.</h1><p>Masuk memakai password tim yang sama dengan Studio.</p></section><form id="admin-login-form"><label><span>Password tim</span><input name="password" type="password" autocomplete="current-password" required autofocus></label><p class="admin-error" role="alert">${esc(errorText)}</p><button type="submit">Masuk ke dashboard ${icon('open')}</button><a href="/studio">Kembali ke Studio</a></form></main>`;
}

function orderCard(order: AdminOrder): string {
  const project = projectFor(order.projectId);
  const answers = order.answers as PlanFormAnswers | undefined;
  const language = answers?.contentLanguage === 'id-en' ? 'Indoglish' : answers?.contentLanguage === 'en' ? 'Full English' : 'Bahasa Indonesia';
  return `<article class="order-card" data-search="${esc(`${order.orderId} ${order.projectId} ${order.recipient} ${order.sender}`.toLowerCase())}">
    <div class="order-card-top"><div><span class="order-id">${esc(order.orderId)}</span><h3>${esc(order.recipient || order.projectId)}</h3><p>${esc(order.sender ? `Dari ${order.sender}` : 'Menunggu form')}</p></div><span class="status-pill status-${order.status}">${statusLabels[order.status]}</span></div>
    <dl><div><dt>Project</dt><dd>${esc(order.projectId)}</dd></div><div><dt>Dibuat</dt><dd>${formatDate(order.createdAt)}</dd></div><div><dt>Bahasa</dt><dd>${esc(language)}</dd></div><div><dt>Deadline</dt><dd>${answers?.deadline ? formatDate(answers.deadline) : 'Tidak ada'}</dd></div><div><dt>Gift</dt><dd>${project?.publishedAt ? 'Sudah terbit' : 'Draft'}</dd></div></dl>
    <div class="card-actions"><button data-action="order-detail" data-order-id="${esc(order.orderId)}">Lihat detail</button><a href="/studio/${encodeURIComponent(order.projectId)}">Buka Studio ${icon('open')}</a>${order.formToken ? `<button data-action="copy-form" data-project-id="${esc(order.projectId)}" data-form-token="${esc(order.formToken)}">${icon('copy')} Link form</button>` : ''}${project?.publishedAt ? `<button data-action="copy-review" data-project-id="${esc(order.projectId)}">${icon('copy')} Template WhatsApp</button>` : ''}</div>
  </article>`;
}

function projectCard(project: DashboardData['projects'][number]): string {
  const order = orderForProject(project.id);
  return `<article class="project-card" data-search="${esc(`${project.id} ${project.recipient} ${project.sender} ${project.customHostname || ''}`.toLowerCase())}"><div class="project-swatch" style="--project-color:${themes[project.theme].colors.primary};--project-paper:${themes[project.theme].colors.paper}"></div><div><span>${project.publishedAt ? 'PUBLISHED' : 'DRAFT'}</span><h3>${esc(project.recipient || project.id)}</h3><p>${esc(project.id)} · ${esc(themes[project.theme].name)}</p>${project.customHostname ? `<small class="custom-host">${esc(project.customHostname)}</small>` : ''}</div><div class="project-meta"><small>Terakhir disimpan</small><strong>${formatDate(project.savedAt)}</strong>${order ? `<small>${esc(order.orderId)}</small>` : ''}</div><div class="card-actions"><a href="/studio/${encodeURIComponent(project.id)}">Buka Studio ${icon('open')}</a><button data-action="project-identity" data-project-id="${esc(project.id)}">Link & domain</button>${project.publishedAt ? `<a href="${giftUrl(project.id)}" target="_blank" rel="noopener">Buka gift ${icon('open')}</a><button data-action="copy-review" data-project-id="${esc(project.id)}">${icon('copy')} Template WhatsApp</button>` : ''}${order?.formToken ? `<button data-action="copy-form" data-project-id="${esc(project.id)}" data-form-token="${esc(order.formToken)}">${icon('copy')} Link form</button>` : ''}</div></article>`;
}

function responseCard(response: DashboardData['responses'][number]): string {
  const project = projectFor(response.projectId);
  return `<article class="response-card" data-search="${esc(`${response.projectId} ${project?.recipient || ''}`.toLowerCase())}"><div class="response-mark">${icon('heart')}</div><div><span>JAWABAN DITERIMA</span><h3>${esc(project?.recipient || response.projectId)}</h3><p>Menjawab “Iya, aku mau pergi” pada ${formatDate(response.answeredAt)}.</p></div><a href="${giftUrl(response.projectId)}" target="_blank" rel="noopener">Buka gift ${icon('open')}</a></article>`;
}

function orderAnswers(order: AdminOrder): string {
  const answer = order.answers as PlanFormAnswers | undefined;
  if (!answer) return `<div class="waiting-form-note"><strong>Form belum dikirim.</strong><p>Data customer dan bahan gift akan tampil lengkap di sini setelah form disubmit.</p></div>`;
  const occasion = answer.people.occasion === 'other' ? answer.people.customOccasion : answer.people.occasion;
  const music = answer.music.mode === 'playlist' ? `${answer.music.selected?.title || '—'} · ${answer.music.selected?.artist || '—'}` : answer.music.mode === 'request' ? answer.music.request : answer.music.mode === 'upload' ? `${answer.music.uploadTitle} · ${answer.music.uploadArtist} (${answer.music.uploaded?.name || 'file belum ada'})` : 'Tim memilihkan lagu';
  const language = answer.contentLanguage === 'id-en' ? 'Indoglish' : answer.contentLanguage === 'en' ? 'Full English' : 'Bahasa Indonesia';
  const letterMode = answer.story.letterMode === 'expand' ? 'Boleh dikembangkan tim' : 'Pertahankan tulisan customer';
  const toneLabels: Record<PlanFormAnswers['story']['tone'][number], string> = { casual: 'Santai', poetic: 'Puitis', romantic: 'Romantis', heartfelt: 'Mengharukan', playful: 'Manja & playful' };
  const tones = Array.isArray(answer.story.tone) ? answer.story.tone.map((tone) => toneLabels[tone] || tone).join(', ') : String(answer.story.tone || '—');
  const factual = [
    ['Penerima', answer.people.recipient], ['Nama panggilan', answer.people.recipientNickname || '—'], ['Pengirim', answer.people.sender], ['Bahasa isi', language],
    ['Deadline', answer.deadline ? formatDate(answer.deadline) : 'Tidak ada'],
    ['Momen', occasion], ['Hubungan', answer.people.relationship], ['Tanggal', answer.event.date], ['Waktu', `${answer.event.startTime}${answer.event.endTime ? ` – ${answer.event.endTime}` : ''}`],
    ['Tempat', answer.event.venue || '—'], ['Alamat', answer.event.address || '—'], ['Dress code', answer.event.dressCode || '—'], ['Maps', answer.event.mapsUrl || '—'],
  ];
  const media = [answer.media.featured, ...answer.media.gallery].filter(Boolean) as NonNullable<typeof answer.media.featured>[];
  return `<section class="answer-detail"><div class="answer-heading"><span>BAHAN DARI CUSTOMER</span><strong>${esc(language)} · ${esc(themes[answer.theme].name)}</strong></div>${order.draftAppliedAt ? `<div class="waiting-form-note applied"><strong>Sudah masuk ke draft Studio.</strong><p>Nama, event, rundown, surat, palet, musik pilihan, serta seluruh media diterapkan otomatis pada ${formatDate(order.draftAppliedAt)}. Tim tinggal memeriksa dan merapikan hasilnya.</p></div>` : ''}<div class="answer-facts">${factual.map(([key, value]) => `<div><span>${esc(key)}</span><strong>${esc(value)}</strong></div>`).join('')}</div>${answer.event.rundownNotes ? `<div class="answer-block"><span>Rundown mentah</span><pre>${esc(answer.event.rundownNotes)}</pre></div>` : ''}<div class="answer-block"><span>Isi Letter Section persis dari customer</span><p>${esc(answer.story.message)}</p></div><div class="answer-facts"><div><span>Pengolahan surat</span><strong>${esc(letterMode)}</strong></div><div><span>Gaya tulisan</span><strong>${esc(tones)}</strong></div><div><span>Musik</span><strong>${esc(music)}</strong></div><div><span>Request lagu</span><strong>${esc(answer.music.request || '—')}</strong></div></div><div class="answer-media-heading"><span>MEDIA CUSTOMER</span><strong>${media.length} file</strong></div><div class="answer-media">${media.map((item, index) => `<a href="${esc(item.url)}" target="_blank" rel="noopener"><span>${index === 0 ? 'UTAMA' : String(index).padStart(2, '0')}</span>${item.type === 'video' ? `<video src="${esc(item.url)}" muted preload="metadata"></video>` : `<img src="${esc(item.url)}" alt="" loading="lazy">`}<small>${esc(item.name)}</small></a>`).join('')}</div></section>`;
}

function createDialog(): string {
  if (!createdOrder) return '';
  const url = formUrl(createdOrder.projectId, createdOrder.formToken);
  return `<div class="admin-modal" role="presentation"><section class="created-dialog" role="dialog" aria-modal="true" aria-labelledby="create-title"><button class="modal-x" data-action="close-create" aria-label="Tutup">${icon('close')}</button><span class="created-mark">${icon('check')}</span><span class="admin-overline">PROJECT BERHASIL DIBUAT</span><h2 id="create-title">Link form sudah siap.</h2><p>Tidak ada data customer yang perlu diisi di sini. Kirim link ini, lalu seluruh jawaban dan media akan masuk kembali ke Dashboard.</p><div class="created-ids"><div><span>Project ID</span><strong>${esc(createdOrder.projectId)}</strong></div><div><span>Order ID</span><strong>${esc(createdOrder.orderId)}</strong></div></div><code>${esc(url)}</code><div class="created-actions"><button class="primary" data-action="copy-created-form" data-project-id="${esc(createdOrder.projectId)}" data-form-token="${esc(createdOrder.formToken)}">${icon('copy')} Salin link form</button><a href="${esc(url)}" target="_blank" rel="noopener">Buka form ${icon('open')}</a><a href="/studio/${encodeURIComponent(createdOrder.projectId)}">Buka Studio ${icon('open')}</a></div></section></div>`;
}

function detailDialog(): string {
  const order = data.orders.find((item) => item.orderId === selectedOrderId);
  if (!order) return '';
  const project = projectFor(order.projectId);
  const answer = order.answers;
  return `<div class="admin-modal" role="presentation"><section role="dialog" aria-modal="true" aria-labelledby="detail-title"><button class="modal-x" data-action="close-detail" aria-label="Tutup">${icon('close')}</button><span class="admin-overline">${esc(order.orderId)}</span><h2 id="detail-title">${esc(order.recipient || order.projectId)}</h2><div class="detail-grid"><div><span>Penerima</span><strong>${esc(order.recipient || 'Menunggu form')}</strong></div><div><span>Nama panggilan</span><strong>${esc(answer?.people.recipientNickname || '—')}</strong></div><div><span>Pengirim</span><strong>${esc(order.sender || '—')}</strong></div><div><span>Bahasa isi</span><strong>${esc(answer?.contentLanguage === 'id-en' ? 'Indoglish' : answer?.contentLanguage === 'en' ? 'Full English' : 'Bahasa Indonesia')}</strong></div><div><span>Palet</span><strong>${esc(themes[order.theme].name)}</strong></div><div><span>Draft Studio</span><strong>${order.draftAppliedAt ? 'Sudah terisi otomatis' : 'Menunggu form'}</strong></div></div>${orderAnswers(order)}<form id="update-order-form"><input type="hidden" name="orderId" value="${esc(order.orderId)}"><label><span>Status pengerjaan</span><select name="status">${statuses.map((status) => `<option value="${status}" ${order.status === status ? 'selected' : ''}>${statusLabels[status]}</option>`).join('')}</select></label><label><span>Catatan internal</span><textarea name="notes" rows="5">${esc(order.notes)}</textarea></label><div class="link-stack">${order.formToken ? `<button type="button" data-action="copy-form" data-project-id="${esc(order.projectId)}" data-form-token="${esc(order.formToken)}">${icon('copy')} Salin link form</button>` : ''}${answer ? `<button type="button" data-action="apply-order" data-order-id="${esc(order.orderId)}">${icon('check')} Terapkan ulang ke Draft</button>` : ''}<button type="button" data-action="project-identity" data-project-id="${esc(order.projectId)}">Link & domain</button><a href="/studio/${encodeURIComponent(order.projectId)}">Buka Studio ${icon('open')}</a>${project?.publishedAt ? `<a href="${giftUrl(order.projectId)}" target="_blank" rel="noopener">Buka gift final ${icon('open')}</a><button type="button" data-action="copy-review" data-project-id="${esc(order.projectId)}">${icon('copy')} Template WhatsApp</button>` : ''}</div><p class="reapply-note">Terapkan ulang akan mengganti bagian yang berasal dari Form pada draft Studio. Gunakan sebelum merapikan copy final.</p><p class="admin-error" role="alert">${esc(errorText)}</p><div class="modal-actions"><button type="button" data-action="close-detail">Tutup</button><button class="primary" type="submit">Simpan perubahan</button></div></form></section></div>`;
}

function identityDialog(): string {
  const project = projectFor(identityProjectId);
  if (!project) return '';
  return `<div class="admin-modal" role="presentation"><section class="identity-dialog" role="dialog" aria-modal="true" aria-labelledby="identity-title"><button class="modal-x" data-action="close-identity" aria-label="Tutup">${icon('close')}</button><span class="admin-overline">LINK PERSONAL</span><h2 id="identity-title">Atur slug & domain.</h2><p>Slug menentukan link standar The Plan. Custom domain bersifat opsional dan baru aktif setelah domain tersebut ditambahkan ke project Vercel The Plan.</p><form id="project-identity-form"><input type="hidden" name="oldProjectId" value="${esc(project.id)}"><label><span>Slug / Project ID</span><input name="projectId" value="${esc(project.id)}" pattern="[a-z0-9][a-z0-9-]{2,63}" maxlength="64" required><small>Contoh: plan-untuk-nara. Mengubah slug akan mengubah link Studio, Form, gift, dan data RSVP terkait.</small></label><label><span>Custom domain (opsional)</span><input name="customHostname" value="${esc(project.customHostname || '')}" placeholder="gift.namaanda.com" inputmode="url"><small>Masukkan hostname saja, tanpa path. Tambahkan domain yang sama di Vercel sebelum dibagikan.</small></label><div class="link-preview"><span>Link aktif</span><code>${esc(giftUrl(project.id))}</code></div><p class="admin-error" role="alert">${esc(errorText)}</p><div class="modal-actions"><button type="button" data-action="close-identity">Batal</button><button class="primary" type="submit">Simpan link</button></div></form></section></div>`;
}

function renderDashboard(): void {
  const pending = data.orders.filter((order) => order.status !== 'done').length;
  const ready = data.orders.filter((order) => order.status === 'ready_to_craft').length;
  const published = data.projects.filter((project) => project.publishedAt).length;
  const cards = tab === 'orders' ? data.orders.filter((order) => order.status !== 'done').map(orderCard).join('') : tab === 'history' ? data.orders.filter((order) => order.status === 'done').map(orderCard).join('') : tab === 'projects' ? data.projects.map(projectCard).join('') : data.responses.map(responseCard).join('');
  root.innerHTML = `<div class="admin-shell"><header><a href="/admin" class="admin-brand"><span>TP</span><div><strong>THE PLAN</strong><small>Production desk</small></div></a><nav><a href="/studio">Studio</a><button data-action="logout">Keluar</button></nav></header><main><section class="dashboard-heading"><div><span class="admin-overline">DASHBOARD INTERNAL</span><h1>Semua pesanan,<br>dalam satu meja.</h1><p>Kelola bahan customer, produksi gift, dan jawaban penerima.</p></div><button class="new-order" data-action="open-create">${icon('plus')} Order baru</button></section><section class="stats"><article><span>Perlu dikerjakan</span><strong>${pending}</strong><small>${ready} sudah siap dibuat</small></article><article><span>Project aktif</span><strong>${data.projects.length}</strong><small>${published} sudah dipublish</small></article><article><span>Jawaban penerima</span><strong>${data.responses.length}</strong><small>Tersimpan dari gift final</small></article></section><section class="workspace"><div class="workspace-tools"><div class="tabs"><button class="${tab === 'orders' ? 'active' : ''}" data-tab="orders">${icon('inbox')} Incoming <b>${pending}</b></button><button class="${tab === 'history' ? 'active' : ''}" data-tab="history">${icon('grid')} Selesai <b>${data.orders.length - pending}</b></button><button class="${tab === 'projects' ? 'active' : ''}" data-tab="projects">${icon('gift')} Projects <b>${data.projects.length}</b></button><button class="${tab === 'responses' ? 'active' : ''}" data-tab="responses">${icon('heart')} RSVP <b>${data.responses.length}</b></button></div><label class="search">${icon('search')}<input id="dashboard-search" type="search" placeholder="Cari nama, project, atau Order ID" value="${esc(query)}"></label></div><div class="workspace-title"><div><span>${tab === 'orders' ? 'ANTRIAN PRODUKSI' : tab === 'history' ? 'RIWAYAT SELESAI' : tab === 'projects' ? 'SEMUA PROJECT' : 'JAWABAN TERBARU'}</span><h2>${tab === 'orders' ? 'Incoming orders' : tab === 'history' ? 'Completed orders' : tab === 'projects' ? 'Gift projects' : 'Recipient RSVP'}</h2></div><button data-action="refresh">Muat ulang</button></div><div class="card-list" id="card-list">${cards || `<div class="empty-state">${icon(tab === 'responses' ? 'heart' : 'inbox')}<h3>Belum ada data di bagian ini.</h3><p>Data baru akan muncul otomatis setelah tersimpan di Worker.</p></div>`}</div></section></main>${createDialog()}${detailDialog()}${identityDialog()}</div>`;
  if (creating) {
    const button = document.querySelector<HTMLButtonElement>('[data-action="open-create"]');
    if (button) { button.disabled = true; button.textContent = 'Membuat project...'; }
  }
  if (errorText && !createdOrder && !selectedOrderId) document.querySelector('.dashboard-heading')?.insertAdjacentHTML('afterend', `<p class="dashboard-error" role="alert">${esc(errorText)}</p>`);
  applySearch();
}

function applySearch(): void {
  const normalized = query.trim().toLowerCase();
  document.querySelectorAll<HTMLElement>('[data-search]').forEach((card) => { card.hidden = normalized.length > 0 && !card.dataset.search!.includes(normalized); });
}

async function createManualOrder(): Promise<void> {
  if (creating) return;
  creating = true; errorText = ''; renderDashboard();
  const time = Date.now();
  const random = crypto.randomUUID().slice(0, 8);
  const projectId = `plan-${time.toString(36)}-${random}`;
  const orderId = `manual-${time}-${random}`;
  const formToken = crypto.randomUUID();
  const project = createProjectStarter(projectId);
  try {
    await adminApi.createOrder({ project, order: { projectId, orderId, formToken } });
    createdOrder = { projectId, orderId, formToken };
    await loadDashboard();
  } catch (error) {
    errorText = error instanceof Error ? error.message : 'Project gagal dibuat.';
  } finally {
    creating = false; renderDashboard();
  }
}

function render(): void {
  if (!studioSession.get()) { renderLogin(); return; }
  if (loading) { root.innerHTML = `<main class="admin-loading"><span>THE PLAN</span><h1>Menyiapkan production desk…</h1></main>`; return; }
  renderDashboard();
}

async function loadDashboard(): Promise<void> {
  loading = true; render();
  try { data = await adminApi.dashboard(); errorText = ''; }
  catch (error) {
    if (error instanceof StudioApiError && error.status === 401) { studioSession.clear(); errorText = 'Sesi berakhir. Silakan masuk lagi.'; }
    else errorText = error instanceof Error ? error.message : 'Dashboard gagal dimuat.';
  }
  loading = false; render();
}

root.addEventListener('input', (event) => {
  const input = event.target as HTMLInputElement;
  if (input.id !== 'dashboard-search') return;
  query = input.value; applySearch();
});

root.addEventListener('click', async (event) => {
  const target = (event.target as Element).closest<HTMLElement>('[data-action], [data-tab]');
  if (!target) return;
  if (target.dataset.tab) { tab = target.dataset.tab as typeof tab; query = ''; renderDashboard(); return; }
  const action = target.dataset.action;
  if (action === 'logout') { studioSession.clear(); renderLogin(); return; }
  if (action === 'refresh') { await loadDashboard(); return; }
  if (action === 'open-create') { await createManualOrder(); return; }
  if (action === 'close-create') { createdOrder = null; errorText = ''; renderDashboard(); return; }
  if (action === 'order-detail') { selectedOrderId = target.dataset.orderId || ''; errorText = ''; renderDashboard(); return; }
  if (action === 'close-detail') { selectedOrderId = ''; errorText = ''; renderDashboard(); return; }
  if (action === 'project-identity') { identityProjectId = target.dataset.projectId || ''; selectedOrderId = ''; errorText = ''; renderDashboard(); return; }
  if (action === 'close-identity') { identityProjectId = ''; errorText = ''; renderDashboard(); return; }
  if (action === 'apply-order') {
    const id = target.dataset.orderId || '';
    if (!confirm('Terapkan ulang semua jawaban dan media customer ke draft Studio? Bagian draft yang berasal dari Form akan diganti.')) return;
    target.setAttribute('disabled', 'true');
    target.textContent = 'Menerapkan...';
    try { await adminApi.applyOrder(id); await loadDashboard(); selectedOrderId = id; renderDashboard(); }
    catch (error) { errorText = error instanceof Error ? error.message : 'Data customer gagal diterapkan.'; selectedOrderId = id; renderDashboard(); }
    return;
  }
  if (action === 'copy-review') {
    const id = target.dataset.projectId || '';
    try {
      const published = await studioApi.getPublished(id);
      await navigator.clipboard.writeText(reviewTemplate(published.project, giftUrl(id), published.project.locale));
      target.textContent = 'Template WhatsApp tersalin';
      setTimeout(() => { target.innerHTML = `${icon('copy')} Template WhatsApp`; }, 1600);
    } catch (error) { errorText = error instanceof Error ? error.message : 'Template WhatsApp gagal disalin.'; renderDashboard(); }
    return;
  }
  if (action === 'copy-form') {
    const id = target.dataset.projectId || '';
    const token = target.dataset.formToken || '';
    await navigator.clipboard.writeText(formUrl(id, token));
    target.textContent = 'Link form tersalin';
    setTimeout(() => { target.innerHTML = `${icon('copy')} Link form`; }, 1400);
  }
  if (action === 'copy-created-form' && createdOrder) {
    await navigator.clipboard.writeText(formUrl(createdOrder.projectId, createdOrder.formToken));
    target.textContent = 'Link form tersalin';
    setTimeout(() => { target.innerHTML = `${icon('copy')} Salin link form`; }, 1400);
  }
});

root.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.target as HTMLFormElement;
  const values = new FormData(form);
  if (form.id === 'admin-login-form') {
    try { await studioApi.login(String(values.get('password') || '')); errorText = ''; await loadDashboard(); }
    catch { errorText = 'Password salah atau Worker belum tersedia.'; renderLogin(); }
    return;
  }
  if (form.id === 'update-order-form') {
    const id = String(values.get('orderId') || '');
    try { await adminApi.updateOrder(id, String(values.get('status')) as OrderStatus, String(values.get('notes') || '')); selectedOrderId = ''; await loadDashboard(); }
    catch (error) { errorText = error instanceof Error ? error.message : 'Status gagal disimpan.'; renderDashboard(); }
  }
  if (form.id === 'project-identity-form') {
    const oldProjectId = String(values.get('oldProjectId') || '');
    try {
      await adminApi.updateProjectIdentity(oldProjectId, String(values.get('projectId') || ''), String(values.get('customHostname') || ''));
      identityProjectId = '';
      errorText = '';
      await loadDashboard();
    } catch (error) {
      errorText = error instanceof Error ? error.message : 'Link project gagal diperbarui.';
      identityProjectId = oldProjectId;
      renderDashboard();
    }
  }
});

void loadDashboard();
