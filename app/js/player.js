/* MY HOUSE — motor de vídeo (HLS, MP4, TS) */
'use strict';

const Video = {
  el: null, hls: null, ts: null, url: '', onErr: null,

  init() {
    this.el = $('#v');
    this.el.addEventListener('error', () => this.fail('O vídeo não pôde ser reproduzido'));
  },

  nativeHls() { return !!this.el.canPlayType('application/vnd.apple.mpegurl'); },

  play(url, opts) {
    opts = opts || {};
    this.stop();
    this.url = url;
    this.onErr = opts.onError || null;
    const v = this.el;
    v.muted = !!opts.muted;
    let real = url; try { real = decodeURIComponent(url); } catch (e) { /* ignora */ }
    const isHls = /\.m3u8(\?|$|&)/i.test(real);
    /* No computador o Chrome não toca MPEG-TS (.ts) sozinho: usa o mpegts.js (na TV o próprio aparelho toca) */
    const caminho = real.replace(/^.*?:\/\/[^/]+/, '').split(/[?#&]/)[0];
    const semExt = !/\.[a-z0-9]{2,4}$/i.test(caminho);
    const isTs = /\.ts$/i.test(caminho) || (semExt && !isHls);
    if (isTs && window.MYHOUSE_PONTE && window.mpegts && mpegts.isSupported()) {
      const tp = mpegts.createPlayer({ type: 'mpegts', isLive: true, url: new URL(url, location.href).href }, { enableWorker: true, liveBufferLatencyChasing: true, lazyLoad: false });
      this.ts = tp;
      tp.on(mpegts.Events.ERROR, () => this.fail('Este canal não está respondendo agora'));
      tp.attachMediaElement(v);
      tp.load();
    } else if (isHls && !this.nativeHls() && window.Hls && Hls.isSupported()) {
      const h = new Hls({ enableWorker: true, lowLatencyMode: false, startPosition: opts.start || -1 });
      this.hls = h;
      h.on(Hls.Events.ERROR, (ev, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR && !h._retried) { h._retried = true; h.startLoad(); return; }
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR && !h._recovered) { h._recovered = true; h.recoverMediaError(); return; }
        this.fail('Este canal não está respondendo agora');
      });
      h.loadSource(url);
      h.attachMedia(v);
    } else {
      v.src = url;
      if (opts.start) {
        const once = () => { v.removeEventListener('loadedmetadata', once); try { v.currentTime = opts.start; } catch (e) { /* ignora */ } };
        v.addEventListener('loadedmetadata', once);
      }
    }
    const p = v.play();
    if (p && p.catch) p.catch(() => { /* autoplay bloqueado no PC; na TV toca */ });
  },

  stop() {
    const v = this.el;
    if (this.hls) { try { this.hls.destroy(); } catch (e) { /* ignora */ } this.hls = null; }
    if (this.ts) { try { this.ts.destroy(); } catch (e) { /* ignora */ } this.ts = null; }
    try { v.pause(); } catch (e) { /* ignora */ }
    v.removeAttribute('src');
    try { v.load(); } catch (e) { /* ignora */ }
    this.url = '';
  },

  fail(msg) {
    if (!this.url) return;
    const cb = this.onErr;
    if (cb) cb(msg); else UI.toast(msg);
  },

  toggle() { const v = this.el; if (v.paused) v.play(); else v.pause(); },
  seek(d) {
    const v = this.el;
    if (!isFinite(v.duration)) return;
    v.currentTime = Math.max(0, Math.min(v.duration - 1, v.currentTime + d));
  },

  /* Faixas de áudio e legenda */
  audioTracks() {
    if (this.hls && this.hls.audioTracks && this.hls.audioTracks.length) {
      return { list: this.hls.audioTracks.map(t => t.name || t.lang || 'Faixa'), cur: this.hls.audioTrack };
    }
    const at = this.el.audioTracks;
    if (at && at.length) {
      let cur = 0; const list = [];
      for (let i = 0; i < at.length; i++) { list.push(at[i].label || at[i].language || ('Faixa ' + (i + 1))); if (at[i].enabled) cur = i; }
      return { list, cur };
    }
    return { list: [], cur: -1 };
  },
  nextAudio() {
    const t = this.audioTracks();
    if (t.list.length < 2) return null;
    const n = (t.cur + 1) % t.list.length;
    if (this.hls && this.hls.audioTracks.length) this.hls.audioTrack = n;
    else { const at = this.el.audioTracks; for (let i = 0; i < at.length; i++) at[i].enabled = (i === n); }
    return t.list[n];
  },
  subTracks() {
    if (this.hls && this.hls.subtitleTracks && this.hls.subtitleTracks.length) {
      return { list: this.hls.subtitleTracks.map(t => t.name || t.lang || 'Legenda'), cur: this.hls.subtitleTrack };
    }
    const tt = this.el.textTracks; const list = []; let cur = -1;
    for (let i = 0; tt && i < tt.length; i++) { list.push(tt[i].label || tt[i].language || ('Legenda ' + (i + 1))); if (tt[i].mode === 'showing') cur = i; }
    return { list, cur };
  },
  nextSub() {
    const t = this.subTracks();
    if (!t.list.length) return null;
    const n = t.cur + 1 >= t.list.length ? -1 : t.cur + 1; /* -1 = desligada */
    if (this.hls && this.hls.subtitleTracks.length) { this.hls.subtitleTrack = n; this.hls.subtitleDisplay = n >= 0; }
    else { const tt = this.el.textTracks; for (let i = 0; i < tt.length; i++) tt[i].mode = (i === n ? 'showing' : 'disabled'); }
    return n < 0 ? 'Desligada' : t.list[n];
  }
};
