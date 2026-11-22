/* MY HOUSE — utilitários, armazenamento e teclas do controle */
'use strict';

const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

function esc(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function pad2(n) { return (n < 10 ? '0' : '') + n; }
function hhmm(d) { return pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }
function fmtTime(sec) {
  sec = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return (h ? h + ':' + pad2(m) : m) + ':' + pad2(s);
}
const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
function fmtDate(d) { return DIAS[d.getDay()] + ', ' + pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1); }
function fmtDateFull(d) { return pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + '/' + d.getFullYear(); }

function b64(s) {
  if (!s) return '';
  try {
    const bin = atob(s);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder('utf-8').decode(bytes);
  } catch (e) { return s; }
}

/* já assistiu quase tudo? (fim = últimos 60 s ou 10% do vídeo, o que for menor) */
function quaseNoFim(pos, dur) { return !!dur && pos >= dur - Math.min(60, dur * 0.1); }

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

/* Cor estável a partir de um texto (para capas sem imagem) */
const PALETA = ['#4B3B7A', '#7A5A22', '#22566B', '#8A4A24', '#2E6B4F', '#6B2D47', '#3D5A80', '#6B3A22', '#3F5A2A', '#5A2D4F'];
function corDe(txt) {
  let h = 0; txt = String(txt || '');
  for (let i = 0; i < txt.length; i++) h = (h * 31 + txt.charCodeAt(i)) >>> 0;
  return PALETA[h % PALETA.length];
}

/* ---------- Armazenamento local ---------- */
const Store = {
  KEY: 'jamsonPlayer.v1',
  d: null,
  load() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(this.KEY) || 'null'); } catch (e) { d = null; }
    this.d = Object.assign({
      lists: [], activeList: null,
      profiles: [], activeProfile: null,
      settings: { layout: 'b', text: 'normal' },
      pp: {}
    }, d || {});
    return this.d;
  },
  save() { try { localStorage.setItem(this.KEY, JSON.stringify(this.d)); } catch (e) { /* cheio */ } },
  list() { return this.d.lists.find(l => l.id === this.d.activeList) || null; },
  profile() { return this.d.profiles.find(p => p.id === this.d.activeProfile) || null; },
  /* dados por perfil */
  my() {
    const p = this.profile(); const id = p ? p.id : '_';
    if (!this.d.pp[id]) this.d.pp[id] = { favs: { live: [], vod: [], series: [] }, recent: [], lastCh: [] };
    return this.d.pp[id];
  },
  layout() {
    const p = this.profile();
    return (p && p.layout) || this.d.settings.layout || 'b';
  },
  isFav(kind, id) { return this.my().favs[kind].some(x => String(x.id) === String(id)); },
  /* guarda o item inteiro, para a lista de favoritos abrir sem baixar tudo de novo */
  toggleFav(kind, item) {
    const f = this.my().favs[kind];
    const i = f.findIndex(x => String(x.id) === String(item.id));
    if (i >= 0) f.splice(i, 1);
    else {
      const keep = {};
      ['kind', 'id', 'num', 'name', 'logo', 'cat', 'epgId', 'url', 'ext', 'plot', 'year', 'rating', 'genre', 'backdrop'].forEach(k => { if (item[k] !== undefined && item[k] !== '') keep[k] = item[k]; });
      f.unshift(keep);
    }
    this.save();
    return i < 0;
  },
  /* "continuar assistindo" */
  setProgress(item) {
    const r = this.my().recent;
    const i = r.findIndex(x => x.kind === item.kind && String(x.id) === String(item.id));
    if (i >= 0) r.splice(i, 1);
    r.unshift(Object.assign({ ts: Date.now() }, item));
    if (r.length > 40) r.length = 40;
    this.save();
  },
  getProgress(kind, id) {
    return this.my().recent.find(x => x.kind === kind && String(x.id) === String(id)) || null;
  },
  pushLastChannel(id) {
    const l = this.my().lastCh; id = String(id);
    if (l[0] === id) return;
    l.unshift(id); if (l.length > 2) l.length = 2;
    this.save();
  }
};

/* ---------- Teclas do controle remoto LG (e teclado do PC para testes) ---------- */
const KEYMAP = {
  37: 'left', 38: 'up', 39: 'right', 40: 'down', 13: 'ok',
  461: 'back', 27: 'back', 8: 'back',
  403: 'red', 404: 'green', 405: 'yellow', 406: 'blue',
  415: 'play', 19: 'pause', 413: 'stop', 417: 'ff', 412: 'rew', 10252: 'playpause',
  33: 'chup', 34: 'chdown', 427: 'chup', 428: 'chdown'
};
const PC_COLORS = { r: 'red', g: 'green', y: 'yellow', b: 'blue' };

/* Nomes das teclas nas dicas da tela: no computador mostra o teclado, na TV o controle */
const NO_PC = !!window.MYHOUSE_PONTE;
if (NO_PC) document.documentElement.classList.add('pc');
const TK = NO_PC
  ? { ok: 'Enter', back: 'Esc', red: 'a tecla R', nums: 'números do teclado', aparelho: 'teclado' }
  : { ok: 'OK', back: 'Voltar', red: 'o botão <b style="color:#E04848">vermelho</b>', nums: 'números do controle', aparelho: 'controle' };

function keyName(e) {
  const typing = document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName);
  if (e.keyCode >= 48 && e.keyCode <= 57 && !typing) return 'n' + (e.keyCode - 48);
  if (e.keyCode >= 96 && e.keyCode <= 105 && !typing) return 'n' + (e.keyCode - 96);
  if (typing && (e.keyCode === 8 || e.keyCode === 37 || e.keyCode === 39)) return null; /* edição do texto */
  if (!typing && e.key && PC_COLORS[e.key.toLowerCase()] && !e.ctrlKey) return PC_COLORS[e.key.toLowerCase()];
  return KEYMAP[e.keyCode] || null;
}

/* ---------- Navegação espacial genérica (telas de formulário) ---------- */
const Spatial = {
  items(root) { return $$('.f', root).filter(el => el.offsetParent !== null && !el.disabled); },
  current(root) { return $('.f.on', root); },
  focus(el) {
    if (!el) return;
    $$('.f.on').forEach(x => x.classList.remove('on'));
    el.classList.add('on');
    if (el.scrollIntoView) el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    if (/INPUT|TEXTAREA/.test(document.activeElement.tagName) && document.activeElement !== el) document.activeElement.blur();
  },
  first(root) { const it = this.items(root); const pref = it.find(x => x.dataset.first); this.focus(pref || it[0]); },
  move(root, dir) {
    const cur = this.current(root);
    const it = this.items(root);
    if (!cur) { this.focus(it[0]); return true; }
    const a = cur.getBoundingClientRect();
    const ax = a.left + a.width / 2, ay = a.top + a.height / 2;
    let best = null, bestScore = Infinity;
    it.forEach(el => {
      if (el === cur) return;
      const b = el.getBoundingClientRect();
      const bx = b.left + b.width / 2, by = b.top + b.height / 2;
      let main, side;
      if (dir === 'left') { if (b.right > a.left + 4) return; main = a.left - b.right; side = Math.abs(by - ay); }
      else if (dir === 'right') { if (b.left < a.right - 4) return; main = b.left - a.right; side = Math.abs(by - ay); }
      else if (dir === 'up') { if (b.bottom > a.top + 4) return; main = a.top - b.bottom; side = Math.abs(bx - ax); }
      else { if (b.top < a.bottom - 4) return; main = b.top - a.bottom; side = Math.abs(bx - ax); }
      const score = Math.max(0, main) + side * 2.2;
      if (score < bestScore) { bestScore = score; best = el; }
    });
    if (best) { this.focus(best); return true; }
    return false;
  },
  activate(root) {
    const cur = this.current(root);
    if (!cur) return false;
    if (cur.tagName === 'INPUT') { cur.focus(); return true; }
    cur.click();
    return true;
  }
};
