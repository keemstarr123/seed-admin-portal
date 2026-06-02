export function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function scoreLabel(value: unknown) {
  if (typeof value !== "number") return "-";
  return value.toFixed(value % 1 === 0 ? 0 : 1);
}
