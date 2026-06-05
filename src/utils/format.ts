/**
 * Formats a given amount into a comma-separated string with exactly two decimal places.
 * Handles strings, numbers, and null/undefined values.
 * e.g., 25000 -> 25,000.00
 */
export const formatCurrency = (amount: string | number | null | undefined): string => {
  if (amount === null || amount === undefined) return '0.00';
  
  // Strip out any existing commas if it's a string, then parse
  const cleanAmount = typeof amount === 'string' ? amount.replace(/,/g, '') : amount;
  const num = typeof cleanAmount === 'string' ? parseFloat(cleanAmount) : cleanAmount;

  if (isNaN(num)) return '0.00';

  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};
