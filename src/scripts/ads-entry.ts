// Inlined (as an IIFE) only when ads are enabled; the AdSense client id comes from data-client.
import { scheduleAds } from './ads';

scheduleAds(document.currentScript?.getAttribute('data-client') ?? '');
