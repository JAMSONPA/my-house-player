/* MY HOUSE — Filmes, Séries e reprodução */
'use strict';

/* ======================= FILMES / SÉRIES (lista) ======================= */
Screens.browse = (p) => {
  const kind = p.kind;
  const nome = kind === 'vod' ? 'Filmes' : 'Séries';
  const B = { cats: [], ci: 0, items: [], idx: 0, zone: 'grid', loading: true, err: '', info: {}, infoT: 0 };
  const root = () => $('#screen');
  const COLS = 8;

  function recentes() {
    const r = Store.my().recent;
    if (kind === 'vod') return Pais.filtrar('vod', r.filter(x => x.kind === 'vod').map(x => ({ kind: 'vod', id: x.id, name: x.name, logo: x.logo, ext: x.ext, url: x.url, cat: x.cat, pos: x.pos, dur: x.dur })));
    const vistos = {}; const out = [];
    r.filter(x => x.kind === 'ep' && x.seriesId).forEach(x => {
      if (vistos[x.seriesId]) return; vistos[x.seriesId] = 1;
      out.push({ kind: 'series', id: x.seriesId, name: x.seriesName, logo: x.seriesLogo, cat: x.seriesCat, pos: x.pos, dur: x.dur, ep: 'T' + x.season + ' · E' + x.epNum });
    });
    return Pais.filtrar('series', out);
  }

  async function carregarCats() {
    B.loading = true; render();
    try {
      const cats = kidsFilterCats(await Api.cats(kind));
      B.cats = [{ id: '__cont', name: 'Continuar' }, { id: '__fav', name: 'Minha lista' }].concat(cats);
      const want = Store.my()['lastCat_' + kind];
      let ci = B.cats.findIndex(c => c.id === want && !(Pais.bloqueado() && Pais.catAdulta(c)));
      if (ci < 0) ci = recentes().length ? 0 : (B.cats.length > 2 ? 2 : 0);
      B.ci = ci;
      await carregarItens();
    } catch (e) { B.loading = false; B.err = e.message; render(); }
  }

  async function carregarItens() {
    B.loading = true; B.items = []; render();
    const c = B.cats[B.ci];
    try {
      if (c.id === '__cont') B.items = recentes();
      else if (c.id === '__fav') B.items = Pais.filtrar(kind, Store.my().favs[kind].slice());
      else {
        const it = await Api.items(kind, c.id);
        B.items = kind === 'vod' ? it.slice().sort((a, b) => (b.added || 0) - (a.added || 0)) : it;
      }
      B.err = '';
      Store.my()['lastCat_' + kind] = c.id; Store.save();
    } catch (e) { B.err = e.message; }
    B.loading = false;
    B.idx = Math.min(B.idx, Math.max(0, B.items.length - 1));
    if (B.cats[B.ci] !== c) return;
    B.idx = 0;
    render(); pedirInfo();
  }

  function pedirInfo() {
    const it = B.items[B.idx];
    if (!it || kind !== 'vod' || B.info[it.id] || it.url) return;
    clearTimeout(B.infoT);
    B.infoT = setTimeout(() => {
      Api.vodInfo(it.id).then(inf => { B.info[it.id] = inf; if (App.cur === self && B.items[B.idx] === it) render(); }).catch(() => { B.info[it.id] = {}; });
    }, 350);
  }

  function render() {
    if (App.cur !== self) return;
    Video.el.className = 'v-hidden';
    const it = B.items[B.idx];
    const inf = it ? Object.assign({}, it, B.info[it.id] || {}) : null;
    const fundoImg = inf && (inf.backdrop || inf.logo);
    const c = B.cats[B.ci] || { name: '' };
    let topo = '';
    if (inf) {
      const meta = [inf.year, inf.duration, inf.genre].filter(Boolean).map(esc).join(' <span class="muted">•</span> ');
      topo = '<span style="font-size:2rem;font-weight:600;letter-spacing:2px" class="acc">' + nome.toUpperCase() + ' · ' + esc(c.name.toUpperCase()) + '</span>' +
        '<h1 class="clamp2">' + esc(inf.name) + '</h1>' +
        '<div class="row" style="gap:14px;font-size:2.2rem;color:#D5D8DF">' + meta +
        (inf.rating ? ' <span class="badge">★ ' + esc(String(inf.rating).slice(0, 3)) + '</span>' : '') +
        (inf.ep ? ' <span class="badge">Parou em ' + esc(inf.ep) + '</span>' : '') +
        (Store.isFav(kind, inf.id) ? ' <span class="badge" style="color:var(--acc);border-color:var(--acc)">♥ Minha lista</span>' : '') + '</div>' +
        (inf.plot ? '<p class="clamp2" style="margin:0;font-size:2.3rem;line-height:1.45;color:#D5D8DF">' + esc(inf.plot) + '</p>' : '');
    }
    let corpo;
    if (B.loading) corpo = '<div class="spinner"></div>';
    else if (B.err) corpo = '<div class="erro">' + esc(B.err) + '</div><div class="empty">Aperte ' + TK.ok + ' para tentar de novo.</div>';
    else if (!B.items.length) corpo = '<div class="empty">' + (c.id === '__cont' ? 'Nada em andamento ainda.' : c.id === '__fav' ? 'Sua lista está vazia. Aperte ' + TK.red + ' num título para guardar aqui.' : 'Nada nesta categoria.') + '</div>';
    else {
      const linha = Math.floor(B.idx / COLS);
      const vis = B.items.slice(linha * COLS, linha * COLS + COLS);
      corpo = '<div class="row" style="justify-content:space-between"><span class="sora" style="font-size:2.6rem;font-weight:600">' + esc(c.name) + '</span>' +
        '<span class="muted" style="font-size:1.9rem">' + (B.idx + 1) + ' de ' + B.items.length + ' · ' + TK.ok + ' abrir · ▲ categorias</span></div>' +
        '<div class="posters">' + vis.map((x, i) => {
          const j = linha * COLS + i;
          const barra = x.pos && x.dur ? '<div class="pbar"><i style="width:' + Math.min(100, x.pos / x.dur * 100) + '%"></i></div>' : '';
          const fv = Store.isFav(kind, x.id) ? '<span class="fv">♥</span>' : '';
          return '<div data-act="poster" data-v="' + j + '">' + posterHTML(x, j === B.idx && B.zone === 'grid', barra + fv) + '</div>';
        }).join('') + '</div>';
    }
    const start = Math.max(0, Math.min(B.ci - 2, B.cats.length - 8));
    const chips = B.cats.slice(start, start + 8).map((x, i) => '<span class="chip' + (start + i === B.ci ? ' sel' : '') + '">' + esc(x.name) + '</span>').join('');
    root().innerHTML =
      (fundoImg ? '<div class="bg-img" style="background-image:url(\'' + esc(fundoImg).replace(/'/g, '%27') + '\')"></div>' : '<div class="bg-cinema" style="filter:hue-rotate(40deg)"></div>') +
      '<div class="shade-left"></div><div class="shade-top"></div>' +
      '<div class="vb-head"><div class="vb-info">' + topo + '</div>' + clockHTML() + '</div>' +
      '<section class="panel vb-panel"><div class="chips' + (B.zone === 'chips' ? ' foco' : '') + '">' + chips +
      '<span class="grow"></span><span class="hint"><span><i class="ck g"></i>buscar</span><span><i class="ck y"></i>todas as categorias</span><span><i class="ck r"></i>minha lista</span></span></div>' + corpo + '</section>';
  }

  function irCat(i) {
    const c = B.cats[i];
    const vai = () => { B.ci = i; B.zone = 'grid'; carregarItens(); };
    if (Pais.catAdulta(c)) Pais.pedir('A categoria ' + c.name + ' é protegida', vai); else vai();
  }
  /* setas nas categorias pulam as +18 enquanto estiver bloqueado */
  function pularCat(d) {
    let i = B.ci;
    for (let n = 0; n < B.cats.length; n++) {
      i = (i + d + B.cats.length) % B.cats.length;
      if (!(Pais.bloqueado() && Pais.catAdulta(B.cats[i]))) break;
    }
    B.ci = i; carregarItens();
  }

  function abrir() {
    const it = B.items[B.idx]; if (!it) return;
    if (kind === 'vod') abrirFilme(it);
    else if (it.url) App.go('player', { kind: 'vod', item: it, url: it.url, start: 0, title: it.name });
    else App.go('serie', { item: it });
  }

  const self = {
    enter() { carregarCats(); },
    resume() {
      const c = B.cats[B.ci];
      if (c && (c.id === '__cont' || c.id === '__fav')) carregarItens(); else render();
    },
    leave() { clearTimeout(B.infoT); },
    act(n, d) { if (n === 'poster') { const j = Number(d.v); if (j === B.idx) abrir(); else { B.idx = j; B.zone = 'grid'; render(); pedirInfo(); } } },
    key(k) {
      if (k === 'back') { if (!App.back()) App.reset('live'); return; }
      if (k === 'green') { App.openOv(Ov.search(kind)); return; }
      if (k === 'yellow') { if (B.cats.length) App.openOv(Ov.cats(B.cats, B.ci, i => irCat(i), 'Categorias de ' + nome.toLowerCase())); return; }
      if (B.err && k === 'ok') { carregarCats(); return; }
      if (k === 'red') {
        const it = B.items[B.idx]; if (!it || B.zone !== 'grid') return;
        const add = Store.toggleFav(kind, it);
        UI.toast(add ? '♥ Guardado na Minha lista' : 'Removido da Minha lista');
        if (B.cats[B.ci].id === '__fav') carregarItens(); else render();
        return;
      }
      if (B.zone === 'chips') {
        if (k === 'left') pularCat(-1);
        else if (k === 'right') pularCat(1);
        else if (k === 'down' || k === 'ok') { B.zone = 'grid'; render(); }
        return;
      }
      const n = B.items.length;
      if (k === 'left') { if (B.idx % COLS === 0) { App.openOv(Ov.menu(kind)); return; } B.idx--; }
      else if (k === 'right') { if (B.idx + 1 < n) B.idx++; }
      else if (k === 'up') { if (B.idx >= COLS) B.idx -= COLS; else { B.zone = 'chips'; } }
      else if (k === 'down') { if (B.idx + COLS < n) B.idx += COLS; else if (Math.floor(B.idx / COLS) < Math.floor((n - 1) / COLS)) B.idx = n - 1; }
      else if (k === 'chdown') B.idx = Math.min(n - 1, B.idx + COLS * 3);
      else if (k === 'chup') B.idx = Math.max(0, B.idx - COLS * 3);
      else if (k === 'ok') { abrir(); return; }
      else return;
      render(); pedirInfo();
    }
  };
  return self;
};

/* ======================= DETALHE DA SÉRIE ======================= */
Screens.serie = (p) => {
  const it = p.item;
  const D = { info: null, si: 0, ei: 0, zone: 'btn', btn: 0, err: '', cont: null };
  const root = () => $('#screen');

  function progEp(ep) { return Store.getProgress('ep', ep.id); }
  function acharContinuar() {
    D.cont = null;
    const r = Store.my().recent.find(x => x.kind === 'ep' && x.seriesId === it.id);
    if (!r || !D.info) return;
    D.info.seasons.forEach((s, si) => s.eps.forEach((e, ei) => { if (e.id === String(r.id)) D.cont = { si, ei, pos: r.pos, dur: r.dur }; }));
    /* episódio já terminado: continuar no próximo */
    if (D.cont && D.cont.dur && quaseNoFim(D.cont.pos, D.cont.dur)) {
      const nx = proximo(D.cont.si, D.cont.ei);
      D.cont = nx ? { si: nx.si, ei: nx.ei, pos: 0, dur: 0 } : D.cont;
    }
  }
  function proximo(si, ei) {
    const ss = D.info.seasons;
    if (ss[si] && ei + 1 < ss[si].eps.length) return { si, ei: ei + 1 };
    for (let s = si + 1; s < ss.length; s++) if (ss[s].eps.length) return { si: s, ei: 0 };
    return null;
  }

  async function carregar() {
    render();
    try {
      D.info = await Api.seriesInfo(it.id);
      if (!D.info.seasons.length) D.err = 'Esta série ainda não tem episódios na sua lista.';
      acharContinuar();
      if (D.cont) { D.si = D.cont.si; D.ei = D.cont.ei; }
    } catch (e) { D.err = e.message; }
    render();
  }

  function tocarEp(si, ei, inicio) {
    const s = D.info.seasons[si]; const ep = s && s.eps[ei]; if (!ep) return;
    const pr = progEp(ep);
    let start = 0;
    if (inicio === undefined && pr && pr.pos > 30 && pr.dur && !quaseNoFim(pr.pos, pr.dur)) start = pr.pos;
    App.go('player', {
      kind: 'ep', item: ep, url: Api.epUrl(ep), start,
      title: D.info.name || it.name, subtitle: 'T' + ep.season + ' · E' + ep.num + ' — ' + ep.title,
      serie: { item: it, info: D.info, si, ei }
    });
  }

  function render() {
    if (App.cur !== self) return;
    Video.el.className = 'v-hidden';
    const inf = D.info || {};
    const fundo = inf.backdrop || inf.cover || it.backdrop || it.logo;
    let esq = '<span style="font-size:2rem;font-weight:600;letter-spacing:2px" class="acc">SÉRIE</span><h1 class="clamp2">' + esc(inf.name || it.name) + '</h1>';
    let dir = '';
    if (!D.info && !D.err) dir = '<div class="spinner"></div>';
    else if (D.err) dir = '<div class="erro">' + esc(D.err) + '</div>';
    if (D.info) {
      const meta = [inf.year || it.year, inf.seasons.length ? inf.seasons.length + ' temporada' + (inf.seasons.length > 1 ? 's' : '') : '', inf.genre || it.genre].filter(Boolean).map(esc).join(' <span class="muted">•</span> ');
      const fav = Store.isFav('series', it.id);
      const cs = D.cont || { si: 0, ei: 0 };
      const epc = inf.seasons[cs.si] && inf.seasons[cs.si].eps[cs.ei];
      const rot = epc ? (D.cont ? 'Continuar' : 'Assistir') + ' T' + epc.season + ' · E' + epc.num : 'Assistir';
      esq += '<div class="row" style="gap:14px;font-size:2.2rem;color:var(--sub)">' + meta + (inf.rating ? ' <span class="badge">★ ' + esc(String(inf.rating).slice(0, 3)) + '</span>' : '') + '</div>' +
        ((inf.plot || it.plot) ? '<p class="clamp4" style="margin:0;font-size:2.4rem;line-height:1.5;color:var(--sub)">' + esc(inf.plot || it.plot) + '</p>' : '') +
        '<div class="row" style="gap:18px;padding-top:8px">' +
        '<button class="btn pri' + (D.zone === 'btn' && D.btn === 0 ? ' f on' : '') + '" data-act="b0">' + PLAY_SVG.replace(/40/g, '26') + esc(rot) + '</button>' +
        '<button class="btn' + (D.zone === 'btn' && D.btn === 1 ? ' f on' : '') + '" data-act="b1">' + ic(fav ? 'check' : 'heart', 26) + (fav ? 'Na Minha lista' : 'Minha lista') + '</button></div>';
      const ss = inf.seasons;
      const st = Math.max(0, Math.min(D.si - 2, ss.length - 6));
      const temps = ss.slice(st, st + 6).map((s, i) => '<span class="chip' + (st + i === D.si ? ' sel' : '') + '">Temporada ' + esc(s.n) + '</span>').join('');
      const eps = (ss[D.si] && ss[D.si].eps) || [];
      const N = 5, e0 = Math.max(0, Math.min(D.ei - 2, eps.length - N));
      dir = '<div class="chips' + (D.zone === 'temp' ? ' foco' : '') + '">' + temps + '</div>' +
        '<div class="muted" style="font-size:1.9rem">' + eps.length + ' episódios · ' + TK.ok + ' assistir</div>' +
        eps.slice(e0, e0 + N).map((e, i) => {
          const j = e0 + i, pr = progEp(e);
          const pct = pr && pr.dur ? Math.min(100, pr.pos / pr.dur * 100) : 0;
          const st2 = pct > 92 ? 'Assistido' : pct > 0 ? 'Em andamento' : '';
          return '<div class="ep' + (D.zone === 'eps' && j === D.ei ? ' sel' : '') + '" data-act="ep" data-v="' + j + '"><div class="th" style="background:' + corDe(e.title) + '">' +
            (e.img ? '<img src="' + esc(e.img) + '" alt="" loading="lazy" onerror="this.remove()">' : '') +
            (pct ? '<div class="pbar"><i style="width:' + pct + '%"></i></div>' : '') + '</div>' +
            '<div class="grow" style="display:flex;flex-direction:column;gap:8px"><span class="clip" style="font-size:2.4rem;font-weight:600">' + esc(e.num + '. ' + e.title) + '</span>' +
            '<span class="muted" style="font-size:1.9rem">' + esc(e.durTxt || '') + '</span></div>' +
            (st2 ? '<span style="font-size:1.8rem;white-space:nowrap;padding-right:10px;color:' + (st2 === 'Em andamento' ? 'var(--acc)' : 'var(--mut)') + '">' + st2 + '</span>' : '') + '</div>';
        }).join('');
    }
    root().innerHTML =
      (fundo ? '<div class="bg-img" style="background-image:url(\'' + esc(fundo).replace(/'/g, '%27') + '\')"></div>' : '<div class="bg-cinema"></div>') +
      '<div class="shade-left" style="width:1300px"></div>' +
      '<div class="sd"><div class="sd-left">' + esq + '</div><div class="sd-right">' + '<div class="row" style="justify-content:flex-end">' + clockHTML() + '</div>' + dir + '</div></div>';
  }

  const self = {
    enter() { carregar(); },
    resume() { acharContinuar(); render(); },
    act(n, d) {
      if (n === 'b0') { D.zone = 'btn'; D.btn = 0; self.key('ok'); }
      else if (n === 'b1') { D.zone = 'btn'; D.btn = 1; self.key('ok'); }
      else if (n === 'ep') { const j = Number(d.v); if (D.zone === 'eps' && j === D.ei) tocarEp(D.si, j); else { D.zone = 'eps'; D.ei = j; render(); } }
    },
    key(k) {
      if (k === 'back') { App.back(); return; }
      if (!D.info) return;
      const eps = (D.info.seasons[D.si] && D.info.seasons[D.si].eps) || [];
      if (k === 'red') { const add = Store.toggleFav('series', it); UI.toast(add ? '♥ Guardada na Minha lista' : 'Removida da Minha lista'); render(); return; }
      if (D.zone === 'btn') {
        if (k === 'left') D.btn = 0;
        else if (k === 'right') { if (D.btn === 0) D.btn = 1; else { D.zone = 'eps'; } }
        else if (k === 'ok') {
          if (D.btn === 0) { const c = D.cont; if (c) tocarEp(c.si, c.ei); else tocarEp(0, 0); return; }
          const add = Store.toggleFav('series', it); UI.toast(add ? '♥ Guardada na Minha lista' : 'Removida da Minha lista');
        } else if (k === 'down' || k === 'up') D.zone = 'eps';
      } else if (D.zone === 'temp') {
        if (k === 'left') { if (D.si > 0) { D.si--; D.ei = 0; } else D.zone = 'btn'; }
        else if (k === 'right') { if (D.si + 1 < D.info.seasons.length) { D.si++; D.ei = 0; } }
        else if (k === 'down' || k === 'ok') D.zone = 'eps';
      } else {
        if (k === 'up') { if (D.ei > 0) D.ei--; else D.zone = 'temp'; }
        else if (k === 'down') { if (D.ei + 1 < eps.length) D.ei++; }
        else if (k === 'left') D.zone = 'btn';
        else if (k === 'ok') { tocarEp(D.si, D.ei); return; }
        else if (k === 'chdown') D.ei = Math.min(eps.length - 1, D.ei + 5);
        else if (k === 'chup') D.ei = Math.max(0, D.ei - 5);
      }
      render();
    }
  };
  return self;
};

/* ======================= REPRODUÇÃO (filmes e episódios) ======================= */
Screens.player = (p) => {
  const P = { ui: true, hideT: 0, saveT: 0, next: null, nextN: 0, nextT: 0, seekAt: 0, seekMul: 1, ok: true };
  const v = () => Video.el;
  const root = () => $('#screen');

  function salvar(final) {
    const el = v();
    if (!isFinite(el.duration) || el.duration < 60) return;
    const it = p.item;
    Store.setProgress({
      kind: p.kind === 'ep' ? 'ep' : 'vod', id: it.id, name: it.name || it.title, logo: it.logo || it.img || '', ext: it.ext, url: it.url, cat: it.cat,
      seriesCat: p.serie ? p.serie.item.cat : undefined,
      pos: final ? el.duration : el.currentTime, dur: el.duration,
      seriesId: p.serie ? p.serie.item.id : undefined,
      seriesName: p.serie ? (p.serie.info.name || p.serie.item.name) : undefined,
      seriesLogo: p.serie ? (p.serie.item.logo || p.serie.info.cover) : undefined,
      season: it.season, epNum: it.num, epTitle: it.title
    });
  }
  function proximoEp() {
    if (p.kind !== 'ep' || !p.serie) return null;
    const ss = p.serie.info.seasons, si = p.serie.si, ei = p.serie.ei;
    if (ss[si] && ei + 1 < ss[si].eps.length) return { si, ei: ei + 1, ep: ss[si].eps[ei + 1] };
    for (let s = si + 1; s < ss.length; s++) if (ss[s].eps.length) return { si: s, ei: 0, ep: ss[s].eps[0] };
    return null;
  }
  function tocarProximo(nx) {
    App.replace('player', {
      kind: 'ep', item: nx.ep, url: Api.epUrl(nx.ep), start: 0, title: p.title,
      subtitle: 'T' + nx.ep.season + ' · E' + nx.ep.num + ' — ' + nx.ep.title,
      serie: { item: p.serie.item, info: p.serie.info, si: nx.si, ei: nx.ei }
    });
  }

  function cutucar() {
    P.ui = true; atualizar();
    clearTimeout(P.hideT);
    P.hideT = setTimeout(() => { if (!v().paused) { P.ui = false; atualizar(); } }, 4000);
  }

  function render() {
    root().innerHTML =
      '<div class="pl-ui" id="plui"><div class="pl-top"></div><div class="pl-bot"></div>' +
      '<div style="position:absolute;top:56px;left:80px;right:80px;display:flex;justify-content:space-between;align-items:flex-start">' +
      '<div style="display:flex;flex-direction:column;gap:6px;max-width:1400px"><span class="sora clip" style="font-size:4rem;font-weight:700">' + esc(p.title || '') + '</span>' +
      (p.subtitle ? '<span class="clip" style="font-size:2.2rem;color:var(--sub)">' + esc(p.subtitle) + '</span>' : '') + '</div>' + clockHTML() + '</div>' +
      '<div style="position:absolute;left:80px;right:80px;bottom:56px;display:flex;flex-direction:column;gap:30px">' +
      '<div class="row" style="gap:24px;font-size:2.2rem;font-variant-numeric:tabular-nums"><span id="plpos">0:00</span><div class="pl-prog"><i id="plbar" style="width:0%"></i><b id="pldot" style="left:0%"></b></div><span id="pldur" class="sub">--:--</span></div>' +
      '<div class="hint" style="font-size:2rem"><span><span class="k">' + TK.ok + '</span>pausar / continuar</span><span><span class="k">◀ ▶</span>voltar / avançar 10 s</span>' +
      '<span><i class="ck g"></i>áudio</span><span><i class="ck y"></i>legenda</span>' + (proximoEp() ? '<span><i class="ck b"></i>próximo episódio</span>' : '') +
      '<span><span class="k">' + TK.back + '</span>sair</span></div></div>' +
      '<div class="pl-big" id="plbig" style="display:none">' + PLAY_SVG.replace(/40/g, '64') + '</div></div>' +
      '<div id="plnext"></div><div id="plload" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%)"><div class="spinner"></div></div>';
    atualizar();
  }
  function atualizar() {
    const el = v();
    const ui = $('#plui'); if (!ui) return;
    ui.classList.toggle('esconde', !P.ui && !el.paused);
    const d = el.duration, t = el.currentTime;
    const pct = isFinite(d) && d > 0 ? t / d * 100 : 0;
    const bar = $('#plbar'), dot = $('#pldot');
    if (bar) bar.style.width = pct + '%';
    if (dot) dot.style.left = pct + '%';
    const a = $('#plpos'), b = $('#pldur');
    if (a) a.textContent = fmtTime(t);
    if (b) b.textContent = isFinite(d) ? '−' + fmtTime(d - t) : '--:--';
    const big = $('#plbig'); if (big) big.style.display = el.paused && P.ok && el.readyState > 1 ? 'flex' : 'none';
    const ld = $('#plload'); if (ld) ld.style.display = el.readyState < 3 && !el.paused ? 'block' : 'none';
    const nx = $('#plnext');
    if (nx) nx.innerHTML = P.next ? '<div class="next-card"><span style="font-size:1.7rem;font-weight:600;letter-spacing:1px" class="acc">PRÓXIMO EM ' + P.nextN + ' S</span>' +
      '<span style="font-size:2.4rem;font-weight:600">' + esc(P.next.ep.num + '. ' + P.next.ep.title) + '</span><span class="muted" style="font-size:1.8rem">' + TK.ok + ' para ir agora · ' + TK.back + ' para cancelar</span></div>' : '';
  }
  function fim() {
    salvar(true);
    const nx = proximoEp();
    if (!nx) { App.back(); return; }
    P.next = nx; P.nextN = 10; P.ui = true; atualizar();
    clearInterval(P.nextT);
    P.nextT = setInterval(() => {
      P.nextN--; atualizar();
      if (P.nextN <= 0) { clearInterval(P.nextT); tocarProximo(nx); }
    }, 1000);
  }
  const ev = {
    timeupdate: () => { if (P.ui) atualizar(); },
    pause: () => { P.ui = true; atualizar(); },
    play: () => cutucar(),
    waiting: () => atualizar(), playing: () => atualizar(), loadedmetadata: () => atualizar(),
    ended: () => fim()
  };

  const self = {
    enter() {
      Video.el.className = 'v-full';
      render();
      Object.keys(ev).forEach(k => v().addEventListener(k, ev[k]));
      Video.play(p.url, {
        start: p.start || 0, onError: msg => {
          P.ok = false;
          UI.toast(msg + '. Voltando…', 3000);
          setTimeout(() => { if (App.cur === self) App.back(); }, 2500);
        }
      });
      P.saveT = setInterval(() => salvar(false), 10000);
      cutucar();
    },
    leave() {
      salvar(false);
      Object.keys(ev).forEach(k => v().removeEventListener(k, ev[k]));
      clearInterval(P.saveT); clearInterval(P.nextT); clearTimeout(P.hideT);
      Video.stop();
    },
    pause() { v().pause(); },
    key(k) {
      if (P.next) {
        if (k === 'ok') { clearInterval(P.nextT); tocarProximo(P.next); }
        else if (k === 'back') { clearInterval(P.nextT); App.back(); }
        return;
      }
      if (k === 'back' || k === 'stop') { App.back(); return; }
      if (k === 'ok' || k === 'playpause') { Video.toggle(); cutucar(); return; }
      if (k === 'play') { v().play(); cutucar(); return; }
      if (k === 'pause') { v().pause(); cutucar(); return; }
      if (k === 'left' || k === 'right' || k === 'rew' || k === 'ff') {
        const now = Date.now();
        P.seekMul = now - P.seekAt < 450 ? Math.min(6, P.seekMul + 0.5) : 1;
        P.seekAt = now;
        Video.seek((k === 'left' || k === 'rew' ? -10 : 10) * Math.floor(P.seekMul));
        cutucar(); return;
      }
      if (k === 'green') { const n = Video.nextAudio(); UI.toast(n ? 'Áudio: ' + n : 'Este vídeo tem só uma faixa de áudio'); return; }
      if (k === 'yellow') { const n = Video.nextSub(); UI.toast(n ? 'Legenda: ' + n : 'Este vídeo não tem legendas'); return; }
      if (k === 'blue') { const nx = proximoEp(); if (nx) tocarProximo(nx); return; }
      if (k === 'up' || k === 'down') cutucar();
    }
  };
  return self;
};
