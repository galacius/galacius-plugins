import { Button, Input, SaveIcon } from "@galacius/design-system";
import { FC, useCallback, useState, type SubmitEvent } from "react";
import type { Settings } from "../../../api/resources";
import {
  DEFAULT_THRESHOLDS,
  METRIC_CLASS_LABELS,
  METRIC_CLASS_SCALE_MAX,
  METRIC_CLASS_UNITS,
  formatBytesPerSec,
  type MetricClass,
} from "../../../utils";

type ThresholdMap = Record<string, { warn: number; critical: number }>;

interface ThresholdsSectionProps {
  settings: Settings;
  enabledMetrics: string[];
  onSettingsChange: (settings: Settings) => void | Promise<void>;
}

export const ThresholdsSection: FC<ThresholdsSectionProps> = ({
  settings,
  enabledMetrics,
  onSettingsChange,
}) => {
  const [draftThresholds, setDraftThresholds] = useState<ThresholdMap>(
    () => settings.thresholds ?? {}
  );
  const [syncedThresholds, setSyncedThresholds] = useState(settings.thresholds);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (settings.thresholds !== syncedThresholds && !isDirty) {
    setSyncedThresholds(settings.thresholds);
    setDraftThresholds(settings.thresholds ?? {});
  }

  const handleThresholdChange = useCallback(
    (metricClass: string, field: "warn" | "critical", value: number) => {
      setDraftThresholds((prev) => ({
        ...prev,
        [metricClass]: {
          ...(prev[metricClass] ||
            DEFAULT_THRESHOLDS[metricClass as keyof typeof DEFAULT_THRESHOLDS]),
          [field]: value,
        },
      }));
      setIsDirty(true);
    },
    []
  );

  const getThresholds = useCallback(
    (metricClass: string) => {
      return (
        draftThresholds[metricClass] ||
        DEFAULT_THRESHOLDS[metricClass as keyof typeof DEFAULT_THRESHOLDS]
      );
    },
    [draftThresholds]
  );

  const handleSubmit = useCallback(
    async (e: SubmitEvent<HTMLFormElement>) => {
      e.preventDefault();
      setIsSaving(true);
      try {
        await onSettingsChange({ ...settings, thresholds: draftThresholds });
        setIsDirty(false);
      } finally {
        setIsSaving(false);
      }
    },
    [settings, draftThresholds, onSettingsChange]
  );

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold tracking-wider uppercase">
          Thresholds (Color Indicators)
        </h3>
        <Button type="submit" size="sm" disabled={!isDirty || isSaving}>
          <SaveIcon className="size-3.5" />
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </div>
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
                  <Input
                    type="number"
                    min="0"
                    max={scaleMax}
                    value={threshold.warn}
                    onChange={(e) =>
                      handleThresholdChange(metricClass, "warn", Number(e.target.value))
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-600 dark:text-neutral-400">
                    Critical {unit === "bytesPerSec" ? "(bytes/sec)" : "%"}
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max={scaleMax}
                    value={threshold.critical}
                    onChange={(e) =>
                      handleThresholdChange(metricClass, "critical", Number(e.target.value))
                    }
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </form>
  );
};
