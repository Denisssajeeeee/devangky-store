import './common.js';
document.querySelectorAll('.faq-question').forEach(button => button.addEventListener('click', () => {
  const item = button.closest('.faq-item'); item.classList.toggle('open');
  const mark = button.querySelector('span'); if (mark) mark.textContent = item.classList.contains('open') ? '−' : '＋';
}));
