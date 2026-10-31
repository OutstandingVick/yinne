import { YinneApiError } from "@yinne/sdk";

export interface ToolOutput {
  [key: string]: unknown;
  summary: string;
}

export function money(amount: string, currency: string) {
  const scale =
    new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions()
      .maximumFractionDigits ?? 2;
  const negative = amount.startsWith("-");
  const digits = BigInt(negative ? amount.slice(1) : amount)
    .toString()
    .padStart(scale + 1, "0");
  const whole = digits.slice(0, digits.length - scale) || "0";
  const fraction = scale ? `.${digits.slice(-scale)}` : "";
  return `${negative ? "-" : ""}${currency} ${BigInt(whole).toLocaleString("en-US")}${fraction}`;
}

export function amountView(amount: string, currency: string) {
  return { amount, currency, formatted_amount: money(amount, currency) };
}

export function mapError(error: unknown, secret?: string): ToolOutput {
  const redact = (message: string) => (secret ? message.split(secret).join("[REDACTED]") : message);
  if (error instanceof YinneApiError) {
    return {
      summary: `Yinne API error ${error.status}: ${redact(error.message)}`,
      error: {
        status: error.status,
        code: error.code,
        message: redact(error.message),
        request_id: error.requestId,
      },
    };
  }
  return {
    summary: error instanceof Error ? redact(error.message) : "Tool failed",
    error: { message: error instanceof Error ? redact(error.message) : "Tool failed" },
  };
}
