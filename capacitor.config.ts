import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.crunchyinn.app',
  appName: 'CrunchyInn',
  webDir: 'dist',

  server: {
    url: 'https://myhotel-demo.vercel.app',
    cleartext: true
  }
};

export default config;