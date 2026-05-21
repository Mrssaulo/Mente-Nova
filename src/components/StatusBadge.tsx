interface StatusBadgeProps {
  value: string;
  compact?: boolean;
}

export function StatusBadge({ value, compact = false }: StatusBadgeProps) {
  return (
    <span className={`status-badge status-${normalize(value)} ${compact ? "status-compact" : ""}`}>
      {value}
    </span>
  );
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, "-")
    .toLowerCase();
}
