self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open("blackjack-v1").then((cache) => {
            return cache.addAll([
                "index.html",
                "styles.css",
                "script.js",
                "manifest.json",
                "background.jpg", // Cache the background image
                "icon-192.png",
                "icon-512.png"
            ]);
        })
    );
});

self.addEventListener("fetch", (event) => {
    event.respondWith(
