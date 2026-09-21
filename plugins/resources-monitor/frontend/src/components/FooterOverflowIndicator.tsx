import { useState } from "react";
import type { ResourcesSample } from "../api/resources";
import { METRIC_CLASS_LABELS } from "../utils";
import { MetricChip } from "./MetricChip";

interface FooterOverflowIndicatorProps {
  overflowMetrics: string[];
  sample: ResourcesSample | null;
  getMetricIcon: (metricClass: string) => React.ReactNode;
  getMetricValue: (metricClass: string, sample: ResourcesSample) => string | null;
  getSeverity: (metricClass: string, value: string | null) => "warning" | "destructive" | undefined;
}

export function FooterOverflowIndicator({
  overflowMetrics,
  sample,
  getMetricIcon,
  getMetricValue,
  getSeverity,
}: FooterOverflowIndicatorProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (overflowMetrics.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="rounded bg-neutral-100 px-2 py-1 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
        title={`${overflowMetrics.length} more metrics`}
      >
        +{overflowMetrics.length}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-1 min-w-64 rounded-md border border-neutral-200 bg-white p-2 shadow-lg dark:border-neutral-800 dark:bg-neutral-950">
          <div className="max-h-96 space-y-1 overflow-y-auto">
            {overflowMetrics.map((metricClass) => {
              const value =
                sample && getMetricValue(metricClass, sample)
                  ? getMetricValue(metricClass, sample)
                  : null;
              const severity = getSeverity(metricClass, value);
              return (
                <div key={metricClass} className="flex items-center gap-2">
                  <MetricChip
                    icon={getMetricIcon(metricClass)}
                    label={
                      METRIC_CLASS_LABELS[metricClass as keyof typeof METRIC_CLASS_LABELS] ||
                      metricClass
                    }
                    value={value || "—"}
                    severity={severity}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
