// ============================================================
// KONFIGURASI FIREBASE — DEVANGKY STORE
// Isi config dari Firebase Console > Project Settings > Add Web App
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDT9D5p1_6PDmQTh2ky48h0q6xC-5VKerE",
  authDomain: "devangky-ccc26.firebaseapp.com",
  projectId: "devangky-ccc26",
  storageBucket: "devangky-ccc26.firebasestorage.app",
  messagingSenderId: "424255938059",
  appId: "1:424255938059:web:79f289b8eeccfedcccf10e",
  measurementId: "G-S42F4GGDB8"
};


// ============================================================
// VALIDASI CONFIG
// ============================================================
const PLACEHOLDER_VALUES = [
  "ISI_API_KEY_FIREBASE",
  "ISI_AUTH_DOMAIN",
  "ISI_PROJECT_ID",
  "ISI_STORAGE_BUCKET",
  "ISI_SENDER_ID",
  "ISI_APP_ID"
];

const configIncomplete = Object.values(firebaseConfig).some(
  v => !v || PLACEHOLDER_VALUES.includes(v) || String(v).startsWith("ISI_")
);

if (configIncomplete) {
  console.error(
    "❌ [Devangky Store] Firebase config belum diisi!\n" +
    "   → Buka: Firebase Console > Project Settings > Add Web App\n" +
    "   → Paste config ke file firebase-config.js"
  );
  const showConfigError = () => {
    if (document.getElementById("firebaseConfigError")) return;
    const overlay = document.createElement("div");
    overlay.id = "firebaseConfigError";
    overlay.style.cssText = `
      position:fixed;inset:0;z-index:99999;background:rgba(11,15,26,.97);
      color:#fff;display:flex;align-items:center;justify-content:center;
      padding:24px;text-align:center;font-family:system-ui,sans-serif;line-height:1.6;
    `;
    overlay.innerHTML = `
      <div style="max-width:520px">
        <div style="font-size:3rem;margin-bottom:16px">⚙️</div>
        <h2 style="color:#22c55e;margin:0 0 12px">Firebase Belum Dikonfigurasi</h2>
        <p style="color:#93a1b8;margin:0 0 16px">
          Buka file <code style="background:#1a2235;padding:2px 6px;border-radius:4px;color:#4ade80">firebase-config.js</code>
          dan isi semua placeholder dengan config dari Firebase Console.
        </p>
      </div>
    `;
    document.body.appendChild(overlay);
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", showConfigError);
  } else {
    showConfigError();
  }
}

// ============================================================
// EXPORT CORE
// ============================================================
export const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);

// ============================================================
// DEFAULT PRODUCTS
// ============================================================
export const DEFAULT_PRODUCTS = [
  {
    name: "AM Premium", icon: "🎬",
    desc: "Alight Motion Pro full fitur.",
    features: ["Tanpa watermark", "Semua preset & efek kebuka", "Akun private"],
    price: "Rp 20.000", priceValue: 20000, period: "1 Bulan", garansi: "30 hari",
    wa: "Halo min, mau beli AM Premium 20k",
    badge: "", order: 1, aktif: true
  },
  {
    name: "CapCut Premium", icon: "✂️",
    desc: "CapCut Pro untuk editing tanpa batas.",
    features: ["Tanpa watermark", "Template premium", "Cloud 100GB"],
    price: "Rp 20.000", priceValue: 20000, period: "1 Bulan", garansi: "30 hari",
    wa: "Halo min, mau beli CapCut Premium 20k",
    badge: "", order: 2, aktif: true
  },
  {
    name: "Canva Premium", icon: "🎨",
    desc: "Canva Pro untuk desain instan.",
    features: ["610K+ template premium", "Background remover", "Brand Kit"],
    price: "Rp 20.000", priceValue: 20000, period: "1 Bulan", garansi: "30 hari",
    wa: "Halo min, mau beli Canva Premium 20k",
    badge: "", order: 3, aktif: true
  },
  {
    name: "Sewa Bot WA", icon: "🤖",
    desc: "Bot WhatsApp aktif 24/7 untuk grup lu.",
    features: ["Fitur RPG, Sticker, Downloader", "Owner bisa setting", "Aktif 24/7 nonstop"],
    price: "Rp 30.000", priceValue: 30000, period: "1 Bulan", garansi: "Full selama masa sewa",
    wa: "Halo min, mau sewa Bot WA 30k",
    badge: "BEST SELLER", order: 4, aktif: true
  },
  {
    name: "Panel Bot", icon: "🖥️",
    desc: "Panel Pterodactyl untuk jalanin bot sendiri.",
    features: ["RAM 4GB", "Anti delay", "Panel pribadi + tutorial setting"],
    price: "Rp 30.000", priceValue: 30000, period: "1 Bulan", garansi: "30 hari",
    wa: "Halo min, mau beli Panel Bot 30k",
    badge: "", order: 5, aktif: true
  },
  {
    name: "Netflix Premium", icon: "🍿",
    desc: "Akun Netflix 4K UHD.",
    features: ["Resolusi 4K UHD", "1 Profil private", "Bisa di TV / HP"],
    price: "Rp 30.000", priceValue: 30000, period: "1 Bulan",
    garansi: "Full, jika bermasalah diganti baru",
    wa: "Halo min, mau beli Netflix Premium 30k",
    badge: "", order: 6, aktif: true
  },
  {
    name: "Video Premium", icon: "📹",
    desc: "Akses video premium untuk konten.",
    features: ["Stock video HD", "Preset editing", "Update seumur hidup"],
    price: "Rp 20.000", priceValue: 20000, period: "Lifetime", garansi: "Lifetime akses",
    wa: "Halo min, mau beli Video Premium 20k",
    badge: "", order: 7, aktif: true
  }
];

// ============================================================
// DEFAULT SETTINGS — Ganti nomor WA & nama QRIS di sini
// ============================================================
export const DEFAULT_SETTINGS = {
  storeName: "Devangky Store",
  tagline: "Premium Murah, Proses Cepat, Garansi Full",
  description: "...",
  waNumber: "6282131338690",      // ⚠️ GANTI nomor WA asli (awali 62, tanpa + atau 0)
  qrisName: "Nama Pemilik QRIS",  // ⚠️ GANTI nama sesuai QRIS
  jamOnline: "Setiap hari 08.00 - 23.00 WIB"
};