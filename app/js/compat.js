/* MY HOUSE — compatibilidade com o navegador antigo das TVs LG (webOS 4/5/6).
   Chrome antes da versão 84 não entende "gap" em layouts flex: aqui o espaço vira margem. */
'use strict';

const Compat = {
  ativo: false,

  flexGapFunciona() {
    const d = document.createElement('div');
    d.style.cssText = 'display:flex;flex-direction:column;row-gap:1px;position:absolute;visibility:hidden';
    d.appendChild(document.createElement('div'));
    d.appendChild(document.createElement('div'));
    document.body.appendChild(d);
    const ok = d.scrollHeight === 1;
    document.body.removeChild(d);
    return ok;
  },

  init() {
    const forcar = /[?&]compat=1/.test(location.search);
    this.ativo = forcar || !this.flexGapFunciona();
    if (!this.ativo) return;
    document.documentElement.classList.add('nogap');
    const st = document.getElementById('stage');
    let pend = false;
    const rodar = () => { pend = false; this.ajustar(st); };
    new MutationObserver(() => {
      if (pend) return;
      pend = true;
      (window.requestAnimationFrame || setTimeout)(rodar);
    }).observe(st, { childList: true, subtree: true });
    this.ajustar(st);
  },

  ajustar(root) {
    const els = root.getElementsByTagName('*');
    for (let i = 0; i < els.length; i++) {
      const el = els[i];
      let rg, cg;
      if (el.dataset.cgr !== undefined) { rg = Number(el.dataset.cgr); cg = Number(el.dataset.cgc); }
      else {
        const cs = getComputedStyle(el);
        if (cs.display !== 'flex' && cs.display !== 'inline-flex') continue;
        rg = parseFloat(cs.rowGap) || 0; cg = parseFloat(cs.columnGap) || 0;
        if (!rg && !cg) continue;
        el.dataset.cgr = rg; el.dataset.cgc = cg;
        el.dataset.cgcol = cs.flexDirection.indexOf('column') === 0 ? '1' : '0';
        el.dataset.cgwrap = cs.flexWrap !== 'nowrap' ? '1' : '0';
        /* no PC (modo de teste) desliga o gap nativo para simular a TV */
        el.style.rowGap = '0px'; el.style.columnGap = '0px';
      }
      const col = el.dataset.cgcol === '1', wrap = el.dataset.cgwrap === '1';
      let primeiro = true;
      const kids = el.children;
      for (let j = 0; j < kids.length; j++) {
        const ch = kids[j];
        if (ch.dataset.cgok === '1') { primeiro = false; continue; }
        const ccs = getComputedStyle(ch);
        if (ccs.position === 'absolute' || ccs.position === 'fixed' || ccs.display === 'none') continue;
        if (col) {
          if (!primeiro) ch.style.marginTop = ((parseFloat(ccs.marginTop) || 0) + rg) + 'px';
        } else {
          if (!primeiro) ch.style.marginLeft = ((parseFloat(ccs.marginLeft) || 0) + cg) + 'px';
          if (wrap && rg) ch.style.marginBottom = ((parseFloat(ccs.marginBottom) || 0) + rg) + 'px';
        }
        ch.dataset.cgok = '1';
        primeiro = false;
      }
    }
  }
};
