/**
 * Utility functions for Stellar Pay
 */

export const formatBalance = (bal) => {
  return Number(bal || 0).toFixed(2);
};

export const shortenKey = (key) => {
  if (!key) return "";
  return key.slice(0, 6) + "..." + key.slice(-6);
};

export const isValidAmount = (amt) => {
  const n = parseFloat(amt);
  return !isNaN(n) && n > 0;
};
