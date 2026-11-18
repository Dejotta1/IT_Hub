/**
 * IT Hub — Busca global (shared/search.js)
 * Ctrl+K abre modal de busca cross-page. Incluir em todas as páginas de módulo.
 */
(function () {
  'use strict';

  // Raiz do repo resolvida a partir do próprio script (shared/ → ../).
  // Funciona em GitHub Pages, servidor local e qualquer nome de repo.
  const ROOT = new URL('../', document.currentScript.src);

  const COLORS = {
    'Endpoint Central': { bg:'rgba(77,159,255,.12)',  fg:'#4d9fff', bd:'rgba(77,159,255,.28)'  },
    'ServiceDesk Plus': { bg:'rgba(90,240,160,.12)',  fg:'#5af0a0', bd:'rgba(90,240,160,.28)'  },
    'AD360':            { bg:'rgba(169,127,245,.12)', fg:'#a97ff5', bd:'rgba(169,127,245,.28)' },
    'PAM360':           { bg:'rgba(255,179,64,.12)',  fg:'#ffb340', bd:'rgba(255,179,64,.28)'  },
    'Dicionário':       { bg:'rgba(51,224,255,.12)',  fg:'#33e0ff', bd:'rgba(51,224,255,.28)'  }
  };
  const color = g => COLORS[g] || { bg:'rgba(255,255,255,.07)', fg:'#8894ab', bd:'rgba(255,255,255,.14)' };

  const CSS = `
    #gs-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.72);backdrop-filter:blur(5px);z-index:9999;align-items:flex-start;justify-content:center;padding-top:11vh}
    #gs-overlay.open{display:flex}
    #gs-box{width:100%;max-width:620px;max-height:72vh;background:#12151f;border:1px solid #252c40;border-radius:13px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 28px 70px rgba(0,0,0,.75)}
    #gs-head{display:flex;align-items:center;gap:10px;padding:13px 16px;border-bottom:1px solid #1e2438;flex-shrink:0}
    #gs-input{flex:1;background:none;border:none;outline:none;color:#edf0fa;font-family:'DM Sans',sans-serif;font-size:15px;caret-color:#4d9fff}
    #gs-input::placeholder{color:#4a556a}
    #gs-esc{font-family:'JetBrains Mono',monospace;font-size:9px;color:#4a556a;border:1px solid #1e2438;border-radius:4px;padding:2px 7px}
    #gs-list{overflow-y:auto;flex:1}
    .gs-gh{padding:7px 16px;position:sticky;top:0;background:#0d0f17;border-bottom:1px solid #1e2438;font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#4a556a}
    .gs-r{display:block;padding:11px 16px;border-bottom:1px solid #181c28;text-decoration:none}
    .gs-r:hover,.gs-r.focused{background:#181c28}
    .gs-r.focused{box-shadow:inset 2px 0 0 #4d9fff}
    .gs-r-top{display:flex;align-items:center;gap:8px;margin-bottom:3px}
    .gs-r-title{font-size:13px;font-weight:600;color:#edf0fa;flex:1;line-height:1.3}
    .gs-r-badge{font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:600;padding:2px 7px;border-radius:4px;flex-shrink:0}
    .gs-r-excerpt{font-size:11.5px;color:#8894ab;line-height:1.45}
    .gs-hi{color:#4d9fff;font-weight:600}
    #gs-empty{display:none;padding:36px 16px;text-align:center;color:#4a556a;font-size:13px}
    #gs-empty.show{display:block}
    #gs-foot{display:flex;gap:14px;padding:8px 16px;border-top:1px solid #1e2438;font-family:'JetBrains Mono',monospace;font-size:9px;color:#4a556a}
    #gs-foot kbd{background:#181c28;border:1px solid #1e2438;border-radius:3px;padding:1px 5px;font-family:inherit}
    #gs-trigger{display:flex;align-items:center;gap:8px;width:100%;background:none;border:1px solid #1e2438;border-radius:7px;color:#8894ab;font-family:'DM Sans',sans-serif;font-size:12px;padding:8px 12px;margin-bottom:10px;cursor:pointer}
    #gs-trigger:hover{border-color:#4d9fff;color:#edf0fa}
    #gs-trigger kbd{margin-left:auto;font-family:'JetBrains Mono',monospace;font-size:9px;border:1px solid #1e2438;border-radius:3px;padding:1px 5px}
    .gs-flash{animation:gsFlash 2s ease}
    @keyframes gsFlash{0%,40%{box-shadow:0 0 0 2px #4d9fff;background:rgba(77,159,255,.08)}100%{box-shadow:none}}
    @media(max-width:680px){#gs-box{max-width:calc(100vw - 24px)}#gs-overlay{padding-top:7vh}}
  `;

  let index = [], loaded = false, focus = -1, timer = null;

  function build() {
    if (document.getElementById('gs-overlay')) return;
    const st = document.createElement('style'); st.id = 'gs-css'; st.textContent = CSS;
    document.head.appendChild(st);
    const ov = document.createElement('div');
    ov.id = 'gs-overlay';
    ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Busca global IT Hub');
    ov.innerHTML = `
      <div id="gs-box">
        <div id="gs-head">
          <span>🔍</span>
          <input id="gs-input" type="search" placeholder="Buscar em todos os guias… EC · SDP · AD360 · PAM360" autocomplete="off" spellcheck="false" aria-label="Busca global"/>
          <span id="gs-esc">ESC</span>
        </div>
        <div id="gs-list" role="listbox"></div>
        <div id="gs-empty">Nenhum resultado — tente outro termo</div>
        <div id="gs-foot"><span><kbd>↑↓</kbd> navegar</span><span><kbd>↵</kbd> abrir</span><span><kbd>ESC</kbd> fechar</span></div>
      </div>`;
    document.body.appendChild(ov);
  }

  function loadIndex() {
    if (loaded) return Promise.resolve();
    return fetch(new URL('search-index.json', ROOT))
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(d => { index = d; loaded = true; })
      .catch(e => { console.warn('[IT Hub] search-index.json não carregou:', e); loaded = true; });
  }

  const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const esc  = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const hl   = (t, q) => q ? t.replace(new RegExp('(' + esc(q) + ')', 'gi'), '<span class="gs-hi">$1</span>') : t;
  const href = i => new URL(i.file + (i.anchor && i.anchor !== '#' ? i.anchor : ''), ROOT).href;

  // Busca por termos: todos os termos precisam aparecer (ignora acento).
  function search(q) {
    const terms = norm(q).split(/\s+/).filter(t => t.length >= 2);
    if (!terms.length) return [];
    return index.filter(i => {
      const h = norm([i.section, i.guide, i.excerpt, ...(i.tags || [])].join(' '));
      return terms.every(t => h.includes(t));
    }).slice(0, 12);
  }

  function render(q) {
    const list = document.getElementById('gs-list'), empty = document.getElementById('gs-empty');
    focus = -1;
    if (!q || q.trim().length < 2) { list.innerHTML = ''; empty.classList.remove('show'); return; }
    const res = search(q);
    if (!res.length) { list.innerHTML = ''; empty.classList.add('show'); return; }
    empty.classList.remove('show');
    const groups = {};
    res.forEach(i => (groups[i.guide] = groups[i.guide] || []).push(i));
    list.innerHTML = Object.entries(groups).map(([g, items]) => {
      const c = color(g);
      return `<div class="gs-gh">${g}</div>` + items.map(i => `
        <a class="gs-r" href="${href(i)}" role="option">
          <div class="gs-r-top">
            <span class="gs-r-title">${hl(i.section, q.trim())}</span>
            <span class="gs-r-badge" style="background:${c.bg};color:${c.fg};border:1px solid ${c.bd}">${g}</span>
          </div>
          <div class="gs-r-excerpt">${hl(i.excerpt, q.trim())}</div>
        </a>`).join('');
    }).join('');
    move(1); // primeiro resultado já focado: Enter abre direto
  }

  const items = () => [...document.querySelectorAll('#gs-list .gs-r')];
  function move(d) {
    const all = items(); if (!all.length) return;
    all.forEach(el => el.classList.remove('focused'));
    focus = Math.max(0, Math.min(all.length - 1, focus + d));
    all[focus].classList.add('focused');
    all[focus].scrollIntoView({ block: 'nearest' });
  }
  function activate() {
    const all = items();
    if (focus >= 0 && all[focus]) { const u = all[focus].href; close(); window.location.href = u; }
  }

  const isOpen = () => document.getElementById('gs-overlay')?.classList.contains('open');
  function open() {
    const ov = document.getElementById('gs-overlay'), ip = document.getElementById('gs-input');
    ov.classList.add('open');
    loadIndex().then(() => { if (ip.value.trim().length >= 2) render(ip.value); });
    setTimeout(() => ip.focus(), 40);
  }
  function close() {
    document.getElementById('gs-overlay').classList.remove('open');
    document.getElementById('gs-input').value = '';
    document.getElementById('gs-list').innerHTML = '';
    document.getElementById('gs-empty').classList.remove('show');
    focus = -1;
  }

  function events() {
    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); isOpen() ? close() : open(); return; }
      if (!isOpen()) return;
      if (e.key === 'Escape')    { e.preventDefault(); close(); }
      if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); move(-1); }
      if (e.key === 'Enter')     { e.preventDefault(); activate(); }
    });
    document.addEventListener('click', e => {
      if (isOpen() && !document.getElementById('gs-box').contains(e.target)) close();
    });
    document.addEventListener('input', e => {
      if (e.target.id !== 'gs-input') return;
      clearTimeout(timer); timer = setTimeout(() => render(e.target.value), 150);
    });
    // Captura: intercepta "Todos os guias" (#modeGlobal) antes do alert legado e abre o modal.
    document.addEventListener('click', e => {
      if (e.target.closest('#gs-trigger, .gs-open, #modeGlobal')) {
        e.preventDefault(); e.stopPropagation(); open();
      }
    }, true);
  }

  // Botão na sidebar só em páginas sem campo de busca próprio.
  function injectTrigger() {
    if (document.getElementById('gs-trigger') || document.querySelector('.search-unified, #searchUnifiedInput')) return;
    const footer = document.querySelector('.sidebar-footer'); if (!footer) return;
    const b = document.createElement('button');
    b.id = 'gs-trigger'; b.setAttribute('aria-label', 'Busca global (Ctrl+K)');
    b.innerHTML = '🔍 Busca global <kbd>Ctrl+K</kbd>';
    footer.insertBefore(b, footer.firstChild);
  }

  // Ao chegar com #âncora: rola até o alvo mesmo se ele for renderizado por JS e destaca por 2s.
  function landOnHash() {
    const id = decodeURIComponent(location.hash.slice(1)); if (!id) return;
    let tries = 0;
    const t = setInterval(() => {
      const el = document.getElementById(id);
      if (el || ++tries > 20) {
        clearInterval(t);
        if (el) { el.scrollIntoView({ block: 'start' }); el.classList.add('gs-flash'); setTimeout(() => el.classList.remove('gs-flash'), 2100); }
      }
    }, 100);
  }

  build(); events();
  setTimeout(loadIndex, 800);
  const ready = () => { injectTrigger(); landOnHash(); };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', ready) : ready();
  window.addEventListener('hashchange', landOnHash);
})();
