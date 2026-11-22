package com.platik.mobile;

import android.content.SharedPreferences;
import android.content.Intent;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import org.json.JSONObject;
import io.flutter.embedding.android.FlutterActivity;
import io.flutter.embedding.engine.FlutterEngine;
import io.flutter.plugin.common.MethodChannel;

public class MainActivity extends FlutterActivity {
    private final Handler main = new Handler(Looper.getMainLooper());
    private final Map<String, MethodChannel.Result> pending = new HashMap<>();
    private MethodChannel channel;
    private WebView engine;
    private boolean ready;
    private int sequence;
    @Override
    public void configureFlutterEngine(FlutterEngine engine) {
        super.configureFlutterEngine(engine);
        SharedPreferences prefs = getSharedPreferences("platik", MODE_PRIVATE);
        channel = new MethodChannel(engine.getDartExecutor().getBinaryMessenger(), "platik/storage");
        channel.setMethodCallHandler((call, result) -> {
                switch (call.method) {
                    case "read":
                        result.success(prefs.getString("state", null));
                        break;
                    case "write":
                        if (prefs.edit().putString("state", call.arguments()).commit()) {
                            result.success(null);
                        } else {
                            result.error("storage", "Could not save Platik data", null);
                        }
                        break;
                    case "openUrl":
                        try {
                            Uri uri=Uri.parse(call.arguments());
                            if(!java.util.Arrays.asList("https","wc","freighter","varial","web+stellar","market").contains(uri.getScheme())) throw new IllegalArgumentException();
                            startActivity(new Intent(Intent.ACTION_VIEW,uri));result.success(null);
                        }catch(Exception e){result.error("open_url","No hay una aplicación compatible para abrir este enlace",null);}
                        break;
                    case "openWallet":
                        try {
                            Intent launch=null;
                            for(String packageName:new String[]{"org.stellar.freighterwallet","org.stellar.freighterdev","com.freightermobile"}){launch=getPackageManager().getLaunchIntentForPackage(packageName);if(launch!=null)break;}
                            if(launch==null)throw new IllegalStateException();startActivity(launch);result.success(null);
                        }catch(Exception e){result.error("wallet_missing","Instala Varial en este teléfono para autorizar la conexión",null);}
                        break;
                    case "stellar":
                        String id=Integer.toString(++sequence);pending.put(id,result);
                        if(MainActivity.this.engine==null)initEngine();
                        final Map<String,Object> request=call.arguments();
                        main.post(new Runnable(){int tries;
                            @Override public void run(){
                                if(!pending.containsKey(id))return;
                                if(!ready){if(++tries>200){completeError(id,"No se pudo iniciar el motor Stellar");return;}main.postDelayed(this,100);return;}
                                Object parameters=request.get("params");JSONObject json=parameters instanceof Map?new JSONObject((Map)parameters):new JSONObject();
                                MainActivity.this.engine.evaluateJavascript("PlatikEngine.dispatch("+JSONObject.quote(id)+","+JSONObject.quote(String.valueOf(request.get("method")))+","+json+")",null);
                            }
                        });
                        main.postDelayed(()->completeError(id,"Se agotó el tiempo de espera. Puedes reintentar y revisar el historial."),240000);
                        break;
                    default:
                        result.notImplemented();
                }
            });
    }
    private String asset(String name)throws Exception{
        try(InputStream in=getAssets().open("flutter_assets/assets/"+name);ByteArrayOutputStream out=new ByteArrayOutputStream()){
            byte[] buffer=new byte[8192];int count;while((count=in.read(buffer))!=-1)out.write(buffer,0,count);return new String(out.toByteArray(),StandardCharsets.UTF_8);
        }
    }
    @android.annotation.SuppressLint({"SetJavaScriptEnabled","JavascriptInterface"})
    private void initEngine(){
        try{
            // Detached local SDK runtime. All visible screens are Flutter widgets.
            engine=new WebView(this);engine.getSettings().setJavaScriptEnabled(true);
            engine.getSettings().setAllowFileAccess(false);engine.getSettings().setAllowContentAccess(false);engine.getSettings().setDomStorageEnabled(true);
            engine.addJavascriptInterface(new Object(){
                @JavascriptInterface public void openAuthUrl(String url){main.post(()->{try{Uri uri=Uri.parse(url);if(!"https".equals(uri.getScheme())||uri.getUserInfo()!=null)return;startActivity(new Intent(Intent.ACTION_VIEW,uri));}catch(Exception ignored){}});}
                @JavascriptInterface public void complete(String id,String json){main.post(()->{MethodChannel.Result result=pending.remove(id);if(result!=null)result.success(json);});}
                @JavascriptInterface public void walletRequest(String payload){
                    main.post(()->channel.invokeMethod("walletRequest",payload,new MethodChannel.Result(){
                        @Override public void success(Object response){try{JSONObject request=new JSONObject(payload);String json=response instanceof String?(String)response:"{}";if(engine!=null)engine.evaluateJavascript("PlatikEngine.respond("+request.getDouble("messageId")+","+json+")",null);}catch(Exception ignored){}}
                        @Override public void error(String code,String message,Object details){respondError(payload,message);}
                        @Override public void notImplemented(){respondError(payload,"Conexión de wallet no disponible");}
                    }));
                }
            },"PlatikNative");
            engine.setWebViewClient(new WebViewClient(){
                @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){return true;}
                @Override public void onPageFinished(WebView view,String url){view.evaluateJavascript("typeof PlatikEngine !== 'undefined'",value->ready="true".equals(value));}
            });
            String html=asset("stellar_engine.html").replace("/*__PLATIK_ENGINE__*/",asset("stellar_engine.js").replace("</script","<\\/script"));
            engine.loadDataWithBaseURL("https://platik-financial.vercel.app/native-engine/",html,"text/html","UTF-8",null);
        }catch(Exception e){for(String id:new java.util.ArrayList<>(pending.keySet()))completeError(id,"No se pudo cargar el motor Stellar");}
    }
    private void respondError(String payload,String message){try{JSONObject request=new JSONObject(payload),error=new JSONObject(),response=new JSONObject();error.put("code",-1);error.put("message",message);response.put("apiError",error);if(engine!=null)engine.evaluateJavascript("PlatikEngine.respond("+request.getDouble("messageId")+","+response+")",null);}catch(Exception ignored){}}
    private void completeError(String id,String message){MethodChannel.Result result=pending.remove(id);if(result!=null)result.error("stellar",message,null);}
    @Override public void onDestroy(){for(String id:new java.util.ArrayList<>(pending.keySet()))completeError(id,"La pantalla se cerró");if(engine!=null){engine.destroy();engine=null;}super.onDestroy();}
}
