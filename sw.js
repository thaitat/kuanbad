// ก๊วนแบด: ทำให้แอปเปิดได้โดยไม่ต้องต่อเน็ต
// ทุกครั้งที่อัปโหลด index.html ใหม่ ให้เปลี่ยนเลขท้าย VERSION (เช่น -2 เป็น -3)
const VERSION = "kuanbad-2026-09-30-1";
const SHELL = ["./", "./index.html", "./manifest.webmanifest"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(VERSION)
      // เก็บทีละไฟล์ ถ้าไฟล์ไหนโหลดไม่ได้ ไฟล์อื่นยังเก็บได้และติดตั้งไม่ล้ม
      .then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);

  // ไฟล์ของแอป (index.html, ไอคอน, manifest): ใช้จากเน็ตก่อนเพื่อให้ได้เวอร์ชันใหม่ ถ้าไม่มีเน็ตใช้ที่เก็บไว้
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); }
          return res;
        })
        .catch(() =>
          caches.match(e.request, { ignoreSearch: true })
            .then(r => r || (e.request.mode === "navigate" ? caches.match("./index.html") : undefined))
        )
    );
    return;
  }

  // ฟอนต์ Google: ใช้ที่เก็บไว้ก่อน
  if (url.host === "fonts.googleapis.com" || url.host === "fonts.gstatic.com") {
    e.respondWith(
      caches.match(e.request).then(r => r || fetch(e.request).then(res => {
        const copy = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); return res;
      }))
    );
  }
});
