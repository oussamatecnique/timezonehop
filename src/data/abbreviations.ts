import type { PlaceRef } from './types';

export interface Abbreviation {
  slug: string;
  abbr: string;
  name: string;
  offsetMinutes: number;
  isDaylight: boolean;
  sibling?: string;
  representative?: PlaceRef;
  representativeTz?: string;
  note?: string;
  usedIn: string[];
}

type Row = [
  slug: string, name: string, offset: number, daylight: boolean, sibling: string | null,
  rep: [string, string] | null, tz: string | null, usedIn: string[], note?: string,
];

const rows: Row[] = [
  ['utc', 'Coordinated Universal Time', 0, false, null, null, null, ['Worldwide time standard', 'Aviation', 'Computing and the internet', 'Science']],
  ['gmt', 'Greenwich Mean Time', 0, false, 'bst', ['London', 'GB'], 'Europe/London', ['United Kingdom (winter)', 'Ireland (winter)', 'Iceland', 'Ghana', 'Senegal', 'Ivory Coast']],
  ['bst', 'British Summer Time', 60, true, 'gmt', ['London', 'GB'], 'Europe/London', ['United Kingdom (summer)'], 'Bangladesh Standard Time (UTC+6) is also abbreviated BST.'],
  ['wet', 'Western European Time', 0, false, 'west', ['Lisbon', 'PT'], 'Europe/Lisbon', ['Portugal (winter)', 'Canary Islands (winter)', 'Faroe Islands (winter)']],
  ['west', 'Western European Summer Time', 60, true, 'wet', ['Lisbon', 'PT'], 'Europe/Lisbon', ['Portugal (summer)', 'Canary Islands (summer)', 'Faroe Islands (summer)']],
  ['cet', 'Central European Time', 60, false, 'cest', ['Paris', 'FR'], 'Europe/Paris', ['France', 'Germany', 'Spain', 'Italy', 'Netherlands', 'Poland', 'Sweden', 'Norway', 'Algeria', 'Tunisia']],
  ['cest', 'Central European Summer Time', 120, true, 'cet', ['Paris', 'FR'], 'Europe/Paris', ['France', 'Germany', 'Spain', 'Italy', 'Netherlands', 'Poland', 'Sweden', 'Norway (summer)']],
  ['eet', 'Eastern European Time', 120, false, 'eest', ['Athens', 'GR'], 'Europe/Athens', ['Greece', 'Finland', 'Romania', 'Bulgaria', 'Ukraine', 'Egypt', 'Baltic states (winter)']],
  ['eest', 'Eastern European Summer Time', 180, true, 'eet', ['Athens', 'GR'], 'Europe/Athens', ['Greece', 'Finland', 'Romania', 'Bulgaria', 'Ukraine', 'Egypt', 'Baltic states (summer)']],
  ['msk', 'Moscow Standard Time', 180, false, null, ['Moscow', 'RU'], 'Europe/Moscow', ['Western Russia', 'Moscow', 'Saint Petersburg', 'Belarus (same offset)']],
  ['est', 'Eastern Standard Time', -300, false, 'edt', ['New York City', 'US'], 'America/New_York', ['Eastern United States (winter)', 'Eastern Canada (winter)', 'Panama', 'Jamaica', 'Cancún']],
  ['edt', 'Eastern Daylight Time', -240, true, 'est', ['New York City', 'US'], 'America/New_York', ['Eastern United States (summer)', 'Eastern Canada (summer)']],
  ['cst', 'Central Standard Time', -360, false, 'cdt', ['Chicago', 'US'], 'America/Chicago', ['Central United States (winter)', 'Central Canada (winter)', 'Mexico', 'Central America'], 'China Standard Time (UTC+8) and Cuba Standard Time (UTC−5) are also abbreviated CST.'],
  ['cdt', 'Central Daylight Time', -300, true, 'cst', ['Chicago', 'US'], 'America/Chicago', ['Central United States (summer)', 'Central Canada (summer)']],
  ['mst', 'Mountain Standard Time', -420, false, 'mdt', ['Denver', 'US'], 'America/Denver', ['Mountain United States (winter)', 'Arizona (all year)', 'Alberta (winter)', 'Sonora'], 'Arizona (except the Navajo Nation) uses MST all year and does not switch to MDT.'],
  ['mdt', 'Mountain Daylight Time', -360, true, 'mst', ['Denver', 'US'], 'America/Denver', ['Mountain United States (summer)', 'Alberta (summer)']],
  ['pst', 'Pacific Standard Time', -480, false, 'pdt', ['Los Angeles', 'US'], 'America/Los_Angeles', ['Pacific United States (winter)', 'British Columbia (winter)', 'Baja California (winter)'], 'Philippine Standard Time (UTC+8) is also sometimes written PST.'],
  ['pdt', 'Pacific Daylight Time', -420, true, 'pst', ['Los Angeles', 'US'], 'America/Los_Angeles', ['Pacific United States (summer)', 'British Columbia (summer)', 'Baja California (summer)']],
  ['akst', 'Alaska Standard Time', -540, false, 'akdt', ['Anchorage', 'US'], 'America/Anchorage', ['Alaska (winter)']],
  ['akdt', 'Alaska Daylight Time', -480, true, 'akst', ['Anchorage', 'US'], 'America/Anchorage', ['Alaska (summer)']],
  ['hst', 'Hawaii-Aleutian Standard Time', -600, false, null, ['Honolulu', 'US'], 'Pacific/Honolulu', ['Hawaii (all year)', 'Aleutian Islands (winter)']],
  ['ast', 'Atlantic Standard Time', -240, false, 'adt', ['Halifax', 'CA'], 'America/Halifax', ['Atlantic Canada (winter)', 'Puerto Rico', 'Dominican Republic', 'Eastern Caribbean'], 'Arabia Standard Time (UTC+3) is also abbreviated AST.'],
  ['adt', 'Atlantic Daylight Time', -180, true, 'ast', ['Halifax', 'CA'], 'America/Halifax', ['Atlantic Canada (summer)', 'Bermuda (summer)']],
  ['nst', 'Newfoundland Standard Time', -210, false, null, ["St. John's", 'CA'], 'America/St_Johns', ['Newfoundland and southeastern Labrador (winter)']],
  ['brt', 'Brasília Time', -180, false, null, ['Sao Paulo', 'BR'], 'America/Sao_Paulo', ['Most of Brazil', 'São Paulo', 'Rio de Janeiro', 'Brasília']],
  ['art', 'Argentina Time', -180, false, null, ['Buenos Aires', 'AR'], 'America/Argentina/Buenos_Aires', ['Argentina']],
  ['wat', 'West Africa Time', 60, false, null, ['Lagos', 'NG'], 'Africa/Lagos', ['Nigeria', 'Angola', 'Cameroon', 'Western DR Congo', 'Niger', 'Chad']],
  ['cat', 'Central Africa Time', 120, false, null, ['Harare', 'ZW'], 'Africa/Harare', ['Zimbabwe', 'Zambia', 'Mozambique', 'Malawi', 'Botswana', 'Eastern DR Congo', 'Sudan']],
  ['sast', 'South Africa Standard Time', 120, false, null, ['Johannesburg', 'ZA'], 'Africa/Johannesburg', ['South Africa', 'Lesotho', 'Eswatini']],
  ['eat', 'East Africa Time', 180, false, null, ['Nairobi', 'KE'], 'Africa/Nairobi', ['Kenya', 'Ethiopia', 'Tanzania', 'Uganda', 'Somalia', 'Madagascar']],
  ['gst', 'Gulf Standard Time', 240, false, null, ['Dubai', 'AE'], 'Asia/Dubai', ['United Arab Emirates', 'Oman']],
  ['pkt', 'Pakistan Standard Time', 300, false, null, ['Karachi', 'PK'], 'Asia/Karachi', ['Pakistan']],
  ['ist', 'India Standard Time', 330, false, null, ['New Delhi', 'IN'], 'Asia/Kolkata', ['India', 'Sri Lanka (same offset)'], 'Israel Standard Time (UTC+2) and Irish Standard Time (UTC+1) are also abbreviated IST.'],
  ['npt', 'Nepal Time', 345, false, null, ['Kathmandu', 'NP'], 'Asia/Kathmandu', ['Nepal']],
  ['ict', 'Indochina Time', 420, false, null, ['Bangkok', 'TH'], 'Asia/Bangkok', ['Thailand', 'Vietnam', 'Cambodia', 'Laos']],
  ['wib', 'Western Indonesia Time', 420, false, null, ['Jakarta', 'ID'], 'Asia/Jakarta', ['Java', 'Sumatra', 'West and Central Kalimantan']],
  ['sgt', 'Singapore Time', 480, false, null, ['Singapore', 'SG'], 'Asia/Singapore', ['Singapore']],
  ['hkt', 'Hong Kong Time', 480, false, null, ['Hong Kong', 'HK'], 'Asia/Hong_Kong', ['Hong Kong']],
  ['pht', 'Philippine Time', 480, false, null, ['Manila', 'PH'], 'Asia/Manila', ['Philippines']],
  ['awst', 'Australian Western Standard Time', 480, false, null, ['Perth', 'AU'], 'Australia/Perth', ['Western Australia']],
  ['jst', 'Japan Standard Time', 540, false, null, ['Tokyo', 'JP'], 'Asia/Tokyo', ['Japan']],
  ['kst', 'Korea Standard Time', 540, false, null, ['Seoul', 'KR'], 'Asia/Seoul', ['South Korea', 'North Korea (same offset)']],
  ['acst', 'Australian Central Standard Time', 570, false, 'acdt', ['Adelaide', 'AU'], 'Australia/Adelaide', ['South Australia (winter)', 'Northern Territory (all year)']],
  ['acdt', 'Australian Central Daylight Time', 630, true, 'acst', ['Adelaide', 'AU'], 'Australia/Adelaide', ['South Australia (summer)']],
  ['aest', 'Australian Eastern Standard Time', 600, false, 'aedt', ['Sydney', 'AU'], 'Australia/Sydney', ['New South Wales (winter)', 'Victoria (winter)', 'Tasmania (winter)', 'Queensland (all year)', 'ACT (winter)']],
  ['aedt', 'Australian Eastern Daylight Time', 660, true, 'aest', ['Sydney', 'AU'], 'Australia/Sydney', ['New South Wales (summer)', 'Victoria (summer)', 'Tasmania (summer)', 'ACT (summer)']],
  ['nzst', 'New Zealand Standard Time', 720, false, 'nzdt', ['Auckland', 'NZ'], 'Pacific/Auckland', ['New Zealand (winter)']],
  ['nzdt', 'New Zealand Daylight Time', 780, true, 'nzst', ['Auckland', 'NZ'], 'Pacific/Auckland', ['New Zealand (summer)']],
];

export const ABBREVIATIONS: Abbreviation[] = rows.map(([slug, name, offsetMinutes, isDaylight, sibling, rep, tz, usedIn, note]) => ({
  slug,
  abbr: slug.toUpperCase(),
  name,
  offsetMinutes,
  isDaylight,
  ...(sibling ? { sibling } : {}),
  ...(rep ? { representative: { name: rep[0], cc: rep[1] } } : {}),
  ...(tz ? { representativeTz: tz } : {}),
  ...(note ? { note } : {}),
  usedIn,
}));
