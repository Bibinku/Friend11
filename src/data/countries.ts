import type { CountryName } from '../types';

export interface CountryOption {
  name: CountryName;
  flag: string;
}

export const COUNTRIES: readonly CountryOption[] = [
  { name: 'India', flag: '🇮🇳' },
  { name: 'Brazil', flag: '🇧🇷' },
  { name: 'Argentina', flag: '🇦🇷' },
  { name: 'United Kingdom', flag: '🇬🇧' },
  { name: 'Germany', flag: '🇩🇪' },
  { name: 'United States', flag: '🇺🇸' },
  { name: 'Indonesia', flag: '🇮🇩' },
  { name: 'Japan', flag: '🇯🇵' },
  { name: 'Malaysia', flag: '🇲🇾' },
  { name: 'Other', flag: '🌐' },
];

export const flagFor = (country: string): string => COUNTRIES.find((c) => c.name === country)?.flag ?? '🌐';
