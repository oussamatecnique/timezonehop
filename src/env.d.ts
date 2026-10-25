/// <reference types="astro/client" />

declare module '*?iife' {
  const code: string;
  export default code;
}

interface ImportMetaEnv {
  readonly PUBLIC_ADSENSE_CLIENT?: string;
  readonly PUBLIC_ADS_ENABLED?: string;
  readonly PUBLIC_AD_SLOT_BELOW_TOOL?: string;
  readonly PUBLIC_AD_SLOT_IN_CONTENT?: string;
  readonly PUBLIC_AD_SLOT_SIDEBAR?: string;
  readonly PUBLIC_CF_ANALYTICS_TOKEN?: string;
}
