export const CONTINENTS = [
  { id: 'africa', label: 'Africa' },
  { id: 'asia', label: 'Asia' },
  { id: 'europe', label: 'Europe' },
  { id: 'north_america', label: 'North America' },
  { id: 'south_america', label: 'South America' },
  { id: 'oceania', label: 'Oceania' },
] as const;

export type ContinentId = (typeof CONTINENTS)[number]['id'];

export const COUNTRIES: { name: string; continent: ContinentId }[] = [
  { name: 'Algeria', continent: 'africa' },
  { name: 'Angola', continent: 'africa' },
  { name: 'Benin', continent: 'africa' },
  { name: 'Botswana', continent: 'africa' },
  { name: 'Burkina Faso', continent: 'africa' },
  { name: 'Burundi', continent: 'africa' },
  { name: 'Cameroon', continent: 'africa' },
  { name: 'Cape Verde', continent: 'africa' },
  { name: 'Central African Republic', continent: 'africa' },
  { name: 'Chad', continent: 'africa' },
  { name: 'Comoros', continent: 'africa' },
  { name: 'Congo', continent: 'africa' },
  { name: 'Côte d’Ivoire', continent: 'africa' },
  { name: 'DR Congo', continent: 'africa' },
  { name: 'Djibouti', continent: 'africa' },
  { name: 'Egypt', continent: 'africa' },
  { name: 'Equatorial Guinea', continent: 'africa' },
  { name: 'Eritrea', continent: 'africa' },
  { name: 'Eswatini', continent: 'africa' },
  { name: 'Ethiopia', continent: 'africa' },
  { name: 'Gabon', continent: 'africa' },
  { name: 'Gambia', continent: 'africa' },
  { name: 'Ghana', continent: 'africa' },
  { name: 'Guinea', continent: 'africa' },
  { name: 'Guinea-Bissau', continent: 'africa' },
  { name: 'Kenya', continent: 'africa' },
  { name: 'Lesotho', continent: 'africa' },
  { name: 'Liberia', continent: 'africa' },
  { name: 'Libya', continent: 'africa' },
  { name: 'Madagascar', continent: 'africa' },
  { name: 'Malawi', continent: 'africa' },
  { name: 'Mali', continent: 'africa' },
  { name: 'Mauritania', continent: 'africa' },
  { name: 'Mauritius', continent: 'africa' },
  { name: 'Morocco', continent: 'africa' },
  { name: 'Mozambique', continent: 'africa' },
  { name: 'Namibia', continent: 'africa' },
  { name: 'Niger', continent: 'africa' },
  { name: 'Nigeria', continent: 'africa' },
  { name: 'Rwanda', continent: 'africa' },
  { name: 'Senegal', continent: 'africa' },
  { name: 'Seychelles', continent: 'africa' },
  { name: 'Sierra Leone', continent: 'africa' },
  { name: 'Somalia', continent: 'africa' },
  { name: 'South Africa', continent: 'africa' },
  { name: 'South Sudan', continent: 'africa' },
  { name: 'Sudan', continent: 'africa' },
  { name: 'Tanzania', continent: 'africa' },
  { name: 'Togo', continent: 'africa' },
  { name: 'Tunisia', continent: 'africa' },
  { name: 'Uganda', continent: 'africa' },
  { name: 'Zambia', continent: 'africa' },
  { name: 'Zimbabwe', continent: 'africa' },

  { name: 'Bangladesh', continent: 'asia' },
  { name: 'China', continent: 'asia' },
  { name: 'India', continent: 'asia' },
  { name: 'Indonesia', continent: 'asia' },
  { name: 'Japan', continent: 'asia' },
  { name: 'Malaysia', continent: 'asia' },
  { name: 'Pakistan', continent: 'asia' },
  { name: 'Philippines', continent: 'asia' },
  { name: 'Singapore', continent: 'asia' },
  { name: 'South Korea', continent: 'asia' },
  { name: 'Thailand', continent: 'asia' },
  { name: 'Turkey', continent: 'asia' },
  { name: 'United Arab Emirates', continent: 'asia' },
  { name: 'Vietnam', continent: 'asia' },

  { name: 'France', continent: 'europe' },
  { name: 'Germany', continent: 'europe' },
  { name: 'Ireland', continent: 'europe' },
  { name: 'Italy', continent: 'europe' },
  { name: 'Netherlands', continent: 'europe' },
  { name: 'Poland', continent: 'europe' },
  { name: 'Portugal', continent: 'europe' },
  { name: 'Spain', continent: 'europe' },
  { name: 'Sweden', continent: 'europe' },
  { name: 'United Kingdom', continent: 'europe' },

  { name: 'Canada', continent: 'north_america' },
  { name: 'Mexico', continent: 'north_america' },
  { name: 'United States', continent: 'north_america' },

  { name: 'Argentina', continent: 'south_america' },
  { name: 'Brazil', continent: 'south_america' },
  { name: 'Chile', continent: 'south_america' },
  { name: 'Colombia', continent: 'south_america' },
  { name: 'Peru', continent: 'south_america' },

  { name: 'Australia', continent: 'oceania' },
  { name: 'New Zealand', continent: 'oceania' },
];

export const continentOf = (country: string): ContinentId | '' =>
  COUNTRIES.find((c) => c.name === country)?.continent ?? '';

export const countriesIn = (continent: string) =>
  COUNTRIES.filter((c) => c.continent === continent).map((c) => c.name);

export const formatPlace = (city?: string | null, country?: string | null, fallback = '') => {
  const parts = [city, country].map((s) => (s ?? '').trim()).filter(Boolean);
  return parts.length ? parts.join(', ') : fallback;
};
