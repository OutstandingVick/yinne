export const POSTGRES_BIGINT_MAX = 9_223_372_036_854_775_807n;

export function parseMinorAmount(value: string | bigint, field = "amount"): bigint {
  if (typeof value === "string" && !/^(0|[1-9][0-9]*)$/.test(value))
    throw new TypeError(`${field} must be a nonnegative integer string.`);
  const amount = typeof value === "bigint" ? value : BigInt(value);
  if (amount < 0n || amount > POSTGRES_BIGINT_MAX)
    throw new RangeError(`${field} is outside the supported range.`);
  return amount;
}

export function multiplyMinorAmount(unitAmount: bigint, quantity: number): bigint {
  if (!Number.isSafeInteger(quantity) || quantity <= 0)
    throw new RangeError("quantity must be a positive safe integer.");
  const total = unitAmount * BigInt(quantity);
  if (total > POSTGRES_BIGINT_MAX) throw new RangeError("The monetary total is too large.");
  return total;
}

export function addMinorAmounts(values: readonly bigint[]): bigint {
  return values.reduce((sum, value) => {
    const next = sum + value;
    if (next > POSTGRES_BIGINT_MAX) throw new RangeError("The monetary total is too large.");
    return next;
  }, 0n);
}
