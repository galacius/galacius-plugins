export function formatPercent(value: number, decimals = 1): string {
  return value.toFixed(decimals);
}

export function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return size.toFixed(1) + units[unitIndex];
}

export function formatLoadAverage(value: number, decimals = 2): string {
  return value.toFixed(decimals);
}

export function formatBatteryTime(minutes: number): string {
  if (minutes === 0) return "–";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h${mins}m`;
}

export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export function getThresholdColor(
  value: number,
  warnThreshold: number,
  criticalThreshold: number,
  lowerIsWorse: boolean = false
): "destructive" | "warning" | undefined {
  if (lowerIsWorse) {
    if (value <= criticalThreshold) return "destructive";
    if (value <= warnThreshold) return "warning";
  } else {
    if (value >= criticalThreshold) return "destructive";
    if (value >= warnThreshold) return "warning";
  }
  return undefined;
}

export type MetricClass =
  "cpu" | "memory" | "disk" | "network" | "battery" | "loadAverage" | "uptime";

export const METRIC_CLASS_LABELS: Record<MetricClass, string> = {
  cpu: "CPU",
  memory: "Memory",
  disk: "Disk",
  network: "Network",
  battery: "Battery",
  loadAverage: "Load",
  uptime: "Uptime",
};

export const DEFAULT_THRESHOLDS: Record<MetricClass, { warn: number; critical: number }> = {
  cpu: { warn: 70, critical: 90 },
  memory: { warn: 70, critical: 85 },
  disk: { warn: 80, critical: 95 },
  network: { warn: 0, critical: 0 },
  battery: { warn: 20, critical: 10 },
  loadAverage: { warn: 0, critical: 0 },
  uptime: { warn: 0, critical: 0 },
};
