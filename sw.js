// splitpot service worker
// Always tries the network first, so updates show up straight away.
// Falls back to the last saved copy, then to offline.html, when there's no connection.
const CACHE = "splitpot-v2";
const SHELL = ["./", "index.html", "offline.html", "style.css?v=3", "icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Only handle this site's own files. Supabase, fonts and libraries go straight to the network.
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === "navigate") return caches.match("offline.html");
        return Response.error();
      })
  );
});

// Show a push sent by the send-push Edge Function
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (err) {
    data = { body: event.data ? event.data.text() : "" };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "splitpot", {
      body: data.body || "You have a new notification.",
      icon: "icon-192.png",
      badge: "icon-192.png",
      data: { url: data.url || "notifications.html" }
    })
  );
});

// Tapping a push opens the room it's about
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data.url, self.registration.scope).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const win of windows) {
        if ("navigate" in win) {
          return win.focus().then(() => win.navigate(target));
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
