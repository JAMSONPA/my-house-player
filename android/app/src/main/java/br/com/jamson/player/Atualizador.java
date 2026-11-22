package br.com.jamson.player;

import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import java.io.File;

/* Baixa a versão nova do MY HOUSE (APK do GitHub) e abre o instalador do Android */
class Atualizador {
    private static long baixando = -1;

    static void baixar(final MainActivity act, String url) {
        /* Android 8+: precisa da permissão "instalar apps desconhecidos" para o MY HOUSE */
        if (Build.VERSION.SDK_INT >= 26 && !act.getPackageManager().canRequestPackageInstalls()) {
            act.avisarJs("window.MYHOUSE_ATUALIZACAO&&MYHOUSE_ATUALIZACAO('permissao')");
            try {
                act.startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + act.getPackageName())));
            } catch (Exception e) { /* algumas TV box não têm essa tela */ }
            return;
        }
        final DownloadManager dm = (DownloadManager) act.getSystemService(Context.DOWNLOAD_SERVICE);
        if (dm == null) { act.avisarJs("window.MYHOUSE_ATUALIZACAO&&MYHOUSE_ATUALIZACAO('erro')"); return; }
        File velho = new File(act.getExternalFilesDir(null), "MyHouse.apk");
        if (velho.exists()) velho.delete();
        DownloadManager.Request r = new DownloadManager.Request(Uri.parse(url));
        r.setTitle("MY HOUSE");
        r.setDescription("Baixando a versão nova");
        r.setMimeType("application/vnd.android.package-archive");
        r.setDestinationInExternalFilesDir(act, null, "MyHouse.apk");
        r.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE);
        baixando = dm.enqueue(r);
        act.avisarJs("window.MYHOUSE_ATUALIZACAO&&MYHOUSE_ATUALIZACAO('baixando')");

        BroadcastReceiver rec = new BroadcastReceiver() {
            @Override
            public void onReceive(Context c, Intent i) {
                long id = i.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1);
                if (id != baixando) return;
                try { act.unregisterReceiver(this); } catch (Exception e) { /* ignora */ }
                boolean ok = false;
                Cursor cur = dm.query(new DownloadManager.Query().setFilterById(id));
                if (cur != null) {
                    if (cur.moveToFirst()) ok = cur.getInt(cur.getColumnIndex(DownloadManager.COLUMN_STATUS)) == DownloadManager.STATUS_SUCCESSFUL;
                    cur.close();
                }
                if (!ok) { act.avisarJs("window.MYHOUSE_ATUALIZACAO&&MYHOUSE_ATUALIZACAO('erro')"); return; }
                Uri apk = dm.getUriForDownloadedFile(id);
                Intent inst = new Intent(Intent.ACTION_VIEW);
                inst.setDataAndType(apk, "application/vnd.android.package-archive");
                inst.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                try {
                    act.startActivity(inst);
                    act.avisarJs("window.MYHOUSE_ATUALIZACAO&&MYHOUSE_ATUALIZACAO('instalar')");
                } catch (Exception e) {
                    act.avisarJs("window.MYHOUSE_ATUALIZACAO&&MYHOUSE_ATUALIZACAO('erro')");
                }
            }
        };
        IntentFilter f = new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE);
        if (Build.VERSION.SDK_INT >= 33) act.registerReceiver(rec, f, Context.RECEIVER_EXPORTED);
        else act.registerReceiver(rec, f);
    }
}
