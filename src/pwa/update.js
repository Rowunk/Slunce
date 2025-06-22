export function initUpdates() {
  if (!('serviceWorker' in navigator)) return;

  const notif      = document.getElementById('update-notification');
  const btnUpdate  = document.getElementById('update-btn');
  const btnDismiss = document.getElementById('dismiss-update');

  /* Abort gracefully if the banner markup is absent on this page */
  if (!notif || !btnUpdate || !btnDismiss) return;

  const showNotif = () => notif.classList.remove('hidden');
  const hideNotif = () => notif.classList.add('hidden');

  /* listen for SW becoming the new controller */
  navigator.serviceWorker.addEventListener('controllerchange', showNotif);

  /* poll the ready registration for waiting workers */
  navigator.serviceWorker.ready.then((reg) => {
    if (reg.waiting) showNotif();

    /* monitor new updates */
    reg.addEventListener('updatefound', () => {
      reg.installing?.addEventListener('statechange', () => {
        if (
          reg.installing?.state === 'installed' &&
          navigator.serviceWorker.controller
        ) {
          showNotif();
        }
      });
    });
  });

  /* user clicks “Update now” */
  btnUpdate.addEventListener('click', async () => {
    const reg = await navigator.serviceWorker.ready;
    reg.waiting?.postMessage({ type: 'SKIP_WAITING' });
    /* give the new worker control, then reload */
    window.location.reload();
  });

  /* user dismisses the banner */
  btnDismiss.addEventListener('click', hideNotif);
}
