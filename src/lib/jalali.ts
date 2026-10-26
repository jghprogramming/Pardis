// Jalali (Persian) calendar display.
// Uses the platform's Intl support for the fa-IR calendar instead of a
// hand-written conversion, so dates cannot drift from the official calendar.
// All amounts and dates in the UI must go through these helpers so the
// app keeps its promises: Persian digits, Jalali dates, RTL layout.

const persianDigits = "۰۱۲۳۴۵۶۷۸۹";

export function toPersianDigits(value: string | number): string {
  return String(value).replace(/[0-9]/g, (d) => persianDigits[Number(d)]);
}

export function formatJalali(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

export function formatJalaliShort(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function formatMoneyToman(amount: number): string {
  return `${toPersianDigits(amount.toLocaleString("en-US"))} تومان`;
}
