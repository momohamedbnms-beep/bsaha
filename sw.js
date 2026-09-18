var V = "bsaha-cache-v1";
var CORE = ["./", "./index.html", "./app.js", "./data.js", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-180.png", "./icon-64.png"];
self.addEventListener("install", function (e) { self.skipWaiting(); e.waitUntil(caches.open(V).then(function (c) { return c.addAll(CORE); })); });
self.addEventListener("activate", function (e) { e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== V; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); })); });
/* Réseau d'abord (toujours la dernière version), cache en secours. Les images d'exercices : cache d'abord. */
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  var url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.indexOf("/assets/") >= 0) { e.respondWith(caches.match(e.request).then(function (r) { return r || fetch(e.request).then(function (res) { var cp = res.clone(); caches.open(V).then(function (c) { c.put(e.request, cp); }); return res; }); })); return; }
  e.respondWith(fetch(e.request).then(function (res) { var cp = res.clone(); caches.open(V).then(function (c) { c.put(e.request, cp); }); return res; }).catch(function () { return caches.match(e.request).then(function (r) { return r || caches.match("./index.html"); }); }));
});
