export function toPgDate(value: Date | string | undefined | null): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "string") return value;
  return value.toISOString().split("T")[0];
}
