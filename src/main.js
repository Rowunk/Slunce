import { initUI } from './ui/controller.js';

/* ---------- optional URL actions ---------- */
function handleUrlParameters() {
  const params  = new URLSearchParams(window.location.search);
  const action  = params.get('action');

  if (action === 'current') {
    /* delay to let UI bind listeners */
    setTimeout(() => document.getElementById('get-location')?.click(), 1_000);
  } else if (action === 'tomorrow') {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const picker = document.getElementById('date-picker');
    if (picker) picker.value = d.toISOString().split('T')[0];
  }

  /* clean URL so it won't repeat on reloads */
  if (action) window.history.replaceState({}, document.title, location.pathname);
}

/* ---------- main bootstrap ---------- */
document.addEventListener('DOMContentLoaded', async () => {
  /* 1. UI (core calculation + i18n glue) */
  initUI();

  /* 2. URL shortcuts (?action=…) */
  handleUrlParameters();

  /* 3. Service-worker (PWA offline & update channel) */
  let swRegistered = false;
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('sw.js');
      swRegistered = true;
    } catch (err) {
      console.warn('SW registration failed:', err);
      /* Do **not** await navigator.serviceWorker.ready later—may reject offline */
    }
  }

  /* 4. Defer bigger PWA helpers until after first paint */
  const [{ initInstall }, { initUpdates }] = await Promise.all([
    import('./pwa/install.js'),
    import('./pwa/update.js')
  ]);

  initInstall();

  /* Only initialise update channel when a worker is present */
  if (swRegistered || navigator.serviceWorker.controller) {
    initUpdates();
  }
});
