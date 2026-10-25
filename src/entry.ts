const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('Missing app root');

if (location.pathname.startsWith('/admin') || location.pathname.startsWith('/dashboard')) {
  void import('./admin/main');
} else if (location.pathname.startsWith('/form/')) {
  void import('./form/main');
} else if (location.pathname.startsWith('/studio')) {
  void import('./studio/main');
} else {
  void import('./main').catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Could not open this gift.';
    app.replaceChildren();
    const panel = document.createElement('main');
    panel.style.cssText = 'max-width:480px;margin:12vh auto;padding:32px;font:18px system-ui;color:#5c302f;text-align:center';
    panel.textContent = message;
    app.append(panel);
  });
}
