import * as QRCode from 'qrcode';
import type { GiftProject } from '../project';
import { themes } from '../themes';

export { reviewTemplate } from '../reviewTemplate';

const xml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]!);

/** Keeps a four-module quiet zone so the stamp remains easy to scan. */
export function makeBarcodeSvg(url: string, project: GiftProject): string {
  const qr = QRCode.create(url, { errorCorrectionLevel: 'H' });
  const colors = themes[project.theme].colors;
  const n = qr.modules.size;
  const cell = Math.floor(560 / n);
  const qrSize = n * cell;
  const qrX = Math.floor((1000 - qrSize) / 2);
  const qrY = 275;
  const quiet = cell * 4;
  const modules: string[] = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    if (qr.modules.get(y, x)) modules.push(`<rect x="${qrX + x * cell}" y="${qrY + y * cell}" width="${cell}" height="${cell}"/>`);
  }
  const perforations: string[] = [];
  for (let y = 82; y <= 1118; y += 28) {
    perforations.push(`<circle cx="52" cy="${y}" r="8" fill="black"/><circle cx="948" cy="${y}" r="8" fill="black"/>`);
  }
  for (let x = 82; x <= 918; x += 28) {
    perforations.push(`<circle cx="${x}" cy="52" r="8" fill="black"/><circle cx="${x}" cy="1148" r="8" fill="black"/>`);
  }
  const title = project.recipient?.trim() ? `FOR ${project.recipient.trim().slice(0, 24).toUpperCase()}` : 'MADE FOR YOU';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1200" viewBox="0 0 1000 1200" role="img" aria-label="QR stamp">
  <defs><mask id="stamp-edge"><rect x="52" y="52" width="896" height="1096" rx="10" fill="white"/>${perforations.join('')}</mask></defs>
  <rect width="1000" height="1200" fill="${colors.surface}"/>
  <rect x="52" y="52" width="896" height="1096" rx="10" fill="${colors.paperBright}" mask="url(#stamp-edge)"/>
  <rect x="78" y="78" width="844" height="1044" rx="5" fill="none" stroke="${colors.border}" stroke-width="3" stroke-dasharray="12 10"/>
  <path d="M150 990H850" fill="none" stroke="${colors.border}" stroke-width="3"/>
  <rect x="${qrX - quiet}" y="${qrY - quiet}" width="${qrSize + quiet * 2}" height="${qrSize + quiet * 2}" rx="6" fill="#fff"/>
  <g fill="${colors.primaryDark}">${modules.join('')}</g>
  <text x="500" y="964" text-anchor="middle" fill="${colors.primaryDark}" font-family="Arial,sans-serif" font-size="25" font-weight="700" letter-spacing="5">SCAN TO OPEN</text>
  <text x="500" y="1044" text-anchor="middle" fill="${colors.ink}" font-family="Georgia,serif" font-size="35">${xml(title)}</text>
  <text x="500" y="1092" text-anchor="middle" fill="${colors.inkSoft}" font-family="Arial,sans-serif" font-size="20" letter-spacing="3">A LITTLE DAY, PLANNED WITH LOVE</text>
  </svg>`;
}
export function barcodeDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export async function downloadBarcodePng(svg: string, filename: string): Promise<void> {
  const image = new Image();
  image.src = barcodeDataUrl(svg);
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = 1000;
  canvas.height = 1200;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas unavailable');
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('PNG export failed')), 'image/png'));
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}

