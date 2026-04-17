import { describe, it, expect } from 'vitest';
import { formatBalance, shortenKey, isValidAmount } from '../utils/formatters';

describe('Stellar Pay Utilities', () => {
  
  it('TC-01 | formatBalance formats balance to 2 decimal places', () => {
    expect(formatBalance('10.5')).toBe('10.50');
    expect(formatBalance(5)).toBe('5.00');
    expect(formatBalance(0)).toBe('0.00');
    expect(formatBalance(null)).toBe('0.00');
  });

  it('TC-02 | shortenKey correctly slices Stellar addresses', () => {
    const address = 'GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKL';
    // GABCDE...DEFGHIJKL
    const short = shortenKey(address);
    expect(short).toBe('GABCDE...GHIJKL');
    // Actually the logic was key.slice(0,6) + "..." + key.slice(-6)
    expect(short.length).toBe(15);
    expect(short).toContain('...');
  });

  it('TC-03 | isValidAmount correctly validates payment amounts', () => {
    expect(isValidAmount('10')).toBe(true);
    expect(isValidAmount('0.1')).toBe(true);
    expect(isValidAmount('0')).toBe(false);
    expect(isValidAmount('-5')).toBe(false);
    expect(isValidAmount('abc')).toBe(false);
  });

});
