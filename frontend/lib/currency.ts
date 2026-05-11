// Multi-currency support. The active currency is resolved at the page level
// (per-tenant or platform-default) and passed down. All amounts are stored
// in their authoritative numeric value (not minor units), then formatted here
// via Intl.NumberFormat for locale-correct symbols and digits.

export type CurrencyCode = string;

export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
}

export const SUPPORTED_CURRENCIES: CurrencyInfo[] = [
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone' },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'SAR', symbol: 'SAR', name: 'Saudi Riyal' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso' },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira' },
  { code: 'PLN', symbol: 'zł', name: 'Polish Złoty' },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
  { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound' },
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka' },
  { code: 'PKR', symbol: 'Rs', name: 'Pakistani Rupee' },
];

export const DEFAULT_CURRENCY: CurrencyCode = 'GBP';

const ZERO_DECIMAL = new Set(['JPY', 'KRW', 'IDR']);

export function formatPrice(amount: number, currency: CurrencyCode = DEFAULT_CURRENCY): string {
  const code = (currency || DEFAULT_CURRENCY).toUpperCase();
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: ZERO_DECIMAL.has(code) ? 0 : 2,
      maximumFractionDigits: ZERO_DECIMAL.has(code) ? 0 : 2,
    }).format(amount);
  } catch {
    const info = SUPPORTED_CURRENCIES.find((c) => c.code === code);
    const symbol = info?.symbol ?? code;
    return `${symbol}${amount.toFixed(ZERO_DECIMAL.has(code) ? 0 : 2)}`;
  }
}

export function currencySymbol(currency: CurrencyCode = DEFAULT_CURRENCY): string {
  const info = SUPPORTED_CURRENCIES.find((c) => c.code === (currency || DEFAULT_CURRENCY).toUpperCase());
  return info?.symbol ?? currency;
}
