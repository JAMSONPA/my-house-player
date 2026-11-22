package br.com.jamson.player;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/* MY HOUSE para TV box Android: abre o mesmo app da TV LG num navegador interno.
   O ServidorLocal entrega o app e faz a ponte com o servidor da lista (igual à versão de PC). */
public class MainActivity extends Activity {
    private WebView web;
    private ServidorLocal servidor;

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON | WindowManager.LayoutParams.FLAG_FULLSCREEN);
        servidor = new ServidorLocal(this);
        servidor.iniciar();

        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(11, 14, 20));
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        /* sem zoom: o próprio app encaixa a tela 1920x1080 no tamanho da TV */
        s.setLoadWithOverviewMode(false);
        s.setUseWideViewPort(false);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setTextZoom(100);
        if (Build.VERSION.SDK_INT >= 21) s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        web.setWebViewClient(new WebViewClient());
        web.setWebChromeClient(new WebChromeClient());
        web.setInitialScale(0);
        web.setScrollContainer(false);
        web.setVerticalScrollBarEnabled(false);
        web.setHorizontalScrollBarEnabled(false);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.addJavascriptInterface(new Ponte(), "MyHouseAndroid");
        web.setFocusable(true);
        web.setFocusableInTouchMode(true);
        setContentView(web);
        esconderBarras();
        web.requestFocus();
        web.loadUrl(servidor.endereco() + "/index.html");
    }

    /* chamado pelo ServidorLocal quando o celular/PC envia os dados da lista */
    void recarregar() {
        runOnUiThread(new Runnable() {
            public void run() {
                web.evaluateJavascript("try{localStorage.removeItem('jamsonPlayer.v1')}catch(e){}", null);
                web.loadUrl(servidor.endereco() + "/index.html");
            }
        });
    }

    private void esconderBarras() {
        View d = getWindow().getDecorView();
        d.setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
    }

    @Override
    public void onWindowFocusChanged(boolean f) {
        super.onWindowFocusChanged(f);
        if (f) esconderBarras();
    }

    /* teclas do controle que o navegador não entende: viram os códigos do controle LG que o app já conhece */
    private int traduz(int k) {
        switch (k) {
            case KeyEvent.KEYCODE_BACK: case KeyEvent.KEYCODE_ESCAPE: return 461;
            case KeyEvent.KEYCODE_PROG_RED: return 403;
            case KeyEvent.KEYCODE_PROG_GREEN: return 404;
            case KeyEvent.KEYCODE_PROG_YELLOW: return 405;
            case KeyEvent.KEYCODE_PROG_BLUE: return 406;
            case KeyEvent.KEYCODE_CHANNEL_UP: case KeyEvent.KEYCODE_PAGE_UP: return 427;
            case KeyEvent.KEYCODE_CHANNEL_DOWN: case KeyEvent.KEYCODE_PAGE_DOWN: return 428;
            case KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE: return 10252;
            case KeyEvent.KEYCODE_MEDIA_PLAY: return 415;
            case KeyEvent.KEYCODE_MEDIA_PAUSE: return 19;
            case KeyEvent.KEYCODE_MEDIA_STOP: return 413;
            case KeyEvent.KEYCODE_MEDIA_FAST_FORWARD: return 417;
            case KeyEvent.KEYCODE_MEDIA_REWIND: return 412;
            case KeyEvent.KEYCODE_MENU: case KeyEvent.KEYCODE_INFO: case KeyEvent.KEYCODE_GUIDE: return 405; /* abre as categorias */
            case KeyEvent.KEYCODE_BOOKMARK: return 403;
            default: return 0;
        }
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent e) {
        int c = traduz(e.getKeyCode());
        if (c != 0) {
            if (e.getAction() == KeyEvent.ACTION_DOWN) {
                web.evaluateJavascript("window.MYHOUSE_TECLA&&MYHOUSE_TECLA(" + c + ")", null);
            }
            return true;
        }
        return super.dispatchKeyEvent(e);
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (web != null) web.evaluateJavascript("try{var v=document.getElementById('v');if(v)v.pause()}catch(e){}", null);
    }

    @Override
    protected void onDestroy() {
        if (servidor != null) servidor.parar();
        if (web != null) web.destroy();
        super.onDestroy();
    }

    private class Ponte {
        @JavascriptInterface
        public void sair() {
            runOnUiThread(new Runnable() { public void run() { finish(); } });
        }

        /* número da versão instalada, para comparar com a do GitHub */
        @JavascriptInterface
        public int versao() {
            try { return getPackageManager().getPackageInfo(getPackageName(), 0).versionCode; } catch (Exception e) { return 0; }
        }

        @JavascriptInterface
        public String nomeVersao() {
            try { return getPackageManager().getPackageInfo(getPackageName(), 0).versionName; } catch (Exception e) { return ""; }
        }

        /* baixa o APK novo e abre a tela de instalação do Android */
        @JavascriptInterface
        public void atualizar(final String url) {
            runOnUiThread(new Runnable() { public void run() { Atualizador.baixar(MainActivity.this, url); } });
        }
    }

    void avisarJs(final String js) {
        runOnUiThread(new Runnable() { public void run() { if (web != null) web.evaluateJavascript(js, null); } });
    }
}
