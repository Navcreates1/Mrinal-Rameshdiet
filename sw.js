/* Service worker — so the plan opens at the hob with no signal.

   The app already declared a manifest and standalone styling, so it looked
   installable; added to a home screen with no connection it showed nothing.
   For something read while cooking, that is the whole point of installing it.

   Cache-first for the shell, because the shell IS the app: one HTML file with
   the data inlined. There is no API to be stale against. A new build changes
   CACHE below, which drops every old entry on activate. */
const CACHE = 'plan-46c6ca6fb356';
const SHELL = ['./', './index.html', './icon.png', './manifest.webmanifest'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  /* Google Fonts: cache whatever arrives, fall back to the cached copy, and if
     neither exists let it fail — the page has Georgia and a system sans behind
     them and stays entirely readable. */
  const isFont = url.hostname.endsWith('googleapis.com') || url.hostname.endsWith('gstatic.com');

  if (req.mode === 'navigate') {
    /* Network first for the page itself, so a new build is picked up the moment
       there is a connection; cache is the fallback, not the default. */
    e.respondWith(
      fetch(req)
        .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); return res; })
        .catch(() => caches.match('./index.html').then(r => r ?? caches.match('./')))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(hit => hit ?? fetch(req).then(res => {
      if (res.ok && (isFont || url.origin === self.location.origin)) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => hit))
  );
});
