// utils/currency.js

/**
 * Formats integer paise into standard Indian Rupee string.
 * e.g., 2500 paise -> ₹25 | 2550 paise -> ₹25.50
 */
export const formatPaise = (paise) => {
  if (typeof paise !== 'number' || isNaN(paise)) return '₹0';
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: rupees % 1 === 0 ? 0 : 2,
  }).format(rupees);
};

/**
 * Returns raw rupee float value from paise
 */
export const paiseToRupees = (paise) => {
  if (typeof paise !== 'number' || isNaN(paise)) return 0;
  return paise / 100;
};