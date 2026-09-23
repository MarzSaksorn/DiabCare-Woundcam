import type { Language } from "@/contexts/LanguageContext";

const localeFor = (language: Language) => language === "th" ? "th-TH" : "en-US";

export function formatNumber(value: number | string | null | undefined, language: Language, options?: Intl.NumberFormatOptions) {
  if (value === null || value === undefined || value === "") return "—";
  const numeric = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(numeric) ? new Intl.NumberFormat(localeFor(language), options).format(numeric) : String(value);
}

export function formatPercent(value: number | string | null | undefined, language: Language) {
  if (value === null || value === undefined || value === "") return "—";
  const numeric = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(numeric) ? new Intl.NumberFormat(localeFor(language), { style: "percent", maximumFractionDigits: 0 }).format(numeric / 100) : String(value);
}

export function formatDate(value: Date | string | number | null | undefined, language: Language, options?: Intl.DateTimeFormatOptions) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat(localeFor(language), options ?? { year: "numeric", month: "short", day: "numeric" }).format(date);
}

export function formatMeasurement(value: number | string | null | undefined, unit: "cm" | "cm²" | "cm³", language: Language) {
  if (value === null || value === undefined || value === "") return "—";
  return `${formatNumber(value, language, { maximumFractionDigits: 2 })} ${unit}`;
}

export function formatMeasurementPair(first: number | string, second: number | string, unit: "cm", language: Language) {
  return `${formatNumber(first, language, { maximumFractionDigits: 2 })} × ${formatNumber(second, language, { maximumFractionDigits: 2 })} ${unit}`;
}
