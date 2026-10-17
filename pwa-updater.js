/* YUNA's PWA update helper. Does not access app data or browser storage. */
(() => {
  'use strict';
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return;

  const workerPath = document.currentScript?.getAttribute('data-worker') || './sw.js';
  let registration;
  let requestedRefresh = false;
  let reloading = false;
  let postponedWorker = null;

  function showUpdate(worker) {
    if (!worker || worker === postponedWorker) return;
    if (document.getElementById('yuna-pwa-update')) return;

    const bar = document.createElement('div');
    bar.id = 'yuna-pwa-update';
    bar.setAttribute('role', 'status');
    Object.assign(bar.style, {
      position: 'fixed', left: '50%', bottom: '88px',
      transform: 'translateX(-50%)', zIndex: '80',
      width: 'min(92%, 390px)', display: 'flex', alignItems: 'center',
      flexWrap: 'wrap', gap: '9px', padding: '12px 14px',
      border: '1px solid #d8e1e5', borderRadius: '14px',
      background: '#fffefa', color: '#405564',
      boxShadow: '0 6px 24px rgba(40,60,70,.17)',
      fontSize: '13px', lineHeight: '1.45'
    });

    const label = document.createElement('span');
    label.textContent = '새 버전이 있어요.';
    label.style.flex = '1 1 auto';

    const update = document.createElement('button');
    update.type = 'button';
    update.textContent = '업데이트';
    Object.assign(update.style, {
      border: '0', borderRadius: '9px', padding: '9px 11px',
      background: '#7898ad', color: '#fff', fontWeight: '700'
    });
    update.addEventListener('click', () => {
      const waiting = registration?.waiting || worker;
      if (!waiting) {
        window.location.reload();
        return;
      }
      update.disabled = true;
      update.textContent = '업데이트 중…';
      requestedRefresh = true;
      waiting.postMessage({ type: 'SKIP_WAITING' });
    });

    const later = document.createElement('button');
    later.type = 'button';
    later.textContent = '나중에';
    Object.assign(later.style, {
      border: '0', background: 'transparent',
      color: '#7e8f9a', padding: '8px 2px'
    });
    later.addEventListener('click', () => {
      postponedWorker = worker;
      bar.remove();
    });

    bar.append(label, update, later);
    document.body.appendChild(bar);
  }

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // Never discard an in-progress edit by reloading without a tap.
    if (!requestedRefresh || reloading) return;
    reloading = true;
    window.location.reload();
  });

  async function setup() {
    try {
      registration = await navigator.serviceWorker.register(workerPath, {
        updateViaCache: 'none'
      });

      const checkWaiting = () => {
        if (navigator.serviceWorker.controller && registration.waiting) {
          showUpdate(registration.waiting);
        }
      };
      registration.addEventListener('updatefound', () => {
        const installing = registration.installing;
        if (!installing) return;
        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed') checkWaiting();
        });
      });

      checkWaiting();
      await registration.update();
      checkWaiting();

      let lastChecked = Date.now();
      const checkOnReturn = () => {
        if (Date.now() - lastChecked < 60 * 1000) return;
        lastChecked = Date.now();
        registration.update().then(checkWaiting).catch(err => {
          console.warn('PWA update check failed:', err);
        });
      };
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') checkOnReturn();
      });
      window.addEventListener('online', checkOnReturn);
    } catch (err) {
      console.warn('PWA registration failed:', err);
    }
  }

  setup();
})();
