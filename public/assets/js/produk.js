import { loadProducts, renderProductCard } from './common.js';
const grid = document.getElementById('productsGrid');
let allProducts = [];
function categoryOf(p) {
  const n = (p.name || '').toLowerCase();
  if (/bot|panel/.test(n)) return 'bot';
  if (/netflix|video premium/.test(n)) return 'streaming';
  return 'editing';
}
function renderCatalog(category = 'semua') {
  if (!grid) return;
  const list = allProducts.filter(p => p.aktif !== false && (category === 'semua' || categoryOf(p) === category));
  grid.innerHTML = list.length ? list.map(renderProductCard).join('') : '<p>Produk dalam kategori ini belum tersedia.</p>';
}
function setupCategoryFilter() {
  document.getElementById('categoryFilters')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-category]');
    if (!btn) return;
    document.querySelectorAll('[data-category]').forEach(x => x.classList.toggle('active', x === btn));
    renderCatalog(btn.dataset.category);
  });
}
window.handleBeli = (name, price, waText) => {
  import('./common.js').then(({ getCurrentUser, openModal, waLink }) => {
    if (!getCurrentUser()) { document.getElementById('loginRequired')?.classList.add('show'); return; }
    window.open(waLink(waText || `Halo min, mau beli ${name} ${price}`), '_blank', 'noopener');
  });
};
allProducts = await loadProducts(); renderCatalog(); setupCategoryFilter();
