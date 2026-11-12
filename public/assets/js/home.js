import { loadProducts, renderProductCard } from './common.js';
const target = document.getElementById('featuredProducts');
async function renderFeaturedProducts() {
  if (!target) return;
  const products = (await loadProducts()).filter(p => p.aktif !== false).slice(0, 4);
  target.innerHTML = products.length ? products.map(renderProductCard).join('') : '<p>Belum ada produk tersedia.</p>';
}
renderFeaturedProducts();
