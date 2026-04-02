import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aipredictor.app',
  appName: 'Prognóstico IA',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
