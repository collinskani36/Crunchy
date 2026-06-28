package com.crunchyinn.app;

import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.core.splashscreen.SplashScreen;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    // Flag — splash stays visible until this is true
    private boolean appReady = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {

        // Install splash screen BEFORE super.onCreate()
        SplashScreen splashScreen = SplashScreen.installSplashScreen(this);

        // Keep splash on screen until Vercel URL has fully loaded
        splashScreen.setKeepOnScreenCondition(() -> !appReady);

        super.onCreate(savedInstanceState);

        // Hook into the WebView after Capacitor sets it up
        getBridge().getWebView().setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(android.webkit.WebView view, String url) {
                super.onPageFinished(view, url);
                // Page loaded — dismiss splash
                appReady = true;
            }
        });
    }
}