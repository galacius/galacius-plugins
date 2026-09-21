import { METRIC_CLASS_LABELS, DEFAULT_THRESHOLDS } from "../../utils";

interface ThresholdsSectionProps {
  thresholds: Record<string, { warn: number; critical: number }>;
  enabledMetrics: string[];
}

export function ThresholdsSection({ thresholds, enabledMetrics }: ThresholdsSectionProps) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold">Thresholds (Color Indicators)</h3>
      <div className="space-y-2">
        {enabledMetrics.map((metricClass) => {
          const threshold =
            thresholds[metricClass] ||
            DEFAULT_THRESHOLDS[metricClass as keyof typeof DEFAULT_THRESHOLDS];
          const label = METRIC_CLASS_LABELS[metricClass as keyof typeof METRIC_CLASS_LABELS];

          // Skip metrics that don't have meaningful thresholds
          if (threshold.warn === 0 && threshold.critical === 0) {
            return null;
          }

          return (
            <div key={metricClass} className="text-sm">
              <div className="mb-1 flex items-center justify-between">
                <span>{label}</span>
                <span className="text-xs text-neutral-500">
                  Warn: {threshold.warn}%, Crit: {threshold.critical}%
                </span>
              </div>
              <div className="flex h-6 gap-2">
                <div className="relative flex-1 rounded bg-neutral-200 dark:bg-neutral-800">
                  <div className="absolute top-0 right-0 bottom-0 left-0 flex">
                    <div className="bg-green-500/30" style={{ width: `${threshold.warn}%` }} />
                    <div
                      className="bg-yellow-500/30"
                      style={{
                        width: `${threshold.critical - threshold.warn}%`,
                      }}
                    />
                    <div
                      className="bg-red-500/30"
                      style={{ width: `${100 - threshold.critical}%` }}
                    />
                  </div>
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-yellow-600"
                    style={{ left: `${threshold.warn}%` }}
                    title={`Warning: ${threshold.warn}%`}
                  />
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-red-600"
                    style={{ left: `${threshold.critical}%` }}
                    title={`Critical: ${threshold.critical}%`}
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
