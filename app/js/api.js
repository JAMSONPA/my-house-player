/* MY HOUSE — acesso à lista (Xtream Codes e M3U) */
'use strict';

/* No computador (servidor-pc.js) os pedidos à lista passam pela ponte local; na TV vão direto */
function viaPonte(u) { return window.MYHOUSE_PONTE ? window.MYHOUSE_PONTE + encodeURIComponent(u) : u; }

const Api = {
  cfg: null,
  cache: {},
  formats: ['m3u8', 'ts'],

  set(cfg) { this.cfg = cfg; this.cache = {}; this.m3u = null; },

  base() { return String(this.cfg.server || '').trim().replace(/\/+$/, ''); },

  async fetchText(url, ms) {
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const t = setTimeout(() => ctrl && ctrl.abort(), ms || 25000);
    try {
      const r = await fetch(viaPonte(url), ctrl ? { signal: ctrl.signal } : {});
      if (!r.ok) throw new Error('O servidor respondeu com erro ' + r.status);
      return await r.text();
    } catch (e) {
      if (e.name === 'AbortError') throw new Error('O servidor demorou demais para responder');
      if (e instanceof TypeError) throw new Error('Não foi possível falar com o servidor. Confira o endereço e a internet.');
      throw e;
    } finally { clearTimeout(t); }
  },

  async j(action, extra) {
    const c = this.cfg;
    let url = this.base() + '/player_api.php?username=' + encodeURIComponent(c.user) + '&password=' + encodeURIComponent(c.pass);
    if (action) url += '&action=' + action;
    if (extra) url += '&' + extra;
    const txt = await this.fetchText(url);
    try { return JSON.parse(txt); } catch (e) {
      const ini = textoDaPagina(txt).slice(0, 220);
      throw new Error('Resposta inválida' + (ini ? ': “' + ini + '”' : ' (resposta vazia)'));
    }
  },

  cached(key, fn) {
    if (!this.cache[key]) this.cache[key] = fn().catch(e => { delete this.cache[key]; throw e; });
    return this.cache[key];
  },

  /* ---------- Login / dados da conta ---------- */
  async login() {
    if (this.cfg.type === 'm3u') {
      const data = await this.loadM3U();
      const total = data.live.length + data.vod.length + data.series.length;
      if (!total) throw new Error('A lista M3U não tem canais');
      return { exp: null, status: 'Active', maxConn: null };
    }
    const r = await this.j('');
    if (!r || !r.user_info) throw new Error('Resposta inesperada do servidor');
    if (String(r.user_info.auth) !== '1') throw new Error('Usuário ou senha incorretos');
    const ui = r.user_info;
    if (Array.isArray(ui.allowed_output_formats) && ui.allowed_output_formats.length) this.formats = ui.allowed_output_formats;
    return {
      exp: ui.exp_date ? Number(ui.exp_date) * 1000 : null,
      status: ui.status || '',
      maxConn: ui.max_connections || null
    };
  },

  /* ---------- M3U ---------- */
  async loadM3U() {
    if (this.m3u) return this.m3u;
    const txt = await this.fetchText(this.cfg.url, 120000);
    if (!/#EXTM3U|#EXTINF/i.test(txt.slice(0, 5000))) {
      const ini = textoDaPagina(txt).slice(0, 220);
      throw new Error('O link não devolveu uma lista M3U' + (ini ? ': “' + ini + '”' : ' (resposta vazia)'));
    }
    this.m3u = parseM3U(txt);
    return this.m3u;
  },

  /* ---------- Categorias e itens (formato único para o app) ---------- */
  async cats(kind) {
    return this.cached('cats_' + kind, async () => {
      if (this.cfg.type === 'm3u') {
        const d = await this.loadM3U();
        Pais.registrar(kind, d.cats[kind]);
        return d.cats[kind];
      }
      const act = { live: 'get_live_categories', vod: 'get_vod_categories', series: 'get_series_categories' }[kind];
      const r = await this.j(act);
      const cats = (Array.isArray(r) ? r : []).map(c => ({ id: String(c.category_id), name: c.category_name || 'Sem nome' }));
      Pais.registrar(kind, cats);
      return cats;
    });
  },

  async items(kind, catId) {
    return this.cached('items_' + kind + '_' + (catId || 'all'), async () => {
      if (this.cfg.type === 'm3u') {
        const d = await this.loadM3U();
        return catId ? d[kind].filter(x => x.cat === catId) : d[kind];
      }
      const act = { live: 'get_live_streams', vod: 'get_vod_streams', series: 'get_series' }[kind];
      const r = await this.j(act, catId ? 'category_id=' + encodeURIComponent(catId) : '');
      const arr = Array.isArray(r) ? r : [];
      if (kind === 'live') return arr.map((s, i) => ({
        kind: 'live', id: String(s.stream_id), num: s.num || i + 1, name: s.name || '', logo: s.stream_icon || '',
        cat: String(s.category_id), epgId: s.epg_channel_id || '', archive: Number(s.tv_archive) === 1
      }));
      if (kind === 'vod') return arr.map(s => ({
        kind: 'vod', id: String(s.stream_id), name: s.name || '', logo: s.stream_icon || '', cat: String(s.category_id),
        ext: s.container_extension || 'mp4', rating: s.rating || '', added: Number(s.added) || 0
      }));
      return arr.map(s => ({
        kind: 'series', id: String(s.series_id), name: s.name || '', logo: s.cover || '', cat: String(s.category_id),
        plot: s.plot || '', year: (s.releaseDate || s.release_date || '').slice(0, 4), rating: s.rating || '',
        genre: s.genre || '', backdrop: Array.isArray(s.backdrop_path) ? s.backdrop_path[0] : (s.backdrop_path || '')
      }));
    });
  },

  async vodInfo(id) {
    if (this.cfg.type === 'm3u') return {};
    return this.cached('vodinfo_' + id, async () => {
      const r = await this.j('get_vod_info', 'vod_id=' + encodeURIComponent(id));
      const i = (r && r.info) || {};
      return {
        plot: i.plot || i.description || '', genre: i.genre || '', duration: i.duration || '',
        year: (i.releasedate || i.release_date || '').slice(0, 4), rating: i.rating || '',
        backdrop: Array.isArray(i.backdrop_path) ? i.backdrop_path[0] : (i.backdrop_path || '')
      };
    });
  },

  async seriesInfo(id) {
    return this.cached('serieinfo_' + id, async () => {
      const r = await this.j('get_series_info', 'series_id=' + encodeURIComponent(id));
      const info = (r && r.info) || {};
      const eps = (r && r.episodes) || {};
      const seasons = Object.keys(eps).sort((a, b) => Number(a) - Number(b)).map(sn => ({
        n: sn,
        eps: (eps[sn] || []).map(e => ({
          kind: 'ep', id: String(e.id), num: Number(e.episode_num) || 0, title: e.title || ('Episódio ' + e.episode_num),
          ext: e.container_extension || 'mp4', season: sn,
          dur: (e.info && (e.info.duration_secs || 0)) || 0,
          durTxt: (e.info && e.info.duration) || '',
          img: (e.info && e.info.movie_image) || '', plot: (e.info && e.info.plot) || ''
        })).sort((a, b) => a.num - b.num)
      }));
      return {
        name: info.name || '', plot: info.plot || '', genre: info.genre || '',
        year: (info.releaseDate || info.release_date || '').slice(0, 4), rating: info.rating || '',
        cover: info.cover || '', backdrop: Array.isArray(info.backdrop_path) ? info.backdrop_path[0] : (info.backdrop_path || ''),
        seasons
      };
    });
  },

  /* Guia curto (agora e próximos) */
  async epg(ch) {
    if (this.cfg.type === 'm3u') return [];
    return this.cached('epg_' + ch.id, async () => {
      const r = await this.j('get_short_epg', 'stream_id=' + encodeURIComponent(ch.id) + '&limit=8');
      const l = (r && r.epg_listings) || [];
      return l.map(p => ({
        title: b64(p.title), desc: b64(p.description),
        start: Number(p.start_timestamp) * 1000 || Date.parse(p.start),
        stop: Number(p.stop_timestamp) * 1000 || Date.parse(p.end || p.stop)
      })).filter(p => p.start && p.stop).sort((a, b) => a.start - b.start);
    });
  },

  /* ---------- Endereços de vídeo ---------- */
  liveUrl(ch) {
    if (ch.url) return viaPonte(ch.url);
    const c = this.cfg, ext = this.formats.indexOf('m3u8') >= 0 ? 'm3u8' : 'ts';
    return viaPonte(this.base() + '/live/' + encodeURIComponent(c.user) + '/' + encodeURIComponent(c.pass) + '/' + ch.id + '.' + ext);
  },
  vodUrl(m) {
    if (m.url) return viaPonte(m.url);
    const c = this.cfg;
    return viaPonte(this.base() + '/movie/' + encodeURIComponent(c.user) + '/' + encodeURIComponent(c.pass) + '/' + m.id + '.' + (m.ext || 'mp4'));
  },
  epUrl(ep) {
    if (ep.url) return viaPonte(ep.url);
    const c = this.cfg;
    return viaPonte(this.base() + '/series/' + encodeURIComponent(c.user) + '/' + encodeURIComponent(c.pass) + '/' + ep.id + '.' + (ep.ext || 'mp4'));
  }
};

/* Tira o visual (CSS, scripts, tags) de uma página de erro e deixa só o texto */
function textoDaPagina(html) {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<title[\s\S]*?<\/title>/gi, ' ')
    .replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ').trim();
}

/* Lê uma lista M3U e separa em TV ao vivo, filmes e séries */
function parseM3U(txt) {
  const lines = txt.split(/\r?\n/);
  const out = { live: [], vod: [], series: [], cats: { live: [], vod: [], series: [] } };
  const seen = { live: {}, vod: {}, series: {} };
  let cur = null, n = 0;
  const attr = (s, k) => { const m = s.match(new RegExp(k + '="([^"]*)"', 'i')); return m ? m[1] : ''; };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (/^#EXTINF/i.test(line)) {
      const comma = line.lastIndexOf(',');
      cur = {
        name: comma >= 0 ? line.slice(comma + 1).trim() : 'Sem nome',
        logo: attr(line, 'tvg-logo'), group: attr(line, 'group-title') || 'Outros', epgId: attr(line, 'tvg-id')
      };
    } else if (line[0] !== '#' && cur) {
      let kind = 'live';
      if (/\/movie\//i.test(line) || /\.(mp4|mkv|avi)(\?|$)/i.test(line)) kind = 'vod';
      if (/\/series\//i.test(line)) kind = 'series';
      const cat = cur.group;
      if (!seen[kind][cat]) { seen[kind][cat] = 1; out.cats[kind].push({ id: cat, name: cat }); }
      n++;
      out[kind].push({ kind, id: 'm' + n, num: out[kind].length + 1, name: cur.name, logo: cur.logo, cat, epgId: cur.epgId, url: line, ext: 'mp4' });
      cur = null;
    }
  }
  return out;
}
