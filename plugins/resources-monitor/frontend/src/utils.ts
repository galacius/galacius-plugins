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

export function formatBytesPerSec(bytesPerSec: number): string {
  return `${formatBytes(bytesPerSec)}/s`;
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

export type MetricClass = "cpu" | "memory" | "diskio";

export const METRIC_CLASS_LABELS: Record<MetricClass, string> = {
  cpu: "CPU",
  memory: "Memory",
  diskio: "Disk I/O",
};

// "percent" metrics are 0-100 and compared/rendered as a percentage;
// "bytesPerSec" metrics are unbounded raw throughput. Thresholds for both
// are stored and compared in the metric's own native unit.
export const METRIC_CLASS_UNITS: Record<MetricClass, "percent" | "bytesPerSec"> = {
  cpu: "percent",
  memory: "percent",
  diskio: "bytesPerSec",
};

// Upper bound used for threshold-input max attributes and for scaling the
// warn/critical gradient bar in the thresholds UI.
export const METRIC_CLASS_SCALE_MAX: Record<MetricClass, number> = {
  cpu: 100,
  memory: 100,
  diskio: 500 * 1024 * 1024, // 500 MB/s
};

export const DEFAULT_THRESHOLDS: Record<MetricClass, { warn: number; critical: number }> = {
  cpu: { warn: 70, critical: 90 },
  memory: { warn: 70, critical: 85 },
  diskio: { warn: 50 * 1024 * 1024, critical: 150 * 1024 * 1024 },
};

const KNOWN_METRIC_CLASSES = new Set(Object.keys(METRIC_CLASS_LABELS));

// Settings/metricOrder are persisted on disk and can carry metric classes
// from a previous version of the plugin that no longer exist (e.g. a removed
// "battery" or "network" metric). The frontend should never render those —
// only a currently-known metric class may show up, and only an unsupported
// *known* one (e.g. diskio on macOS) should render as N/A.
export function isKnownMetricClass(metricClass: string): metricClass is MetricClass {
  return KNOWN_METRIC_CLASSES.has(metricClass);
}

// Metrics the user has turned on, regardless of whether the current platform
// supports them (an unsupported-but-enabled metric is still shown, as N/A).
// Unknown/stale metric classes are always dropped.
export function getEnabledMetrics(
  metricOrder: string[],
  enabledMetrics: Record<string, boolean>
): string[] {
  return metricOrder.filter((m) => isKnownMetricClass(m) && enabledMetrics[m]);
}

// Metrics the user has turned on AND that the current platform can actually
// collect. Use this where showing an N/A placeholder wouldn't make sense
// (e.g. threshold/display configuration for a metric with no data).
export function getSupportedEnabledMetrics(
  metricOrder: string[],
  enabledMetrics: Record<string, boolean>,
  capabilities: object
): string[] {
  const capabilityMap = capabilities as Record<string, boolean>;
  return getEnabledMetrics(metricOrder, enabledMetrics).filter((m) => capabilityMap[m]);
}
