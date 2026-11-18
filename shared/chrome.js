/**
 * IT Hub · chrome.js — comportamento compartilhado do cabeçalho padrão.
 *
 * 1. Busca local genérica: SÓ para páginas que optam via
 *    <div id="searchUnified" data-ith-local="SELETOR" data-ith-container="#lista">
 *    e não têm busca própria. data-ith-container (opcional) reaplica a busca
 *    quando a lista é recriada por filtros.
 *    (Runbooks já têm a sua; este script não interfere nelas.)
 * 2. O modo GLOBAL é tratado por shared/search.js (modal Ctrl+K).
 */
(function () {
  'use strict';
  const box = document.getElementById('searchUnified');
  if (!box || !box.dataset.ithLocal) return;

  const input = document.getElementById('searchUnifiedInput');
  if (!input) return;
  const selector = box.dataset.ithLocal;
  const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  let empty = null;
  function ensureEmpty(anchor) {
    if (empty || !anchor) return;
    empty = document.createElement('p');
    empty.className = 'ith-empty';
    empty.textContent = 'Nenhum resultado nesta página. Tente o modo GLOBAL (Ctrl+K).';
    empty.style.cssText = 'display:none;padding:40px 0;text-align:center;color:var(--text3);font-size:13px;';
    anchor.parentElement.insertBefore(empty, anchor.nextSibling);
  }

  function apply() {
      const terms = norm(input.value).split(/\s+/).filter(Boolean);
      const items = document.querySelectorAll(selector);
      let shown = 0;
      items.forEach(el => {
        const ok = terms.every(x => norm(el.textContent).includes(x));
        el.style.display = ok ? '' : 'none';
        if (ok) shown++;
      });
      if (items.length) ensureEmpty(items[items.length - 1].parentElement);
      if (empty) empty.style.display = (terms.length && !shown) ? 'block' : 'none';
  }

  let t;
  input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(apply, 150); });

  // Filtros que recriam a lista (ex.: playbooks): reaplica a busca na lista nova.
  const container = box.dataset.ithContainer && document.querySelector(box.dataset.ithContainer);
  if (container) new MutationObserver(() => { if (input.value.trim()) apply(); })
                   .observe(container, { childList: true });
})();
