/* MY HOUSE — TV ao Vivo (modelos A Clássico, B Cinema, C Lista simples) */
'use strict';

Screens.live = (p) => {
  const L = {
    cats: [], ci: 0, chans: [], sel: 0, playing: null, full: false,
    numBuf: '', numT: 0, loading: true, err: '', banner: false, bannerT: 0,
    started: false, exitAt: 0, rT: 0
  };
  const epgMem = {}, pend = {}, fila = [];
  let ativos = 0;
  const root = () => $('#screen');
  const ROWS = { a: 7, b: 5, c: 8 };

  /* ---------- dados ---------- */
  async function carregarCats() {
    L.loading = true; L.err = ''; render();
    try {
      const cats = kidsFilterCats(await Api.cats('live'));
      L.cats = (isKids() ? [] : [{ id: '__all', name: 'Todos' }]).concat([{ id: '__fav', name: 'Favoritos' }], cats);
      const want = p.cat || Store.my().lastCat;
      let ci = L.cats.findIndex(c => c.id === want && !(Pais.bloqueado() && Pais.catAdulta(c)));
      if (ci < 0) ci = isKids() ? (L.cats.length > 1 ? 1 : 0) : 0;
      L.ci = ci;
      await carregarCanais(true);
    } catch (e) { L.loading = false; L.err = e.message || 'Erro ao carregar os canais'; render(); }
  }

  async function carregarCanais(inicio) {
    L.loading = true; render();
    const c = L.cats[L.ci];
    try {
      let lista;
      if (c.id === '__fav') lista = Pais.filtrar('live', Store.my().favs.live.slice());
      else if (c.id === '__all') lista = Pais.filtrar('live', await Api.items('live'));
      else lista = await Api.items('live', c.id);
      L.chans = lista; L.loading = false; L.err = '';
      Store.my().lastCat = c.id; Store.save();
      if (inicio) {
        let ch = p.play || null;
        const ult = Store.my().lastCh[0];
        if (!ch && ult) ch = lista.find(x => x.id === ult) || null;
        if (!ch && ult && !isKids()) { try { ch = Pais.filtrar('live', await Api.items('live')).find(x => x.id === ult) || null; } catch (e) { /* ignora */ } }
        if (!ch) ch = lista[0] || null;
        if (ch) { tocar(ch); if (p.play) L.full = true; }
      }
      const pi = L.playing ? lista.findIndex(x => x.id === L.playing.id) : -1;
      L.sel = pi >= 0 ? pi : 0;
    } catch (e) { L.loading = false; L.err = e.message || 'Erro ao carregar os canais'; L.chans = []; }
    render();
  }

  function pedirEpg(lista) {
    lista.forEach(ch => {
      if (!ch || epgMem[ch.id] || pend[ch.id]) return;
      pend[ch.id] = 1; fila.push(ch);
    });
    bombear();
  }
  function bombear() {
    while (ativos < 4 && fila.length) {
      const ch = fila.shift(); ativos++;
      Api.epg(ch).then(r => { epgMem[ch.id] = r; }, () => { epgMem[ch.id] = []; })
        .then(() => { ativos--; delete pend[ch.id]; agendarRender(); bombear(); });
    }
  }
  function agendarRender() { clearTimeout(L.rT); L.rT = setTimeout(() => { if (App.cur === self) render(); }, 150); }

  function progAgora(ch) {
    const ps = epgMem[ch.id]; if (!ps) return null;
    const now = Date.now();
    return ps.find(x => x.start <= now && now < x.stop) || null;
  }
  function progDepois(ch, n) {
    const ps = epgMem[ch.id]; if (!ps) return [];
    const now = Date.now();
    return ps.filter(x => x.start > now).slice(0, n || 2);
  }

  /* ---------- reprodução ---------- */
  function tocar(ch) {
    L.playing = ch;
    Store.pushLastChannel(ch.id);
    Video.play(Api.liveUrl(ch), { onError: msg => UI.toast(msg + ' (' + ch.name + ')', 3500) });
    pedirEpg([ch]);
  }
  function zap(d) {
    if (!L.chans.length) return;
    let i = L.playing ? L.chans.findIndex(x => x.id === L.playing.id) : L.sel;
    if (i < 0) i = L.sel;
    i = (i + d + L.chans.length) % L.chans.length;
    L.sel = i;
    tocar(L.chans[i]);
    mostrarBanner();
  }
  function mostrarBanner() {
    L.banner = true; render();
    clearTimeout(L.bannerT);
    L.bannerT = setTimeout(() => { L.banner = false; if (App.cur === self && L.full) render(); }, 5000);
  }
  async function acharPorId(id) {
    let ch = L.chans.find(x => x.id === id);
    if (!ch && !isKids()) { try { ch = (await Api.items('live')).find(x => x.id === id); } catch (e) { /* ignora */ } }
    return ch || null;
  }
  async function acharPorNumero(n) {
    let ch = L.chans.find(x => Number(x.num) === n);
    if (!ch && !isKids()) { try { ch = (await Api.items('live')).find(x => Number(x.num) === n); } catch (e) { /* ignora */ } }
    return ch || null;
  }
  function digito(d) {
    if (L.numBuf.length >= 4) return;
    L.numBuf += d; render();
    clearTimeout(L.numT);
    L.numT = setTimeout(async () => {
      const n = Number(L.numBuf); L.numBuf = ''; render();
      const ch = await acharPorNumero(n);
      if (ch) {
        const ir = () => { tocar(ch); const i = L.chans.findIndex(x => x.id === ch.id); if (i >= 0) L.sel = i; L.full = true; mostrarBanner(); };
        if (Pais.itemAdulto('live', ch)) Pais.pedir('O canal ' + n + ' é protegido', ir); else ir();
      }
      else { UI.toast('Canal ' + n + ' não encontrado'); render(); }
    }, 1500);
  }

  /* ---------- desenho ---------- */
  function janela(n) {
    const len = L.chans.length;
    const start = Math.max(0, Math.min(L.sel - Math.floor(n / 2), len - n));
    return { start, vis: L.chans.slice(start, start + n) };
  }

  function infoSel() {
    const ch = L.chans[L.sel] || L.playing;
    if (!ch) return null;
    const pr = progAgora(ch);
    const now = Date.now();
    let tempo = '', pct = 0, resta = '';
    if (pr) {
      tempo = hhmm(new Date(pr.start)) + ' – ' + hhmm(new Date(pr.stop));
      pct = Math.min(100, Math.max(0, (now - pr.start) / (pr.stop - pr.start) * 100));
      const m = Math.round((pr.stop - now) / 60000);
      resta = m >= 60 ? 'faltam ' + Math.floor(m / 60) + 'h' + pad2(m % 60) : 'faltam ' + m + ' min';
    }
    return { ch, pr, tempo, pct, resta, prox: progDepois(ch, 2), tocando: !!(L.playing && L.playing.id === ch.id) };
  }

  function linhaGuia(ch, i, t0, t1, chW, h) {
    const sel = i === L.sel;
    const ps = epgMem[ch.id];
    const now = Date.now();
    let blocos = '';
    if (!ps || !ps.length) {
      blocos = '<div class="g-p ' + (sel ? 'now' : 'vazio') + '" style="flex:1 1 0">' + (ps ? (sel ? esc(ch.name) : 'Sem informação do guia') : 'Carregando guia…') + '</div>';
    } else {
      let t = t0; const parts = [];
      ps.forEach(pr => {
        if (pr.stop <= t0 || pr.start >= t1) return;
        const s = Math.max(pr.start, t0, t), e = Math.min(pr.stop, t1);
        if (e <= s) return;
        if (s > t) parts.push({ w: s - t });
        parts.push({ pr, w: e - s, now: pr.start <= now && now < pr.stop });
        t = e;
      });
      if (t < t1) parts.push({ w: t1 - t });
      blocos = parts.map(x => x.pr ?
        '<div class="g-p' + (x.now ? ' now' : '') + '" style="flex:' + x.w + ' 1 0">' + esc(x.pr.title) + '</div>' :
        '<div class="g-p vazio" style="flex:' + x.w + ' 1 0"></div>').join('');
    }
    const tocando = L.playing && L.playing.id === ch.id;
    return '<div class="g-row' + (sel ? ' sel' : '') + '" style="height:' + h + 'px" data-act="row" data-v="' + i + '">' +
      '<div class="g-ch" style="width:' + chW + 'px"><span class="num">' + esc(ch.num) + '</span>' + logoHTML(ch, 'lg') +
      '<span class="nm clip grow">' + esc(ch.name) + '</span>' + (Store.isFav('live', ch.id) ? '<span class="fav-star">★</span>' : '') +
      (tocando ? '<span class="playing-dot"></span>' : '') + '</div>' +
      '<div class="g-progs">' + blocos + '</div></div>';
  }

  function guia(n, chW, h, larg) {
    const w = janela(n);
    pedirEpg(w.vis);
    const now = Date.now();
    const t0 = Math.floor(now / 1800000) * 1800000, t1 = t0 + 7200000;
    const frac = (now - t0) / (t1 - t0);
    const tempos = [0, 1, 2, 3].map(i => '<span>' + (Math.abs(frac - i * 0.25) * larg < 90 ? '' : hhmm(new Date(t0 + i * 1800000))) + '</span>').join('');
    return '<div class="g-times"><div style="width:' + chW + 'px;flex-shrink:0"></div><div class="tl">' + tempos + '</div></div>' +
      '<div class="g-body"><div class="nowline" style="left:calc(' + (chW + 8) + 'px + (100% - ' + (chW + 8) + 'px) * ' + frac.toFixed(4) + ')"><b>' + hhmm(new Date()) + '</b></div>' +
      w.vis.map((ch, i) => linhaGuia(ch, w.start + i, t0, t1, chW, h)).join('') + '</div>';
  }

  function estadoVazio() {
    if (L.loading) return '<div class="spinner"></div><div class="empty">Carregando canais…</div>';
    if (L.err) return '<div class="erro" style="margin:20px">' + esc(L.err) + '</div><div class="empty">Aperte ' + TK.ok + ' para tentar de novo.</div>';
    const c = L.cats[L.ci];
    if (c && c.id === '__fav') return '<div class="empty">Nenhum favorito ainda. No canal desejado, aperte ' + TK.red + '.</div>';
    return '<div class="empty">Nenhum canal nesta categoria.</div>';
  }

  function dicas(extra) {
    return '<div class="hint"><span><span class="k">' + TK.ok + '</span>' + (L.playing && L.chans[L.sel] && L.playing.id === L.chans[L.sel].id ? 'tela cheia' : 'assistir') + '</span>' +
      '<span><span class="k">◀</span>menu</span>' +
      '<span><i class="ck r"></i>favoritar</span><span><i class="ck g"></i>buscar</span><span><i class="ck y"></i>categorias</span><span><i class="ck b"></i>último canal</span>' + (extra || '') + '</div>';
  }

  function chipsCats(max) {
    const start = Math.max(0, Math.min(L.ci - 2, L.cats.length - max));
    return L.cats.slice(start, start + max).map((c, i) => '<span class="chip' + (start + i === L.ci ? ' sel' : '') + '">' + esc(c.name) + '</span>').join('');
  }

  function avisoVencimento() {
    const ex = expInfo(Store.list());
    if (ex.dias === null || ex.dias > 5) return '';
    return '<div style="margin-top:10px;display:inline-flex;padding:8px 18px;border-radius:999px;background:#2A2111;border:1px solid #5C4415;color:#F6CF7E;font-size:1.9rem">' + esc(ex.txt) + '</div>';
  }

  function telaB() {
    const inf = infoSel();
    const cab = inf ?
      '<div class="row" style="gap:14px">' + (inf.tocando ? '<span class="live-tag">AO VIVO</span>' : '<span class="badge">' + TK.ok + ' para assistir</span>') +
      '<span style="font-size:2.2rem;color:#E3E5EA">' + esc(inf.ch.num) + ' · ' + esc(inf.ch.name) + '</span></div>' +
      '<h1 class="clip">' + esc(inf.pr ? inf.pr.title : inf.ch.name) + '</h1>' +
      '<span style="font-size:2.3rem;color:#D5D8DF">' + (inf.pr ? esc(inf.tempo + ' · ' + inf.resta) : 'Sem informação do guia') + '</span>' : '';
    return (L.playing ? '' : '<div class="bg-cinema"></div>') + '<div class="shade-top"></div><div class="shade-bot"></div>' +
      '<div class="lb-head"><div style="display:flex;flex-direction:column;gap:10px;min-width:0">' + cab + avisoVencimento() + '</div>' + clockHTML() + '</div>' +
      '<section class="panel lb-panel">' +
      '<div class="chips">' + chipsCats(8) + '<span class="grow"></span><span class="hint"><span><i class="ck y"></i>trocar categoria</span></span></div>' +
      (L.chans.length ? guia(ROWS.b, 340, 70, 1428) : estadoVazio()) +
      '</section>' +
      '<div style="position:absolute;left:72px;bottom:6px">' + dicas() + '</div>';
  }

  function telaA() {
    const inf = infoSel();
    const c = L.cats[L.ci] || { name: '' };
    const rail = ['tv', 'film', 'series', 'heart', 'search'].map((n, i) => '<div class="ic' + (i === 0 ? ' sel' : '') + '">' + ic(n, 30) + '</div>').join('');
    const topo = inf ?
      '<div class="row" style="gap:14px;font-size:2.2rem;color:var(--sub)"><span style="padding:6px 12px;border-radius:8px;background:var(--card2);font:600 2.2rem Sora;color:var(--acc)">' + esc(inf.ch.num) + '</span>' + esc(inf.ch.name) + ' · ' + esc(c.name) + '</div>' +
      '<h1 class="clamp2">' + esc(inf.pr ? inf.pr.title : inf.ch.name) + '</h1>' +
      '<span style="font-size:2.3rem;color:var(--sub)">' + (inf.pr ? esc(inf.tempo + ' · ' + inf.resta) : 'Sem informação do guia') + '</span>' +
      (inf.pr ? '<div class="bar" style="width:560px"><i style="width:' + inf.pct + '%"></i></div>' : '') +
      (inf.pr && inf.pr.desc ? '<p class="clamp2" style="margin:0;font-size:2.1rem;line-height:1.45;color:#A9AEBB">' + esc(inf.pr.desc) + '</p>' : '') +
      avisoVencimento() : '';
    return '<div class="la"><nav class="la-rail"><div class="logo-mark" style="margin-bottom:26px"></div>' + rail + '<div class="grow"></div><div class="ic">' + ic('gear', 30) + '</div></nav>' +
      '<div class="la-main"><div class="la-top"><div class="la-info">' + topo + '</div><div class="la-prev"></div></div>' +
      '<section style="flex-grow:1;min-height:0;display:flex;flex-direction:column;gap:8px">' +
      '<div class="row" style="gap:10px;font-size:2rem;font-weight:600;height:30px"><span class="acc">☰</span>' + esc(c.name) + ' · ' + L.chans.length + '<span class="grow"></span><span class="hint"><span><i class="ck y"></i>trocar categoria</span></span></div>' +
      (L.chans.length ? guia(ROWS.a, 340, 62, 1372) : estadoVazio()) + '</section>' + dicas() + '</div></div>';
  }

  function telaC() {
    const c = L.cats[L.ci] || { name: '' };
    const startC = Math.max(0, Math.min(L.ci - 4, L.cats.length - 9));
    const cats = L.cats.slice(startC, startC + 9).map((x, i) => '<div class="lc-cat' + (startC + i === L.ci ? ' sel' : '') + '"><span class="clip">' + esc(x.name) + '</span></div>').join('');
    let lista = '';
    if (L.chans.length) {
      const w = janela(ROWS.c); pedirEpg(w.vis);
      lista = w.vis.map((ch, i) => {
        const j = w.start + i, pr = progAgora(ch);
        const pct = pr ? Math.min(100, (Date.now() - pr.start) / (pr.stop - pr.start) * 100) : 0;
        return '<div class="lc-item' + (j === L.sel ? ' sel' : '') + '" data-act="row" data-v="' + j + '"><span class="num">' + esc(ch.num) + '</span>' + logoHTML(ch, 'lg') +
          '<div class="grow" style="display:flex;flex-direction:column;gap:6px"><div class="row" style="justify-content:space-between;gap:16px"><span class="clip" style="font-size:2.4rem;font-weight:600">' + esc(ch.name) +
          (Store.isFav('live', ch.id) ? ' <span class="acc">★</span>' : '') + '</span><span class="muted" style="font-size:1.9rem;white-space:nowrap">' + (pr ? hhmm(new Date(pr.start)) + '–' + hhmm(new Date(pr.stop)) : '') + '</span></div>' +
          '<span class="clip sub" style="font-size:2rem">' + esc(pr ? pr.title : (epgMem[ch.id] ? 'Sem informação do guia' : 'Carregando…')) + '</span>' +
          '<div class="bar" style="height:5px"><i style="width:' + pct + '%"></i></div></div></div>';
      }).join('');
    } else lista = estadoVazio();
    const inf = infoSel();
    const lado = inf ?
      '<div style="display:flex;flex-direction:column;gap:10px"><span style="font-size:1.8rem;font-weight:600;letter-spacing:1.5px" class="acc">' + (inf.tocando ? 'AGORA' : 'SELECIONADO') + '</span>' +
      '<span class="sora clamp2" style="font-size:3.4rem;font-weight:700;line-height:1.15">' + esc(inf.pr ? inf.pr.title : inf.ch.name) + '</span>' +
      '<span class="sub" style="font-size:2.1rem">' + (inf.pr ? esc(inf.tempo + ' · ' + inf.resta) : esc(inf.ch.name)) + '</span></div>' +
      (inf.prox.length ? '<div class="card" style="padding:22px;display:flex;flex-direction:column;gap:12px"><span class="muted" style="font-size:1.8rem;font-weight:600;letter-spacing:1.5px">A SEGUIR</span>' +
        inf.prox.map(x => '<div class="row" style="gap:16px;font-size:2.1rem"><span class="muted" style="width:70px">' + hhmm(new Date(x.start)) + '</span><span class="clip">' + esc(x.title) + '</span></div>').join('') + '</div>' : '') : '';
    return '<div class="lc"><nav class="lc-cats"><div class="logo-box" style="padding:0 8px 26px"><div class="logo-mark" style="width:48px;height:48px"></div><span class="sora" style="font-size:3.2rem;font-weight:700">TV ao Vivo</span></div>' + cats + '</nav>' +
      '<section class="lc-list"><div class="row" style="justify-content:space-between;padding:6px 8px 14px"><span class="sora" style="font-size:3rem;font-weight:600">' + esc(c.name) + '</span><span class="muted" style="font-size:2rem">' + L.chans.length + (L.chans.length === 1 ? ' canal' : ' canais') + ' · ▲▼ navegar</span></div>' + lista + '</section>' +
      '<aside class="lc-side"><div class="row" style="justify-content:flex-end">' + clockHTML() + '</div><div style="height:338px;border-radius:20px;background:#19202E;flex-shrink:0"></div>' + lado +
      '<div class="grow"></div><div class="hint" style="flex-wrap:wrap;gap:12px 24px"><span><span class="k">' + TK.ok + '</span>' + (inf && inf.tocando ? 'tela cheia' : 'assistir') + '</span><span><span class="k">◀</span>menu</span><span><i class="ck r"></i>favoritar</span><span><i class="ck y"></i>categorias</span><span><i class="ck b"></i>último</span></div></aside></div>';
  }

  function telaCheia() {
    let h = '';
    if (L.banner && L.playing) {
      const ch = L.playing, pr = progAgora(ch), prox = progDepois(ch, 1)[0];
      const pct = pr ? Math.min(100, (Date.now() - pr.start) / (pr.stop - pr.start) * 100) : 0;
      h += '<div class="banner"><span class="bnum">' + esc(ch.num) + '</span>' + logoHTML(ch, 'lg') +
        '<div class="grow" style="display:flex;flex-direction:column;gap:10px"><div class="row" style="gap:14px"><span class="live-tag">AO VIVO</span><span style="font-size:2.6rem;font-weight:600">' + esc(ch.name) + '</span>' +
        (Store.isFav('live', ch.id) ? '<span class="acc" style="font-size:2.4rem">★</span>' : '') + '</div>' +
        '<span class="sora clip" style="font-size:3.4rem;font-weight:700">' + esc(pr ? pr.title : 'Sem informação do guia') + '</span>' +
        (pr ? '<div class="row" style="gap:18px;font-size:2rem;color:var(--sub)"><span>' + hhmm(new Date(pr.start)) + '</span><div class="bar grow"><i style="width:' + pct + '%"></i></div><span>' + hhmm(new Date(pr.stop)) + '</span></div>' : '') +
        (prox ? '<span class="muted" style="font-size:2rem">A seguir: <span style="color:#E3E5EA">' + esc(prox.title) + '</span> — ' + hhmm(new Date(prox.start)) + '</span>' : '') + '</div>' +
        '<div class="hint" style="flex-direction:column;align-items:flex-start;gap:10px"><span><span class="k">▲▼</span>trocar canal</span><span><span class="k">' + TK.ok + '</span>guia</span><span><i class="ck b"></i>último canal</span></div></div>';
    }
    return h;
  }

  function render() {
    if (App.cur !== self) return;
    const lay = Store.layout();
    if (L.full) Video.el.className = 'v-full';
    else Video.el.className = lay === 'a' ? 'v-a' : lay === 'c' ? 'v-c' : 'v-full';
    if (!L.playing && !L.full && lay === 'b') Video.el.className = 'v-hidden';
    let h = L.full ? telaCheia() : (lay === 'a' ? telaA() : lay === 'c' ? telaC() : telaB());
    if (L.numBuf) h += '<div class="numbox">' + esc(L.numBuf) + '<span style="opacity:.4">' + '_'.repeat(Math.max(0, 3 - L.numBuf.length)) + '</span></div>';
    root().innerHTML = h;
  }

  /* ---------- teclas ---------- */
  function mover(d) {
    if (!L.chans.length) return;
    L.sel = (L.sel + d + L.chans.length) % L.chans.length;
    render();
  }
  function trocarCat(i) {
    i = (i + L.cats.length) % L.cats.length;
    const c = L.cats[i];
    if (Pais.catAdulta(c)) Pais.pedir('A categoria ' + c.name + ' é protegida', () => { L.ci = i; carregarCanais(false); });
    else { L.ci = i; carregarCanais(false); }
  }
  /* seta para a direita pula as categorias +18 enquanto estiver bloqueado */
  function proximaCat() {
    let i = L.ci;
    for (let n = 0; n < L.cats.length; n++) {
      i = (i + 1) % L.cats.length;
      if (!(Pais.bloqueado() && Pais.catAdulta(L.cats[i]))) break;
    }
    L.ci = i; carregarCanais(false);
  }
  async function favoritar() {
    const ch = L.full ? L.playing : L.chans[L.sel];
    if (!ch) return;
    const add = Store.toggleFav('live', ch);
    UI.toast(add ? '★ ' + ch.name + ' nos favoritos' : ch.name + ' saiu dos favoritos');
    if (L.cats[L.ci] && L.cats[L.ci].id === '__fav') { await carregarCanais(false); }
    else render();
  }
  async function ultimoCanal() {
    const id = Store.my().lastCh[1];
    if (!id) { UI.toast('Ainda não há canal anterior'); return; }
    const ch = await acharPorId(id);
    if (!ch) { UI.toast('Canal anterior não encontrado'); return; }
    tocar(ch);
    const i = L.chans.findIndex(x => x.id === ch.id); if (i >= 0) L.sel = i;
    if (L.full) mostrarBanner(); else render();
  }
  function sair() {
    if (Date.now() - L.exitAt < 2500) { exitApp(); return; }
    L.exitAt = Date.now();
    UI.toast('Aperte ' + TK.back + ' de novo para sair do MY HOUSE');
  }

  const self = {
    isLive: true,
    enter() {
      if (p.lazy && !L.started) { L.started = true; carregarCats(); return; }
      L.started = true;
      carregarCats();
    },
    resume() {
      if (!L.started) { self.enter(); return; }
      if (L.playing) tocar(L.playing);
      render();
    },
    leave() { Video.stop(); clearTimeout(L.bannerT); clearTimeout(L.numT); },
    pause() { Video.stop(); },
    unpause() { if (L.playing) tocar(L.playing); },
    tick() { if (!L.full) render(); },
    playItem(it) { tocar(it); const i = L.chans.findIndex(x => x.id === it.id); if (i >= 0) L.sel = i; L.full = true; mostrarBanner(); },
    gotoCat(id) { const i = L.cats.findIndex(c => c.id === id); if (i >= 0) trocarCat(i); },
    act(n, d) {
      if (n === 'row') {
        const i = Number(d.v);
        if (i === L.sel && L.chans[i]) { if (L.playing && L.playing.id === L.chans[i].id) { L.full = true; mostrarBanner(); } else { tocar(L.chans[i]); render(); } }
        else { L.sel = i; render(); }
      }
    },
    key(k) {
      if (/^n\d$/.test(k)) { digito(k.slice(1)); return; }
      if (k === 'red') { favoritar(); return; }
      if (k === 'blue') { ultimoCanal(); return; }
      if (k === 'green') { App.openOv(Ov.search('live')); return; }
      if (k === 'left' && !L.full) { App.openOv(Ov.menu('live')); return; }
      if (k === 'yellow') { if (L.cats.length) App.openOv(Ov.cats(L.cats, L.ci, i => trocarCat(i), 'Categorias de canais')); return; }
      if (L.err && k === 'ok') { carregarCats(); return; }
      if (L.full) {
        if (k === 'up' || k === 'chup') zap(-1);
        else if (k === 'down' || k === 'chdown') zap(1);
        else if (k === 'ok') { L.full = false; L.banner = false; render(); }
        else if (k === 'left') App.openOv(Ov.menu('live'));
        else if (k === 'right' || k === 'play' || k === 'pause' || k === 'playpause') mostrarBanner();
        else if (k === 'back') { if (L.banner) { L.banner = false; render(); } else sair(); }
        return;
      }
      if (k === 'up') mover(-1);
      else if (k === 'down') mover(1);
      else if (k === 'chup') mover(-ROWS[Store.layout()]);
      else if (k === 'chdown') mover(ROWS[Store.layout()]);
      else if (k === 'right') proximaCat();
      else if (k === 'ok') {
        const ch = L.chans[L.sel]; if (!ch) return;
        if (L.playing && L.playing.id === ch.id) { L.full = true; mostrarBanner(); }
        else { tocar(ch); render(); }
      } else if (k === 'back') {
        if (L.playing) { L.full = true; mostrarBanner(); } else sair();
      }
    }
  };
  return self;
};
