import { loadProducts, fillProductSelect, getCurrentUser, getUserData, getProductsCache, waLink, openModal } from './common.js';
import { db } from './firebase-config.js';
import { addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const qr = document.getElementById('qrImage');
const placeholder = document.getElementById('qrPlaceholder');

// ============================================================
// FIX: QR preview tidak muncul kalau gambar sudah di-cache
// ============================================================
function setupQR() {
  if (!qr) return;

  const showImage = () => {
    qr.style.display = 'block';
    if (placeholder) placeholder.style.display = 'none';
  };

  const hideImage = () => {
    qr.style.display = 'none';
    if (placeholder) placeholder.style.display = 'grid';
  };

  // Cek dulu: kalau gambar sudah selesai dimuat (cache), langsung tampilkan.
  // Kalau belum, baru pasang listener load/error.
  if (qr.complete && qr.naturalWidth > 0) {
    showImage();
  } else {
    qr.addEventListener('load', showImage);
    qr.addEventListener('error', hideImage);
  }
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
  const user = getCurrentUser();
  if (!user) { openModal('loginRequired'); return; }

  const productSelect = document.getElementById('orderProduct');
  const productName = productSelect ? productSelect.value : 'Produk';
  const product = getProductsCache().find(p => p.name === productName);
  const harga = product ? product.price : '-';
  const priceValue = product ? product.priceValue : 0;

  const btn = document.querySelector('button[onclick="handleSudahBayar()"]');
  if (btn) {
    btn.disabled = true;
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML = '⏳ Menyimpan...';
  }

  const userData = getUserData();

  try {
    await addDoc(collection(db, 'orders'), {
      userId: user.uid,
      userEmail: user.email,
      userName: userData?.nama || user.displayName || '',
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
setupQR();