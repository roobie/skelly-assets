/** Orders strings by UTF-16 code unit, so an export is the same on every machine; `localeCompare` follows the runtime locale. */
export const compareCodeUnits = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

const DIGIT_RUNS = /(\d+)/;
const LEADING_ZEROS = /^0+(?=\d)/;

const compareDigitRuns = (a, b) => {
  const left = a.replace(LEADING_ZEROS, '');
  const right = b.replace(LEADING_ZEROS, '');
  return left.length - right.length || compareCodeUnits(left, right);
};

/**
 * Orders strings by code unit, except that each run of digits compares as a number, so `frame-2` precedes `frame-10`.
 * Spellings of one number (`2`, `02`) fall back to code-unit order, keeping the order total.
 */
export const compareNumbered = (a, b) => {
  // Splitting on a captured digit run alternates text (even indexes) and digit runs (odd indexes).
  const left = a.split(DIGIT_RUNS);
  const right = b.split(DIGIT_RUNS);
  for (let i = 0; i < Math.min(left.length, right.length); i++) {
    const order = i % 2 === 1 ? compareDigitRuns(left[i], right[i]) : compareCodeUnits(left[i], right[i]);
    if (order !== 0) return order;
  }
  return left.length - right.length || compareCodeUnits(a, b);
};
