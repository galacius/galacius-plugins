import { cn } from "@galacius/design-system";
import { FC, ReactNode } from "react";

function getSeverityClass(disabled?: boolean, severity?: "warning" | "destructive"): string {
  if (disabled) return "bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-600";
  if (severity === "destructive") return "bg-destructive/10 text-destructive";
  if (severity === "warning") return "bg-warning/10 text-warning";
  return "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300";
}

interface MetricChipProps {
  icon: ReactNode;
  label: string;
  value: string;
  severity?: "warning" | "destructive";
  isLoading?: boolean;
  disabled?: boolean;
  title?: string;
  width?: string;
  compact?: boolean;
}

export const MetricChip: FC<MetricChipProps> = ({
  icon,
  label,
  value,
  severity,
  isLoading,
  disabled,
  title,
  width,
  compact,
}) => {
  const baseClass = "flex items-center gap-1 px-2 py-1 rounded text-xs transition-opacity";
  const severityClass = getSeverityClass(disabled, severity);

  if (isLoading) {
    return (
      <div
        className={cn("animate-pulse", baseClass, severityClass)}
        style={{ width: width || "auto" }}
      >
        <span className="text-xs">{icon}</span>
        {!compact && <span className="flex-1">{label}</span>}
        <span className="min-w-8 text-right font-mono text-xs">—</span>
      </div>
    );
  }

  return (
    <div className={cn(baseClass, severityClass)} title={title || `${label}: ${value}`}>
      <span className="text-xs">{icon}</span>
      {!compact && <span className="flex-1">{label}</span>}
      <span className="min-w-8 text-right font-mono text-xs">{value}</span>
    </div>
  );
};
