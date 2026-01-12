import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pontoflex.app',
  appName: 'PontoFlex',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#0F172A",
      showSpinner: true,
      androidSpinnerStyle: "large",
      spinnerColor: "#3B82F6"
    }
  }
};

export default config;
