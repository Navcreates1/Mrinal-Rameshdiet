import { boot } from './ui/shell.ts';

boot();

/* Offline. Registered after boot so a failure here can never stop the app
   rendering — the plan working matters more than the plan working on a train. */
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(err =>
      console.warn('[sw] not registered — the app still works online', err));
  });
}
