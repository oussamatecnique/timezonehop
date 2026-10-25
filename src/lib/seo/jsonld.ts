/** schema.org structured data. */
import { BRAND, SITE, type Crumb } from './meta';

const CONTEXT = 'https://schema.org';
const abs = (url: string) => (url === '/' ? SITE : SITE + url);

export function websiteLd(): object {
  return { '@context': CONTEXT, '@type': 'WebSite', name: BRAND, url: SITE };
}

export function organizationLd(): object {
  return { '@context': CONTEXT, '@type': 'Organization', name: BRAND, url: SITE, logo: `${SITE}/apple-touch-icon.png` };
}

export function breadcrumbLd(crumbs: Crumb[]): object {
  return {
    '@context': CONTEXT,
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: abs(c.url) })),
  };
}

export function webAppLd(name: string, url: string): object {
  return {
    '@context': CONTEXT,
    '@type': 'WebApplication',
    name,
    url: abs(url),
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Any',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  };
}
