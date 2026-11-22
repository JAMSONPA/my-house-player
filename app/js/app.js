/* MY HOUSE — núcleo: navegação entre telas, janelas, login e perfis */
'use strict';

const VERSAO = '1.0.8';
/* servidor da lista já preenchido no primeiro acesso (pode ser trocado na tela) */
const SERVIDOR_PADRAO = ''; /* ex.: 'http://seu-servidor.com' */
/* outros endereços do mesmo fornecedor: tentados em ordem quando o primeiro não responde como lista Xtream */
const SERVIDORES_RESERVA = []; /* endereços alternativos do mesmo fornecedor, se houver */

function normalizaServidor(srv) {
  srv = String(srv || '').trim();
  if (srv && !/^https?:\/\//i.test(srv)) srv = 'http://' + srv;
  return srv.replace(/\/+$/, '').replace(/\/player_api\.php.*$/i, '');
}
/* tenta o servidor informado e, se falhar, os reservas; devolve { cfg, info } do primeiro que funcionar */
async function loginComReservas(server, user, pass, reservas) {
  const lista = [normalizaServidor(server)];
  (reservas || SERVIDORES_RESERVA).forEach(r => { const n = normalizaServidor(r); if (n && lista.indexOf(n) < 0) lista.push(n); });
  const erros = [];
  for (const srv of lista) {
    const cfg = { type: 'xtream', server: srv, user: user, pass: pass };
    try { Api.set(cfg); const info = await Api.login(); return { cfg, info }; }
    catch (e) { erros.push(srv.replace(/^https?:\/\//, '') + ' → ' + (e.message || 'erro')); }
  }
  throw new Error(erros.length > 1 ? erros.join('  |  ') : (erros[0] || 'Não foi possível conectar'));
}
const KIDS_RE = /infantil|kids|crian|desenho|cartoon|anima|disney|junior|júnior|baby|nick|discovery kids/i;
const AV_CORES = ['#3B6FD8', '#B4573A', '#2E8B5F', '#7A4BC4', '#C4466E', '#2A8C9C', '#B88A1E'];

const ICON = {
  tv: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="m17 2-5 5-5-5"/>',
  film: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 3v18M17 3v18M3 8h4M3 16h4M17 8h4M17 16h4"/>',
  series: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 12 10 5 10-5M2 17l10 5 10-5"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  back: '<path d="M15 18l-6-6 6-6"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>'
};
function ic(name, size) {
  return '<svg width="' + (size || 28) + '" height="' + (size || 28) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[name] + '</svg>';
}
const PLAY_SVG = '<svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg>';
const PAUSE_SVG = '<svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="4.5" width="4" height="15" rx="1"/><rect x="14" y="4.5" width="4" height="15" rx="1"/></svg>';

function iniciais(n) { return String(n || '?').replace(/[^\p{L}\p{N} ]/gu, '').trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?'; }

/* Logo de canal com reserva (iniciais coloridas) quando a imagem falha */
function logoHTML(item, cls) {
  const img = item.logo ? '<img src="' + esc(item.logo) + '" alt="" loading="lazy" style="position:absolute;left:0;top:0" onerror="this.remove()">' : '';
  return '<div class="' + cls + '" style="position:relative;background:' + corDe(item.name) + '">' + esc(iniciais(item.name)) + img + '</div>';
}
function posterHTML(item, sel, extra) {
  const img = item.logo ? '<img src="' + esc(item.logo) + '" alt="" loading="lazy" onload="this.parentNode.classList.add(\'temimg\')" onerror="this.remove()">' : '';
  return '<div class="poster' + (sel ? ' sel' : '') + '" style="background:' + corDe(item.name) + '">' + img +
    '<span class="pt">' + esc(item.name) + '</span>' + (extra || '') + '</div>';
}
function clockHTML() {
  const d = new Date();
  return '<div class="clockbox"><div class="clock">' + hhmm(d) + '</div><div class="date">' + fmtDate(d) + '</div></div>';
}
function expInfo(list) {
  if (!list || !list.exp) return { txt: 'Sem data de vencimento', dias: null };
  const dias = Math.ceil((list.exp - Date.now()) / 864e5);
  const data = fmtDateFull(new Date(list.exp));
  if (dias < 0) return { txt: 'Venceu em ' + data, dias };
  if (dias === 0) return { txt: 'Vence hoje', dias };
  return { txt: 'Vence em ' + dias + ' dia' + (dias > 1 ? 's' : '') + ' (' + data + ')', dias };
}
function cfgOf(list) {
  return list.type === 'm3u' ? { type: 'm3u', url: list.url } : { type: 'xtream', server: list.server, user: list.user, pass: list.pass };
}
function isKids() { const p = Store.profile(); return !!(p && p.kids); }
function kidsFilterCats(cats) { return isKids() ? cats.filter(c => KIDS_RE.test(c.name)) : cats; }
function semAcento(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }

/* Redesenha mantendo o foco no mesmo elemento (telas com navegação livre) */
function renderKeep(root, html) {
  const on = root.querySelector('.f.on');
  const id = on && on.dataset.id;
  root.innerHTML = html;
  const el = id && root.querySelector('[data-id="' + id + '"]');
  if (el) Spatial.focus(el); else Spatial.first(root);
}
function spatialKey(root, k) {
  if (k === 'up' || k === 'down' || k === 'left' || k === 'right') { Spatial.move(root, k); return true; }
  if (k === 'ok') { Spatial.activate(root); return true; }
  return false;
}

/* ---------- Avisos ---------- */
const UI = {
  t: 0,
  toast(msg, ms) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(this.t);
    this.t = setTimeout(() => el.classList.remove('show'), ms || 2600);
  }
};

/* ---------- Controle das telas ---------- */
const Screens = {};
const Ov = {};
const App = {
  stack: [], cur: null, ov: null,
  show(s) {
    this.cur = s;
    this.closeOv();
    if (s.enter) s.enter(); else s.render();
  },
  go(name, p) {
    if (this.cur && this.cur.leave) this.cur.leave();
    if (this.cur) this.stack.push(this.cur);
    this.show(Screens[name](p || {}));
  },
  replace(name, p) {
    if (this.cur && this.cur.leave) this.cur.leave();
    this.show(Screens[name](p || {}));
  },
  reset(name, p) {
    if (this.cur && this.cur.leave) this.cur.leave();
    this.stack = [];
    this.show(Screens[name](p || {}));
  },
  /* volta para a TV ao Vivo e abre outra tela por cima (Voltar retorna à TV) */
  fromHome(name, p) {
    if (this.cur && this.cur.leave) this.cur.leave();
    this.stack = [Screens.live({ lazy: true })];
    this.show(Screens[name](p || {}));
  },
  back() {
    const prev = this.stack.pop();
    if (!prev) return false;
    if (this.cur && this.cur.leave) this.cur.leave();
    this.cur = prev;
    this.closeOv();
    if (prev.resume) prev.resume(); else if (prev.enter) prev.enter(); else prev.render();
    return true;
  },
  openOv(o) { this.ov = o; o.render(); },
  closeOv() { this.ov = null; const el = $('#ov'); if (el) el.innerHTML = ''; },
  key(k) {
    if (this.ov) { this.ov.key(k); return; }
    if (this.cur) this.cur.key(k);
  },
  act(name, el) {
    const t = this.ov || this.cur;
    if (t && t.act) t.act(name, el.dataset, el);
  }
};

function exitApp() {
  try {
    if (window.webOS && window.webOS.platformBack) window.webOS.platformBack();
    else if (window.MyHouseAndroid) window.MyHouseAndroid.sair();
    else window.close();
  } catch (e) { /* ignora */ }
}

/* ======================= LOGIN DA LISTA ======================= */
Screens.login = (p) => {
  const S = { tab: p.aba || 'x', name: 'Minha lista', server: p.servidor || SERVIDOR_PADRAO, user: p.usuario || '', pass: '', url: '', err: p.erro || '', busy: false };
  const root = () => $('#screen');
  const self = {
    render() {
      Video.el.className = 'v-hidden';
      const x = S.tab === 'x';
      const campos = x ?
        '<label class="fld" style="grid-column:span 2">Nome da lista (como vai aparecer)<input class="f" data-id="name" data-bind="name" value="' + esc(S.name) + '" autocomplete="off" spellcheck="false"></label>' +
        '<label class="fld" style="grid-column:span 2">Endereço do servidor (URL)<input class="f" data-id="server" data-bind="server" value="' + esc(S.server) + '" autocomplete="off" autocapitalize="off" spellcheck="false"></label>' +
        '<label class="fld">Usuário<input class="f" data-id="user" data-first="1" data-bind="user" inputmode="numeric" value="' + esc(S.user) + '" autocomplete="off" autocapitalize="off" spellcheck="false"></label>' +
        '<label class="fld">Senha<input class="f" type="password" data-id="pass" data-bind="pass" inputmode="numeric" value="' + esc(S.pass) + '" autocomplete="off"></label>'
        :
        '<label class="fld" style="grid-column:span 2">Nome da lista (como vai aparecer)<input class="f" data-id="name" data-bind="name" value="' + esc(S.name) + '" autocomplete="off" spellcheck="false"></label>' +
        '<label class="fld" style="grid-column:span 2">Link da lista M3U<input class="f" data-id="url" data-first="1" data-bind="url" value="' + esc(S.url) + '" placeholder="http://..." autocomplete="off" autocapitalize="off" spellcheck="false"></label>';
      renderKeep(root(),
        '<div class="bg-cinema"></div><div style="position:absolute;top: 0; right: 0; bottom: 0; left: 0;background:rgba(4,6,10,.6)"></div>' +
        '<div style="position:absolute;top: 0; right: 0; bottom: 0; left: 0;padding:64px 110px;display:flex;flex-direction:column;gap:40px">' +
        '<div class="row" style="justify-content:space-between"><div class="logo-box"><div class="logo-mark"></div><span class="sora" style="font-size:3.8rem;font-weight:700">MY HOUSE</span></div>' +
        (p.canBack ? '<span class="muted" style="font-size:2rem">Voltar: cancelar</span>' : '') + '</div>' +
        '<div style="display:flex;gap:56px;flex-grow:1;min-height:0">' +
        '<div style="flex:1.35 1 0;min-width:0;display:flex;flex-direction:column;gap:24px">' +
        '<h1 class="sora" style="font-size:5.6rem;letter-spacing:-1px">Vamos conectar sua lista</h1>' +
        '<p class="sub" style="margin:0;font-size:2.6rem">Use os dados que o seu fornecedor enviou.</p>' +
        '<div class="row" style="gap:14px">' +
        '<button class="btn f' + (x ? ' pri' : '') + '" data-id="tx" data-act="tab" data-v="x">Usuário e senha (Xtream)</button>' +
        '<button class="btn f' + (!x ? ' pri' : '') + '" data-id="tm" data-act="tab" data-v="m">Link M3U</button></div>' +
        '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px 28px">' + campos + '</div>' +
        (S.err ? '<div class="erro">' + esc(S.err) + '</div>' : '') +
        '<div class="row" style="gap:20px"><button class="btn pri f" data-id="go" data-act="go">' + (S.busy ? 'Conectando…' : 'Conectar e testar') + '</button>' +
        '<span class="muted" style="font-size:2.1rem">Vamos verificar o acesso e mostrar o vencimento.</span></div>' +
        '</div>' +
        '<div style="flex:1 1 0;min-width:0;display:flex;flex-direction:column;gap:24px;padding-top:150px">' +
        '<div class="card" style="display:flex;flex-direction:column;gap:18px"><span class="sora" style="font-size:2.8rem;font-weight:600">Onde encontro esses dados?</span>' +
        '<div class="sub" style="font-size:2.2rem;line-height:1.5"><b class="acc">URL</b> às vezes vem como “Host”, “DNS” ou “Servidor”.<br><b class="acc">Username</b> é o seu usuário.<br><b class="acc">Password</b> é a sua senha.<br><b class="acc">M3U</b> é um link único que já traz tudo.</div></div>' +
        (NO_ANDROID && window.MYHOUSE_ANDROID.ip
          ? '<div class="card" style="display:flex;flex-direction:column;gap:12px;color:#F2C46B;background:#1F1A0F;border-color:#4A3A1F"><span class="sora" style="font-size:2.6rem;font-weight:600">Mais fácil: envie pelo celular ou PC</span>' +
            '<span class="sub" style="font-size:2.1rem;line-height:1.5">Na mesma rede Wi-Fi, abra no navegador:<br><b style="color:#fff;font-size:2.5rem">http://' + esc(window.MYHOUSE_ANDROID.ip) + ':8787/enviar</b><br>e use o código <b style="color:#fff;font-size:2.5rem;letter-spacing:4px">' + esc(window.MYHOUSE_ANDROID.codigo) + '</b></span></div>'
          : '<div class="card" style="font-size:2.1rem;color:#9FE0BF;background:#0F1A15;border-color:#1F4A35">Seus dados ficam guardados só nesta TV.</div>') +
        '<div class="hint"><span><span class="k">' + TK.ok + '</span>' + (NO_PC ? 'escrever no campo' : 'abrir o teclado') + '</span><span><span class="k">▲▼</span>trocar de campo</span></div>' +
        '</div></div></div>');
    },
    bind(k, v) { S[k] = v; },
    async act(name, d) {
      if (name === 'tab') { S.tab = d.v; S.err = ''; self.render(); return; }
      if (name !== 'go' || S.busy) return;
      let cfg;
      if (S.tab === 'x') {
        let srv = S.server.trim();
        if (srv && !/^https?:\/\//i.test(srv)) srv = 'http://' + srv;
        if (!srv || srv === 'http://' || !S.user.trim() || !S.pass) { S.err = 'Preencha o servidor, o usuário e a senha.'; self.render(); return; }
        cfg = { type: 'xtream', server: normalizaServidor(srv), user: S.user.trim(), pass: S.pass };
      } else {
        if (!/^https?:\/\/.+/i.test(S.url.trim())) { S.err = 'Cole o link completo da lista M3U (começa com http).'; self.render(); return; }
        cfg = { type: 'm3u', url: S.url.trim() };
      }
      S.busy = true; S.err = ''; self.render();
      try {
        let info;
        if (cfg.type === 'xtream') {
          const r = await loginComReservas(cfg.server, cfg.user, cfg.pass, normalizaServidor(cfg.server) === SERVIDOR_PADRAO ? null : []);
          cfg = r.cfg; info = r.info;
        } else { Api.set(cfg); info = await Api.login(); }
        const list = Object.assign({ id: uid(), name: S.name.trim() || 'Minha lista', exp: info.exp, status: info.status, maxConn: info.maxConn }, cfg);
        Store.d.lists.push(list);
        Store.d.activeList = list.id;
        Store.save();
        UI.toast('Lista conectada! ' + expInfo(list).txt);
        if (!Store.d.profiles.length) App.reset('perfis', { criar: true });
        else App.reset('perfis');
      } catch (e) {
        S.busy = false; S.err = e.message || 'Não foi possível conectar';
        const l = Store.list(); if (l) Api.set(cfgOf(l));
        self.render();
      }
    },
    key(k) {
      if (k === 'back') { if (p.canBack) App.back(); return; }
      spatialKey(root(), k);
    }
  };
  return self;
};

/* ======================= PERFIS ======================= */
Screens.perfis = (p) => {
  const root = () => $('#screen');
  const self = {
    enter() {
      self.render();
      if (p.criar && !Store.d.profiles.length) App.openOv(Ov.perfilForm(() => self.render(), true));
    },
    render() {
      Video.el.className = 'v-hidden';
      const list = Store.list();
      const cards = Store.d.profiles.map(pr =>
        '<div class="perfil f" data-id="p' + pr.id + '" data-act="pick" data-v="' + pr.id + '"' + (pr.id === Store.d.activeProfile ? ' data-first="1"' : '') + '>' +
        '<div class="avatar" style="background:' + pr.color + '">' + esc(iniciais(pr.name).slice(0, 1)) + '</div>' +
        '<span class="nome">' + esc(pr.name) + '</span>' +
        (pr.kids ? '<span class="badge" style="border-color:#2E8B5F;color:#9FE0BF">Infantil</span>' : '') + '</div>').join('');
      renderKeep(root(),
        '<div style="position:absolute;top: 0; right: 0; bottom: 0; left: 0;padding:72px 120px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:72px">' +
        '<div style="display:flex;flex-direction:column;align-items:center;gap:16px"><h1 class="sora" style="font-size:7.2rem;letter-spacing:-1.5px">Quem vai assistir?</h1>' +
        '<p class="muted" style="margin:0;font-size:2.6rem">Cada perfil tem seus favoritos e o seu “continuar assistindo”.</p></div>' +
        '<div class="row" style="gap:56px;align-items:flex-start">' + cards +
        '<div class="perfil f" data-id="novo" data-act="novo"><div class="avatar novo">+</div><span class="nome">Novo perfil</span></div></div>' +
        (list ? '<div class="row" style="gap:28px;padding:20px 32px;border-radius:18px;background:var(--card);border:1px solid var(--line);font-size:2.2rem;color:var(--sub)">' +
          '<span class="row" style="gap:10px"><span class="playing-dot"></span>' + esc(list.name) + ' conectada</span><span>' + esc(expInfo(list).txt) + '</span></div>' : '') +
        '</div>');
    },
    act(name, d) {
      if (name === 'pick') {
        Store.d.activeProfile = d.v; Store.save(); Pais.bloquear();
        App.reset('live');
      } else if (name === 'novo') {
        App.openOv(Ov.perfilForm(() => self.render(), false));
      }
    },
    key(k) {
      if (k === 'back') { if (!App.back() && Store.profile()) App.reset('live'); return; }
      spatialKey(root(), k);
    }
  };
  return self;
};

/* Janela: criar perfil */
Ov.perfilForm = (done, obrigatorio) => {
  const F = { name: '', kids: false, err: '' };
  const root = () => $('#ov');
  const self = {
    render() {
      renderKeep(root(),
        '<div class="modal-dim"><div class="modal">' +
        '<h2>' + (obrigatorio ? 'Como você se chama?' : 'Novo perfil') + '</h2>' +
        '<label class="fld">Nome do perfil<input class="f" data-id="n" data-first="1" data-bind="name" value="' + esc(F.name) + '" autocomplete="off" spellcheck="false"></label>' +
        '<div class="linha f" data-id="k" data-act="kids"><div><div style="font-size:2.3rem;font-weight:600">Perfil infantil</div><div class="muted" style="font-size:1.8rem">Mostra só categorias infantis</div></div><span class="toggle' + (F.kids ? ' ligado' : '') + '"></span></div>' +
        (F.err ? '<div class="erro">' + esc(F.err) + '</div>' : '') +
        '<div class="row" style="gap:16px"><button class="btn pri f" data-id="ok" data-act="criar">Criar perfil</button>' +
        (obrigatorio ? '' : '<button class="btn f" data-id="c" data-act="cancelar">Cancelar</button>') + '</div>' +
        '</div></div>');
    },
    bind(k, v) { F[k] = v; },
    act(name) {
      if (name === 'kids') { F.kids = !F.kids; self.render(); return; }
      if (name === 'cancelar') { App.closeOv(); return; }
      if (name === 'criar') {
        const nome = F.name.trim();
        if (!nome) { F.err = 'Digite um nome para o perfil.'; self.render(); return; }
        const pr = { id: uid(), name: nome.slice(0, 20), kids: F.kids, color: AV_CORES[Store.d.profiles.length % AV_CORES.length], layout: null };
        Store.d.profiles.push(pr);
        if (!Store.d.activeProfile) Store.d.activeProfile = pr.id;
        Store.save();
        App.closeOv();
        done();
      }
    },
    key(k) {
      if (k === 'back') { if (!obrigatorio) App.closeOv(); return; }
      spatialKey(root(), k);
    }
  };
  return self;
};

/* Janela de escolha simples (ex.: continuar de onde parou) */
Ov.choice = (titulo, texto, opcoes) => {
  const root = () => $('#ov');
  return {
    render() {
      renderKeep(root(), '<div class="modal-dim"><div class="modal"><h2>' + esc(titulo) + '</h2>' +
        (texto ? '<p class="sub" style="margin:0;font-size:2.3rem">' + esc(texto) + '</p>' : '') +
        '<div style="display:flex;flex-direction:column;gap:14px">' +
        opcoes.map((o, i) => '<button class="btn f' + (i === 0 ? ' pri' : '') + '" data-id="o' + i + '" data-act="o" data-v="' + i + '" style="justify-content:center">' + esc(o[0]) + '</button>').join('') +
        '</div></div></div>');
    },
    act(n, d) { const o = opcoes[Number(d.v)]; App.closeOv(); if (o && o[1]) o[1](); },
    key(k) { if (k === 'back') { App.closeOv(); return; } spatialKey(root(), k); }
  };
};

/* Menu lateral */
Ov.menu = (atual) => {
  const itens = [
    ['live', 'TV ao Vivo', 'tv'], ['vod', 'Filmes', 'film'], ['series', 'Séries', 'series'],
    ['fav', 'Favoritos', 'heart'], ['search', 'Buscar', 'search'], ['ajustes', 'Ajustes', 'gear'], ['perfis', 'Trocar perfil', 'user']
  ];
  let idx = Math.max(0, itens.findIndex(x => x[0] === atual));
  const self = {
    render() {
      const pr = Store.profile() || { name: '', color: '#3B6FD8' };
      const ex = expInfo(Store.list());
      $('#ov').innerHTML = '<div class="menu-dim"></div><nav class="menu">' +
        '<div class="logo-box" style="padding:0 18px 36px"><div class="logo-mark"></div><span class="sora" style="font-size:3.4rem;font-weight:700">MY HOUSE</span></div>' +
        itens.map((it, i) => '<div class="mi' + (it[0] === atual ? ' atual' : '') + (i === idx ? ' on' : '') + '" data-act="go" data-v="' + i + '">' + ic(it[2], 32) + '<span>' + it[1] + '</span></div>').join('') +
        '<div class="grow"></div>' +
        '<div class="row" style="gap:18px;padding:18px 22px;border-radius:18px;background:var(--card);border:1px solid var(--line)">' +
        '<div style="width:56px;height:56px;border-radius:16px;background:' + pr.color + ';display:flex;align-items:center;justify-content:center;font:700 2.6rem Sora">' + esc(iniciais(pr.name).slice(0, 1)) + '</div>' +
        '<div style="display:flex;flex-direction:column;gap:4px"><span style="font-size:2.4rem;font-weight:600">' + esc(pr.name) + '</span>' +
        '<span style="font-size:1.8rem;color:' + (ex.dias !== null && ex.dias <= 7 ? '#F6CF7E' : 'var(--mut)') + '">' + esc(ex.txt) + '</span></div></div>' +
        '</nav>';
    },
    act(n, d) { idx = Number(d.v); self.go(); },
    go() {
      const k = itens[idx][0];
      App.closeOv();
      if (k === atual && k !== 'fav') return;
      if (k === 'live') { if (App.cur && App.cur.isLive) return; if (!App.back() || !(App.cur && App.cur.isLive)) App.reset('live'); }
      else if (k === 'vod' || k === 'series') App.fromHome('browse', { kind: k });
      else if (k === 'fav') { if (App.cur && App.cur.isLive) App.cur.gotoCat('__fav'); else App.reset('live', { cat: '__fav' }); }
      else if (k === 'search') App.openOv(Ov.search(atual === 'vod' || atual === 'series' ? atual : 'live'));
      else if (k === 'ajustes') App.go('ajustes');
      else if (k === 'perfis') App.reset('perfis');
    },
    key(k) {
      if (k === 'up') { idx = (idx + itens.length - 1) % itens.length; self.render(); }
      else if (k === 'down') { idx = (idx + 1) % itens.length; self.render(); }
      else if (k === 'ok') self.go();
      else if (k === 'right' || k === 'back' || k === 'left') App.closeOv();
    }
  };
  return self;
};

/* Lista para escolher categoria */
Ov.cats = (cats, atual, onPick, titulo) => {
  let idx = atual;
  const N = 11;
  const self = {
    render() {
      const start = Math.max(0, Math.min(idx - Math.floor(N / 2), cats.length - N));
      const vis = cats.slice(start, start + N);
      $('#ov').innerHTML = '<div class="menu-dim"></div><div class="sheet"><h2>' + esc(titulo || 'Categorias') + '</h2>' +
        '<div class="muted" style="font-size:1.9rem">' + (idx + 1) + ' de ' + cats.length + ' · ▲▼ escolher · ' + TK.ok + ' abrir</div>' +
        vis.map((c, i) => {
          const j = start + i;
          return '<div class="opt' + (j === atual ? ' sel' : '') + (j === idx ? ' on' : '') + '" data-act="pick" data-v="' + j + '"><span class="clip">' + esc(c.name) + '</span></div>';
        }).join('') + '</div>';
    },
    act(n, d) { idx = Number(d.v); App.closeOv(); onPick(idx); },
    key(k) {
      if (k === 'up') idx = Math.max(0, idx - 1);
      else if (k === 'down') idx = Math.min(cats.length - 1, idx + 1);
      else if (k === 'chup' || k === 'left') idx = Math.max(0, idx - N);
      else if (k === 'chdown' || k === 'right') idx = Math.min(cats.length - 1, idx + N);
      else if (k === 'ok') { App.closeOv(); onPick(idx); return; }
      else if (k === 'back' || k === 'yellow') { App.closeOv(); return; }
      self.render();
    }
  };
  return self;
};

/* Busca */
Ov.search = (kindIni) => {
  const S = { kind: kindIni, q: '', res: [], loading: false, t: 0, err: '' };
  const nomes = { live: 'Canais', vod: 'Filmes', series: 'Séries' };
  const root = () => $('#ov');
  async function buscar() {
    const q = semAcento(S.q.trim());
    if (q.length < 2) { S.res = []; S.err = ''; lista(); return; }
    S.loading = true; lista();
    try {
      await Api.cats(S.kind);
      let all = Pais.filtrar(S.kind, await Api.items(S.kind));
      if (isKids()) {
        const ok = {}; kidsFilterCats(await Api.cats(S.kind)).forEach(c => { ok[c.id] = 1; });
        all = all.filter(x => ok[x.cat]);
      }
      const r = [];
      for (let i = 0; i < all.length && r.length < 12; i++) if (semAcento(all[i].name).indexOf(q) >= 0) r.push(all[i]);
      S.res = r; S.err = '';
    } catch (e) { S.err = e.message; S.res = []; }
    S.loading = false; lista();
  }
  function lista() {
    const box = $('#sres'); if (!box) return;
    const on = box.querySelector('.f.on'); const keep = on && on.dataset.id;
    box.innerHTML = S.loading ? '<div class="spinner"></div>' :
      S.err ? '<div class="erro">' + esc(S.err) + '</div>' :
      !S.res.length ? '<div class="muted" style="font-size:2.2rem;padding:20px">' + (S.q.trim().length < 2 ? 'Digite pelo menos 2 letras.' : 'Nada encontrado.') + '</div>' :
      S.res.map((it, i) => '<div class="opt f" data-id="r' + i + '" data-act="abrir" data-v="' + i + '"><span class="clip">' + esc(it.name) + '</span>' + (it.num && S.kind === 'live' ? '<span class="muted">' + it.num + '</span>' : '') + '</div>').join('');
    if (keep) { const el = box.querySelector('[data-id="' + keep + '"]'); if (el) Spatial.focus(el); }
  }
  const self = {
    render() {
      renderKeep(root(), '<div class="menu-dim"></div><div class="sheet" style="width:900px">' +
        '<h2>Buscar</h2>' +
        '<div class="row" style="gap:12px">' + Object.keys(nomes).map(k => '<span class="chip f' + (k === S.kind ? ' sel' : '') + '" data-id="t' + k + '" data-act="kind" data-v="' + k + '">' + nomes[k] + '</span>').join('') + '</div>' +
        '<label class="fld">O que você procura?<input class="f" data-id="q" data-first="1" data-bind="q" value="' + esc(S.q) + '" autocomplete="off" spellcheck="false" placeholder="Nome do canal, filme ou série"></label>' +
        '<div id="sres" style="display:flex;flex-direction:column;gap:6px;overflow:hidden"></div></div>');
      lista();
    },
    bind(k, v) { S.q = v; clearTimeout(S.t); S.t = setTimeout(buscar, 350); },
    act(n, d) {
      if (n === 'kind') { S.kind = d.v; self.render(); buscar(); return; }
      if (n === 'abrir') {
        const it = S.res[Number(d.v)]; if (!it) return;
        App.closeOv();
        abrirItem(it);
      }
    },
    key(k) {
      if (k === 'back') { App.closeOv(); return; }
      spatialKey(root(), k);
    }
  };
  return self;
};

/* Abre qualquer item (canal, filme, série) a partir da busca ou dos favoritos */
function abrirItem(it) {
  if (it.kind === 'live') {
    if (App.cur && App.cur.isLive) App.cur.playItem(it);
    else App.reset('live', { play: it });
  } else if (it.kind === 'vod') abrirFilme(it);
  else if (it.kind === 'series') {
    if (it.url) App.go('player', { kind: 'vod', item: it, url: it.url, start: 0, title: it.name });
    else App.go('serie', { item: it });
  }
}
function abrirFilme(it) {
  const pr = Store.getProgress('vod', it.id);
  const tocar = (start) => App.go('player', { kind: 'vod', item: it, url: Api.vodUrl(it), start, title: it.name });
  if (pr && pr.pos > 30 && pr.dur && !quaseNoFim(pr.pos, pr.dur)) {
    App.openOv(Ov.choice(it.name, 'Você parou em ' + fmtTime(pr.pos) + ' de ' + fmtTime(pr.dur) + '.',
      [['Continuar de ' + fmtTime(pr.pos), () => tocar(pr.pos)], ['Assistir do início', () => tocar(0)]]));
  } else tocar(0);
}

/* ======================= INÍCIO DO APP ======================= */
function applyText() {
  const t = Store.d.settings.text;
  const c = document.documentElement.classList;
  c.remove('t-grande', 't-extra');
  if (t === 'grande') c.add('t-grande'); else if (t === 'extra') c.add('t-extra');
}
function scaleStage() {
  const s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
  $('#stage').style.transform = 'scale(' + s + ')';
}

/* Primeiro acesso: se o app veio com o arquivo lista-config.json preenchido, conecta sozinho */
function lerConfig() {
  return new Promise(res => {
    try {
      const x = new XMLHttpRequest();
      x.open('GET', 'lista-config.json?' + Date.now(), true);
      x.onload = () => { try { res(JSON.parse(x.responseText)); } catch (e) { res(null); } };
      x.onerror = () => res(null);
      x.send();
    } catch (e) { res(null); }
  });
}
async function configInicial() {
  const c = await lerConfig();
  /* link M3U no arquivo: entra por ele */
  if (c && c.m3u && /^https?:\/\//i.test(String(c.m3u).trim())) {
    $('#screen').innerHTML = '<div class="bg-cinema"></div><div style="position:absolute;top:0;right:0;bottom:0;left:0;display:flex;flex-direction:column;align-items:center;justify-content:center"><div class="spinner"></div><div class="empty">Baixando a sua lista M3U… (listas grandes podem levar até 1 minuto)</div></div>';
    const cfgM = { type: 'm3u', url: String(c.m3u).trim() };
    try {
      Api.set(cfgM);
      const info = await Api.login();
      const list = Object.assign({ id: uid(), name: c.nome || 'Minha lista', exp: info.exp, status: info.status, maxConn: null }, cfgM);
      Store.d.lists.push(list); Store.d.activeList = list.id; Store.save();
      UI.toast('Lista M3U conectada!', 4000);
      App.reset('perfis', { criar: !Store.d.profiles.length });
    } catch (e) {
      App.reset('login', { aba: 'm', erro: (e.message || 'Não foi possível abrir a lista') + ' (link M3U do arquivo lista-config.json)' });
    }
    return;
  }
  const tem = c && c.usuario && c.senha && c.servidor;
  if (!tem) { App.reset('login', c && c.servidor ? { servidor: c.servidor, usuario: c.usuario || '' } : {}); return; }
  $('#screen').innerHTML = '<div class="bg-cinema"></div><div style="position:absolute;top:0;right:0;bottom:0;left:0;display:flex;flex-direction:column;align-items:center;justify-content:center"><div class="spinner"></div><div class="empty">Conectando à sua lista…</div></div>';
  let cfg = { type: 'xtream', server: normalizaServidor(c.servidor), user: String(c.usuario).trim(), pass: String(c.senha) };
  try {
    const r = await loginComReservas(cfg.server, cfg.user, cfg.pass, Array.isArray(c.reservas) ? c.reservas : null);
    cfg = r.cfg; const info = r.info;
    const list = Object.assign({ id: uid(), name: c.nome || 'Minha lista', exp: info.exp, status: info.status, maxConn: info.maxConn }, cfg);
    Store.d.lists.push(list); Store.d.activeList = list.id; Store.save();
    UI.toast('Lista conectada! ' + expInfo(list).txt, 4000);
    App.reset('perfis', { criar: !Store.d.profiles.length });
  } catch (e) {
    App.reset('login', { servidor: cfg.server, usuario: cfg.user, erro: (e.message || 'Não foi possível conectar') + ' (dados do arquivo lista-config.json)' });
  }
}

function boot() {
  Store.load();
  applyText();
  scaleStage();
  window.addEventListener('resize', scaleStage);
  Compat.init();
  Video.init();

  document.addEventListener('keydown', e => {
    const k = keyName(e);
    const typing = document.activeElement && document.activeElement.tagName === 'INPUT';
    if (typing) {
      if (k === 'ok' || k === 'down' || k === 'up' || k === 'back') {
        e.preventDefault();
        document.activeElement.blur();
        if (k === 'up') App.key('up'); else if (k !== 'back') App.key('down');
      }
      return;
    }
    if (!k) return;
    e.preventDefault();
    App.key(k);
  });
  document.addEventListener('input', e => {
    const b = e.target.dataset && e.target.dataset.bind;
    const t = App.ov || App.cur;
    if (b && t && t.bind) t.bind(b, e.target.value);
  });
  document.addEventListener('click', e => {
    const el = e.target.closest && e.target.closest('[data-act]');
    if (el) { if (el.classList.contains('f')) Spatial.focus(el); App.act(el.dataset.act, el); }
  });
  /* webOS: app minimizado/voltou */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { Pais.bloquear(); if (App.cur && App.cur.pause) App.cur.pause(); }
    else if (App.cur && App.cur.unpause) App.cur.unpause();
  });
  setInterval(() => {
    $$('.clock').forEach(el => { el.textContent = hhmm(new Date()); });
    if (App.cur && App.cur.tick) App.cur.tick();
  }, 20000);

  const list = Store.list();
  if (!list) { configInicial(); return; }
  Api.set(cfgOf(list));
  /* atualiza vencimento e formatos permitidos em segundo plano */
  Api.login().then(info => { list.exp = info.exp; list.status = info.status; Store.save(); }).catch(() => { /* sem internet: segue com o que tem */ });
  if (!Store.d.profiles.length) App.reset('perfis', { criar: true });
  else if (Store.d.profiles.length > 1 || !Store.profile()) App.reset('perfis');
  else App.reset('live');
}

window.addEventListener('load', boot);
