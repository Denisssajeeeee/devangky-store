// ============================================================
// DEVANGKY STORE — Main Script v5 (Drawer + Profile + Scroll Lock)
// ============================================================

import { auth, db, DEFAULT_PRODUCTS, DEFAULT_SETTINGS } from './firebase-config.js';
import {
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup,
  updateProfile, setPersistence, browserLocalPersistence, browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc, setDoc, getDoc, collection, addDoc, updateDoc, deleteDoc,
  query, where, getDocs, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ============================================================
// SETTINGS & STATE
// ============================================================
export const SETTINGS = { ...DEFAULT_SETTINGS };
export const WA_NUMBER = SETTINGS.waNumber;
export const QRIS_NAME = SETTINGS.qrisName;
export const STORE_NAME = SETTINGS.storeName;

export let currentUser = null;
export let userData = null;
let dashboardLoaded = false;
let profileLoaded = false;
let adminAllOrders = [];
export let productsCache = [];
let productsLoaded = false;
let bodyScrollY = 0;

// ============================================================
// HELPERS
// ============================================================
export function waLink(text = '') {
  const msg = encodeURIComponent(text || 'Halo min, mau tanya produk');
  return `https://wa.me/${WA_NUMBER}?text=${msg}`;
}

export function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}

export function setText(id, v) {
  const el = document.getElementById(id);
  if (el) el.textContent = v;
}

export function showError(el, msg) {
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
}

export function hideError(el) {
  if (!el) return;
  el.classList.remove('show');
  el.textContent = '';
}

export function showSuccess(el, msg) {
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
}

export function setLoading(btn, loading) {
  if (!btn) return;
  if (loading) {
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML = '<span class="spinner"></span> Memproses...';
    btn.classList.add('loading');
    btn.disabled = true;
  } else {
    btn.innerHTML = btn.dataset.originalText || btn.innerHTML;
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}

export function formatDate(ts) {
  if (!ts) return '-';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

export function formatRupiah(num) {
  return 'Rp ' + (num || 0).toLocaleString('id-ID');
}

export function getProductByName(name) {
  return productsCache.find(p => p.name === name);
}

export function getProductIcon(name) {
  const p = getProductByName(name);
  return p ? (p.icon || '📦') : '📦';
}

export function getInitials(name) {
  return (name || 'U').trim().split(/\s+/).map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

// ============================================================
// SCROLL LOCK (untuk drawer)
// ============================================================
function lockBodyScroll() {
  bodyScrollY = window.scrollY || window.pageYOffset || 0;
  document.body.style.position = 'fixed';
  document.body.style.top = `-${bodyScrollY}px`;
  document.body.style.left = '0';
  document.body.style.right = '0';
  document.body.style.width = '100%';
  document.body.classList.add('drawer-open');
}

function unlockBodyScroll() {
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.left = '';
  document.body.style.right = '';
  document.body.style.width = '';
  document.body.classList.remove('drawer-open');
  window.scrollTo(0, bodyScrollY);
}

// ============================================================
// PRODUCTS — Load dari Firestore (fallback ke DEFAULT)
// ============================================================
export async function loadProducts(force = false) {
  if (productsLoaded && !force) return productsCache;

  try {
    const snap = await getDocs(collection(db, 'products'));
    if (snap.empty) {
      productsCache = DEFAULT_PRODUCTS.map((p, i) => ({
        _id: 'default-' + i, ...p, _isFallback: true
      }));
    } else {
      productsCache = snap.docs.map(d => ({ _id: d.id, ...d.data() }))
        .sort((a, b) => (a.order || 0) - (b.order || 0));
    }
    productsLoaded = true;
  } catch (e) {
    console.warn('Gagal load products, pakai default:', e);
    productsCache = DEFAULT_PRODUCTS.map((p, i) => ({
      _id: 'default-' + i, ...p, _isFallback: true
    }));
    productsLoaded = true;
  }
  return productsCache;
}

// ============================================================
// AUTH STATE
// ============================================================
onAuthStateChanged(auth, async (user) => {
  currentUser = user;

  if (user) {
    try {
      const snap = await getDoc(doc(db, 'users', user.uid));
      userData = snap.exists() ? snap.data() : null;
    } catch (e) {
      console.warn('Gagal ambil user data:', e);
      userData = null;
    }
  } else {
    userData = null;
  }

  updateNavbar();
  window.__devangkyAuthReady = true;
  window.dispatchEvent(new CustomEvent('authstate', { detail: { user: currentUser, userData } }));

  const path = window.location.pathname;

  if (path.includes('dashboard.html')) {
    if (!user) { window.location.href = 'login.html'; return; }
    if (!dashboardLoaded) { dashboardLoaded = true; await loadDashboard(); }
  }

  if (path.includes('profile.html')) {
    if (!user) { window.location.href = 'login.html'; return; }
    if (!profileLoaded) { profileLoaded = true; await loadProfile(); }
  }

  if (path.includes('admin.html')) {
    if (!user) { window.location.href = 'login.html'; return; }
    await loadAdminPanel();
  }
});

// ============================================================
// NAVBAR + USER DRAWER INJECTION
// ============================================================
export function updateNavbar() {
  const authContainer = document.getElementById('authContainer');
  const mobileAuth = document.getElementById('mobileAuth');
  if (!authContainer) return;

  document.getElementById('userDrawer')?.remove();
  document.getElementById('userDrawerOverlay')?.remove();
  document.body.classList.remove('drawer-open');
  document.body.style.position = '';
  document.body.style.top = '';

  if (currentUser) {
    const name = userData?.nama || currentUser.displayName || currentUser.email?.split('@')[0] || 'User';
    const email = currentUser.email || '';
    const isAdmin = userData?.role === 'admin';
    const initials = getInitials(name);
    const firstName = name.split(' ')[0];

    authContainer.innerHTML = `
      <span class="header-greeting">Hi, ${escapeHtml(firstName)}</span>
      <button class="user-menu-toggle" onclick="toggleUserMenu()" aria-label="Buka menu user">
        <span></span><span></span><span></span>
      </button>
    `;

    if (mobileAuth) mobileAuth.innerHTML = '';

    const siteToggle = document.querySelector('.menu-toggle');
    if (siteToggle) siteToggle.style.display = 'none';
    document.querySelectorAll('.site-nav').forEach(nav => nav.style.display = 'none');

    document.body.insertAdjacentHTML('beforeend', `
      <div class="user-drawer-overlay" id="userDrawerOverlay" onclick="closeUserMenu()"></div>
      <aside class="user-drawer" id="userDrawer">
        <div class="user-drawer-header">
          <div class="drawer-avatar">${escapeHtml(initials)}</div>
          <div class="drawer-user-info">
            <strong>${escapeHtml(name)}</strong>
            <span>${escapeHtml(email)}</span>
          </div>
          <button class="drawer-close" onclick="closeUserMenu()" aria-label="Tutup">×</button>
        </div>
        <nav class="user-drawer-nav">
          <div class="drawer-section-label">Akun</div>
          <a href="dashboard.html" class="drawer-link">
            <span class="drawer-link-icon">📊</span>
            <span>Dashboard</span>
          </a>
          <a href="profile.html" class="drawer-link">
            <span class="drawer-link-icon">👤</span>
            <span>Profil Saya</span>
          </a>
          ${isAdmin ? `
          <a href="admin.html" class="drawer-link drawer-link-admin">
            <span class="drawer-link-icon">🛡️</span>
            <span>Admin Panel</span>
          </a>
          ` : ''}
          <div class="drawer-divider"></div>
          <div class="drawer-section-label">Navigasi</div>
          <a href="index.html" class="drawer-link">
            <span class="drawer-link-icon">🏠</span>
            <span>Beranda</span>
          </a>
          <a href="produk.html" class="drawer-link">
            <span class="drawer-link-icon">🛒</span>
            <span>Produk</span>
          </a>
          <a href="pembayaran.html" class="drawer-link">
            <span class="drawer-link-icon">💳</span>
            <span>Pembayaran</span>
          </a>
          <a href="docs.html" class="drawer-link"><span class="drawer-link-icon">📖</span><span>Cara Order</span></a>
          <a href="testimoni.html" class="drawer-link"><span class="drawer-link-icon">⭐</span><span>Testimoni</span></a>
          <div class="drawer-divider"></div>
          <button onclick="handleLogout()" class="drawer-link drawer-link-danger">
            <span class="drawer-link-icon">🚪</span>
            <span>Logout</span>
          </button>
        </nav>
        <div class="user-drawer-footer">
          <small>⚡ ${escapeHtml(STORE_NAME)}</small>
        </div>
      </aside>
    `);

    const path = window.location.pathname;
    document.querySelectorAll('.drawer-link').forEach(link => {
      const href = link.getAttribute('href');
      if (!href) return;
      const cleanHref = href.split('#')[0];
      if (cleanHref && cleanHref !== 'index.html' && path.includes(cleanHref)) {
        link.classList.add('active');
      }
    });

  } else {
    authContainer.innerHTML = `
      <a href="login.html" class="btn btn-outline" style="padding:8px 16px;font-size:0.85rem">Login</a>
      <a href="register.html" class="btn btn-primary" style="padding:8px 16px;font-size:0.85rem">Daftar</a>
    `;
    if (mobileAuth) {
      mobileAuth.innerHTML = `
        <a href="login.html">Login</a>
        <a href="register.html">Daftar</a>
      `;
    }
    const siteToggle = document.querySelector('.menu-toggle');
    if (siteToggle) siteToggle.style.display = '';
    document.querySelectorAll('.site-nav').forEach(nav => nav.style.display = '');
  }
}

// ============================================================
// USER DRAWER (v2 — proper body scroll lock)
// ============================================================
window.toggleUserMenu = function () {
  const drawer = document.getElementById('userDrawer');
  const overlay = document.getElementById('userDrawerOverlay');
  if (!drawer) return;
  if (drawer.classList.contains('show')) {
    window.closeUserMenu();
  } else {
    drawer.classList.add('show');
    overlay?.classList.add('show');
    lockBodyScroll();
  }
};

window.closeUserMenu = function () {
  const drawer = document.getElementById('userDrawer');
  if (!drawer || !drawer.classList.contains('show')) return;
  drawer.classList.remove('show');
  document.getElementById('userDrawerOverlay')?.classList.remove('show');
  unlockBodyScroll();
};

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') window.closeUserMenu();
});

// Prevent scroll passthrough via wheel di luar drawer nav
document.addEventListener('wheel', (e) => {
  if (document.body.classList.contains('drawer-open')) {
    const drawerNav = document.querySelector('.user-drawer-nav');
    if (drawerNav && !drawerNav.contains(e.target)) {
      e.preventDefault();
    }
  }
}, { passive: false });

// Prevent scroll passthrough via touchmove di luar drawer nav
document.addEventListener('touchmove', (e) => {
  if (document.body.classList.contains('drawer-open')) {
    const drawerNav = document.querySelector('.user-drawer-nav');
    if (drawerNav && !drawerNav.contains(e.target)) {
      e.preventDefault();
    }
  }
}, { passive: false });

// ============================================================
// LOGOUT
// ============================================================
window.handleLogout = async function () {
  try {
    await signOut(auth);
    window.location.href = 'index.html';
  } catch (e) {
    console.error(e);
    alert('Gagal logout. Coba lagi.');
  }
};

// ============================================================
// REGISTER
// ============================================================
window.handleRegister = async function (e) {
  e.preventDefault();
  const form = e.target;
  const nama = form.nama.value.trim();
  const email = form.email.value.trim();
  const password = form.password.value;
  const confirm = form.confirm.value;
  const errorEl = document.getElementById('registerError');
  const successEl = document.getElementById('registerSuccess');
  const btn = form.querySelector('button[type="submit"]');

  hideError(errorEl); hideError(successEl);

  if (!nama || nama.length < 2) return showError(errorEl, 'Nama lengkap minimal 2 karakter.');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showError(errorEl, 'Email tidak valid.');
  if (password.length < 6) return showError(errorEl, 'Password minimal 6 karakter.');
  if (password !== confirm) return showError(errorEl, 'Password dan konfirmasi tidak sama.');

  setLoading(btn, true);
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: nama });
    await setDoc(doc(db, 'users', cred.user.uid), {
      nama, email, role: 'user', createdAt: serverTimestamp()
    });
    showSuccess(successEl, 'Akun berhasil dibuat! Mengalihkan...');
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 1200);
  } catch (err) {
    console.error(err);
    let msg = 'Gagal mendaftar. Coba lagi.';
    if (err.code === 'auth/email-already-in-use') msg = 'Email sudah terdaftar. Silakan login.';
    else if (err.code === 'auth/weak-password') msg = 'Password terlalu lemah.';
    else if (err.code === 'auth/invalid-email') msg = 'Format email tidak valid.';
    showError(errorEl, msg);
  } finally {
    setLoading(btn, false);
  }
};

// ============================================================
// LOGIN
// ============================================================
window.handleLogin = async function (e) {
  e.preventDefault();
  const form = e.target;
  const email = form.email.value.trim();
  const password = form.password.value;
  const remember = form.remember?.checked;
  const errorEl = document.getElementById('loginError');
  const btn = form.querySelector('button[type="submit"]');

  hideError(errorEl);
  if (!email || !password) return showError(errorEl, 'Email dan password wajib diisi.');

  setLoading(btn, true);
  try {
    await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
    await signInWithEmailAndPassword(auth, email, password);
    window.location.href = 'dashboard.html';
  } catch (err) {
    console.error(err);
    let msg = 'Email atau password salah.';
    if (err.code === 'auth/user-not-found') msg = 'Akun tidak ditemukan. Daftar dulu ya.';
    else if (err.code === 'auth/wrong-password') msg = 'Password salah.';
    else if (err.code === 'auth/invalid-credential') msg = 'Email atau password salah.';
    else if (err.code === 'auth/too-many-requests') msg = 'Terlalu banyak percobaan. Coba nanti.';
    showError(errorEl, msg);
  } finally {
    setLoading(btn, false);
  }
};

// ============================================================
// GOOGLE LOGIN
// ============================================================
window.handleGoogleLogin = async function () {
  const errorEl = document.getElementById('loginError') || document.getElementById('registerError');
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    const snap = await getDoc(doc(db, 'users', user.uid));
    if (!snap.exists()) {
      await setDoc(doc(db, 'users', user.uid), {
        nama: user.displayName || 'User',
        email: user.email,
        role: 'user',
        createdAt: serverTimestamp()
      });
    }
    window.location.href = 'dashboard.html';
  } catch (err) {
    console.error(err);
    if (errorEl) showError(errorEl, 'Gagal login dengan Google. Coba lagi.');
  }
};

// ============================================================
// LUPA PASSWORD
// ============================================================
window.handleForgotPassword = async function () {
  const email = document.getElementById('loginEmail')?.value.trim();
  const errorEl = document.getElementById('loginError');
  const successEl = document.getElementById('loginSuccess');
  hideError(errorEl); hideError(successEl);

  if (!email) return showError(errorEl, 'Masukkan email dulu, lalu klik Lupa Password.');
  try {
    await sendPasswordResetEmail(auth, email);
    showSuccess(successEl, 'Link reset password sudah dikirim ke email kamu.');
  } catch (err) {
    console.error(err);
    let msg = 'Gagal mengirim link reset.';
    if (err.code === 'auth/user-not-found') msg = 'Email tidak terdaftar.';
    showError(errorEl, msg);
  }
};

// ============================================================
// PROFILE PAGE
// ============================================================
async function loadProfile() {
  if (!currentUser) return;

  await loadProducts();

  const loadingEl = document.getElementById('profileLoading');
  const contentEl = document.getElementById('profileContent');

  const nama = userData?.nama || currentUser.displayName || 'User';
  const email = currentUser.email || '-';
  const isAdmin = userData?.role === 'admin';

  setText('profileAvatar', getInitials(nama));
  setText('profileName', nama);
  setText('profileEmail', email);
  setText('profileRole', isAdmin ? '🛡️ Admin' : '👤 Member');
  setText('profileJoin', userData?.createdAt
    ? formatDate(userData.createdAt).split(',')[0]
    : 'hari ini');

  const editNama = document.getElementById('editNama');
  const editEmail = document.getElementById('editEmail');
  if (editNama) editNama.value = nama;
  if (editEmail) editEmail.value = email;

  try {
    const q = query(collection(db, 'orders'), where('userId', '==', currentUser.uid));
    const snap = await getDocs(q);
    const orders = snap.docs.map(d => d.data());
    const done = orders.filter(o => o.status?.includes('selesai'));
    const spent = done.reduce((s, o) => s + (o.priceValue || 0), 0);

    setText('profileStatOrders', orders.length);
    setText('profileStatDone', done.length);
    setText('profileStatSpent', formatRupiah(spent));
  } catch (e) {
    console.warn(e);
  }

  if (loadingEl) loadingEl.style.display = 'none';
  if (contentEl) contentEl.style.display = 'block';
}

window.handleSaveProfile = async function (e) {
  e.preventDefault();
  if (!currentUser) return;

  const nama = document.getElementById('editNama').value.trim();
  const errorEl = document.getElementById('profileError');
  const successEl = document.getElementById('profileSuccess');
  const btn = e.target.querySelector('button[type="submit"]');

  hideError(errorEl); hideError(successEl);
  if (!nama || nama.length < 2) return showError(errorEl, 'Nama minimal 2 karakter.');

  setLoading(btn, true);
  try {
    await updateProfile(currentUser, { displayName: nama });
    await updateDoc(doc(db, 'users', currentUser.uid), { nama });
    userData = { ...userData, nama };

    showSuccess(successEl, '✅ Profil berhasil diperbarui!');
    setText('profileName', nama);
    setText('profileAvatar', getInitials(nama));
    updateNavbar();
  } catch (err) {
    console.error(err);
    showError(errorEl, 'Gagal menyimpan. Coba lagi.');
  } finally {
    setLoading(btn, false);
  }
};

window.handleResetPasswordProfile = async function () {
  if (!currentUser?.email) return;
  if (!confirm(`Kirim link reset password ke ${currentUser.email}?`)) return;
  try {
    await sendPasswordResetEmail(auth, currentUser.email);
    alert('✅ Link reset password sudah dikirim ke email kamu.');
  } catch (e) {
    console.error(e);
    alert('Gagal mengirim link reset.');
  }
};

// ============================================================
// BELI PRODUK
// ============================================================
window.handleBeli = function (productName, price, waText) {
  if (!currentUser) { openModal('loginRequired'); return; }
  const text = waText || `Halo min, mau beli ${productName} ${price}`;
  window.open(waLink(text), '_blank');
};

// ============================================================
// SAYA SUDAH BAYAR
// ============================================================
window.handleSudahBayar = async function () {
  if (!currentUser) { openModal('loginRequired'); return; }

  const productSelect = document.getElementById('orderProduct');
  const productName = productSelect ? productSelect.value : 'Produk';
  const product = productsCache.find(p => p.name === productName);
  const harga = product ? product.price : '-';
  const priceValue = product ? product.priceValue : 0;

  const btn = document.querySelector('button[onclick="handleSudahBayar()"]');
  if (btn) { btn.disabled = true; btn.dataset.originalText = btn.innerHTML; btn.innerHTML = '⏳ Menyimpan...'; }

  try {
    await addDoc(collection(db, 'orders'), {
      userId: currentUser.uid,
      userEmail: currentUser.email,
      userName: userData?.nama || currentUser.displayName || '',
      productName, harga, priceValue,
      status: 'menunggu verifikasi',
      createdAt: serverTimestamp()
    });
  } catch (e) {
    console.warn('Gagal simpan order:', e);
    alert('Gagal menyimpan pesanan. Pastikan koneksi stabil.');
    if (btn) { btn.disabled = false; btn.innerHTML = btn.dataset.originalText; }
    return;
  }

  if (btn) { btn.disabled = false; btn.innerHTML = btn.dataset.originalText; }

  const text = `Halo min, saya sudah bayar.\n\nProduk: ${productName}\nHarga: ${harga}\nEmail: ${currentUser.email}\n\nMohon dicek ya 🙏`;
  window.open(waLink(text), '_blank');
};

// ============================================================
// MODAL
// ============================================================
window.openModal = function (id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('show');
};

window.closeModal = function (id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('show');
};

document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('show');
  }
});

// ============================================================
// RENDER PRODUCTS (Storefront)
// ============================================================
function renderProducts() {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;

  const active = productsCache.filter(p => p.aktif !== false);

  if (active.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;padding:60px 20px">
        <div class="icon" style="font-size:3rem">📦</div>
        <p>Belum ada produk tersedia saat ini.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = active.map(p => `
    <div class="product-card">
      ${p.badge ? `<span class="product-badge">${escapeHtml(p.badge)}</span>` : ''}
      <div class="product-icon">${escapeHtml(p.icon || '📦')}</div>
      <h3 class="product-name">${escapeHtml(p.name)}</h3>
      <p class="product-desc">${escapeHtml(p.desc || '')}</p>
      <ul class="product-features">
        ${(p.features || []).map(f => `<li>${escapeHtml(f)}</li>`).join('')}
      </ul>
      <div class="product-price">${escapeHtml(p.price)}</div>
      <div class="product-period">/ ${escapeHtml(p.period || '')}</div>
      <div class="product-garansi">🛡️ Garansi: ${escapeHtml(p.garansi || '-')}</div>
      <button class="btn btn-primary btn-block" data-buy-id="${escapeHtml(p._id)}">BELI SEKARANG</button>
    </div>
  `).join('');

  grid.querySelectorAll('[data-buy-id]').forEach(btn => {
    btn.onclick = () => {
      const p = productsCache.find(x => x._id === btn.dataset.buyId);
      if (p) handleBeli(p.name, p.price, p.wa);
      else openModal('loginRequired');
    };
  });
}

export function fillProductSelect() {
  const select = document.getElementById('orderProduct');
  if (!select) return;
  const available = productsCache.filter(p => p.aktif !== false);
  if (available.length === 0) {
    select.innerHTML = '<option value="">-- Belum ada produk --</option>';
    return;
  }
  select.innerHTML = available.map(p =>
    `<option value="${escapeHtml(p.name)}">${escapeHtml(p.name)} — ${escapeHtml(p.price)}</option>`
  ).join('');
}

// ============================================================
// DASHBOARD USER
// ============================================================
async function loadDashboard() {
  if (!currentUser) return;

  await loadProducts();

  const loadingEl = document.getElementById('dashLoading');
  const contentEl = document.getElementById('dashContent');

  const nama = userData?.nama || currentUser.displayName || 'User';
  setText('dashName', nama);
  setText('dashEmail', currentUser.email || '-');
  setText('dashJoin', userData?.createdAt ? formatDate(userData.createdAt).split(',')[0] : 'hari ini');
  setText('dashAvatar', getInitials(nama));

  let orders = [];
  try {
    const q = query(collection(db, 'orders'), where('userId', '==', currentUser.uid));
    const snap = await getDocs(q);
    orders = snap.docs.map(d => ({ _id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  } catch (e) { console.error(e); }

  const total = orders.length;
  const pending = orders.filter(o => !o.status || o.status.includes('menunggu')).length;
  const done = orders.filter(o => o.status?.includes('selesai')).length;
  const spent = orders
    .filter(o => o.status?.includes('selesai'))
    .reduce((s, o) => s + (o.priceValue || 0), 0);

  setText('statTotalOrders', total);
  setText('statPendingOrders', pending);
  setText('statDoneOrders', done);
  setText('statSpent', formatRupiah(spent));

  const listEl = document.getElementById('ordersList');
  if (listEl) {
    if (orders.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state">
          <div class="icon">📦</div>
          <p>Belum ada pesanan. Yuk beli produk dulu!</p>
          <a href="produk.html" class="btn btn-primary" style="margin-top:12px">Lihat Produk</a>
        </div>
      `;
    } else {
      listEl.innerHTML = orders.map((o, i) =>
        renderOrderItem(o).replace('class="order-item"',
          `class="order-item" style="animation-delay:${i * 0.05}s"`)
      ).join('');
    }
  }

  setupFilter('userFilters', orders, (filtered) => {
    if (!listEl) return;
    if (filtered.length === 0) {
      listEl.innerHTML = `<div class="empty-state"><div class="icon">🔍</div><p>Tidak ada pesanan dengan status ini.</p></div>`;
    } else {
      listEl.innerHTML = filtered.map((o, i) =>
        renderOrderItem(o).replace('class="order-item"',
          `class="order-item" style="animation-delay:${i * 0.05}s"`)
      ).join('');
    }
  });

  if (loadingEl) loadingEl.style.display = 'none';
  if (contentEl) contentEl.style.display = 'block';
}

// ============================================================
// RENDER ORDER ITEM (Reusable)
// ============================================================
export function renderOrderItem(o, isAdmin = false) {
  const status = o.status || 'menunggu verifikasi';
  const statusClass = status.includes('selesai') ? 'status-selesai' :
    status.includes('batal') ? 'status-batal' : 'status-menunggu';
  const icon = getProductIcon(o.productName);

  const showActions = isAdmin && !status.includes('selesai') && !status.includes('batal');
  const adminActions = showActions ? `
    <div class="order-actions">
      <button class="btn-status btn-approve" onclick="updateOrderStatus('${o._id}', 'selesai')">✅ Selesai</button>
      <button class="btn-status btn-reject" onclick="updateOrderStatus('${o._id}', 'batal')">❌ Batal</button>
    </div>
  ` : '';

  const userInfo = isAdmin
    ? `<span>👤 ${escapeHtml(o.userName || '-')} · ${escapeHtml(o.userEmail || '-')}</span>`
    : '';

  return `
    <div class="order-item">
      <div class="order-icon">${icon}</div>
      <div class="order-info">
        <strong>${escapeHtml(o.productName || '-')}</strong>
        <div class="order-meta">
          <span>📅 ${formatDate(o.createdAt)}</span>
          ${userInfo}
        </div>
      </div>
      <div class="order-price">${escapeHtml(o.harga || '-')}</div>
      <span class="status-badge ${statusClass}">${escapeHtml(status)}</span>
      ${adminActions}
    </div>
  `;
}

// ============================================================
// ADMIN PANEL
// ============================================================
async function loadAdminPanel() {
  const loadingEl = document.getElementById('adminLoading');
  const deniedEl = document.getElementById('adminDenied');
  const contentEl = document.getElementById('adminContent');

  if (!currentUser || userData?.role !== 'admin') {
    if (loadingEl) loadingEl.style.display = 'none';
    if (deniedEl) deniedEl.style.display = 'block';
    return;
  }

  await loadProducts();
  await loadAdminOrders();

  setupAdminTabs();
  renderAdminStats();
  renderAdminOrders(adminAllOrders, '');
  renderAdminProducts();
  setupAdminFilters();
  setupAdminSearch();

  if (loadingEl) loadingEl.style.display = 'none';
  if (contentEl) contentEl.style.display = 'block';
}

async function loadAdminOrders() {
  try {
    const snap = await getDocs(collection(db, 'orders'));
    adminAllOrders = snap.docs.map(d => ({ _id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  } catch (e) {
    console.error(e);
    adminAllOrders = [];
  }
}

function renderAdminStats() {
  const total = adminAllOrders.length;
  const pending = adminAllOrders.filter(o => !o.status || o.status.includes('menunggu')).length;
  const done = adminAllOrders.filter(o => o.status?.includes('selesai')).length;
  const revenue = adminAllOrders
    .filter(o => o.status?.includes('selesai'))
    .reduce((s, o) => s + (o.priceValue || 0), 0);

  setText('statTotal', total);
  setText('statPending', pending);
  setText('statDone', done);
  setText('statRevenue', formatRupiah(revenue));
}

function renderAdminOrders(orders, searchTerm = '') {
  const listEl = document.getElementById('adminOrdersList');
  if (!listEl) return;

  let filtered = orders;
  if (searchTerm.trim()) {
    const t = searchTerm.toLowerCase();
    filtered = orders.filter(o =>
      (o.productName || '').toLowerCase().includes(t) ||
      (o.userName || '').toLowerCase().includes(t) ||
      (o.userEmail || '').toLowerCase().includes(t)
    );
  }

  if (filtered.length === 0) {
    listEl.innerHTML = `<div class="empty-state"><div class="icon">📭</div><p>Tidak ada pesanan${searchTerm ? ' yang cocok' : ''}.</p></div>`;
    return;
  }

  listEl.innerHTML = filtered.map((o, i) =>
    renderOrderItem(o, true).replace('class="order-item"',
      `class="order-item" style="animation-delay:${i * 0.04}s"`)
  ).join('');
}

export function filterOrders(orders, filter) {
  if (filter === 'all') return orders;
  if (filter === 'menunggu') return orders.filter(o => !o.status || o.status.includes('menunggu'));
  return orders.filter(o => o.status?.includes(filter));
}

export function setupFilter(containerId, orders, callback) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.querySelectorAll('.filter-tab').forEach(tab => {
    tab.onclick = () => {
      container.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      callback(filterOrders(orders, tab.dataset.filter));
    };
  });
}

function setupAdminFilters() {
  setupFilter('adminFilters', adminAllOrders, (filtered) => {
    renderAdminOrders(filtered, document.getElementById('adminSearch')?.value || '');
  });
}

function setupAdminSearch() {
  const searchEl = document.getElementById('adminSearch');
  if (!searchEl) return;
  searchEl.oninput = () => {
    const activeFilter = document.querySelector('#adminFilters .filter-tab.active')?.dataset.filter || 'all';
    const filtered = filterOrders(adminAllOrders, activeFilter);
    renderAdminOrders(filtered, searchEl.value);
  };
}

function setupAdminTabs() {
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
      const targetId = 'tab' + tab.dataset.tab.charAt(0).toUpperCase() + tab.dataset.tab.slice(1);
      document.getElementById(targetId)?.classList.add('active');
    };
  });
}

window.updateOrderStatus = async function (orderId, newStatus) {
  if (!currentUser || userData?.role !== 'admin') { alert('Akses ditolak.'); return; }
  if (!confirm(`Ubah status pesanan menjadi "${newStatus}"?`)) return;
  try {
    await updateDoc(doc(db, 'orders', orderId), {
      status: newStatus, updatedAt: serverTimestamp()
    });
    const idx = adminAllOrders.findIndex(o => o._id === orderId);
    if (idx >= 0) adminAllOrders[idx].status = newStatus;
    renderAdminStats();
    const activeFilter = document.querySelector('#adminFilters .filter-tab.active')?.dataset.filter || 'all';
    const searchTerm = document.getElementById('adminSearch')?.value || '';
    renderAdminOrders(filterOrders(adminAllOrders, activeFilter), searchTerm);
  } catch (e) {
    console.error(e);
    alert('Gagal update status.');
  }
};

// ============================================================
// ADMIN: PRODUCT CRUD
// ============================================================
function renderAdminProducts() {
  const listEl = document.getElementById('adminProductsList');
  const bannerEl = document.getElementById('noProductsBanner');
  if (!listEl) return;

  const real = productsCache.filter(p => !p._isFallback);

  if (real.length === 0) {
    listEl.innerHTML = '';
    if (bannerEl) bannerEl.style.display = 'block';
    return;
  }

  if (bannerEl) bannerEl.style.display = 'none';

  listEl.innerHTML = real.map((p, i) => `
    <div class="order-item" style="animation-delay:${i * 0.04}s">
      <div class="order-icon">${escapeHtml(p.icon || '📦')}</div>
      <div class="order-info">
        <strong>${escapeHtml(p.name)}</strong>
        <div class="order-meta">
          <span>💵 ${escapeHtml(p.price)} / ${escapeHtml(p.period || '-')}</span>
          ${p.badge ? `<span class="product-badge-inline">${escapeHtml(p.badge)}</span>` : ''}
          <span class="${p.aktif !== false ? 'badge-aktif' : 'badge-nonaktif'}">
            ${p.aktif !== false ? '✅ Aktif' : '❌ Nonaktif'}
          </span>
          <span>🔢 Urutan: ${p.order || 0}</span>
        </div>
      </div>
      <div class="order-actions">
        <button class="btn-status btn-approve" onclick="toggleProductActive('${escapeHtml(p._id)}')">
          ${p.aktif !== false ? '👁️ Sembunyikan' : '👁️ Tampilkan'}
        </button>
        <button class="btn-status btn-edit" onclick="editProduct('${escapeHtml(p._id)}')">✏️ Edit</button>
        <button class="btn-status btn-reject" onclick="deleteProduct('${escapeHtml(p._id)}')">🗑️ Hapus</button>
      </div>
    </div>
  `).join('');
}

window.seedDefaultProducts = async function () {
  if (!confirm('Tambahkan 7 produk default ke database? Setelah ini kamu bisa edit/hapus produk.')) return;
  try {
    for (const p of DEFAULT_PRODUCTS) {
      const { ...data } = p;
      await addDoc(collection(db, 'products'), { ...data, createdAt: serverTimestamp() });
    }
    await loadProducts(true);
    renderAdminProducts();
    alert('✅ Produk default berhasil dimuat!');
  } catch (e) {
    console.error(e);
    alert('Gagal memuat produk default.');
  }
};

window.openProductModal = function () {
  document.getElementById('productModalTitle').textContent = 'Tambah Produk';
  document.getElementById('productForm').reset();
  document.getElementById('productId').value = '';
  document.getElementById('featuresList').innerHTML = '';
  document.getElementById('pOrder').value = (productsCache.filter(p => !p._isFallback).length + 1);
  document.getElementById('pAktif').checked = true;
  addFeatureInput(); addFeatureInput(); addFeatureInput();
  openModal('productModal');
};

window.editProduct = function (id) {
  const p = productsCache.find(x => x._id === id);
  if (!p) return;

  document.getElementById('productModalTitle').textContent = 'Edit Produk';
  document.getElementById('productId').value = id;
  document.getElementById('pIcon').value = p.icon || '';
  document.getElementById('pName').value = p.name || '';
  document.getElementById('pDesc').value = p.desc || '';
  document.getElementById('pPrice').value = p.price || '';
  document.getElementById('pPriceValue').value = p.priceValue || '';
  document.getElementById('pPeriod').value = p.period || '';
  document.getElementById('pGaransi').value = p.garansi || '';
  document.getElementById('pBadge').value = p.badge || '';
  document.getElementById('pOrder').value = p.order || 1;
  document.getElementById('pWa').value = p.wa || '';
  document.getElementById('pAktif').checked = p.aktif !== false;

  const featuresList = document.getElementById('featuresList');
  featuresList.innerHTML = '';
  const features = p.features || [];
  if (features.length === 0) addFeatureInput();
  else features.forEach(f => addFeatureInput(f));

  openModal('productModal');
};

window.addFeatureInput = function (value = '') {
  const container = document.getElementById('featuresList');
  if (!container) return;
  const div = document.createElement('div');
  div.className = 'feature-input-row';
  div.innerHTML = `
    <input type="text" class="feature-input" value="${escapeHtml(value)}" placeholder="Contoh: Tanpa watermark">
    <button type="button" onclick="this.parentElement.remove()" class="btn-remove-feature" title="Hapus">×</button>
  `;
  container.appendChild(div);
};

function getFeatures() {
  return Array.from(document.querySelectorAll('.feature-input'))
    .map(i => i.value.trim())
    .filter(Boolean);
}

window.saveProduct = async function (e) {
  e.preventDefault();
  if (!currentUser || userData?.role !== 'admin') { alert('Akses ditolak.'); return; }

  const id = document.getElementById('productId').value;
  const form = e.target;

  const data = {
    name: form.name.value.trim(),
    icon: form.icon.value.trim() || '📦',
    desc: form.desc.value.trim(),
    features: getFeatures(),
    price: form.price.value.trim(),
    priceValue: parseInt(form.priceValue.value) || 0,
    period: form.period.value.trim(),
    garansi: form.garansi.value.trim(),
    wa: form.wa.value.trim(),
    badge: form.badge.value.trim(),
    order: parseInt(form.order.value) || 1,
    aktif: form.aktif.checked,
    updatedAt: serverTimestamp()
  };

  if (!data.name) return alert('Nama produk wajib diisi.');
  if (!data.price) return alert('Harga tampil wajib diisi.');
  if (data.priceValue <= 0) return alert('Harga angka harus lebih dari 0.');

  const btn = form.querySelector('button[type="submit"]');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Menyimpan...'; }

  try {
    if (id) {
      await updateDoc(doc(db, 'products', id), data);
    } else {
      await addDoc(collection(db, 'products'), { ...data, createdAt: serverTimestamp() });
    }
    await loadProducts(true);
    renderAdminProducts();
    closeModal('productModal');
    alert('✅ Produk berhasil disimpan!');
  } catch (e) {
    console.error(e);
    alert('Gagal menyimpan produk.');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '💾 Simpan'; }
  }
};

window.deleteProduct = async function (id) {
  if (!currentUser || userData?.role !== 'admin') return;
  const p = productsCache.find(x => x._id === id);
  if (!p) return;
  if (!confirm(`Hapus produk "${p.name}"?\n\nTindakan ini tidak bisa dibatalkan.`)) return;
  try {
    await deleteDoc(doc(db, 'products', id));
    await loadProducts(true);
    renderAdminProducts();
    alert('✅ Produk berhasil dihapus.');
  } catch (e) {
    console.error(e);
    alert('Gagal menghapus produk.');
  }
};

window.toggleProductActive = async function (id) {
  if (!currentUser || userData?.role !== 'admin') return;
  const p = productsCache.find(x => x._id === id);
  if (!p) return;
  try {
    await updateDoc(doc(db, 'products', id), {
      aktif: !(p.aktif !== false),
      updatedAt: serverTimestamp()
    });
    await loadProducts(true);
    renderAdminProducts();
  } catch (e) {
    console.error(e);
    alert('Gagal update status produk.');
  }
};

window.refreshAdminData = async function () {
  await loadProducts(true);
  await loadAdminOrders();
  renderAdminStats();
  renderAdminOrders(adminAllOrders, '');
  renderAdminProducts();
};

// ============================================================
// QR + SETTINGS + MOBILE MENU
// ============================================================
function setupQR() {
  const qrImg = document.getElementById('qrImage');
  const qrPlaceholder = document.getElementById('qrPlaceholder');
  if (qrImg) {
    qrImg.onerror = () => {
      qrImg.style.display = 'none';
      if (qrPlaceholder) qrPlaceholder.style.display = 'flex';
    };
    qrImg.onload = () => {
      if (qrPlaceholder) qrPlaceholder.style.display = 'none';
    };
  }
}

window.toggleMobileMenu = function () {
  const menu = document.getElementById('mobileNav');
  if (menu) menu.classList.toggle('show');
};

export function fillSettings() {
  document.querySelectorAll('[data-store-name]').forEach(el => el.textContent = STORE_NAME);
  document.querySelectorAll('[data-qris-name]').forEach(el => el.textContent = QRIS_NAME);
  document.querySelectorAll('[data-wa-number]').forEach(el => el.textContent = WA_NUMBER);
  document.querySelectorAll('[data-jam-online]').forEach(el => el.textContent = SETTINGS.jamOnline);

  document.querySelectorAll('a[data-wa]').forEach(a => {
    const text = a.getAttribute('data-wa') || '';
    a.href = waLink(text);
  });

  const floatWa = document.getElementById('floatWa');
  if (floatWa) floatWa.href = waLink('Halo min, mau tanya produk');
}

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  fillSettings();
  await loadProducts();
  renderProducts();
  fillProductSelect();
  setupQR();
});



// API bersama untuk halaman multi-page.
export function getCurrentUser() { return currentUser; }
export function getUserData() { return userData; }
export function getProductsCache() { return productsCache; }
export function waitForAuth() {
  return new Promise(resolve => {
    if (window.__devangkyAuthReady) return resolve({ user: currentUser, userData });
    window.addEventListener('authstate', () => resolve({ user: currentUser, userData }), { once: true });
  });
}
export function renderProductCard(p) {
  const safe = escapeHtml;
  return `<article class="product-card">
    ${p.badge ? `<span class="product-badge">${safe(p.badge)}</span>` : ''}
    <div class="product-icon">${safe(p.icon || '📦')}</div>
    <h3 class="product-name">${safe(p.name)}</h3><p class="product-desc">${safe(p.desc || '')}</p>
    <ul class="product-features">${(p.features || []).map(f => `<li>${safe(f)}</li>`).join('')}</ul>
    <div class="product-price">${safe(p.price || formatRupiah(p.priceValue))}</div>
    <div class="product-period">/ ${safe(p.period || '')}</div>
    <div class="product-garansi">🛡️ Garansi: ${safe(p.garansi || '-')}</div>
    <button class="btn btn-primary btn-block" data-buy-name="${safe(p.name)}" data-buy-price="${safe(p.price || '')}" data-buy-wa="${safe(p.wa || '')}">BELI SEKARANG</button>
  </article>`;
}

// Delegasi klik kartu produk, aman untuk nama produk yang mengandung tanda kutip.
document.addEventListener('click', event => {
  const button = event.target.closest('[data-buy-name]');
  if (button && typeof window.handleBeli === 'function') {
    window.handleBeli(button.dataset.buyName, button.dataset.buyPrice, button.dataset.buyWa);
  }
});
