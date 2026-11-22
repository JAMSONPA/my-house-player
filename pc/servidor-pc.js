/* MY HOUSE no computador
   Abre o mesmo app da TV no navegador e faz a ponte com o servidor da lista
   (o Chrome do PC bloqueia o app de falar direto com o servidor; na TV isso não acontece).
   Uso: node servidor-pc.js   (ou dois cliques em "MY HOUSE.bat")
   Só aceita conexões deste próprio computador (127.0.0.1). */
'use strict';
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORTA = Number(process.env.MYHOUSE_PORTA || 8787);
const APP = path.resolve(process.env.MYHOUSE_APP || path.join(__dirname, '..', 'app'));
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';
const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8'
};
const PREFIXO = '/p?u=';
const px = u => PREFIXO + encodeURIComponent(u);

/* busca uma URL seguindo redirecionamentos; devolve a resposta e a URL final */
function buscar(url, headers, saltos) {
  return new Promise((ok, falha) => {
    let u;
    try { u = new URL(url); } catch (e) { falha(new Error('endereço inválido')); return; }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') { falha(new Error('protocolo não permitido')); return; }
    const lib = u.protocol === 'https:' ? https : http;
    const req = lib.request(u, { method: 'GET', headers: Object.assign({ 'User-Agent': UA, 'Accept': '*/*' }, headers || {}), timeout: 30000 }, res => {
      if ([301, 302, 303, 307, 308].indexOf(res.statusCode) >= 0 && res.headers.location && (saltos || 0) < 6) {
        res.resume();
        buscar(new URL(res.headers.location, u).toString(), headers, (saltos || 0) + 1).then(ok, falha);
        return;
      }
      ok({ res, final: u.toString() });
    });
    req.on('timeout', () => req.destroy(new Error('tempo esgotado')));
    req.on('error', falha);
    req.end();
  });
}

/* reescreve uma playlist HLS para que segmentos e sub-listas também passem pela ponte */
function reescreverM3U8(texto, base) {
  const abs = s => { try { return new URL(s, base).toString(); } catch (e) { return s; } };
  return texto.split(/\r?\n/).map(linha => {
    const l = linha.trim();
    if (!l) return linha;
    if (l[0] === '#') return linha.replace(/URI="([^"]+)"/g, (m, u) => 'URI="' + px(abs(u)) + '"');
    return px(abs(l));
  }).join('\n');
}

async function ponte(req, res, alvo) {
  try {
    const h = {};
    if (req.headers.range) h.Range = req.headers.range;
    const { res: r, final } = await buscar(alvo, h);
    const tipo = String(r.headers['content-type'] || '');
    const ehM3U8 = /mpegurl/i.test(tipo) || /\.m3u8(\?|$)/i.test(final);
    if (ehM3U8 && r.statusCode < 400) {
      const partes = [];
      r.on('data', c => partes.push(c));
      r.on('end', () => {
        const txt = Buffer.concat(partes).toString('utf8');
        if (/^#EXTM3U/.test(txt.trim()) && /#EXT-X-/.test(txt)) {
          const corpo = reescreverM3U8(txt, final);
          res.writeHead(r.statusCode, { 'Content-Type': 'application/vnd.apple.mpegurl', 'Cache-Control': 'no-cache' });
          res.end(corpo);
        } else {
          res.writeHead(r.statusCode, { 'Content-Type': tipo || 'text/plain' });
          res.end(txt);
        }
      });
      return;
    }
    const out = { 'Cache-Control': 'no-cache' };
    ['content-type', 'content-length', 'content-range', 'accept-ranges', 'last-modified'].forEach(k => { if (r.headers[k]) out[k] = r.headers[k]; });
    res.writeHead(r.statusCode, out);
    r.pipe(res);
    req.on('close', () => r.destroy());
  } catch (e) {
    if (!res.headersSent) res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Ponte do MY HOUSE: não foi possível acessar o servidor da lista (' + e.message + ')');
  }
}

function arquivo(res, rel) {
  const f = path.join(APP, path.normalize(rel).replace(/^(\.\.[\\/])+/, ''));
  if (f.indexOf(APP) !== 0) { res.writeHead(403); res.end(); return; }
  fs.readFile(f, (e, dados) => {
    if (e) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('não encontrado'); return; }
    const ext = path.extname(f).toLowerCase();
    if (ext === '.html' && path.basename(f) === 'index.html') {
      /* avisa o app que está no PC: pedidos à lista passam pela ponte */
      const html = dados.toString('utf8').replace('<head>', '<head>\n<script>window.MYHOUSE_PONTE = ' + JSON.stringify(PREFIXO) + ';</script>');
      res.writeHead(200, { 'Content-Type': TIPOS['.html'], 'Cache-Control': 'no-cache' });
      res.end(html);
      return;
    }
    res.writeHead(200, { 'Content-Type': TIPOS[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(dados);
  });
}

const servidor = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://localhost');
  if (u.pathname === '/p') { ponte(req, res, u.searchParams.get('u') || ''); return; }
  if (u.pathname === '/') { res.writeHead(302, { Location: '/index.html' }); res.end(); return; }
  arquivo(res, decodeURIComponent(u.pathname).replace(/^\/+/, ''));
});

servidor.on('error', e => {
  if (e.code === 'EADDRINUSE') console.log('O MY HOUSE já está aberto (porta ' + PORTA + ' em uso). Use a janela que já está aberta.');
  else console.log('Erro: ' + e.message);
  process.exit(1);
});
servidor.listen(PORTA, '127.0.0.1', () => {
  console.log('MY HOUSE rodando em http://localhost:' + PORTA + '/  (app: ' + APP + ')');
  console.log('Deixe esta janela aberta enquanto assiste. Para sair, feche esta janela.');
});
