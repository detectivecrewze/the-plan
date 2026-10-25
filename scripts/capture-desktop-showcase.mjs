import { mkdir, writeFile } from 'node:fs/promises';

const [debugPort = '9333', baseUrl = 'http://127.0.0.1:4322', outputDir = 'showcase/desktop'] = process.argv.slice(2);
await mkdir(outputDir, { recursive: true });

const pageList = await fetch(`http://127.0.0.1:${debugPort}/json/list`).then((response) => response.json());
const page = pageList.find((entry) => entry.type === 'page');
if (!page?.webSocketDebuggerUrl) throw new Error('Chrome DevTools page is unavailable');

const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});

let nextId = 0;
const pending = new Map();
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (!message.id || !pending.has(message.id)) return;
  const { resolve, reject } = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) reject(new Error(message.error.message));
  else resolve(message.result);
});

function command(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const targets = [
  ['opening', '#gate', ''],
  ['hero', '#hero', '?sample=1&section=hero'],
  ['music', '#music-player', '?sample=1&section=music-player'],
  ['invitation', '#invitation', '?sample=1&section=invitation'],
  ['rundown', '.rundown', '?sample=1&section=invitation'],
  ['letter', '.letter-section', '?sample=1&section=letter'],
  ['gallery', '.gallery-section', '?sample=1&section=gallery'],
  ['closing', '.closing-section', '?sample=1&section=closing'],
  ['ticket', '#ticket-modal', '?sample=1&section=closing'],
];

await command('Page.enable');
await command('Emulation.setDeviceMetricsOverride', {
  width: 1600,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});

for (const [name, selector, query] of targets) {
  await command('Page.navigate', { url: `${baseUrl}/${query}` });
  await pause(1800);
  const evaluated = await command('Runtime.evaluate', {
    expression: `(() => {
      document.body.classList.remove('gate-open', 'modal-open');
      document.querySelector('#gift-content')?.removeAttribute('inert');
      document.querySelector('#gift-content')?.classList.remove('motion-ready');
      document.querySelectorAll('[data-reveal]').forEach((node) => node.classList.add('is-visible'));
      if (${JSON.stringify(name)} === 'ticket') {
        const modal = document.querySelector('#ticket-modal');
        if (modal) modal.hidden = false;
        document.body.classList.add('modal-open');
        const card = document.querySelector('.printed-card');
        if (card) card.style.animation = 'none';
      }
      const target = document.querySelector(${JSON.stringify(selector)});
      if (!target) return false;
      target.scrollIntoView({ block: ${name === 'music' ? "'center'" : "'start'"}, behavior: 'instant' });
      return true;
    })()`,
    returnByValue: true,
  });
  if (!evaluated.result?.value) throw new Error(`Missing section: ${selector}`);
  await pause(700);
  const screenshot = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await writeFile(`${outputDir}/${name}.png`, Buffer.from(screenshot.data, 'base64'));
}

socket.close();
