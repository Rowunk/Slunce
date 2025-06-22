let deferredPrompt = null;

function isAlreadyInstalled() {
  return (
    window.navigator.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches ||
    new URLSearchParams(window.location.search).get('standalone') === 'true'
  );
}

export function initInstall() {
  /* grab elements (may be null!) */
  const btnInstall   = document.getElementById('install-btn');
  const modalInstall = document.getElementById('install-modal');
  const btnClose     = document.getElementById('close-modal');
  const toast        = document.getElementById('install-success');

  /* helpers */
  const showBtn   = () => btnInstall?.classList.remove('hidden');
  const hideBtn   = () => btnInstall?.classList.add('hidden');
  const showModal = () => {
    if (!modalInstall) return;
    modalInstall.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  };
  const hideModal = () => {
    if (!modalInstall) return;
    modalInstall.classList.add('hidden');
    document.body.style.overflow = '';
  };
  const showToast = (key, ms = 3000) => {
    if (!toast) return;
    toast.querySelector('span').textContent = getText(key);
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), ms);
  };

  /* intercept browser prompt */
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (!isAlreadyInstalled()) showBtn();
  });

  /* iOS visual tweak */
  if (window.navigator.standalone) document.body.classList.add('ios-standalone');

  /* notify when installed */
  window.addEventListener('appinstalled', () => {
    hideBtn();
    showToast('installSuccess');
  });

  /* fallback: show manual button after 5 s */
  if (!isAlreadyInstalled()) {
    setTimeout(() => {
      if (!deferredPrompt) {
        /* No browser prompt available → expose manual button only */
        showBtn();
      }
    }, 5000);
  } else hideBtn();

  /* main button */
  btnInstall?.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') hideBtn();
      deferredPrompt = null;
    } else if (isAlreadyInstalled()) {
      showToast('alreadyInstalled');
    } else {
      showModal();               // manual instructions
    }
  });

  /* modal controls (only if elements exist) */
  btnClose?.addEventListener('click', hideModal);
  modalInstall?.addEventListener('click', (e) => {
    if (e.target.id === 'install-modal') hideModal();
  });

  /* live display-mode changes */
  window
    .matchMedia('(display-mode: standalone)')
    .addEventListener('change', (e) => e.matches && hideBtn());
}
