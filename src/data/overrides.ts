/** Display-name and slug overrides, keyed `${cc}:${GeoNames ASCII name}`. */
export const CITY_OVERRIDES: Record<string, { name: string; slug: string }> = {
  'US:New York City': { name: 'New York', slug: 'new-york' },
  'US:Washington': { name: 'Washington, D.C.', slug: 'washington-dc' },
};

/** Short, commonly searched country slugs. */
export const COUNTRY_SLUG_OVERRIDES: Record<string, string> = {
  US: 'usa',
  GB: 'uk',
  AE: 'uae',
};
