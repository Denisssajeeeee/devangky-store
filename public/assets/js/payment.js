// ============================================================
// PAYMENT.JS — Self-contained (tidak bergantung export yang rawan hilang)
// ============================================================

import { loadProducts, productsCache, waLink } from './common.js';
import { auth, db } from './firebase-config.js';
import { addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const qr = document.getElementById('qrImage');

// ============================================================
// Isi dropdown produk (implementasi lokal, tidak import)
// ============================================================
function fillProductSelect() {
  const select = document.getElementById('orderProduct');
  if (!select) return;
  const available = productsCache.filter(p => p.aktif !== false);
  if (available.length === 0) {
    select.innerHTML = '<option value="">-- Belum ada produk --</option>';
    return;
  }
  select.innerHTML = available
    .map(p => `<option value="${p.name}">${p.name} — ${p.price}</option>`)
    .join('');
}

// ============================================================
// MODAL: Lihat QR Besar
// ============================================================
window.openQRModal = () => {
  const modal = document.getElementById('qrModal');
  const large = document.getElementById('qrLarge');
  if (qr?.naturalWidth) {
    large.src = qr.src;
    modal?.classList.add('show');
  } else {
    alert('QRIS belum tersedia. Silakan unggah gambar QRIS terlebih dahulu.');
  }
};

// ============================================================
// TOMBOL: Saya Sudah Bayar
// ============================================================
window.handleSudahBayar = async function () {
  const user = auth.currentUser;
  if (!user) {
    const modal = document.getElementById('loginRequired');
    if (modal) modal.classList.add('show');
    return;
  }

  const select = document.getElementById('orderProduct');
  const productName = select ? select.value : 'Produk';
  const product = productsCache.find(p => p.name === productName);
  const harga = product ? product.price : '-';
  const priceValue = product ? product.priceValue : 0;

  const btn = document.querySelector('button[onclick="handleSudahBayar()"]');
  if (btn) {
    btn.disabled = true;
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML = '⏳ Menyimpan...';
  }

  try {
    await addDoc(collection(db, 'orders'), {
      userId: user.uid,
      userEmail: user.email,
      userName: user.displayName || '',
      productName,
      harga,
      priceValue,
      status: 'menunggu verifikasi',
      createdAt: serverTimestamp()
    });
  } catch (e) {
    console.error(e);
    alert('Gagal menyimpan pesanan. Pastikan koneksi stabil.');
    if (btn) { btn.disabled = false; btn.innerHTML = btn.dataset.originalText; }
    return;
  }

  if (btn) { btn.disabled = false; btn.innerHTML = btn.dataset.originalText; }

  const text = `Halo min, saya sudah bayar.\n\nProduk: ${productName}\nHarga: ${harga}\nEmail: ${user.email}\n\nMohon dicek ya 🙏`;
  window.open(waLink(text), '_blank');
};

// ============================================================
// INIT
// ============================================================
await loadProducts();
fillProductSelect();
console.log('[payment.js] Produk ter-load:', productsCache.length);