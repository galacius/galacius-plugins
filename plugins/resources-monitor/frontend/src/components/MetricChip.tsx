import { ReactNode } from "react";

interface MetricChipProps {
  icon: ReactNode;
  label: string;
  value: string;
  severity?: "warning" | "destructive";
  isLoading?: boolean;
  disabled?: boolean;
  title?: string;
  width?: string;
}

export function MetricChip({
  icon,
  label,
  value,
  severity,
  isLoading,
  disabled,
  title,
  width,
}: MetricChipProps) {
  const baseClass = "flex items-center gap-1 px-2 py-1 rounded text-xs transition-opacity";
  const severityClass = disabled
    ? "bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-600"
    : severity === "destructive"
      ? "bg-destructive/10 text-destructive"
      : severity === "warning"
        ? "bg-warning/10 text-warning"
        : "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300";

  if (isLoading) {
    return (
      <div
        className={`${baseClass} ${severityClass} animate-pulse`}
        style={{ width: width || "auto" }}
      >
        <span className="text-lg">{icon}</span>
        <span className="flex-1">{label}</span>
        <span className="min-w-8 text-right font-mono text-xs">—</span>
      </div>
    );
  }

  return (
    <div className={`${baseClass} ${severityClass}`} title={title || `${label}: ${value}`}>
      <span className="text-lg">{icon}</span>
      <span className="flex-1">{label}</span>
      <span className="min-w-8 text-right font-mono text-xs">{value}</span>
    </div>
  );
}
