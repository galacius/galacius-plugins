import {
  METRIC_CLASS_LABELS,
  DEFAULT_THRESHOLDS,
  METRIC_CLASS_UNITS,
  METRIC_CLASS_SCALE_MAX,
  formatBytesPerSec,
  type MetricClass,
} from "../../utils";
import type { Settings } from "../../api/resources";

interface ThresholdsSectionProps {
  settings: Settings;
  enabledMetrics: string[];
  onSettingsChange: (settings: Settings) => void;
}

export function ThresholdsSection({
  settings,
  enabledMetrics,
  onSettingsChange,
}: ThresholdsSectionProps) {
  const handleThresholdChange = (
    metricClass: string,
    field: "warn" | "critical",
    value: number
  ) => {
    const updated = {
      ...settings,
      thresholds: {
        ...settings.thresholds,
        [metricClass]: {
          ...(settings.thresholds?.[metricClass] ||
            DEFAULT_THRESHOLDS[metricClass as keyof typeof DEFAULT_THRESHOLDS]),
          [field]: value,
        },
      },
    };
    onSettingsChange(updated);
  };

  const getThresholds = (metricClass: string) => {
    return (
      settings.thresholds?.[metricClass] ||
      DEFAULT_THRESHOLDS[metricClass as keyof typeof DEFAULT_THRESHOLDS]
    );
  };

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold">Thresholds (Color Indicators)</h3>
      <div className="space-y-4">
        {enabledMetrics.map((metricClass) => {
          const threshold = getThresholds(metricClass);
          const label = METRIC_CLASS_LABELS[metricClass as keyof typeof METRIC_CLASS_LABELS];
          const unit = METRIC_CLASS_UNITS[metricClass as MetricClass];
          const scaleMax = METRIC_CLASS_SCALE_MAX[metricClass as MetricClass];

          if (threshold.warn === 0 && threshold.critical === 0) {
            return null;
          }

          const warnBarPercent = Math.min((threshold.warn / scaleMax) * 100, 100);
          const criticalBarPercent = Math.min((threshold.critical / scaleMax) * 100, 100);

          const formatValue = (value: number) =>
            unit === "bytesPerSec" ? formatBytesPerSec(value) : `${value}%`;

          return (
            <div
              key={metricClass}
              className="rounded border border-neutral-200 p-3 dark:border-neutral-800"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium">{label}</span>
              </div>
              <div className="mb-3 flex h-6 gap-2">
                <div className="relative flex-1 rounded bg-neutral-200 dark:bg-neutral-800">
                  <div className="absolute top-0 right-0 bottom-0 left-0 flex">
                    <div className="bg-green-500/30" style={{ width: `${warnBarPercent}%` }} />
                    <div
                      className="bg-yellow-500/30"
                      style={{
                        width: `${criticalBarPercent - warnBarPercent}%`,
                      }}
                    />
                    <div
                      className="bg-red-500/30"
                      style={{ width: `${100 - criticalBarPercent}%` }}
                    />
                  </div>
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-yellow-600"
                    style={{ left: `${warnBarPercent}%` }}
                    title={`Warning: ${formatValue(threshold.warn)}`}
                  />
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-red-600"
                    style={{ left: `${criticalBarPercent}%` }}
                    title={`Critical: ${formatValue(threshold.critical)}`}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-neutral-600 dark:text-neutral-400">
                    Warning {unit === "bytesPerSec" ? "(bytes/sec)" : "%"}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={scaleMax}
                    value={threshold.warn}
                    onChange={(e) =>
                      handleThresholdChange(metricClass, "warn", Number(e.target.value))
                    }
                    className="mt-1 w-full rounded border border-neutral-300 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-800"
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-600 dark:text-neutral-400">
                    Critical {unit === "bytesPerSec" ? "(bytes/sec)" : "%"}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={scaleMax}
                    value={threshold.critical}
                    onChange={(e) =>
                      handleThresholdChange(metricClass, "critical", Number(e.target.value))
                    }
                    className="mt-1 w-full rounded border border-neutral-300 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-800"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
