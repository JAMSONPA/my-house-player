package br.com.jamson.player;

import android.content.res.AssetManager;

import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.NetworkInterface;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.URL;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.util.Collections;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Random;

/* Servidor dentro do app (porta 8787), igual ao pc/servidor-pc.js:
   - entrega os arquivos do app (assets/www) só para a própria TV box;
   - /p?u=... faz a ponte com o servidor da lista e reescreve playlists HLS;
   - /enviar: página para mandar os dados da lista pelo celular ou PC na mesma rede (protegida por código). */
class ServidorLocal {
    static final int PORTA = 8787;
    private static final String PREFIXO = "/p?u=";
    private static final String UA = "Mozilla/5.0 (Linux; Android 10; TV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";

    private final MainActivity act;
    private final AssetManager assets;
    private final String codigo;
    private ServerSocket socket;
    private volatile boolean ligado;

    ServidorLocal(MainActivity a) {
        act = a;
        assets = a.getAssets();
        codigo = String.format(Locale.US, "%04d", new Random().nextInt(10000));
    }

    String endereco() { return "http://127.0.0.1:" + PORTA; }

    void iniciar() {
        ligado = true;
        Thread t = new Thread(new Runnable() {
            public void run() {
                try {
                    socket = new ServerSocket();
                    socket.setReuseAddress(true);
                    socket.bind(new InetSocketAddress(PORTA));
                    while (ligado) {
                        final Socket s = socket.accept();
                        new Thread(new Runnable() { public void run() { atender(s); } }).start();
                    }
                } catch (IOException e) { /* servidor parado */ }
            }
        });
        t.setDaemon(true);
        t.start();
    }

    void parar() {
        ligado = false;
        try { if (socket != null) socket.close(); } catch (IOException e) { /* ignora */ }
    }

    /* ---------------- atendimento ---------------- */
    private void atender(Socket s) {
        try {
            s.setSoTimeout(60000);
            InputStream in = s.getInputStream();
            OutputStream out = s.getOutputStream();
            String linha = lerLinha(in);
            if (linha == null || linha.isEmpty()) { s.close(); return; }
            String[] p = linha.split(" ");
            String metodo = p[0], alvo = p.length > 1 ? p[1] : "/";
            Map<String, String> cab = new HashMap<String, String>();
            String l;
            while ((l = lerLinha(in)) != null && !l.isEmpty()) {
                int i = l.indexOf(':');
                if (i > 0) cab.put(l.substring(0, i).trim().toLowerCase(Locale.US), l.substring(i + 1).trim());
            }
            boolean local = s.getInetAddress().isLoopbackAddress();
            String caminho = alvo.split("\\?")[0];

            if (caminho.equals("/enviar")) { enviar(metodo, alvo, cab, in, out); }
            else if (!local) { responder(out, 403, "text/plain; charset=utf-8", "Acesso só pela própria TV box. Para enviar a lista, abra /enviar".getBytes("UTF-8")); }
            else if (alvo.startsWith(PREFIXO)) { ponte(URLDecoder.decode(alvo.substring(PREFIXO.length()), "UTF-8"), cab, out); }
            else if (caminho.equals("/lista-config.json")) { configuracao(out); }
            else { arquivo(caminho.equals("/") ? "/index.html" : caminho, out); }
            out.flush();
        } catch (Exception e) { /* conexão encerrada */ }
        try { s.close(); } catch (IOException e) { /* ignora */ }
    }

    private static String lerLinha(InputStream in) throws IOException {
        StringBuilder sb = new StringBuilder();
        int c;
        while ((c = in.read()) != -1) {
            if (c == '\n') break;
            if (c != '\r') sb.append((char) c);
            if (sb.length() > 16384) break;
        }
        if (c == -1 && sb.length() == 0) return null;
        return sb.toString();
    }

    private static void responder(OutputStream out, int status, String tipo, byte[] corpo) throws IOException {
        String h = "HTTP/1.1 " + status + " " + (status == 200 ? "OK" : "Erro") + "\r\nContent-Type: " + tipo
                + "\r\nContent-Length: " + corpo.length + "\r\nCache-Control: no-cache\r\nConnection: close\r\n\r\n";
        out.write(h.getBytes("UTF-8"));
        out.write(corpo);
    }

    private static byte[] lerTudo(InputStream in) throws IOException {
        ByteArrayOutputStream b = new ByteArrayOutputStream();
        byte[] buf = new byte[16384];
        int n;
        while ((n = in.read(buf)) > 0) b.write(buf, 0, n);
        return b.toByteArray();
    }

    /* ---------------- arquivos do app ---------------- */
    private static String tipoDe(String c) {
        String x = c.toLowerCase(Locale.US);
        if (x.endsWith(".html")) return "text/html; charset=utf-8";
        if (x.endsWith(".js")) return "application/javascript; charset=utf-8";
        if (x.endsWith(".css")) return "text/css; charset=utf-8";
        if (x.endsWith(".json")) return "application/json; charset=utf-8";
        if (x.endsWith(".png")) return "image/png";
        if (x.endsWith(".woff2")) return "font/woff2";
        if (x.endsWith(".svg")) return "image/svg+xml";
        return "application/octet-stream";
    }

    private void arquivo(String caminho, OutputStream out) throws IOException {
        String rel = URLDecoder.decode(caminho, "UTF-8").replace("\\", "/");
        while (rel.startsWith("/")) rel = rel.substring(1);
        if (rel.contains("..")) { responder(out, 403, "text/plain", new byte[0]); return; }
        byte[] dados;
        try {
            InputStream in = assets.open("www/" + rel);
            dados = lerTudo(in);
            in.close();
        } catch (IOException e) {
            responder(out, 404, "text/plain; charset=utf-8", "não encontrado".getBytes("UTF-8"));
            return;
        }
        if (rel.equals("index.html")) {
            String ip = ipDaRede();
            String inj = "<head>\n<script>window.MYHOUSE_PONTE = " + json(PREFIXO) + "; window.MYHOUSE_ANDROID = {ip: " + json(ip == null ? "" : ip)
                    + ", codigo: " + json(codigo) + "};</script>\n<script src=\"lib/mpegts.js\"></script>";
            dados = new String(dados, "UTF-8").replaceFirst("<head>", java.util.regex.Matcher.quoteReplacement(inj)).getBytes("UTF-8");
        }
        responder(out, 200, tipoDe(rel), dados);
    }

    private File arquivoConfig() { return new File(act.getFilesDir(), "lista-config.json"); }

    private void configuracao(OutputStream out) throws IOException {
        File f = arquivoConfig();
        File ext = act.getExternalFilesDir(null);
        File f2 = ext == null ? null : new File(ext, "lista-config.json");
        File usar = f.exists() ? f : (f2 != null && f2.exists() ? f2 : null);
        if (usar == null) { responder(out, 404, "application/json", "{}".getBytes("UTF-8")); return; }
        FileInputStream in = new FileInputStream(usar);
        byte[] d = lerTudo(in);
        in.close();
        responder(out, 200, "application/json; charset=utf-8", d);
    }

    /* ---------------- ponte com o servidor da lista ---------------- */
    private void ponte(String url, Map<String, String> cab, OutputStream out) throws IOException {
        HttpURLConnection c = null;
        try {
            String atual = url;
            for (int i = 0; i < 7; i++) {
                if (!atual.startsWith("http://") && !atual.startsWith("https://")) throw new IOException("endereço inválido");
                c = (HttpURLConnection) new URL(atual).openConnection();
                c.setInstanceFollowRedirects(false);
                c.setConnectTimeout(20000);
                c.setReadTimeout(30000);
                c.setRequestProperty("User-Agent", UA);
                c.setRequestProperty("Accept", "*/*");
                if (cab.containsKey("range")) c.setRequestProperty("Range", cab.get("range"));
                int st = c.getResponseCode();
                String loc = c.getHeaderField("Location");
                if (st >= 300 && st < 400 && loc != null) {
                    atual = new URL(new URL(atual), loc).toString();
                    c.disconnect();
                    continue;
                }
                break;
            }
            int st = c.getResponseCode();
            String tipo = c.getContentType() == null ? "" : c.getContentType();
            InputStream in = st >= 400 ? c.getErrorStream() : c.getInputStream();
            if (in == null) { responder(out, st, "text/plain", new byte[0]); return; }
            String final_ = c.getURL().toString();
            boolean m3u8 = tipo.toLowerCase(Locale.US).contains("mpegurl") || final_.toLowerCase(Locale.US).matches(".*\\.m3u8(\\?.*)?$");
            if (m3u8 && st < 400) {
                String txt = new String(lerTudo(in), "UTF-8");
                if (txt.trim().startsWith("#EXTM3U") && txt.contains("#EXT-X-")) {
                    responder(out, st, "application/vnd.apple.mpegurl", reescrever(txt, final_).getBytes("UTF-8"));
                } else {
                    responder(out, st, tipo.isEmpty() ? "text/plain" : tipo, txt.getBytes("UTF-8"));
                }
                return;
            }
            StringBuilder h = new StringBuilder("HTTP/1.1 " + st + " OK\r\nCache-Control: no-cache\r\nConnection: close\r\n");
            if (!tipo.isEmpty()) h.append("Content-Type: ").append(tipo).append("\r\n");
            for (String k : new String[]{"Content-Length", "Content-Range", "Accept-Ranges", "Last-Modified"}) {
                String v = c.getHeaderField(k);
                if (v != null) h.append(k).append(": ").append(v).append("\r\n");
            }
            h.append("\r\n");
            out.write(h.toString().getBytes("UTF-8"));
            byte[] buf = new byte[32768];
            int n;
            while ((n = in.read(buf)) > 0) { out.write(buf, 0, n); }
            in.close();
        } catch (IOException e) {
            responder(out, 502, "text/plain; charset=utf-8", ("Ponte do MY HOUSE: não foi possível acessar o servidor da lista (" + e.getMessage() + ")").getBytes("UTF-8"));
        } finally {
            if (c != null) c.disconnect();
        }
    }

    private static String px(String u) {
        try { return PREFIXO + URLEncoder.encode(u, "UTF-8"); } catch (Exception e) { return u; }
    }

    private static String abs(String s, String base) {
        try { return new URL(new URL(base), s).toString(); } catch (Exception e) { return s; }
    }

    static String reescrever(String txt, String base) {
        StringBuilder sb = new StringBuilder();
        for (String linha : txt.split("\r?\n")) {
            String l = linha.trim();
            if (l.isEmpty()) { sb.append(linha); }
            else if (l.startsWith("#")) {
                java.util.regex.Matcher m = java.util.regex.Pattern.compile("URI=\"([^\"]+)\"").matcher(linha);
                StringBuffer r = new StringBuffer();
                while (m.find()) m.appendReplacement(r, java.util.regex.Matcher.quoteReplacement("URI=\"" + px(abs(m.group(1), base)) + "\""));
                m.appendTail(r);
                sb.append(r);
            } else { sb.append(px(abs(l, base))); }
            sb.append('\n');
        }
        return sb.toString();
    }

    /* ---------------- envio da lista pelo celular / PC ---------------- */
    private void enviar(String metodo, String alvo, Map<String, String> cab, InputStream in, OutputStream out) throws IOException {
        String msg = "";
        if (metodo.equals("POST")) {
            int tam = 0;
            try { tam = Integer.parseInt(cab.containsKey("content-length") ? cab.get("content-length") : "0"); } catch (Exception e) { /* ignora */ }
            if (tam > 65536) tam = 65536;
            byte[] corpo = new byte[tam];
            int lido = 0;
            while (lido < tam) { int n = in.read(corpo, lido, tam - lido); if (n < 0) break; lido += n; }
            Map<String, String> f = form(new String(corpo, 0, lido, "UTF-8"));
            String cod = val(f, "codigo"), m3u = val(f, "m3u"), srv = val(f, "servidor"), usu = val(f, "usuario"), sen = val(f, "senha"), nome = val(f, "nome");
            if (!cod.equals(codigo)) msg = "<p class=e>Código errado. Confira o código que aparece na tela da TV.</p>";
            else if (m3u.isEmpty() && (srv.isEmpty() || usu.isEmpty() || sen.isEmpty())) msg = "<p class=e>Preencha o link M3U, ou então servidor, usuário e senha.</p>";
            else if (!m3u.isEmpty() && !m3u.matches("(?i)^https?://.+")) msg = "<p class=e>O link M3U precisa começar com http:// ou https://</p>";
            else {
                String j = "{\n  \"nome\": " + json(nome.isEmpty() ? "Minha lista" : nome) + ",\n  \"servidor\": " + json(srv) + ",\n  \"usuario\": " + json(usu)
                        + ",\n  \"senha\": " + json(sen) + ",\n  \"m3u\": " + json(m3u) + "\n}\n";
                FileOutputStream fo = new FileOutputStream(arquivoConfig());
                fo.write(j.getBytes("UTF-8"));
                fo.close();
                act.recarregar();
                responder(out, 200, "text/html; charset=utf-8", pagina("<h1>Pronto!</h1><p class=ok>A lista foi enviada. Olhe a TV: o MY HOUSE já está conectando.</p>").getBytes("UTF-8"));
                return;
            }
        }
        String form = "<h1>Enviar a lista para o MY HOUSE</h1><p>Preencha <b>um</b> dos jeitos: o link M3U, ou servidor + usuário + senha.</p>" + msg
                + "<form method=post action=/enviar>"
                + "<label>Código que aparece na TV</label><input name=codigo inputmode=numeric maxlength=4 required autocomplete=off>"
                + "<label>Nome da lista</label><input name=nome value=\"Minha lista\">"
                + "<label>Link M3U</label><input name=m3u placeholder=\"http://...get.php?username=...\" autocomplete=off>"
                + "<p class=ou>ou</p>"
                + "<label>Servidor</label><input name=servidor placeholder=\"http://...\" autocomplete=off>"
                + "<label>Usuário</label><input name=usuario autocomplete=off>"
                + "<label>Senha</label><input name=senha type=password autocomplete=off>"
                + "<button>Enviar para a TV</button></form>";
        responder(out, 200, "text/html; charset=utf-8", pagina(form).getBytes("UTF-8"));
    }

    private static String pagina(String corpo) {
        return "<!doctype html><html lang=pt-BR><meta charset=utf-8><meta name=viewport content=\"width=device-width,initial-scale=1\"><title>MY HOUSE</title>"
                + "<style>body{font-family:system-ui,sans-serif;background:#0B0E14;color:#E8EAF0;margin:0;padding:24px;max-width:560px}"
                + "h1{font-size:24px}label{display:block;margin:14px 0 6px;color:#A9AEBB}input{width:100%;box-sizing:border-box;padding:12px;border-radius:10px;border:1px solid #2A3140;background:#151A23;color:#fff;font-size:16px}"
                + "button{margin-top:22px;width:100%;padding:14px;border:0;border-radius:10px;background:#F2B53A;color:#1A1A1A;font-size:17px;font-weight:700}"
                + ".e{background:#3A1518;color:#FFB4B4;padding:12px;border-radius:10px}.ok{background:#0F1A15;color:#9FE0BF;padding:12px;border-radius:10px}.ou{text-align:center;color:#6B7280;margin:16px 0 0}</style>"
                + corpo + "</html>";
    }

    private static Map<String, String> form(String s) {
        Map<String, String> m = new HashMap<String, String>();
        for (String par : s.split("&")) {
            int i = par.indexOf('=');
            if (i <= 0) continue;
            try { m.put(URLDecoder.decode(par.substring(0, i), "UTF-8"), URLDecoder.decode(par.substring(i + 1), "UTF-8")); } catch (Exception e) { /* ignora */ }
        }
        return m;
    }

    private static String val(Map<String, String> m, String k) { String v = m.get(k); return v == null ? "" : v.trim(); }

    static String json(String s) {
        StringBuilder b = new StringBuilder("\"");
        for (char ch : s.toCharArray()) {
            if (ch == '"' || ch == '\\') b.append('\\').append(ch);
            else if (ch == '<') b.append("\\u003c");
            else if (ch < 0x20) b.append(String.format(Locale.US, "\\u%04x", (int) ch));
            else b.append(ch);
        }
        return b.append('"').toString();
    }

    private static String ipDaRede() {
        try {
            for (NetworkInterface ni : Collections.list(NetworkInterface.getNetworkInterfaces())) {
                if (!ni.isUp() || ni.isLoopback()) continue;
                for (InetAddress a : Collections.list(ni.getInetAddresses())) {
                    if (a instanceof Inet4Address && a.isSiteLocalAddress()) return a.getHostAddress();
                }
            }
        } catch (Exception e) { /* ignora */ }
        return null;
    }
}
