/* MY HOUSE — controle dos pais: senha para conteúdo +18 */
'use strict';

const Pais = {
  aberto: false, /* liberado nesta sessão (até fechar o app, trocar de perfil ou bloquear de novo) */
  RE: /adult|\+\s?18|18\s?\+|xxx|er[oó]tic|sexy|\bhot\b|porn|playboy|\bsexo\b|priv[eê]\b/i,
  cats: { live: {}, vod: {}, series: {} },

  ativo() { return Store.d.settings.pais !== false; },
  pin() { return String(Store.d.settings.pin || '1234'); },
  padrao() { return this.pin() === '1234'; },
  bloqueado() { return this.ativo() && !this.aberto; },
  bloquear() { this.aberto = false; },

  catAdulta(c) { return !!c && this.RE.test(String(c.name || '')); },
  /* chamado sempre que as categorias de um tipo são carregadas */
  registrar(kind, cats) {
    (cats || []).forEach(c => { if (this.catAdulta(c)) this.cats[kind][String(c.id)] = c.name; });
  },
  itemAdulto(kind, it) {
    if (!it) return false;
    const k = kind === 'ep' ? 'series' : kind;
    return !!(it.cat != null && this.cats[k] && this.cats[k][String(it.cat)]);
  },
  filtrar(kind, arr) {
    if (!this.bloqueado()) return arr;
    return (arr || []).filter(x => !this.itemAdulto(x.kind === 'ep' ? 'series' : (x.kind || kind), x));
  },
  /* pede a senha (se precisar) e depois executa */
  pedir(motivo, depois) {
    if (!this.bloqueado()) { depois(); return; }
    App.openOv(Ov.pin({
      titulo: 'Conteúdo +18',
      texto: (motivo ? motivo + '. ' : '') + 'Digite a senha do controle dos pais.',
      check: v => v === this.pin() ? true : 'Senha incorreta',
      ok: () => { this.aberto = true; depois(); }
    }));
  },
  nomesProtegidos() {
    const out = [];
    ['live', 'vod', 'series'].forEach(k => Object.keys(this.cats[k]).forEach(id => out.push(this.cats[k][id])));
    return out.filter((v, i) => out.indexOf(v) === i);
  }
};

/* Janela de senha de 4 números: botões numéricos do controle ou teclado na tela */
Ov.pin = (o) => {
  const P = { v: '', err: '' };
  const root = () => $('#ov');
  const teclas = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'apagar', '0', 'cancelar'];
  function enviar() {
    const r = o.check ? o.check(P.v) : true;
    if (r === true) { App.closeOv(); o.ok(P.v); return; }
    P.err = typeof r === 'string' ? r : 'Senha incorreta';
    P.v = '';
    self.render();
  }
  function digito(d) {
    if (P.v.length >= 4) return;
    P.v += d; P.err = '';
    self.render();
    if (P.v.length === 4) setTimeout(enviar, 150);
  }
  const self = {
    render() {
      const caixas = [0, 1, 2, 3].map(i => '<div style="width:96px;height:110px;border-radius:18px;background:var(--card);border:' + (i === P.v.length ? '3px solid var(--acc)' : '1px solid #2E3544') +
        ';display:flex;align-items:center;justify-content:center;font:700 6rem Sora">' + (i < P.v.length ? '•' : '') + '</div>').join('');
      const kp = teclas.map(t => {
        const label = t === 'apagar' ? '⌫' : t === 'cancelar' ? 'Sair' : t;
        return '<button class="btn f" data-id="k' + t + '" data-act="k" data-v="' + t + '"' + (t === '1' ? ' data-first="1"' : '') +
          ' style="justify-content:center;height:84px;font-size:' + (t.length > 1 ? '2.2rem' : '3.4rem') + '">' + label + '</button>';
      }).join('');
      renderKeep(root(), '<div class="modal-dim"><div class="modal" style="width:760px;align-items:center">' +
        '<h2>' + esc(o.titulo) + '</h2>' +
        '<p class="sub" style="margin:0;font-size:2.3rem;text-align:center">' + esc(o.texto || '') + '</p>' +
        '<div class="row" style="gap:18px">' + caixas + '</div>' +
        (P.err ? '<div class="erro" style="width:100%;text-align:center">' + esc(P.err) + '</div>' : '') +
        '<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;width:480px">' + kp + '</div>' +
        '<div class="hint"><span><span class="k">0–9</span>números do controle</span><span><span class="k">Voltar</span>apagar / sair</span></div>' +
        '</div></div>');
    },
    act(n, d) {
      if (d.v === 'apagar') { P.v = P.v.slice(0, -1); self.render(); }
      else if (d.v === 'cancelar') { App.closeOv(); if (o.cancel) o.cancel(); }
      else digito(d.v);
    },
    key(k) {
      if (/^n\d$/.test(k)) { digito(k.slice(1)); return; }
      if (k === 'back') {
        if (P.v) { P.v = P.v.slice(0, -1); self.render(); }
        else { App.closeOv(); if (o.cancel) o.cancel(); }
        return;
      }
      spatialKey(root(), k);
    }
  };
  return self;
};
