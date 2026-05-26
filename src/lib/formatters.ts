export function money(value: number | undefined, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(value ?? 0);
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function statusLabel(value: string) {
  return value.replace("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
