export function formatMinorAmount(amount: string, currency: string): string {
  const value = BigInt(amount);
  const whole = value / 100n;
  const minor = (value % 100n).toString().padStart(2, "0");
  return `${currency} ${new Intl.NumberFormat("en-NG").format(whole)}.${minor}`;
}
