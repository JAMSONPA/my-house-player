/* Servidor de lista falso (padrão Xtream Codes) para testar o Jamson Player no PC.
   Uso: node mock-server.js  ->  http://localhost:8099/app/index.html
   Login de teste: servidor http://localhost:8099  usuário teste  senha 1234 */
const http = require('http'), fs = require('fs'), path = require('path'), url = require('url');
const PORT = Number(process.env.PORT || 8099);
const APP = path.join(__dirname, '..', 'app');
const MEDIA = path.join(__dirname, 'media');
const USER = 'teste', PASS = '1234';

const now = () => Math.floor(Date.now() / 1000);
const liveCats = ['Esportes', 'Notícias', 'Filmes 24h', 'Infantil', 'Documentários', 'Abertos', 'Música', 'Variedades', 'Adultos +18'];
const nomesCanais = {
  'Esportes': ['Esporte Total', 'Arena Lutas', 'Canal Esportes 1', 'Canal Esportes 2', 'Tênis Total', 'Motor Max', 'Esporte Radical', 'Bola Nacional'],
  'Notícias': ['Notícias 24h', 'Jornal Agora', 'Mundo Hoje', 'Economia TV', 'Notícias Regional'],
  'Filmes 24h': ['Cine Ação', 'Cine Clássicos', 'Cine Comédia', 'Cine Suspense', 'Cine Nacional'],
  'Infantil': ['Kids Mundo', 'Desenhos 24h', 'Turma Infantil', 'Baby TV'],
  'Documentários': ['Documentários BR', 'Natureza Viva', 'História Total'],
  'Abertos': ['Canal Aberto 1', 'Canal Aberto 2', 'Canal Aberto 3', 'Canal Aberto 4', 'Canal Aberto 5'],
  'Música': ['Música Brasil', 'Hits 24h'],
  'Variedades': ['Culinária TV', 'Casa e Estilo', 'Viagem HD'],
  'Adultos +18': ['Canal Proibido A', 'Canal Proibido B']
};
const live = []; let n = 0;
liveCats.forEach((c, ci) => nomesCanais[c].forEach(nm => {
  n++;
  live.push({ num: 100 + n, name: nm, stream_type: 'live', stream_id: 1000 + n, stream_icon: n % 3 === 0 ? 'http://localhost:' + PORT + '/logo-quebrado.png' : '', epg_channel_id: 'ch' + n, category_id: String(ci + 1), tv_archive: 0 });
}));
const progs = ['Jornal da Manhã', 'Futebol: Rodada final ao vivo', 'Resenha', 'Documentário especial', 'Filme da tarde', 'Desenhos', 'Debate', 'Programa de entrevistas', 'Reprise', 'Show ao vivo'];
const vodCats = ['Lançamentos', 'Ação', 'Comédia', 'Nacionais', 'Infantil'];
const vod = [];
['O Último Farol', 'Noite em Recife', 'Maré Alta', 'Sertão Vivo', 'Casa Amarela', 'Pequenos Gigantes', 'A Herdeira', 'Último Round', 'Linha de Frente', 'O Inventor', 'Céu de Vidro', 'Fuga às 3h', 'Rio Abaixo', 'Asfalto', 'Turma do Quintal', 'Ventania', 'O Segredo da Ilha', 'Correnteza', 'Lua de Papel', 'Trilha Norte'].forEach((t, i) => {
  vod.push({ num: i + 1, name: t, stream_type: 'movie', stream_id: 5000 + i, stream_icon: '', rating: (6 + (i % 4)).toFixed(1), added: String(now() - i * 3600), category_id: String((i % vodCats.length) + 1), container_extension: 'mp4' });
});
vod.push({ num: 90, name: 'Filme Proibido Um', stream_type: 'movie', stream_id: 5900, stream_icon: '', rating: '5', added: String(now()), category_id: '6', container_extension: 'mp4' });
const serCats = ['Drama', 'Comédia', 'Infantil'];
const series = ['Rota Norte', 'Família Silva', 'Os Vizinhos', 'Turma do Bairro', 'Cidade Alta', 'Plantão', 'Pequenos Heróis', 'A Fazenda Azul'].map((t, i) => ({
  num: i + 1, name: t, series_id: 7000 + i, cover: '', plot: 'Sinopse de teste da série ' + t + '.', releaseDate: '2025-03-01', rating: '8.1', genre: 'Drama', category_id: String((i % 3) + 1)
}));

function epgFor(id) {
  const base = Math.floor(now() / 1800) * 1800 - 1800;
  const out = [];
  let t = base;
  for (let i = 0; i < 8; i++) {
    const dur = ((id + i) % 3 + 1) * 1800;
    out.push({ title: Buffer.from(progs[(id + i) % progs.length]).toString('base64'), description: Buffer.from('Descrição de teste do programa ' + (i + 1) + '.').toString('base64'), start_timestamp: String(t), stop_timestamp: String(t + dur) });
    t += dur;
  }
  return { epg_listings: out };
}

function json(res, o) { res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }); res.end(JSON.stringify(o)); }
function sendFile(req, res, f, type) {
  fs.stat(f, (e, st) => {
    if (e) { res.writeHead(404, { 'Access-Control-Allow-Origin': '*' }); res.end('nao encontrado'); return; }
    const h = { 'Content-Type': type, 'Access-Control-Allow-Origin': '*', 'Accept-Ranges': 'bytes' };
    const r = req.headers.range && /bytes=(\d*)-(\d*)/.exec(req.headers.range);
    if (r) {
      const s = r[1] ? Number(r[1]) : 0, e2 = r[2] ? Number(r[2]) : st.size - 1;
      h['Content-Range'] = 'bytes ' + s + '-' + e2 + '/' + st.size; h['Content-Length'] = e2 - s + 1;
      res.writeHead(206, h); fs.createReadStream(f, { start: s, end: e2 }).pipe(res);
    } else { h['Content-Length'] = st.size; res.writeHead(200, h); fs.createReadStream(f).pipe(res); }
  });
}
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2', '.ts': 'video/mp2t', '.m3u8': 'application/vnd.apple.mpegurl', '.mp4': 'video/mp4' };

http.createServer((req, res) => {
  const u = url.parse(req.url, true), q = u.query, p = decodeURIComponent(u.pathname);
  if (p === '/html/player_api.php') { res.writeHead(200, { 'Content-Type': 'text/html', 'Access-Control-Allow-Origin': '*' }); return res.end('<html><head><title>XUI.one - Debug Mode</title><style>*{-webkit-box-sizing:border-box;box-sizing:border-box}body{margin:0}</style></head><body><h1>Acesso negado</h1><p>BLOCKED_USER_AGENT</p></body></html>'); }
  if (p === '/player_api.php') {
    if (q.username !== USER || q.password !== PASS) return json(res, { user_info: { auth: 0 } });
    switch (q.action) {
      case undefined: case '': return json(res, { user_info: { auth: 1, status: 'Active', username: USER, exp_date: String(now() + 11 * 86400), max_connections: '1', allowed_output_formats: ['m3u8', 'ts'] }, server_info: { url: 'localhost', port: String(PORT) } });
      case 'get_live_categories': return json(res, liveCats.map((c, i) => ({ category_id: String(i + 1), category_name: c, parent_id: 0 })));
      case 'get_live_streams': return json(res, q.category_id ? live.filter(s => s.category_id === q.category_id) : live);
      case 'get_short_epg': return json(res, epgFor(Number(q.stream_id)));
      case 'get_vod_categories': return json(res, vodCats.map((c, i) => ({ category_id: String(i + 1), category_name: c })).concat([{ category_id: '6', category_name: 'XXX Adultos' }]));
      case 'get_vod_streams': return json(res, q.category_id ? vod.filter(s => s.category_id === q.category_id) : vod);
      case 'get_vod_info': return json(res, { info: { plot: 'Sinopse de teste do filme.', genre: 'Suspense', duration: '1h35', releasedate: '2026-01-10', rating: '7.5', backdrop_path: [] }, movie_data: {} });
      case 'get_series_categories': return json(res, serCats.map((c, i) => ({ category_id: String(i + 1), category_name: c })));
      case 'get_series': return json(res, q.category_id ? series.filter(s => s.category_id === q.category_id) : series);
      case 'get_series_info': {
        const s = series.find(x => String(x.series_id) === q.series_id) || series[0];
        const eps = {};
        [1, 2].forEach(sn => { eps[sn] = [1, 2, 3, 4].map(e => ({ id: String(s.series_id * 100 + sn * 10 + e), episode_num: e, title: ['A Ponte', 'Sinal Fraco', 'Estrada de Terra', 'Ponto Cego'][e - 1], container_extension: 'mp4', info: { duration: '1 min 35 s', duration_secs: 95, plot: 'Episódio de teste.' }, season: sn })); });
        return json(res, { info: { name: s.name, plot: s.plot, cover: '', genre: 'Drama', releaseDate: '2025-03-01', rating: '8.1', backdrop_path: [] }, episodes: eps });
      }
      default: return json(res, []);
    }
  }
  let m;
  if ((m = /^\/live\/[^/]+\/[^/]+\/(\d+)\.m3u8$/.exec(p))) {
    const txt = fs.readFileSync(path.join(MEDIA, 'live.m3u8'), 'utf8').replace(/^live(\d+)\.ts$/gm, '/media/live$1.ts');
    res.writeHead(200, { 'Content-Type': TYPES['.m3u8'], 'Access-Control-Allow-Origin': '*' }); return res.end(txt);
  }
  if (/^\/(live\/)?[^/]+\/[^/]+\/\d+(\.ts)?$/.test(p) && !/^\/(movie|series)\//.test(p)) { res.writeHead(200, { 'Content-Type': 'video/mp2t' }); return res.end(Buffer.concat([0,1,2].map(i => fs.readFileSync(path.join(MEDIA, 'live' + i + '.ts'))))); }
  if (p === '/lista-ts.m3u') { let t = '#EXTM3U\n'; live.slice(0, 10).forEach(s => { t += '#EXTINF:-1 tvg-id="' + s.epg_channel_id + '" group-title="' + liveCats[Number(s.category_id) - 1] + '",' + s.name + '\nhttp://localhost:' + PORT + '/' + USER + '/' + PASS + '/' + s.stream_id + '\n'; }); res.writeHead(200, { 'Content-Type': 'audio/x-mpegurl' }); return res.end(t); }
  if (/^\/(movie|series)\/[^/]+\/[^/]+\/\d+\.mp4$/.test(p)) return sendFile(req, res, path.join(MEDIA, 'vod.mp4'), 'video/mp4');
  if (p.startsWith('/media/')) return sendFile(req, res, path.join(MEDIA, path.basename(p)), TYPES[path.extname(p)] || 'application/octet-stream');
  if (p === '/m3u-negado') { res.writeHead(200, { 'Content-Type': 'text/html', 'Access-Control-Allow-Origin': '*' }); return res.end('<html><head><title>XUI.one - Debug Mode</title><style>*{box-sizing:border-box}</style></head><body>XUI.ONE INVALID_CREDENTIALS Username or password is invalid.</body></html>'); }
  if (p === '/lista.m3u') {
    let t = '#EXTM3U\n';
    live.slice(0, 10).forEach(s => { t += '#EXTINF:-1 tvg-id="' + s.epg_channel_id + '" group-title="' + liveCats[Number(s.category_id) - 1] + '",' + s.name + '\nhttp://localhost:' + PORT + '/live/' + USER + '/' + PASS + '/' + s.stream_id + '.m3u8\n'; });
    vod.slice(0, 4).forEach(s => { t += '#EXTINF:-1 group-title="Filmes",' + s.name + '\nhttp://localhost:' + PORT + '/movie/' + USER + '/' + PASS + '/' + s.stream_id + '.mp4\n'; });
    res.writeHead(200, { 'Content-Type': 'audio/x-mpegurl', 'Access-Control-Allow-Origin': '*' }); return res.end(t);
  }
  if (p === '/' || p === '/app' ) { res.writeHead(302, { Location: '/app/index.html' }); return res.end(); }
  if (p.startsWith('/app/')) {
    const f = path.join(APP, path.normalize(p.slice(5)).replace(/^(\.\.[/\\])+/, ''));
    return sendFile(req, res, f, TYPES[path.extname(f)] || 'application/octet-stream');
  }
  res.writeHead(404, { 'Access-Control-Allow-Origin': '*' }); res.end('nao encontrado');
}).listen(PORT, () => console.log('Servidor de teste: http://localhost:' + PORT + '/app/index.html'));
