/* DP-300 Exam Prep - offline support.
 *
 * The app needs 1.5 MB of JSON plus 34.6 MB of images. A timed simulator
 * that stops working on hotel wifi is not a simulator, so the shell and the
 * bank are cached and the images are cached as they are viewed.
 *
 * Two caches, on purpose:
 *   - the shell (HTML, CSS, JS, questions.json) is versioned by the commit
 *     SHA in the asset query string, so a new deploy is a new URL and the
 *     old entries are dropped rather than served;
 *   - the images are content-addressed by name, so they never change and
 *     can be cached forever.
 *
 * The shell is served network-first: online, the student always gets the
 * current build, and offline they get the last one they used.
 */

/* Stamped with the commit SHA by the Pages workflow, like index.html. */
const BUILD_VERSION = '{{BUILD_VERSION}}';

const SHELL_CACHE = `dp300-shell-${BUILD_VERSION}`;
const MEDIA_CACHE = 'dp300-media-v1';

/* The images live under this path in the published site. */
const MEDIA_PATH = 'extracted_images/';

self.addEventListener('install', (event) => {
  // The shell is cached the first time it is fetched rather than up front:
  // the asset URLs carry the build version, so they are only known at
  // runtime.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith('dp300-shell-') && name !== SHELL_CACHE)
          .map((name) => caches.delete(name))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname.includes(MEDIA_PATH)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(networkFirst(request));
});

/**
 * The current build when there is a network, the last one seen when there
 * is not.
 */
async function networkFirst(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok && response.type === 'basic') {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    // A navigation that cannot reach the network still has to open the app.
    if (request.mode === 'navigate') {
      const shell = await matchShell(cache);
      if (shell) {
        return shell;
      }
    }
    throw error;
  }
}

/** The app shell, whatever it was requested under. */
async function matchShell(cache) {
  const scope = self.registration.scope;
  for (const candidate of [scope, `${scope}index.html`]) {
    const hit = await cache.match(candidate);
    if (hit) {
      return hit;
    }
  }
  return null;
}

/**
 * An image: served from the cache once it has been seen.
 *
 * The file names carry a content hash, so a cached image is always the
 * right image.
 */
async function cacheFirst(request) {
  const cache = await caches.open(MEDIA_CACHE);
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }
  const response = await fetch(request);
  if (response && response.ok && response.type === 'basic') {
    cache.put(request, response.clone());
  }
  return response;
}
