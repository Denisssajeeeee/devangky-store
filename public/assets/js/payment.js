import { loadProducts, fillProductSelect } from './common.js';
const qr = document.getElementById('qrImage'), placeholder = document.getElementById('qrPlaceholder');
function setupQR() {
  if (!qr) return;
  qr.addEventListener('load', () => { qr.style.display = 'block'; if (placeholder) placeholder.style.display = 'none'; });
  qr.addEventListener('error', () => { qr.style.display = 'none'; if (placeholder) placeholder.style.display = 'grid'; });
}
window.openQRModal = () => {
  const modal = document.getElementById('qrModal'); const large = document.getElementById('qrLarge');
  if (qr?.naturalWidth) { large.src = qr.src; modal?.classList.add('show'); }
  else alert('QRIS belum tersedia. Silakan unggah gambar QRIS terlebih dahulu.');
};
await loadProducts(); fillProductSelect(); setupQR();
