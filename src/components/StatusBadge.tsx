export function StatusBadge({ value }: { value?: string | boolean | null }) {
  const normalized = typeof value === "string" && value === "approved" ? "active" : value;
  const label = typeof normalized === "boolean" ? (normalized ? "active" : "pending") : normalized || "unknown";
  return <span className={`badge ${label}`}>{label.replaceAll("_", " ")}</span>;
}
