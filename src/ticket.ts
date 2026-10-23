import type { GiftProject } from './project';
import { eventDate } from './copy';

const W = 1080;
const H = 1920;

function multiline(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number {
  const words = text.split(/\s+/);
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      ctx.fillText(line, x, y); y += lineHeight; line = word;
    } else line = next;
  }
  if (line) { ctx.fillText(line, x, y); y += lineHeight; }
  return y;
}

export async function makeTicket(project: GiftProject): Promise<Blob> {
  await Promise.all([document.fonts.load('bold 100px Kalam'), document.fonts.load('48px Caveat'), document.fonts.load('38px Nunito Sans')]);
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  const c = canvas.getContext('2d');
  if (!c) throw new Error('Canvas unavailable');
  c.fillStyle = '#e6ded3'; c.fillRect(0, 0, W, H);
  c.fillStyle = '#f9f2e9'; c.fillRect(50, 80, 980, 1760);
  c.strokeStyle = '#9c302f'; c.lineWidth = 4; c.setLineDash([14, 12]); c.strokeRect(80, 110, 920, 1700); c.setLineDash([]);
  c.save(); c.translate(845, 260); c.rotate(0.14); c.strokeStyle = '#aa3932'; c.lineWidth = 7; c.beginPath(); c.arc(0, 0, 95, 0, Math.PI * 2); c.stroke(); c.font = 'bold 29px Nunito Sans'; c.fillStyle = '#aa3932'; c.textAlign = 'center'; c.fillText('THE PLAN', 0, -3); c.fillText('FOR YOU', 0, 35); c.restore();
  c.textAlign = 'left'; c.fillStyle = '#a34239'; c.font = 'bold 34px Nunito Sans'; c.fillText('A LITTLE DAY, PLANNED WITH LOVE', 130, 245);
  c.fillStyle = '#552624'; c.font = 'bold 112px Kalam';
  let y = multiline(c, project.invitation.title, 130, 435, 800, 120);
  c.strokeStyle = '#b64a3b'; c.lineWidth = 4; c.beginPath(); c.moveTo(130, y + 12); c.lineTo(930, y + 12); c.stroke();
  const date = eventDate(project.invitation.date, project.locale);
  y += 120; c.fillStyle = '#a34239'; c.font = 'bold 35px Nunito Sans'; c.fillText(project.locale === 'id' ? 'TANGGAL' : 'DATE', 130, y);
  c.fillStyle = '#552624'; c.font = 'bold 70px Kalam'; c.fillText(date.full, 130, y + 80);
  y += 180; c.fillStyle = '#a34239'; c.font = 'bold 35px Nunito Sans'; c.fillText(project.locale === 'id' ? 'WAKTU' : 'TIME', 130, y);
  c.fillStyle = '#552624'; c.font = 'bold 64px Kalam'; c.fillText(`${project.invitation.startTime}${project.invitation.endTime ? ` – ${project.invitation.endTime}` : ''}`, 130, y + 76);
  y += 170;
  if (project.invitation.venue) {
    c.fillStyle = '#a34239'; c.font = 'bold 35px Nunito Sans'; c.fillText(project.locale === 'id' ? 'TEMPAT' : 'PLACE', 130, y);
    c.fillStyle = '#552624'; c.font = 'bold 58px Kalam'; y = multiline(c, project.invitation.venue, 130, y + 70, 790, 69) + 35;
    if (project.invitation.address) { c.font = '35px Nunito Sans'; y = multiline(c, project.invitation.address, 130, y, 790, 48) + 20; }
  }
  y = Math.min(Math.max(y + 80, 1310), 1490);
  c.fillStyle = '#a34239'; c.font = '48px Caveat'; multiline(c, project.closing.ticketMessage, 130, y, 800, 58);
  c.fillStyle = '#552624'; c.font = 'bold 37px Nunito Sans'; c.fillText(project.sender ? `from ${project.sender}` : 'made for you', 130, 1685);
  c.strokeStyle = '#b64a3b'; c.lineWidth = 3; c.beginPath(); c.moveTo(130, 1715); c.lineTo(930, 1715); c.stroke();
  c.fillStyle = '#a34239'; c.font = 'bold 25px Nunito Sans'; c.fillText('THE PLAN  •  FOR YOU, ALWAYS.', 130, 1770);
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('PNG encoding failed')), 'image/png'));
}

export function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = name; document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
